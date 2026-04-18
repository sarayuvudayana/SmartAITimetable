import { ClassSession, Section, Subject, Faculty, Day, SubjectType } from '@/types/timetable';
import { DAYS, SLOT_DEFINITIONS } from '@/core/timeSlotManager';

interface ExportDeps {
  sessions: ClassSession[];
  sections: Section[];
  subjects: Subject[];
  faculty: Faculty[];
}

function getCellLabel(
  sessions: ClassSession[],
  sectionId: string,
  day: Day,
  slotIndex: number,
  subjects: Subject[],
  faculty: Faculty[]
): string {
  const session = sessions.find(
    (s) => s.sectionId === sectionId && s.day === day && s.slotIndex === slotIndex
  );
  if (!session) return '';
  const subj = subjects.find((s) => s.code === session.subjectCode);
  const fac1 = faculty.find((f) => f.id === session.facultyId);
  const fac2 = session.secondFacultyId ? faculty.find(f => f.id === session.secondFacultyId) : null;
  
  let facultyDisplay = '';
  if (session.isCareerPath && session.facultyIds) {
    facultyDisplay = session.facultyIds
      .map(fid => faculty.find(f => f.id === fid)?.shortName || fid)
      .join(' / ');
  } else {
    facultyDisplay = fac2 
      ? `${fac1?.shortName || session.facultyId} & ${fac2?.shortName || session.secondFacultyId}` 
      : `${fac1?.shortName || session.facultyId}`;
  }

  let type: string;
  if (session.isCareerPath) {
    type = session.careerPathSlotType === 'lab' ? 'CP-LAB' : 'CP-THEORY';
  } else if (subj?.subjectType === SubjectType.LAB) {
    type = 'LAB';
  } else if (subj?.subjectType === SubjectType.INTEGRATED) {
    type = session.labRoomId ? 'INT-LAB' : 'INT-THEORY'; 
  } else {
    type = 'THEORY';
  }

  const subjCode = subj?.code || session.subjectCode;
  let text = `[${type}] ${subjCode} | ${facultyDisplay}`;
  if (session.labRoomId) {
    text += ` | ${session.labRoomId}`;
  }
  return text;
}

export function exportToCSV({ sessions, sections, subjects, faculty }: ExportDeps): string {
  const lines: string[] = [];

  // Build display columns: slot0, slot1, BREAK, slot2, slot3, LUNCH, slot4, slot5
  const displayCols: { label: string; slotIndex: number | null; type: 'slot' | 'break' | 'lunch' }[] = [];
  for (let i = 0; i < 7; i++) {
    const s = SLOT_DEFINITIONS[i];
    if (i === 2) displayCols.push({ label: 'BREAK (11:00-11:10)', slotIndex: null, type: 'break' });
    if (i === 4) displayCols.push({ label: 'LUNCH (13:10-14:00)', slotIndex: null, type: 'lunch' });
    displayCols.push({ label: `${s.startTime}-${s.endTime}`, slotIndex: s.slotIndex, type: 'slot' });
  }

  for (const section of sections) {
    lines.push(`\nYear ${section.yearNumber} - Section ${section.name}`);
    lines.push(['Day', ...displayCols.map(c => c.label)].join(','));

    for (const day of DAYS) {
      let skipNext = false;
      
      const fixedCells = displayCols.map((col, colIdx) => {
        if (skipNext) {
          skipNext = false;
          return '""';
        }
        
        if (col.slotIndex === null) {
          return '"-"';
        }
        
        const session = sessions.find(s => s.sectionId === section.id && s.day === day && s.slotIndex === col.slotIndex);
        if (!session) return '""';
        
        const subj = subjects.find(s => s.code === session.subjectCode);
        const isLab = subj && (subj.subjectType === SubjectType.LAB || subj.subjectType === SubjectType.INTEGRATED);
        const isCpLab = session.isCareerPath && session.careerPathSlotType === 'lab';
        
        if ((isLab || isCpLab) && colIdx < displayCols.length - 1) {
          const nextCol = displayCols[colIdx + 1];
          if (nextCol.type === 'slot') {
            const nextSession = sessions.find(s => s.sectionId === section.id && s.day === day && s.slotIndex === nextCol.slotIndex);
            if (nextSession && nextSession.subjectCode === session.subjectCode) {
              skipNext = true;
            }
          }
        }

        const label = getCellLabel(sessions, section.id, day, col.slotIndex, subjects, faculty);
        return `"${label}"`; // Preserve \n for native Excel multiline cells
      });
      lines.push([day, ...fixedCells].join(','));
    }
  }

  return lines.join('\n');
}

export function exportToHTML({ sessions, sections, subjects, faculty }: ExportDeps): string {
  // Build display columns with break and lunch
  const displayCols: { label: string; slotIndex: number | null; type: 'slot' | 'break' | 'lunch' }[] = [];
  for (let i = 0; i < 7; i++) {
    const s = SLOT_DEFINITIONS[i];
    if (i === 2) displayCols.push({ label: '11:00-11:10', slotIndex: null, type: 'break' });
    if (i === 4) displayCols.push({ label: '13:10-14:00', slotIndex: null, type: 'lunch' });
    displayCols.push({ label: `${s.startTime}-${s.endTime}`, slotIndex: s.slotIndex, type: 'slot' });
  }

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>CSE Timetable</title>
  <style>
    :root { --bg: #0f172a; --card: #1e293b; --border: #334155; --text: #f8fafc; --muted: #94a3b8; --primary: #6366f1; --accent: #8b5cf6; }
    body{font-family:'Inter',system-ui,sans-serif;padding:40px;background:var(--bg);color:var(--text);line-height:1.5}
    h1{font-size:32px;font-weight:900;text-align:center;margin-bottom:10px;text-transform:uppercase;letter-spacing:-0.025em;background:linear-gradient(to right, #818cf8, #c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .inst{text-align:center;font-size:14px;color:var(--muted);font-weight:700;margin-bottom:40px;letter-spacing:0.1em;text-transform:uppercase}
    table{border-collapse:separate;border-spacing:0;width:100%;margin-bottom:50px;border:2px solid var(--border);border-radius:12px;overflow:hidden;background:var(--card);box-shadow:0 25px 50px -12px rgba(0,0,0,0.5)}
    th,td{border:1px solid var(--border);padding:12px 10px;text-align:center;font-size:14px;font-weight:500}
    th{background:#1e293b;color:var(--text);font-weight:800;text-transform:uppercase;letter-spacing:0.05em;font-size:12px}
    th.day-header{background:#0f172a;width:100px}
    th.break-col{background:var(--primary);color:#fff;width:35px;font-size:11px;font-weight:900}
    th.lunch-col{background:var(--accent);color:#fff;width:35px;font-size:11px;font-weight:900}
    td.break-cell{background:rgba(99,102,241,0.1);font-size:12px;color:var(--primary);font-weight:900}
    td.lunch-cell{background:rgba(139,92,246,0.1);font-size:12px;color:var(--accent);font-weight:900}
    h2{margin-top:40px;margin-bottom:15px;color:var(--text);font-size:20px;font-weight:800;display:flex;align-items:center;gap:10px}
    h2::before{content:'';display:block;width:4px;height:24px;background:var(--primary);border-radius:2px}
    .sub{font-weight:900;font-size:15px;color:#fff;display:block;margin-bottom:2px}
    .fac{font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase}
    .empty{color:var(--border);font-weight:900}
    @media print{
      body{padding:0;background:white;color:black}
      :root{--bg:white;--card:white;--border:#000;--text:black;--muted:#444;--primary:#444;--accent:#444}
      h1{-webkit-text-fill-color:black;background:none;color:black;border-bottom:2px solid black;padding-bottom:10px}
      table{box-shadow:none;border:2px solid black}
      th,td{border:1px solid black;color:black}
      .sub{color:black}
      h2::before{background:black}
      h2{page-break-before:always}
    }
  </style></head><body><h1>SMART TIMETABLE</h1><div class="inst">GMR Institute of Technology - Rajam</div>`;

  for (const section of sections) {
    html += `<h2>Year ${section.yearNumber} - Section ${section.name}</h2>`;
    html += `<table><tr><th class="day-header">Day</th>`;
    for (const col of displayCols) {
      if (col.type === 'break') {
        html += `<th class="break-col" style="writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg)">${col.label}</th>`;
      } else if (col.type === 'lunch') {
        html += `<th class="lunch-col" style="writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg)">${col.label}</th>`;
      } else {
        html += `<th>${col.label}</th>`;
      }
    }
    html += `</tr>`;

    for (let di = 0; di < DAYS.length; di++) {
      const day = DAYS[di];
      const isFirstRow = di === 0;
      html += `<tr><td class="day-header"><strong>${day}</strong></td>`;
      let skipNext = false;
      for (let colIdx = 0; colIdx < displayCols.length; colIdx++) {
        if (skipNext) {
          skipNext = false;
          continue;
        }

        const col = displayCols[colIdx];
        if (col.type === 'break') {
          if (isFirstRow) {
            html += `<td class="break-cell" rowspan="${DAYS.length}" style="writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg)">BREAK</td>`;
          }
        } else if (col.type === 'lunch') {
          if (isFirstRow) {
            html += `<td class="lunch-cell" rowspan="${DAYS.length}" style="writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg)">LUNCH</td>`;
          }
        } else {
          const session = sessions.find(
            (s) => s.sectionId === section.id && s.day === day && s.slotIndex === col.slotIndex
          );
          if (session) {
            const subj = subjects.find((s) => s.code === session.subjectCode);
            const fac = faculty.find((f) => f.id === session.facultyId);
            const fac2 = session.secondFacultyId ? faculty.find((f) => f.id === session.secondFacultyId) : null;
            
            let facultyHTML = '';
            if (session.isCareerPath && session.facultyIds) {
              facultyHTML = session.facultyIds
                .map(fid => faculty.find(f => f.id === fid)?.shortName || fid)
                .join(' / ');
            } else {
              facultyHTML = `${fac?.shortName || session.facultyId}${fac2 ? ' & ' + fac2.shortName : ''}`;
            }

            let colspan = 1;

            const isLab = subj && (subj.subjectType === SubjectType.LAB || subj.subjectType === SubjectType.INTEGRATED);
            const isCpLab = session.isCareerPath && session.careerPathSlotType === 'lab';

            if ((isLab || isCpLab) && colIdx < displayCols.length - 1) {
              const nextCol = displayCols[colIdx + 1];
              if (nextCol.type === 'slot') {
                const nextSession = sessions.find(
                  (s) => s.sectionId === section.id && s.day === day && s.slotIndex === nextCol.slotIndex
                );
                if (nextSession && nextSession.subjectCode === session.subjectCode) {
                  colspan = 2;
                  skipNext = true;
                }
              }
            }

            let type = '';
            if (session.isCareerPath) {
              type = session.careerPathSlotType === 'lab' ? 'CP-LAB' : 'CP-THEORY';
            } else if (subj?.subjectType === SubjectType.LAB) {
              type = 'LAB';
            } else if (subj?.subjectType === SubjectType.INTEGRATED) {
              type = session.labRoomId ? 'INT-LAB' : 'INT-THEORY'; 
            } else {
              type = 'THEORY';
            }

            html += `<td colspan="${colspan}">
              <span class="sub">${subj?.code || session.subjectCode}</span>
              <span class="fac">${facultyHTML}</span>
            </td>`;
          } else {
            html += `<td class="empty"></td>`;
          }
        }
      }
      html += `</tr>`;
    }
    html += `</table>`;

    // Reference Table for Sections
    const sectionSubjects = subjects.filter(s => sessions.some(sess => sess.sectionId === section.id && sess.subjectCode === s.code));
    if (sectionSubjects.length > 0) {
      html += `<div style="margin-top:20px;margin-bottom:50px;border:1px solid var(--border);border-radius:10px;overflow:hidden">
        <div style="background:#0f172a;color:#fff;padding:12px 16px;font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em">Course Information</div>
        <table style="margin-bottom:0;border:none;box-shadow:none;border-radius:0">
          <thead>
            <tr>
              <th style="font-size:13px;width:60px;padding:12px 8px">S.No</th>
              <th style="font-size:13px;width:100px;padding:12px 8px">Code</th>
              <th style="font-size:13px;text-align:left;padding:12px 10px">Course Title</th>
              <th style="font-size:13px;width:80px;padding:12px 8px">Credits</th>
              <th style="font-size:13px;text-align:left;padding:12px 10px">Faculty</th>
            </tr>
          </thead>
          <tbody style="font-size:13px">`;
      
      let sNo = 1;
      sectionSubjects.forEach(subj => {
        const getFac = () => {
          const s = sessions.find(sess => sess.sectionId === section.id && sess.subjectCode === subj.code && !sess.isCareerPath);
          if (!s) return '—';
          const f1 = faculty.find(f => f.id === s.facultyId)?.shortName || s.facultyId;
          const f2 = s.secondFacultyId ? faculty.find(f => f.id === s.secondFacultyId)?.shortName || s.secondFacultyId : null;
          return f2 ? `${f1} / ${f2}` : f1;
        };
        const facName = getFac();

        if (subj.credits && subj.credits > 4) {
          html += `<tr>
            <td style="padding:10px 5px">${sNo++}</td>
            <td style="padding:10px 5px">${subj.code}</td>
            <td style="text-align:left;padding:10px 8px">${subj.name}</td>
            <td style="padding:10px 5px">${subj.theoryCredits?.toFixed(1) || '0.0'}</td>
            <td style="text-align:left;padding:10px 8px">${facName}</td>
          </tr>
          <tr>
            <td style="padding:10px 5px">${sNo++}</td>
            <td style="padding:10px 5px">${subj.code}</td>
            <td style="text-align:left;padding:10px 8px">${subj.name} Lab</td>
            <td style="padding:10px 5px">${subj.labCredits?.toFixed(1) || '0.0'}</td>
            <td style="text-align:left;padding:10px 8px">${facName}</td>
          </tr>`;
        } else {
          html += `<tr>
            <td style="padding:10px 5px">${sNo++}</td>
            <td style="padding:10px 5px">${subj.code}</td>
            <td style="text-align:left;padding:10px 8px">${subj.name}</td>
            <td style="padding:10px 5px">${subj.credits?.toFixed(1) || '0.0'}</td>
            <td style="text-align:left;padding:10px 8px">${facName}</td>
          </tr>`;
        }
      });

      // Add Career Path Session if exists for this year
      const hasCP = sessions.some(s => s.isCareerPath && s.yearNumber === section.yearNumber);
      if (hasCP) {
        const cpFacs = [...new Set(
          sessions
            .filter(s => s.isCareerPath && s.yearNumber === section.yearNumber)
            .flatMap(s => s.facultyIds || [])
            .map(fid => faculty.find(f => f.id === fid)?.shortName || fid)
        )].join(' / ');
        const cpCredits = sessions.find(s => s.isCareerPath && s.yearNumber === section.yearNumber)?.credits?.toFixed(1) || '2.0';

        html += `<tr style="background:#f8fafc;border-top:2px solid #e2e8f0">
          <td style="padding:10px 5px">${sNo++}</td>
          <td style="padding:10px 5px;color:#6366f1;font-weight:900">CP</td>
          <td style="text-align:left;padding:10px 8px;font-weight:600">Career Path</td>
          <td style="padding:10px 5px;font-weight:900">${cpCredits}</td>
          <td style="text-align:left;padding:10px 8px">${cpFacs || '—'}</td>
        </tr>`;
      }
      html += `</tbody></table></div>`;
    }
  }

  html += `</body></html>`;
  return html;
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function printTimetable(deps: ExportDeps) {
  const html = exportToHTML(deps);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.print();
  }
}

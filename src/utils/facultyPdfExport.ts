import { ClassSession, Faculty, Subject, SubjectType, Day } from '@/types/timetable';
import { DAYS, SLOT_DEFINITIONS } from '@/core/timeSlotManager';

interface FacultyPdfDeps {
  sessions: ClassSession[];
  faculty: Faculty[];
  subjects: Subject[];
  sections: { id: string; yearNumber: number; name: string }[];
}

export function exportFacultyTimetablePdf({ sessions, faculty, subjects, sections }: FacultyPdfDeps) {
  // Build display columns: slot0, slot1, BREAK, slot2, slot3, LUNCH, slot4, slot5
  const displayCols: { label: string; slotIndex: number | null; type: 'slot' | 'break' | 'lunch' }[] = [];
  for (let i = 0; i < 6; i++) {
    const s = SLOT_DEFINITIONS[i];
    if (i === 2) displayCols.push({ label: '11:00-11:10', slotIndex: null, type: 'break' });
    if (i === 4) displayCols.push({ label: '13:10-14:00', slotIndex: null, type: 'lunch' });
    displayCols.push({ label: `${s.startTime}-${s.endTime}`, slotIndex: s.slotIndex, type: 'slot' });
  }

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Faculty Timetables</title>
  <style>
    :root { --bg: #0f172a; --card: #1e293b; --border: #334155; --text: #f8fafc; --muted: #94a3b8; --primary: #6366f1; --accent: #8b5cf6; }
    @page { size: landscape; margin: 10mm; }
    body { font-family: 'Inter', system-ui, sans-serif; padding: 20px; background: var(--bg); color: var(--text); line-height: 1.4; }
    h1 { font-size: 28px; font-weight: 900; text-align: center; margin-bottom: 20px; text-transform: uppercase; letter-spacing: -0.025em; background: linear-gradient(to right, #818cf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    h2 { font-size: 18px; font-weight: 800; margin: 30px 0 10px; color: var(--text); display: flex; align-items: center; gap: 8px; page-break-before: always; }
    h2::before { content: ''; display: block; width: 4px; height: 20px; background: var(--primary); border-radius: 2px; }
    h2:first-of-type { page-break-before: avoid; }
    table { border-collapse: separate; border-spacing: 0; width: 100%; margin-bottom: 20px; border: 2px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--card); }
    th, td { border: 1px solid var(--border); padding: 8px 6px; text-align: center; font-size: 12px; }
    th { background: #1e293b; color: var(--text); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-size: 10px; }
    th.break-col { background: var(--primary); color: #fff; width: 30px; font-size: 9px; padding: 4px 2px; }
    th.lunch-col { background: var(--accent); color: #fff; width: 30px; font-size: 9px; padding: 4px 2px; }
    td.break-cell { background: rgba(99,102,241,0.05); font-size: 10px; color: var(--primary); font-weight: 900; }
    td.lunch-cell { background: rgba(139,92,246,0.05); font-size: 10px; color: var(--accent); font-weight: 900; }
    .lab { background: rgba(59,130,246,0.1); }
    .theory { background: rgba(16,185,129,0.05); }
    .cp { background: rgba(236,72,153,0.1); }
    .sub { font-weight: 900; font-size: 13px; color: #fff; display: block; margin-bottom: 1px; }
    .sec { font-size: 10px; color: var(--muted); font-weight: 700; text-transform: uppercase; }
    .type { font-size: 9px; color: var(--primary); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; display: block; }
    .free { color: var(--border); font-weight: 900; }
    .workload-title { font-size: 11px; font-weight: 800; color: var(--primary); margin: 15px 0 6px; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 6px; }
    .workload-title::after { content: ''; flex: 1; height: 1px; background: var(--border); }
    .workload-table { width: auto; min-width: 400px; border-radius: 6px; }
    .workload-table th { background: #0f172a; color: var(--muted); font-size: 10px; }
    .workload-table td { font-size: 14px; font-weight: 700; padding: 10px; }
    .workload-table td.total { font-weight: 900; color: #fff; background: var(--primary); }
    @media print {
      body { padding: 0; background: white; color: black; }
      :root { --bg: white; --card: white; --border: #000; --text: black; --muted: #444; --primary: #000; --accent: #000; }
      h1 { -webkit-text-fill-color: black; background: none; color: black; border-bottom: 2px solid black; padding-bottom: 5px; }
      table { border: 2px solid black; box-shadow: none; }
      th, td { border: 1px solid black; color: black; }
      .sub { color: black; }
      .type { color: black; }
      .workload-title { color: black; }
      .workload-title::after { background: black; }
    }
  </style></head><body>
  <h1>FACULTY TIMETABLES</h1>`;

  for (const fac of faculty) {
    const allSessions = sessions.filter(s => 
      s.facultyId === fac.id || 
      s.secondFacultyId === fac.id || 
      s.facultyIds?.includes(fac.id)
    );
    
    // Deduplicate Career Path sessions by day and slot index
    const facSessions: typeof allSessions = [];
    const seenCpSlots = new Set<string>();
    
    allSessions.forEach(s => {
      if (s.isCareerPath) {
        const key = `${s.day}-${s.slotIndex}`;
        if (!seenCpSlots.has(key)) {
          seenCpSlots.add(key);
          facSessions.push(s);
        }
      } else {
        facSessions.push(s);
      }
    });

    if (facSessions.length === 0) continue;

    html += `<h2>${fac.shortName} <span style="font-size:12px;color:var(--muted);font-weight:600">(${fac.id})</span></h2>`;

    // Timetable header
    html += `<table><tr><th style="width:80px">Day</th>`;
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

    // Timetable rows
    for (let di = 0; di < DAYS.length; di++) {
      const day = DAYS[di];
      const isFirstRow = di === 0;
      html += `<tr><td style="background:#0f172a;font-weight:900;color:var(--text)">${day.slice(0, 3)}</td>`;

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
          continue;
        }
        if (col.type === 'lunch') {
          if (isFirstRow) {
            html += `<td class="lunch-cell" rowspan="${DAYS.length}" style="writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg)">LUNCH</td>`;
          }
          continue;
        }

        const session = facSessions.find(s => s.day === day && s.slotIndex === col.slotIndex);
        if (!session) {
          html += `<td class="free"></td>`;
          continue;
        }

        const subj = subjects.find(s => s.code === session.subjectCode);
        const section = sections.find(s => s.id === session.sectionId);

        let type: string;
        let cellClass: string;
        let colspan = 1;

        if (session.isCareerPath) {
          type = session.careerPathSlotType === 'lab' ? 'CP-LAB' : 'CP-THEORY';
          cellClass = 'cp';
        } else if (subj?.subjectType === SubjectType.LAB) {
          type = 'LAB';
          cellClass = 'lab';
        } else if (subj?.subjectType === SubjectType.INTEGRATED) {
          const sameSubjSameDay = facSessions.filter(
            s => s.day === day && s.subjectCode === session.subjectCode && s.sectionId === session.sectionId
          );
          const slots = sameSubjSameDay.map(s => s.slotIndex).sort((a, b) => a - b);
          const isLabPortion = slots.length >= 2 && (
            (session.slotIndex === slots[0] && Math.abs(slots[1] - slots[0]) === 1) ||
            (session.slotIndex === slots[1] && Math.abs(slots[1] - slots[0]) === 1)
          );
          type = isLabPortion ? 'INT-LAB' : 'INT-THEORY';
          cellClass = isLabPortion ? 'lab' : 'theory';
        } else {
          type = 'THEORY';
          cellClass = 'theory';
        }

        // Check if we should colspan=2
        const isLab = cellClass === 'lab';
        const isCpLab = session.isCareerPath && session.careerPathSlotType === 'lab';

        if ((isLab || isCpLab) && colIdx < displayCols.length - 1) {
          const nextCol = displayCols[colIdx + 1];
          if (nextCol.type === 'slot') {
            const nextSession = facSessions.find(s => s.day === day && s.slotIndex === nextCol.slotIndex);
            if (nextSession && nextSession.subjectCode === session.subjectCode && nextSession.sectionId === session.sectionId) {
              colspan = 2;
              skipNext = true;
            }
          }
        }

        let facultyDisplay = '';
        if (session.isCareerPath && session.facultyIds) {
          facultyDisplay = session.facultyIds
            .map(fid => faculty.find(f => f.id === fid)?.shortName || fid)
            .join(' / ');
        }

        html += `<td colspan="${colspan}" class="${cellClass}">
          <span class="type">
            ${subj ? (subj.credits === 2 ? 'EMPLOYABILITY SKILLS' : (subj.credits === 4 ? 'INTEGRATED' : (subj.credits && subj.credits > 4 ? '(THEORY+LAB)' : type))) : type}
          </span>
          <span class="sub">${subj?.name || session.subjectCode}</span>
          <div style="display:flex;flex-direction:column;gap:1px;margin-top:2px">
            <span class="sec">
              ${session.isCareerPath 
                ? (session.yearNumber === 3 ? "3rd Year" : "4th Year")
                : `Section: ${section?.name || session.sectionId}`}
            </span>
            ${facultyDisplay ? `<span class="sec" style="font-size:8px;color:var(--primary);opacity:0.8">Inst: ${facultyDisplay}</span>` : ''}
          </div>
          ${session.labRoomId ? `<span class="lab-id" style="display:block;font-size:8px;font-weight:900;margin-top:2px;color:var(--primary);opacity:0.8">LAB: ${session.labRoomId}</span>` : ''}
        </td>`;
      }
      html += `</tr>`;
    }
    html += `</table>`;

    // Workload table
    let theoryHours = 0;
    let labHours = 0;
    facSessions.forEach(s => {
      // Prioritize Career Path workload
      if (s.isCareerPath) {
        if (s.careerPathSlotType === 'lab') {
          labHours++;
        } else {
          theoryHours++;
        }
        return;
      }

      const subj = subjects.find(sub => sub.code === s.subjectCode);
      if (!subj) return;
      
      if (subj.subjectType === SubjectType.INTEGRATED || subj.subjectType === SubjectType.THEORY_LAB) {
        const daySessions = facSessions.filter(ds => ds.day === s.day && ds.subjectCode === s.subjectCode);
        const isPair = daySessions.length >= 2 &&
          daySessions.some(ds1 =>
            daySessions.some(ds2 => ds1 !== ds2 && Math.abs(ds1.slotIndex - ds2.slotIndex) === 1)
          );
        if (isPair) labHours++; else theoryHours++;
      } else if (subj.subjectType === SubjectType.LAB) {
        labHours++;
      } else {
        theoryHours++;
      }
    });

    html += `<div class="workload-title">Work Load Summary</div>`;
    html += `<table class="workload-table">
      <tr><th>Instructional Hours (Theory)</th><th>Contact Hours (Lab)</th><th>Total Weekly Load</th></tr>
      <tr><td>${theoryHours}</td><td>${labHours}</td><td class="total">${theoryHours + labHours} Hours</td></tr>
    </table>`;

    // Reference Table for Faculty
    const facSubjects = subjects
      .filter(s => facSessions.some(sess => sess.subjectCode === s.code))
      .sort((a, b) => a.code.localeCompare(b.code));  // Sort alphabetically by code
    if (facSubjects.length > 0) {
      html += `<div style="margin-top:20px;border:1px solid var(--border);border-radius:8px;overflow:hidden">
        <div style="background:#0f172a;color:#fff;padding:10px 14px;font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em">Course Credits & Sections</div>
        <table style="margin-bottom:0;border:none;box-shadow:none;border-radius:0;font-size:13px">
          <thead>
            <tr>
              <th style="font-size:13px;width:35px;padding:10px 5px">S.No</th>
              <th style="font-size:13px;width:70px;padding:10px 5px">Code</th>
              <th style="font-size:13px;text-align:left;padding:10px 8px">Course Title</th>
              <th style="font-size:13px;width:50px;padding:10px 5px">Credits</th>
              <th style="font-size:13px;text-align:left;padding:10px 8px">Assigned Section(s)</th>
            </tr>
          </thead>
          <tbody>`;
      
      let sNo = 1;
      facSubjects.forEach(subj => {
        const assignedSections = [...new Set(
          allSessions
            .filter(s => s.subjectCode === subj.code && (s.facultyId === fac.id || s.secondFacultyId === fac.id))
            .map(s => {
              const sec = sections.find(sec => sec.id === s.sectionId);
              const isAssisting = s.secondFacultyId === fac.id;
              return `Y${s.yearNumber}-${sec?.name || s.sectionId}${isAssisting ? " (Asst.)" : ""}`;
            })
        )].join(', ');

        if (subj.subjectType === SubjectType.INTEGRATED || (subj.credits && subj.credits > 4)) {
          html += `<tr>
            <td style="font-size:9px">${sNo++}</td>
            <td style="font-size:9px">${subj.code}</td>
            <td style="font-size:9px;text-align:left">${subj.name}</td>
            <td style="font-size:9px">${subj.theoryCredits?.toFixed(1) || '0.0'}</td>
            <td style="font-size:9px;text-align:left">${assignedSections}</td>
          </tr>
          <tr>
            <td style="font-size:9px">${sNo++}</td>
            <td style="font-size:9px">${subj.code}</td>
            <td style="font-size:9px;text-align:left">${subj.name} Lab</td>
            <td style="font-size:9px">${subj.labCredits?.toFixed(1) || '0.0'}</td>
            <td style="font-size:9px;text-align:left">${assignedSections}</td>
          </tr>`;
        } else {
          const label = subj.subjectType === SubjectType.THEORY_LAB ? "(THEORY+LAB)" : "";
          html += `<tr>
            <td style="font-size:9px">${sNo++}</td>
            <td style="font-size:9px">${subj.code}</td>
            <td style="font-size:9px;text-align:left">${subj.name} ${label}</td>
            <td style="font-size:9px">${subj.credits?.toFixed(1) || '0.0'}</td>
            <td style="font-size:9px;text-align:left">${assignedSections}</td>
          </tr>`;
        }
      });

      // Add Career Path to Faculty Reference Table
      const cpSessions = facSessions.filter(s => s.isCareerPath);
      if (cpSessions.length > 0) {
        const cpYears = [...new Set(cpSessions.map(s => s.yearNumber === 3 ? "3rd Year" : "4th Year"))].join(', ');
        const cpCredits = cpSessions[0]?.credits?.toFixed(1) || '2.0';
        html += `<tr style="background:#f1f5f9;border-top:1px solid #cbd5e1">
          <td style="font-size:9px">${sNo++}</td>
          <td style="font-size:9px;color:#6366f1;font-weight:900">CP</td>
          <td style="font-size:9px;text-align:left;font-weight:600">Career Path</td>
          <td style="font-size:9px;font-weight:900">${cpCredits}</td>
          <td style="font-size:9px;text-align:left">${cpYears}</td>
        </tr>`;
      }
      html += `</tbody></table></div>`;
    }
  }

  html += `</body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.print();
  }
}

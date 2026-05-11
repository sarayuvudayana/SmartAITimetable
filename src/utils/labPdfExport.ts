import { ClassSession, Faculty, Subject, SubjectType, Section, LabRoom } from '@/types/timetable';
import { DAYS, SLOT_DEFINITIONS } from '@/core/timeSlotManager';

interface LabPdfDeps {
  sessions: ClassSession[];
  faculty: Faculty[];
  subjects: Subject[];
  sections: Section[];
  labRooms: LabRoom[];
}

export function exportLabTimetablePdf({ sessions, faculty, subjects, sections, labRooms }: LabPdfDeps) {
  // Build display columns
  const displayCols: { label: string; slotIndex: number | null; type: 'slot' | 'break' | 'lunch' }[] = [];
  for (let i = 0; i < 6; i++) {
    const s = SLOT_DEFINITIONS[i];
    if (i === 2) displayCols.push({ label: '11:00-11:10', slotIndex: null, type: 'break' });
    if (i === 4) displayCols.push({ label: '13:10-14:00', slotIndex: null, type: 'lunch' });
    displayCols.push({ label: `${s.startTime}-${s.endTime}`, slotIndex: s.slotIndex, type: 'slot' });
  }

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Lab Room Timetables</title>
  <style>
    :root { --bg: #0f172a; --card: #1e293b; --border: #334155; --text: #f8fafc; --muted: #94a3b8; --primary: #0ea5e9; --accent: #8b5cf6; }
    @page { size: landscape; margin: 10mm; }
    body { font-family: 'Inter', system-ui, sans-serif; padding: 20px; background: var(--bg); color: var(--text); line-height: 1.4; }
    h1 { font-size: 28px; font-weight: 900; text-align: center; margin-bottom: 20px; text-transform: uppercase; letter-spacing: -0.025em; background: linear-gradient(to right, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    h2 { font-size: 18px; font-weight: 800; margin: 30px 0 10px; color: var(--text); display: flex; align-items: center; gap: 8px; page-break-before: always; }
    h2::before { content: ''; display: block; width: 4px; height: 20px; background: var(--primary); border-radius: 2px; }
    h2:first-of-type { page-break-before: avoid; }
    table { border-collapse: separate; border-spacing: 0; width: 100%; margin-bottom: 20px; border: 2px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--card); }
    th, td { border: 1px solid var(--border); padding: 8px 6px; text-align: center; font-size: 12px; }
    th { background: #1e293b; color: var(--text); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-size: 10px; }
    th.break-col { background: #6366f1; color: #fff; width: 30px; font-size: 9px; padding: 4px 2px; }
    th.lunch-col { background: var(--accent); color: #fff; width: 30px; font-size: 9px; padding: 4px 2px; }
    td.break-cell { background: rgba(99,102,241,0.05); font-size: 10px; color: #6366f1; font-weight: 900; }
    td.lunch-cell { background: rgba(139,92,246,0.05); font-size: 10px; color: var(--accent); font-weight: 900; }
    .lab { background: rgba(59,130,246,0.1); }
    .theory { background: rgba(16,185,129,0.05); }
    .cp { background: rgba(236,72,153,0.1); }
    .sub { font-weight: 900; font-size: 13px; color: #fff; display: block; margin-bottom: 1px; }
    .sec { font-size: 10px; color: var(--muted); font-weight: 700; text-transform: uppercase; }
    .type { font-size: 9px; color: var(--primary); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; display: block; }
    .free { color: var(--border); font-weight: 900; }
    @media print {
      body { padding: 0; background: white; color: black; }
      :root { --bg: white; --card: white; --border: #000; --text: black; --muted: #444; --primary: #000; --accent: #000; }
      h1 { -webkit-text-fill-color: black; background: none; color: black; border-bottom: 2px solid black; padding-bottom: 5px; }
      table { border: 2px solid black; box-shadow: none; }
      th, td { border: 1px solid black; color: black; }
      .sub { color: black; }
      .type { color: black; }
    }
  </style></head><body>
  <h1>LAB ROOM TIMETABLES</h1>`;

  let labsUsed = 0;

  for (const lab of labRooms) {
    const labSessions = sessions.filter(s => s.labRoomId === lab.id);
    if (labSessions.length === 0) continue;

    labsUsed++;
    html += `<h2>${lab.name} <span style="font-size:12px;color:var(--muted);font-weight:600">(${lab.id} - Cap: ${lab.capacity})</span></h2>`;
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
          if (isFirstRow) html += `<td class="break-cell" rowspan="${DAYS.length}" style="writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg)">BREAK</td>`;
          continue;
        }
        if (col.type === 'lunch') {
          if (isFirstRow) html += `<td class="lunch-cell" rowspan="${DAYS.length}" style="writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg)">LUNCH</td>`;
          continue;
        }

        const session = labSessions.find(s => s.day === day && s.slotIndex === col.slotIndex);
        if (!session) {
          html += `<td class="free"></td>`;
          continue;
        }

        const subj = subjects.find(s => s.code === session.subjectCode);
        const section = sections.find(s => s.id === session.sectionId);
        const fac1 = faculty.find(f => f.id === session.facultyId);
        const fac2 = session.secondFacultyId ? faculty.find(f => f.id === session.secondFacultyId) : null;

        let type: string;
        let cellClass: string;
        let colspan = 1;

        if (session.isCareerPath) {
          type = session.careerPathSlotType === 'lab' ? 'CP-LAB' : 'CP-THEORY';
          cellClass = 'cp';
        } else if (subj?.subjectType === SubjectType.LAB || subj?.subjectType === SubjectType.THEORY_LAB) {
          type = session.labRoomId ? 'LAB' : 'THEORY';
          cellClass = 'lab';
        } else if (subj?.subjectType === SubjectType.INTEGRATED) {
          type = 'INT-LAB';
          cellClass = 'lab';
        } else {
          type = 'THEORY';
          cellClass = 'theory';
        }

        const nextCol = displayCols[colIdx + 1];
        if (nextCol && nextCol.type === 'slot') {
          const nextSession = labSessions.find(s => s.day === day && s.slotIndex === nextCol.slotIndex);
          if (nextSession && nextSession.subjectCode === session.subjectCode && nextSession.sectionId === session.sectionId) {
            colspan = 2;
            skipNext = true;
          }
        }

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

        const typeLabel = subj ? (
          subj.credits === 2 ? 'EMPLOYABILITY SKILLS' : 
          (subj.credits === 4 ? 'INTEGRATED' : 
          (subj.credits && subj.credits > 4 ? '(THEORY+LAB)' : type))
        ) : type;

        html += `<td colspan="${colspan}" class="${cellClass}">
          <span class="type">${typeLabel}</span>
          <span class="sub">${subj?.name || session.subjectCode}</span>
          <span class="sec" style="color:var(--primary)">Sec: ${section?.name || session.sectionId}</span>
          <span class="fac" style="display:block;font-size:9px;font-weight:900;margin-top:2px;color:var(--muted)">${facultyDisplay}</span>
        </td>`;
      }
      html += `</tr>`;
    }
    html += `</table>`;
  }

  if (labsUsed === 0) {
    html += `<p style="text-align:center;color:var(--muted);font-weight:600;margin-top:40px;">No lab rooms were scheduled in this timetable.</p>`;
  }

  html += `</body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.print();
  }
}

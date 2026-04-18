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
  for (let i = 0; i < 7; i++) {
    const s = SLOT_DEFINITIONS[i];
    if (i === 2) displayCols.push({ label: '11:00-11:10', slotIndex: null, type: 'break' });
    if (i === 4) displayCols.push({ label: '13:10-14:00', slotIndex: null, type: 'lunch' });
    displayCols.push({ label: `${s.startTime}-${s.endTime}`, slotIndex: s.slotIndex, type: 'slot' });
  }

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Lab Room Timetables</title>
  <style>
    :root { --bg: #0f172a; --card: #1e293b; --border: #334155; --text: #f8fafc; --muted: #94a3b8; --primary: #6366f1; --accent: #8b5cf6; }
    @page { size: landscape; margin: 10mm; }
    body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; background: var(--bg); color: var(--text); line-height: 1.5; }
    h1 { font-size: 32px; font-weight: 900; text-align: center; margin-bottom: 10px; text-transform: uppercase; letter-spacing: -0.025em; background: linear-gradient(to right, #818cf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .inst { text-align: center; font-size: 14px; color: var(--muted); font-weight: 700; margin-bottom: 40px; letter-spacing: 0.1em; text-transform: uppercase; }
    h2 { font-size: 20px; font-weight: 800; margin: 40px 0 15px; color: var(--text); display: flex; align-items: center; gap: 10px; page-break-before: always; }
    h2::before { content: ''; display: block; width: 4px; height: 24px; background: var(--primary); border-radius: 2px; }
    h2:first-of-type { page-break-before: avoid; }
    table { border-collapse: separate; border-spacing: 0; width: 100%; margin-bottom: 50px; border: 2px solid var(--border); border-radius: 12px; overflow: hidden; background: var(--card); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    th, td { border: 1px solid var(--border); padding: 12px 10px; text-align: center; font-size: 14px; font-weight: 500; }
    th { background: #1e293b; color: var(--text); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-size: 12px; }
    th.break-col { background: var(--primary); color: #ffffff; width: 35px; font-size: 11px; font-weight: 900; }
    th.lunch-col { background: var(--accent); color: #ffffff; width: 35px; font-size: 11px; font-weight: 900; }
    td.break-cell { background: rgba(99, 102, 241, 0.1); font-size: 12px; color: var(--primary); font-weight: 900; }
    td.lunch-cell { background: rgba(139, 92, 246, 0.1); font-size: 12px; color: var(--accent); font-weight: 900; }
    .lab { background: rgba(59, 130, 246, 0.1); }
    .theory { background: rgba(16, 185, 129, 0.05); }
    .cp { background: rgba(236, 72, 153, 0.1); }
    .sub { font-weight: 900; font-size: 15px; color: #fff; display: block; margin-bottom: 2px; }
    .sec { font-size: 11px; color: var(--primary); font-weight: 800; text-transform: uppercase; margin-top: 2px; display: block; }
    .fac { font-size: 12px; color: var(--muted); font-weight: 700; text-transform: uppercase; }
    .type { font-size: 9px; color: var(--primary); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; display: block; }
    .free { color: var(--border); font-weight: 900; }
    @media print {
      body { padding: 0; background: white; color: black; }
      :root { --bg: white; --card: white; --border: #000; --text: black; --muted: #444; --primary: #000; --accent: #000; }
      h1 { -webkit-text-fill-color: black; background: none; color: black; border-bottom: 2px solid black; padding-bottom: 10px; }
      .inst { color: black; margin-bottom: 20px; }
      table { border: 2px solid black; box-shadow: none; border-radius: 0; }
      th, td { border: 1px solid black; color: black; padding: 8px 6px; }
      th { background: #f1f5f9 !important; color: #000 !important; }
      th.break-col, th.lunch-col { background: #e2e8f0 !important; color: #000 !important; }
      h2::before { background: black; }
      h2 { page-break-before: always; }
      .sub { color: black; }
      .type { color: black !important; }
      .sec { color: black !important; }
      .fac { color: black !important; }
    }
  </style></head><body>
  <h1>LAB ROOM TIMETABLES</h1>
  <div class="inst">GMR Institute of Technology - Rajam</div>`;

  let labsUsed = 0;

  for (const lab of labRooms) {
    // Find all sessions taking place in this lab room
    const labSessions = sessions.filter(s => s.labRoomId === lab.id);
    
    // We only print labs that are actually used
    if (labSessions.length === 0) continue;

    labsUsed++;
    html += `<h2>${lab.name} <span style="font-size:12px;color:var(--muted);font-weight:600">(${lab.id} - Cap: ${lab.capacity})</span></h2>`;

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
        } else if (subj?.subjectType === SubjectType.LAB) {
          type = 'LAB';
          cellClass = 'lab';
        } else if (subj?.subjectType === SubjectType.INTEGRATED) {
          type = 'INT-LAB'; // By definition, if it's assigned a lab room, it's the lab portion
          cellClass = 'lab';
        } else {
          // Fallback, shouldn't really happen for a valid lab
          type = 'THEORY';
          cellClass = 'theory';
        }

        // Check if we should colspan=2
        const isLab = cellClass === 'lab';
        const isCpLab = session.isCareerPath && session.careerPathSlotType === 'lab';

        if ((isLab || isCpLab) && colIdx < displayCols.length - 1) {
          const nextCol = displayCols[colIdx + 1];
          if (nextCol.type === 'slot') {
            const nextSession = labSessions.find(s => s.day === day && s.slotIndex === nextCol.slotIndex);
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
        } else {
          facultyDisplay = fac2 
            ? `${fac1?.shortName || session.facultyId} & ${fac2?.shortName || session.secondFacultyId}` 
            : `${fac1?.shortName || session.facultyId}`;
        }

        // Only show if it is a 2-hour continuous block (colspan=2)
        if (colspan < 2 && !session.isCareerPath) {
          html += `<td class="empty"></td>`;
        } else {
          html += `<td colspan="${colspan}" class="${cellClass}">
          <span class="sub">${subj?.code || (session.isCareerPath ? 'CP' : session.subjectCode)}</span>
          <span class="fac">${facultyDisplay}</span>
          <div style="display:flex; flex-direction:column; gap:2px; margin-top:4px">
            <span class="sec" style="font-size:10px; color:var(--primary); font-weight:900">SEC: ${section?.name || session.sectionId}</span>
            <span class="type">
              ${subj ? (subj.credits === 2 ? 'EMPLOYABILITY SKILLS' : (subj.credits === 4 ? 'INTEGRATED' : (subj.credits && subj.credits > 4 ? '(THEORY+LAB)' : type))) : type}
            </span>
          </div>
        </td>`;
      }
      html += `</tr>`;
    }
    html += `</table>`;
  }

  if (labsUsed > 0) {
    html += `
    <div style="margin-top:20px; margin-bottom:50px; border: 1px solid var(--border); border-radius: 10px; overflow: hidden">
      <div style="background:#0f172a; color:#fff; padding:12px 16px; font-size:15px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em">
        Lab Room Usage Summary
      </div>
      <table style="margin-bottom:0; border:none; box-shadow:none; border-radius:0">
        <thead>
          <tr>
            <th style="font-size:13px; width:60px; padding:12px 8px">S.No</th>
            <th style="font-size:13px; text-align:left; padding:12px 10px">Lab Room Details</th>
            <th style="font-size:13px; width:80px; padding:12px 8px">Capacity</th>
            <th style="font-size:13px; width:100px; padding:12px 8px">Total Hours</th>
            <th style="font-size:13px; text-align:left; padding:12px 10px">Hosted Subjects</th>
          </tr>
        </thead>
        <tbody style="font-size:13px">`;

    let sNo = 1;
    for (const lab of labRooms) {
      const labSessions = sessions.filter(s => s.labRoomId === lab.id);
      if (labSessions.length === 0) continue;

      const hostedSubjects = [...new Set(labSessions.map(s => {
        const subj = subjects.find(sub => sub.code === s.subjectCode);
        return subj?.name || s.subjectCode;
      }))].join(', ');

      html += `
        <tr>
          <td style="padding:10px 5px">${sNo++}</td>
          <td style="text-align:left; padding:10px 10px; font-weight:700;">
            ${lab.name} <span style="font-size:10px; color:var(--muted); font-weight:500;">(${lab.id})</span>
          </td>
          <td style="padding:10px 5px">${lab.capacity}</td>
          <td style="padding:10px 5px; font-weight:900; color:var(--primary)">${labSessions.length} Hrs</td>
          <td style="text-align:left; padding:10px 10px; font-size:11px; color:var(--muted); line-height:1.4;">${hostedSubjects}</td>
        </tr>`;
    }

    html += `</tbody></table></div>`;
  } else {
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

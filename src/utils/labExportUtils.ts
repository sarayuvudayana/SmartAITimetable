import { ClassSession, Faculty, Subject, Day, SubjectType, Section, LabRoom } from '@/types/timetable';
import { DAYS, SLOT_DEFINITIONS } from '@/core/timeSlotManager';

interface LabExportDeps {
  sessions: ClassSession[];
  faculty: Faculty[];
  subjects: Subject[];
  sections: Section[];
  labRooms: LabRoom[];
}

export function exportLabToCSV({ sessions, faculty, subjects, sections, labRooms }: LabExportDeps): string {
  const lines: string[] = [];

  const displayCols: { label: string; slotIndex: number | null; type: 'slot' | 'break' | 'lunch' }[] = [];
  for (let i = 0; i < 6; i++) {
    const s = SLOT_DEFINITIONS[i];
    if (i === 2) displayCols.push({ label: 'BREAK (11:00-11:10)', slotIndex: null, type: 'break' });
    if (i === 4) displayCols.push({ label: 'LUNCH (13:10-14:00)', slotIndex: null, type: 'lunch' });
    displayCols.push({ label: `${s.startTime}-${s.endTime}`, slotIndex: s.slotIndex, type: 'slot' });
  }

  let exportedAny = false;

  for (const lab of labRooms) {
    const labSessions = sessions.filter(s => s.labRoomId === lab.id);
    if (labSessions.length === 0) continue;
    
    exportedAny = true;
    lines.push('');
    lines.push(`Lab Room: ${lab.name} (${lab.id})`);
    lines.push(['Day', ...displayCols.map(c => `"${c.label}"`)].join(','));

    for (const day of DAYS) {
      let skipNext = false;
      const cells = displayCols.map((col, colIdx) => {
        if (skipNext) {
          skipNext = false;
          return '""';
        }
        if (col.type === 'break') return '"-"';
        if (col.type === 'lunch') return '"-"';
        
        const session = labSessions.find(s => s.day === day && s.slotIndex === col.slotIndex);
        if (!session) return '""';
        
        const subj = subjects.find(s => s.code === session.subjectCode);
        const section = sections.find(s => s.id === session.sectionId);
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
          type = 'INT-LAB'; // If it's in a lab room, it's the lab portion
        } else {
          type = 'THEORY'; // Fallback
        }

        const isLab = subj && (subj.subjectType === SubjectType.LAB || subj.subjectType === SubjectType.INTEGRATED);
        const isCpLab = session.isCareerPath && session.careerPathSlotType === 'lab';

        if ((isLab || isCpLab) && colIdx < displayCols.length - 1) {
          const nextCol = displayCols[colIdx + 1];
          if (nextCol.type === 'slot') {
            const nextSession = labSessions.find(s => s.day === day && s.slotIndex === nextCol.slotIndex);
            if (nextSession && nextSession.subjectCode === session.subjectCode && nextSession.sectionId === session.sectionId) {
              skipNext = true;
            }
          }
        }

        let text = `[${type}] ${session.subjectCode} | Sec: ${section?.name || session.sectionId} | Fac: ${facultyDisplay}`;
        return `"${text}"`;
      });
      lines.push([day, ...cells].join(','));
    }
  }

  if (!exportedAny) {
    lines.push('No lab sessions scheduled.');
  }

  return lines.join('\n');
}

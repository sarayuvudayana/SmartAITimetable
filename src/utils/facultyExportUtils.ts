import { ClassSession, Faculty, Subject, Day, SubjectType } from '@/types/timetable';
import { DAYS, SLOT_DEFINITIONS } from '@/core/timeSlotManager';

interface FacultyExportDeps {
  sessions: ClassSession[];
  faculty: Faculty[];
  subjects: Subject[];
  sections: { id: string; yearNumber: number; name: string }[];
}

export function exportFacultyToCSV({ sessions, faculty, subjects, sections }: FacultyExportDeps): string {
  const lines: string[] = [];

  const displayCols: { label: string; slotIndex: number | null; type: 'slot' | 'break' | 'lunch' }[] = [];
  for (let i = 0; i < 6; i++) {
    const s = SLOT_DEFINITIONS[i];
    if (i === 2) displayCols.push({ label: 'BREAK (11:00-11:10)', slotIndex: null, type: 'break' });
    if (i === 4) displayCols.push({ label: 'LUNCH (13:10-14:00)', slotIndex: null, type: 'lunch' });
    displayCols.push({ label: `${s.startTime}-${s.endTime}`, slotIndex: s.slotIndex, type: 'slot' });
  }

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

    lines.push('');
    lines.push(`Faculty: ${fac.shortName} (${fac.id})`);
    lines.push(['Day', ...displayCols.map(c => c.label)].join(','));

    for (const day of DAYS) {
      let skipNext = false;
      const cells = displayCols.map((col, colIdx) => {
        if (skipNext) {
          skipNext = false;
          return '""';
        }
        if (col.type === 'break') return '"-"';
        if (col.type === 'lunch') return '"-"';
        
        const session = facSessions.find(s => s.day === day && s.slotIndex === col.slotIndex);
        if (!session) return '""';
        
        const subj = subjects.find(s => s.code === session.subjectCode);
        const section = sections.find(s => s.id === session.sectionId);
        
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

        const isLab = subj && (subj.subjectType === SubjectType.LAB || subj.subjectType === SubjectType.INTEGRATED);
        const isCpLab = session.isCareerPath && session.careerPathSlotType === 'lab';

        if ((isLab || isCpLab) && colIdx < displayCols.length - 1) {
          const nextCol = displayCols[colIdx + 1];
          if (nextCol.type === 'slot') {
            const nextSession = facSessions.find(s => s.day === day && s.slotIndex === nextCol.slotIndex);
            if (nextSession && nextSession.subjectCode === session.subjectCode && nextSession.sectionId === session.sectionId) {
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

        let sectionDisplay = session.isCareerPath 
          ? (session.yearNumber === 3 ? "3rd Year" : "4th Year")
          : `Sec: ${section?.name || session.sectionId}`;

        let text = `[${type}] ${session.subjectCode} | ${sectionDisplay}`;
        if (session.isCareerPath && facultyDisplay) {
          text += ` | ${facultyDisplay}`;
        }
        if (session.labRoomId) {
          text += ` | ${session.labRoomId}`;
        }
        
        return `"${text}"`;
      });
      lines.push([day, ...cells].join(','));
    }

    // Workload summary
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
      
      if (subj.subjectType === SubjectType.INTEGRATED) {
        const daySessions = facSessions.filter(ds => ds.day === s.day && ds.subjectCode === s.subjectCode);
        const isPair = daySessions.length === 2 &&
          daySessions.some(ds1 =>
            daySessions.some(ds2 => Math.abs(ds1.slotIndex - ds2.slotIndex) === 1)
          );
        if (isPair) labHours++; else theoryHours++;
      } else if (subj.subjectType === SubjectType.LAB) {
        labHours++;
      } else {
        theoryHours++;
      }
    });

    lines.push('');
    lines.push('WORK LOAD (IN TERMS OF INSTRUCTIONAL & CONTACT HOURS)');
    lines.push('Theory,Lab,TTL Hours');
    lines.push(`${theoryHours},${labHours},${theoryHours + labHours}`);
  }

  return lines.join('\n');
}

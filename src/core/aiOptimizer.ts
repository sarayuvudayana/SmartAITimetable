import { ClassSession, TimetableData, Day } from '@/types/timetable';
import { ConstraintEngine } from './constraintEngine';

export interface AiSwap {
  type: 'swap' | 'move';
  reason: string;
  sectionId: string;
  day: Day;
  fromSlot: number;
  toSlot: number;
}

export function summarizeTimetable(data: TimetableData): string {
  if (!data.generatedTimetable) return "No timetable generated.";

  let summary = "### Faculty Availability and Loads\n";
  const facultyDays = new Map<string, Map<Day, number[]>>();

  data.generatedTimetable.forEach(s => {
    if (!facultyDays.has(s.facultyId)) facultyDays.set(s.facultyId, new Map());
    const days = facultyDays.get(s.facultyId)!;
    if (!days.has(s.day)) days.set(s.day, []);
    days.get(s.day)!.push(s.slotIndex);
  });

  data.faculty.forEach(f => {
    summary += `- Faculty ${f.id} (${f.shortName}): `;
    const days = facultyDays.get(f.id);
    if (!days) {
      summary += "No classes assigned.\n";
    } else {
      const daySummaries: string[] = [];
      for (const [day, slots] of days) {
        daySummaries.push(`${day}(${slots.sort((a,b) => a-b).join(',')})`);
      }
      summary += daySummaries.join(', ') + "\n";
    }
  });

  summary += "\n### Subject Eligibility\n";
  data.subjects.forEach(s => {
    summary += `- ${s.code} (${s.name}): Can be taught by [${s.eligibleFacultyIds.join(', ')}]\n`;
  });

  summary += "\n### Section Daily Loads (Current Schedule)\n";
  const sectionDays = new Map<string, Map<Day, string[]>>();
  data.generatedTimetable.forEach(s => {
    if (!sectionDays.has(s.sectionId)) sectionDays.set(s.sectionId, new Map());
    const days = sectionDays.get(s.sectionId)!;
    if (!days.has(s.day)) days.set(s.day, []);
    days.get(s.day)!.push(`${s.slotIndex}:${s.subjectCode}(${s.facultyId})`);
  });

  for (const [secId, days] of sectionDays) {
    summary += `- Section ${secId}: `;
    const daySummaries: string[] = [];
    for (const [day, slots] of days) {
      daySummaries.push(`${day}[${slots.sort().join('|')}]`);
    }
    summary += daySummaries.join(', ') + "\n";
  }

  summary += "\n### Mandatory Faculty-Section Mappings (Unique)\n";
  data.facultySectionMappings.forEach(m => {
    summary += `- ${m.subjectCode} in ${m.sectionId} MUST be taught by ${m.facultyId}\n`;
  });

  summary += "\n### Rules Reminder for AI\n";
  summary += "1. Faculty assignments for subjects in sections are fixed (see Mappings above). DO NOT suggest changes to who teaches what.\n";
  summary += "2. You can ONLY swap the time slots of sessions within the same section.\n";
  summary += "3. Avoid gaps (e.g., if faculty has classes in slots 0 and 4, move slot 4 to 1 if available).\n";
  summary += "4. Ensure that the Unique Assignment rules (1:1 or 3:4) are respected in your reasoning.\n";

  return summary;
}

export function parseAiSwaps(response: string): AiSwap[] {
  try {
    const match = response.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonStr = match ? match[1] : response;
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse AI response:", e);
    return [];
  }
}

export function applyAiSwaps(
  currentTimetable: ClassSession[],
  swaps: AiSwap[],
  engine: ConstraintEngine
): ClassSession[] {
  let newTimetable = [...currentTimetable.map(s => ({ ...s }))];

  for (const swap of swaps) {
    if (swap.type === 'swap' || swap.type === 'move') {
      const idxFrom = newTimetable.findIndex(
        s => s.sectionId === swap.sectionId && s.day === swap.day && s.slotIndex === swap.fromSlot
      );
      const idxTo = newTimetable.findIndex(
        s => s.sectionId === swap.sectionId && s.day === swap.day && s.slotIndex === swap.toSlot
      );

      if (idxFrom === -1) continue; // Source session missing

      const originalSession = { ...newTimetable[idxFrom] };
      
      // Perform move/swap
      if (idxTo !== -1) {
        // Swap two sessions
        const targetSession = { ...newTimetable[idxTo] };
        newTimetable[idxFrom].slotIndex = swap.toSlot;
        newTimetable[idxTo].slotIndex = swap.fromSlot;
        
        // Validate
        const violations = engine.evaluateAll(newTimetable).filter(v => v.type === 'hard');
        if (violations.length > 0) {
          // Rollback
          newTimetable[idxFrom].slotIndex = swap.fromSlot;
          newTimetable[idxTo].slotIndex = swap.toSlot;
          console.warn(`AI Swap rejected: ${swap.reason} (Violates hard constraints)`);
        }
      } else {
        // Move to empty slot
        newTimetable[idxFrom].slotIndex = swap.toSlot;
        
        // Validate
        const violations = engine.evaluateAll(newTimetable).filter(v => v.type === 'hard');
        if (violations.length > 0) {
          // Rollback
          newTimetable[idxFrom].slotIndex = swap.fromSlot;
          console.warn(`AI Move rejected: ${swap.reason} (Violates hard constraints)`);
        }
      }
    }
  }

  return newTimetable;
}

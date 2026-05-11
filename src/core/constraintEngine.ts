import { ClassSession, Subject, SubjectType, Day, FacultySectionMapping, LabRoom, LabRoomMapping } from '@/types/timetable';
import { TimeSlotManager } from './timeSlotManager';

export interface ConstraintViolation {
  type: 'hard' | 'soft';
  message: string;
  penalty: number;
}

export class ConstraintEngine {
  private timeSlotManager: TimeSlotManager;
  private subjects: Map<string, Subject>;
  private facultyMappings: FacultySectionMapping[];
  private labRooms: LabRoom[];
  private labRoomMappings: LabRoomMapping[];

  constructor(
    timeSlotManager: TimeSlotManager,
    subjects: Subject[],
    facultyMappings: FacultySectionMapping[] = [],
    labRooms: LabRoom[] = [],
    labRoomMappings: LabRoomMapping[] = [],
  ) {
    this.timeSlotManager = timeSlotManager;
    this.subjects = new Map(subjects.map((s) => [s.code, s]));
    this.facultyMappings = facultyMappings;
    this.labRooms = labRooms;
    this.labRoomMappings = labRoomMappings;
  }

  evaluateAll(sessions: ClassSession[]): ConstraintViolation[] {
    return [
      ...this.checkFacultyConflicts(sessions),
      ...this.checkFacultyBackToBack(sessions),
      ...this.checkFacultyBreakSandwich(sessions),
      ...this.checkFirstHourDiversity(sessions),
      ...this.checkDuplicateSubjectPerDay(sessions),
      ...this.checkInvalidSlots(sessions),
      ...this.checkLabContinuity(sessions),
      ...this.checkCareerPathSync(sessions),
      ...this.checkFacultyMappingViolations(sessions),
      ...this.checkIntegratedSubjectRules(sessions),
      ...this.checkYear3DailyWorkload(sessions),
      ...this.checkLeisureHourPlacement(sessions),
      ...this.checkLabRoomClashes(sessions),
      ...this.checkLabRoomMappingImmutability(sessions),
      ...this.checkOneLabPerDay(sessions),
      ...this.checkMissingHours(sessions),
      ...this.checkCareerPathLabCapacityOverlap(sessions),
      ...this.checkThirtyFiveCapacityLabPairing(sessions),
      ...this.checkFacultySectionConsistency(sessions),
      ...this.checkLinkedSubjectConsistency(sessions),
      ...this.checkSoftConstraints(sessions),
    ];
  }

  // ─── HARD: Year 3 Daily Workload Balancing ─────────────────────
  private checkYear3DailyWorkload(sessions: ClassSession[]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const year3Sections = [...new Set(sessions.filter(s => s.yearNumber === 3).map(s => s.sectionId))];

    for (const sectionId of year3Sections) {
      const sectionSessions = sessions.filter(s => s.sectionId === sectionId);
      const totalPlaced = sectionSessions.length;
      if (totalPlaced === 0) continue;

      const expectedPerDay = Math.floor(totalPlaced / 5);
      const remainder = totalPlaced % 5;
      const maxAllowed = expectedPerDay + (remainder > 0 ? 1 : 0);
      const minAllowed = expectedPerDay;

      const byDay = new Map<string, number>();
      for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
        byDay.set(day, 0);
      }

      for (const s of sectionSessions) {
        byDay.set(s.day, (byDay.get(s.day) || 0) + 1);
      }

      for (const [day, count] of byDay) {
        if (count > maxAllowed) {
          violations.push({
            type: 'hard',
            message: `Year 3 workload unbalanced: ${sectionId} has ${count} sessions on ${day} (max allowed ${maxAllowed})`,
            penalty: 150 * (count - maxAllowed),
          });
        }
        if (count < minAllowed) {
          violations.push({
            type: 'hard',
            message: `Year 3 workload unbalanced: ${sectionId} has ${count} sessions on ${day} (min allowed ${minAllowed})`,
            penalty: 150 * (minAllowed - count),
          });
        }
      }
    }
    return violations;
  }

  private checkMissingHours(sessions: ClassSession[]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const sectionIds = [...new Set(sessions.map(s => s.sectionId))];

    // Get all years currently in sessions to find relevant subjects
    const years = [...new Set(sessions.map(s => s.yearNumber))];
    const relevantSubjects = [...this.subjects.values()].filter(s => years.includes(s.yearNumber));

    for (const sectionId of sectionIds) {
      // Find year for this section from sessions
      const sample = sessions.find(s => s.sectionId === sectionId);
      if (!sample) continue;
      const yearNumber = sample.yearNumber;

      const yearSubjects = relevantSubjects.filter(s => s.yearNumber === yearNumber);

      for (const subject of yearSubjects) {
        const actualHours = sessions.filter(
          s => s.sectionId === sectionId && s.subjectCode === subject.code
        ).length;

        if (actualHours < subject.weeklyHours) {
          violations.push({
            type: 'hard',
            message: `Missing hours: ${subject.code} in ${sectionId} (${actualHours}/${subject.weeklyHours})`,
            penalty: 3000 * (subject.weeklyHours - actualHours),  // Increased from 1000 to prioritize filling all hours
          });
        }
      }
    }
    return violations;
  }

  calculateFitness(sessions: ClassSession[]): number {
    const violations = this.evaluateAll(sessions);
    return violations.reduce((sum, v) => sum + v.penalty, 0);
  }

  validateEdit(
    allSessions: ClassSession[],
    editedSession: ClassSession,
    originalSession: ClassSession
  ): string[] {
    const hypothetical = allSessions.map(s =>
      s === originalSession ? { ...editedSession } : { ...s }
    );
    const violations = this.evaluateAll(hypothetical).filter(v => v.type === 'hard');
    return violations.map(v => v.message);
  }

  // ─── HARD: Faculty conflicts ───────────────────────────────────
  private checkFacultyConflicts(sessions: ClassSession[]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const slotMap = new Map<string, ClassSession[]>();
    for (const session of sessions) {
      const facs = [...new Set([
        session.facultyId,
        ...(session.secondFacultyId ? [session.secondFacultyId] : []),
        ...(session.facultyIds || [])
      ])].filter(Boolean);

      for (const fac of facs) {
        const key = `${fac}-${session.day}-${session.slotIndex}`;
        if (!slotMap.has(key)) slotMap.set(key, []);
        slotMap.get(key)!.push(session);
      }
    }
    for (const [key, classes] of slotMap) {
      if (classes.length > 1) {
        // IF multiple sessions at the same (faculty, slot) are for the SAME Career Path subject, it's NOT a conflict.
        // It IS a conflict if:
        // 1. One is Career Path and another is NOT.
        // 2. Both are Career Path but for DIFFERENT subjects.
        // 3. Neither is Career Path (normal collision).

        const careerPathSessions = classes.filter(c => c.isCareerPath);
        const regularSessions = classes.filter(c => !c.isCareerPath);

        if (careerPathSessions.length > 0) {
          // If there are regular sessions at the same time as career path, it's a conflict
          if (regularSessions.length > 0) {
            violations.push({
              type: 'hard',
              message: `Faculty conflict: ${key.split('-')[0]} is in Career Path but also assigned to sections: ${regularSessions.map(s => s.sectionId).join(', ')}`,
              penalty: 2000
            });
          } else {
            // Check if all career path sessions are for the same subject
            const uniqueSubjs = new Set(careerPathSessions.map(c => c.subjectCode));
            if (uniqueSubjs.size > 1) {
              violations.push({
                type: 'hard',
                message: `Faculty conflict: ${key.split('-')[0]} is in multiple Career Path subjects: ${Array.from(uniqueSubjs).join(', ')}`,
                penalty: 2000
              });
            }
          }
        } else if (regularSessions.length > 1) {
          // Normal collisions between regular sessions
          violations.push({ type: 'hard', message: `Faculty conflict: ${key}`, penalty: 2000 });
        }
      }
    }
    return violations;
  }

  // ─── HARD: Faculty no back-to-back THEORY classes (labs allowed as 2-hr blocks) ───
  private checkFacultyBackToBack(sessions: ClassSession[]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    // Build a lookup: faculty+day+slot → session
    const facultyDaySessions = new Map<string, ClassSession[]>();
    for (const session of sessions) {
      const facs = [...new Set([
        session.facultyId,
        ...(session.secondFacultyId ? [session.secondFacultyId] : []),
        ...(session.facultyIds || [])
      ])].filter(Boolean);

      for (const fac of facs) {
        const key = `${fac}-${session.day}`;
        if (!facultyDaySessions.has(key)) facultyDaySessions.set(key, []);
        facultyDaySessions.get(key)!.push(session);
      }
    }

    for (const [key, daySessions] of facultyDaySessions) {
      const sorted = daySessions
        .map(s => ({ slot: s.slotIndex, session: s }))
        .sort((a, b) => a.slot - b.slot);

      // Deduplicate by slot (shouldn't have dupes but be safe)
      const unique: { slot: number; session: ClassSession }[] = [];
      const seen = new Set<number>();
      for (const entry of sorted) {
        if (!seen.has(entry.slot)) { seen.add(entry.slot); unique.push(entry); }
      }

      for (let i = 1; i < unique.length; i++) {
        const prev = unique[i - 1];
        const curr = unique[i];

        if (!this.timeSlotManager.areSlotsConsecutive(prev.slot, curr.slot)) continue;

        // Both are part of the same lab subject → allowed (2-hr lab block)
        const prevSubj = this.subjects.get(prev.session.subjectCode);
        const currSubj = this.subjects.get(curr.session.subjectCode);
        const prevIsLab = prevSubj && (prevSubj.subjectType === SubjectType.LAB || prevSubj.subjectType === SubjectType.INTEGRATED);
        const currIsLab = currSubj && (currSubj.subjectType === SubjectType.LAB || currSubj.subjectType === SubjectType.INTEGRATED);

        if (prevIsLab && currIsLab && prev.session.subjectCode === curr.session.subjectCode
            && prev.session.sectionId === curr.session.sectionId) {
          continue; // Valid 2-hr lab block
        }

        // Otherwise it's a violation
        violations.push({
          type: 'hard',
          message: `Faculty back-to-back: ${key} slots ${prev.slot}-${curr.slot}`,
          penalty: 1000,
        });
      }

      // After a lab block, next slot must be free
      // Find lab blocks and check the slot after the second lab hour
      const slotSet = new Set(unique.map(u => u.slot));
      for (let i = 0; i < unique.length - 1; i++) {
        const a = unique[i];
        const b = unique[i + 1];
        const aSubj = this.subjects.get(a.session.subjectCode);
        const bSubj = this.subjects.get(b.session.subjectCode);
        const aIsLab = aSubj && (aSubj.subjectType === SubjectType.LAB || aSubj.subjectType === SubjectType.INTEGRATED);
        const bIsLab = bSubj && (bSubj.subjectType === SubjectType.LAB || bSubj.subjectType === SubjectType.INTEGRATED);

        if (aIsLab && bIsLab && a.session.subjectCode === b.session.subjectCode
            && a.session.sectionId === b.session.sectionId
            && this.timeSlotManager.areSlotsConsecutive(a.slot, b.slot)) {
          // This is a lab block ending at b.slot. Check if there's a session in the next consecutive slot.
          const nextEntry = unique.find(u => this.timeSlotManager.areSlotsConsecutive(b.slot, u.slot) && u.slot > b.slot);
          if (nextEntry) {
            violations.push({
              type: 'hard',
              message: `No free slot after lab: ${key} lab ends at slot ${b.slot}, next at ${nextEntry.slot}`,
              penalty: 1000,
            });
          }
        }
      }
    }

    return violations;
  }

  // ─── HARD: If faculty has class before break, no class after break ───
  private checkFacultyBreakSandwich(sessions: ClassSession[]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    // Build lookup: faculty+day → list of sessions
    const facDaySessions = new Map<string, ClassSession[]>();
    for (const s of sessions) {
      const facs = [...new Set([
        s.facultyId,
        ...(s.secondFacultyId ? [s.secondFacultyId] : []),
        ...(s.facultyIds || [])
      ])].filter(Boolean);

      for (const fac of facs) {
        const key = `${fac}-${s.day}`;
        if (!facDaySessions.has(key)) facDaySessions.set(key, []);
        facDaySessions.get(key)!.push(s);
      }
    }

    // Break is between slot 1 and slot 2; Lunch is between slot 3 and slot 4
    const BREAK_PAIRS: [number, number][] = [[1, 2], [3, 4]];

    for (const [key, daySessions] of facDaySessions) {
      const slotMap = new Map<number, ClassSession>();
      for (const s of daySessions) slotMap.set(s.slotIndex, s);

      for (const [beforeSlot, afterSlot] of BREAK_PAIRS) {
        const beforeSession = slotMap.get(beforeSlot);
        const afterSession = slotMap.get(afterSlot);
        if (!beforeSession || !afterSession) continue;

        const breakName = beforeSlot === 1 ? 'break' : 'lunch';
        const facId = key.split('-')[0];

        // Any class sequence across the break for the same faculty is a violation.
        violations.push({
          type: 'hard',
          message: `Faculty class across ${breakName}: ${facId} has class in slot ${beforeSlot}, cannot have class in slot ${afterSlot}`,
          penalty: 1000,
        });
      }
    }

    return violations;
  }

  // ─── HARD: First-hour subject diversity ────────────────────────
  private checkFirstHourDiversity(sessions: ClassSession[]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    // Group slot-0 sessions by section
    const sectionFirstHour = new Map<string, Map<string, number>>();
    for (const session of sessions) {
      if (session.slotIndex !== 0) continue;
      if (!sectionFirstHour.has(session.sectionId)) sectionFirstHour.set(session.sectionId, new Map());
      const subjectCounts = sectionFirstHour.get(session.sectionId)!;
      subjectCounts.set(session.subjectCode, (subjectCounts.get(session.subjectCode) || 0) + 1);
    }
    for (const [sectionId, subjectCounts] of sectionFirstHour) {
      for (const [subjectCode, count] of subjectCounts) {
        if (count > 1) {
          violations.push({
            type: 'hard',
            message: `First-hour repeat: ${subjectCode} in ${sectionId} (${count} days)`,
            penalty: 1000,
          });
        }
      }
    }
    return violations;
  }

  // ─── HARD: No same theory subject twice per day per section ────
  private checkDuplicateSubjectPerDay(sessions: ClassSession[]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const dayMap = new Map<string, number>();
    for (const session of sessions) {
      const subject = this.subjects.get(session.subjectCode);
      if (subject && subject.subjectType !== SubjectType.THEORY) continue;
      const key = `${session.sectionId}-${session.day}-${session.subjectCode}`;
      dayMap.set(key, (dayMap.get(key) || 0) + 1);
    }
    for (const [key, count] of dayMap) {
      if (count > 1) {
        violations.push({ type: 'hard', message: `Duplicate theory subject: ${key}`, penalty: 1000 });
      }
    }
    return violations;
  }

  // ─── HARD: Valid time slots only ───────────────────────────────
  private checkInvalidSlots(sessions: ClassSession[]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    for (const session of sessions) {
      if (!this.timeSlotManager.isValidSlot(session.day, session.slotIndex)) {
        violations.push({ type: 'hard', message: `Invalid slot: ${session.day} slot ${session.slotIndex}`, penalty: 1000 });
      }
    }
    return violations;
  }

  private checkLabContinuity(sessions: ClassSession[]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    // Enforce exact 2-hour continuous blocks for LAB and INTEGRATED subjects
    const labSubjects = [...this.subjects.values()].filter(
      s => s.subjectType === SubjectType.LAB || s.subjectType === SubjectType.INTEGRATED || s.subjectType === SubjectType.THEORY_LAB
    );

    for (const subject of labSubjects) {
      const expectedLabHours = subject.subjectType === SubjectType.INTEGRATED ? subject.labHours : subject.weeklyHours;
      if (expectedLabHours <= 0 || expectedLabHours % 2 !== 0) continue;

      const yearSectionIds = [...new Set(sessions
        .filter(s => s.yearNumber === subject.yearNumber)
        .map(s => s.sectionId))];

      for (const sectionId of yearSectionIds) {
        // For integrated subjects, only count sessions that are part of a continuous pair (lab portion)
        const allSubjSessions = sessions
          .filter(s => !s.isCareerPath && s.sectionId === sectionId && s.subjectCode === subject.code)
          .sort((a, b) => a.day.localeCompare(b.day) || a.slotIndex - b.slotIndex);

        // Find continuous pairs
        const byDay = new Map<Day, number[]>();
        for (const session of allSubjSessions) {
          if (!byDay.has(session.day)) byDay.set(session.day, []);
          byDay.get(session.day)!.push(session.slotIndex);
        }

        let continuousPairCount = 0;
        for (const [day, daySlots] of byDay) {
          daySlots.sort((a, b) => a - b);
          for (let i = 0; i < daySlots.length - 1; i++) {
            if (this.timeSlotManager.areSlotsConsecutive(daySlots[i], daySlots[i + 1])) {
              continuousPairCount++;
              i++; // skip the second slot of the pair
            }
          }
        }

        const expectedPairs = expectedLabHours / 2;
        if (continuousPairCount < expectedPairs) {
          violations.push({
            type: 'hard',
            message: `Lab not continuous: ${subject.code} in ${sectionId} (${continuousPairCount}/${expectedPairs} pairs)`,
            penalty: 5000 * (expectedPairs - continuousPairCount),  // Increased penalty - CRITICAL constraint
          });
        }
      }
    }

    return violations;
  }

  // ─── HARD: Career path sync ────────────────────────────────────
  private checkCareerPathSync(sessions: ClassSession[]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const careerSessions = sessions.filter((s) => s.isCareerPath);
    const groups = new Map<string, ClassSession[]>();
    for (const session of careerSessions) {
      const key = `${session.yearNumber}-${session.subjectCode}-${session.day}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(session);
    }
    for (const [, classes] of groups) {
      if (classes.length > 1) {
        const slots = new Set(classes.map((c) => c.slotIndex));
        if (slots.size > 1) {
          violations.push({ type: 'hard', message: `Career path not synchronised`, penalty: 1000 });
        }
      }
    }
    return violations;
  }

  // ─── HARD: Faculty-section mapping immutability ────────────────
  private checkFacultyMappingViolations(sessions: ClassSession[]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    for (const session of sessions) {
      const mapping = this.facultyMappings.find(
        m => m.subjectCode === session.subjectCode && m.sectionId === session.sectionId
      );
      if (mapping && session.facultyId !== mapping.facultyId) {
        violations.push({
          type: 'hard',
          message: `Faculty mapping violated: ${session.subjectCode} in ${session.sectionId} should be ${mapping.facultyId}`,
          penalty: 1000,
        });
      }
    }
    return violations;
  }

  // ─── HARD: Integrated subject – no 3 continuous hours ──────────
  private checkIntegratedSubjectRules(sessions: ClassSession[]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    for (const subject of this.subjects.values()) {
      if (subject.subjectType !== SubjectType.INTEGRATED) continue;

      const sectionIds = [...new Set(sessions.filter(s => s.subjectCode === subject.code).map(s => s.sectionId))];

      for (const sectionId of sectionIds) {
        const subjSessions = sessions.filter(s => s.subjectCode === subject.code && s.sectionId === sectionId);

        const byDay = new Map<string, ClassSession[]>();
        for (const s of subjSessions) {
          if (!byDay.has(s.day)) byDay.set(s.day, []);
          byDay.get(s.day)!.push(s);
        }

        for (const [day, daySessions] of byDay) {
          if (daySessions.length >= 3) {
            violations.push({
              type: 'hard',
              message: `Integrated subject has 3+ hours on ${day} (not allowed): ${subject.code} in ${sectionId}`,
              penalty: 1000,
            });
          } else if (daySessions.length === 2) {
            const slots = daySessions.map(s => s.slotIndex).sort((a, b) => a - b);
            if (!this.timeSlotManager.areSlotsConsecutive(slots[0], slots[1])) {
              violations.push({
                type: 'hard',
                message: `Integrated subject has 2 non-consecutive hours on ${day} (duplicate theory): ${subject.code} in ${sectionId}`,
                penalty: 1000,
              });
            }
          }
        }
      }
    }

    return violations;
  }

  // ─── HARD: Linked Subject Faculty Consistency ─────────────────
  private checkLinkedSubjectConsistency(sessions: ClassSession[]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const sectionIds = [...new Set(sessions.map(s => s.sectionId))];

    for (const sectionId of sectionIds) {
      const sectionSessions = sessions.filter(s => s.sectionId === sectionId);
      for (const session of sectionSessions) {
        const subj = this.subjects.get(session.subjectCode);
        if (subj?.linkedSubjectCode) {
          const linkedSession = sectionSessions.find(s => s.subjectCode === subj.linkedSubjectCode);
          if (linkedSession && session.facultyId !== linkedSession.facultyId) {
            violations.push({
              type: 'hard',
              message: `Linked subject faculty mismatch: ${session.subjectCode} and ${subj.linkedSubjectCode} in ${sectionId} must have same faculty`,
              penalty: 2000,
            });
          }
        }
      }
    }
    return violations;
  }
  // Leisure allowed ONLY at slot 3 (12:10-1:10) or slot 5 (3:00-4:00)
  // First period (slot 0) must NEVER be leisure
  // Period after lunch (slot 4) must NEVER be leisure
  private checkLeisureHourPlacement(sessions: ClassSession[]): ConstraintViolation[] {
    const ALLOWED_LEISURE_SLOTS = new Set([3, 5]); // 12:10-1:10 and 3:00-4:00
    const violations: ConstraintViolation[] = [];
    const sectionIds = [...new Set(sessions.map(s => s.sectionId))];

    for (const sectionId of sectionIds) {
      const sectionSessions = sessions.filter(s => s.sectionId === sectionId);
      const byDay = new Map<Day, Set<number>>();

      for (const s of sectionSessions) {
        if (!byDay.has(s.day)) byDay.set(s.day, new Set());
        byDay.get(s.day)!.add(s.slotIndex);
      }

      for (const [day, occupiedSlots] of byDay) {
        const validSlots = this.timeSlotManager.getValidSlots(day).map(s => s.slotIndex);
        const leisureSlots = validSlots.filter(slot => !occupiedSlots.has(slot));

        if (leisureSlots.length === 0) continue;

        // Hard: first period cannot be leisure
        if (leisureSlots.includes(0)) {
          violations.push({
            type: 'hard',
            message: `First period is leisure: ${sectionId} ${day}`,
            penalty: 1000,
          });
        }

        // Hard: period after lunch (slot 4) cannot be leisure
        if (leisureSlots.includes(4)) {
          violations.push({
            type: 'hard',
            message: `Post-lunch period is leisure: ${sectionId} ${day}`,
            penalty: 1000,
          });
        }

        // Hard: leisure only allowed at slots 3 and 5
        for (const slot of leisureSlots) {
          if (!ALLOWED_LEISURE_SLOTS.has(slot)) {
            violations.push({
              type: 'hard',
              message: `Leisure at invalid slot ${slot}: ${sectionId} ${day}`,
              penalty: 1000,
            });
          }
        }

        // Hard: at most one leisure per day
        if (leisureSlots.length > 1) {
          violations.push({
            type: 'hard',
            message: `Multiple leisure slots: ${sectionId} ${day}`,
            penalty: 1000,
          });
        }
      }
    }

    return violations;
  }

  // ─── HARD: Lab room double-booking ─────────────────────────────
  private checkLabRoomClashes(sessions: ClassSession[]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const labSlotMap = new Map<string, ClassSession[]>();
    for (const session of sessions) {
      if (!session.labRoomId) continue;
      const key = `${session.labRoomId}-${session.day}-${session.slotIndex}`;
      if (!labSlotMap.has(key)) labSlotMap.set(key, []);
      labSlotMap.get(key)!.push(session);
    }
    for (const [key, classes] of labSlotMap) {
      // Multiple sessions in the same lab room at the same time is only OK if they are the same section+subject (continuous lab)
      const uniqueSections = new Set(classes.map(c => `${c.sectionId}-${c.subjectCode}`));
      if (uniqueSections.size > 1) {
        violations.push({
          type: 'hard',
          message: `Lab room double-booked: ${key}`,
          penalty: 1000,
        });
      }
    }
    return violations;
  }

  // ─── HARD: Lab room mapping immutability ───────────────────────
  private checkLabRoomMappingImmutability(sessions: ClassSession[]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    for (const session of sessions) {
      if (!session.labRoomId) continue;
      const mapping = this.labRoomMappings.find(
        m => m.subjectCode === session.subjectCode && m.sectionId === session.sectionId
      );
      if (mapping && session.labRoomId !== mapping.labRoomId) {
        violations.push({
          type: 'hard',
          message: `Lab room mapping violated: ${session.subjectCode} in ${session.sectionId} should use ${mapping.labRoomId}`,
          penalty: 1000,
        });
      }
    }
    return violations;
  }

  // ─── SOFT CONSTRAINTS ──────────────────────────────────────────
  private checkSoftConstraints(sessions: ClassSession[]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    for (const session of sessions) {

    }

    const facultyDayCount = new Map<string, number>();
    for (const session of sessions) {
      const facs = [...new Set([
        session.facultyId,
        ...(session.secondFacultyId ? [session.secondFacultyId] : []),
        ...(session.facultyIds || [])
      ])].filter(Boolean);

      for (const fac of facs) {
        const key = `${fac}-${session.day}`;
        facultyDayCount.set(key, (facultyDayCount.get(key) || 0) + 1);
      }
    }
    for (const [, count] of facultyDayCount) {
      if (count > 4) {
        violations.push({ type: 'soft', message: `Faculty overload`, penalty: 10 * (count - 4) });
      }
    }

    const sectionDaySlots = new Map<string, number[]>();
    for (const session of sessions) {
      const key = `${session.sectionId}-${session.day}`;
      if (!sectionDaySlots.has(key)) sectionDaySlots.set(key, []);
      sectionDaySlots.get(key)!.push(session.slotIndex);
    }
    for (const [, slots] of sectionDaySlots) {
      if (slots.length > 1) {
        const sorted = [...slots].sort((a, b) => a - b);
        for (let i = 1; i < sorted.length; i++) {
          const gap = sorted[i] - sorted[i - 1] - 1;
          if (gap > 0 && !(sorted[i - 1] === 3 && sorted[i] === 4)) {
            violations.push({ type: 'soft', message: `Idle gap`, penalty: 3 * gap });
          }
        }
      }
    }

    // Workload balancing
    const subjectFacultyLoad = new Map<string, Map<string, number>>();
    for (const session of sessions) {
      const subject = this.subjects.get(session.subjectCode);
      if (!subject || subject.eligibleFacultyIds.length <= 1) continue;
      if (!subjectFacultyLoad.has(session.subjectCode)) {
        subjectFacultyLoad.set(session.subjectCode, new Map());
      }
      const loads = subjectFacultyLoad.get(session.subjectCode)!;
      const facs = [session.facultyId];
      if (session.secondFacultyId) facs.push(session.secondFacultyId);

      for (const fac of facs) {
        loads.set(fac, (loads.get(fac) || 0) + 1);
      }
    }
    for (const [, loads] of subjectFacultyLoad) {
      const counts = [...loads.values()];
      if (counts.length > 0) {
        const max = Math.max(...counts);
        const min = Math.min(...counts);
        const imbalance = max - min;
        if (imbalance > 2) {
          violations.push({ type: 'soft', message: `Faculty workload imbalance`, penalty: 5 * (imbalance - 2) });
        }
      }
    }

    return violations;
  }

  private checkOneLabPerDay(sessions: ClassSession[]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const sectionIds = [...new Set(sessions.map(s => s.sectionId))];

    for (const sectionId of sectionIds) {
      const sectionSessions = sessions.filter(s => s.sectionId === sectionId);
      const byDay = new Map<Day, ClassSession[]>();
      for (const s of sectionSessions) {
        if (!byDay.has(s.day)) byDay.set(s.day, []);
        byDay.get(s.day)!.push(s);
      }

      for (const [day, daySessions] of byDay) {
        const sorted = daySessions.sort((a, b) => a.slotIndex - b.slotIndex);
        const labSubjectsOnDay = new Set<string>();

        for (let i = 0; i < sorted.length - 1; i++) {
          const s1 = sorted[i];
          const s2 = sorted[i + 1];
          if (this.timeSlotManager.areSlotsConsecutive(s1.slotIndex, s2.slotIndex)) {
            const subj = this.subjects.get(s1.subjectCode);
            if (subj && s1.subjectCode === s2.subjectCode && 
                (subj.subjectType === SubjectType.LAB || subj.subjectType === SubjectType.INTEGRATED)) {
              labSubjectsOnDay.add(s1.subjectCode);
              i++; // skip second slot of potential pair
            }
          }
        }

        if (labSubjectsOnDay.size > 1) {
          violations.push({
            type: 'hard',
            message: `More than one lab on ${day} for ${sectionId}: ${Array.from(labSubjectsOnDay).join(', ')}`,
            penalty: 1000,
          });
        }
      }
    }

    return violations;
  }

  // ─── HARD: Career Path Lab capacity reservation (70 capacity labs reserved) ───
  private checkCareerPathLabCapacityOverlap(sessions: ClassSession[]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    // Find all slots where a Career Path lab is scheduled
    const cpLabSlots = new Set<string>();
    for (const s of sessions) {
      if (s.isCareerPath && s.careerPathSlotType === 'lab') {
        cpLabSlots.add(`${s.day}-${s.slotIndex}`);
      }
    }

    if (cpLabSlots.size === 0) return violations;

    // Identify labs with exactly 70 capacity
    const reservedLabIds = new Set(this.labRooms.filter(lr => lr.capacity === 70).map(lr => lr.id));
    if (reservedLabIds.size === 0) return violations;

    for (const session of sessions) {
      if (session.isCareerPath) continue; // Exceptions: CP labs themselves occupy these rooms
      // If a session is assigned to a 70-capacity lab at the same time as a CP lab
      if (session.labRoomId && reservedLabIds.has(session.labRoomId)) {
        if (cpLabSlots.has(`${session.day}-${session.slotIndex}`)) {
          violations.push({
            type: 'hard',
            message: `Resource conflict: Lab ${session.labRoomId} (70 cap) is reserved for Career Path at ${session.day} slot ${session.slotIndex}`,
            penalty: 1000,
          });
        }
      }
    }

    return violations;
  }

  // ─── HARD: 35-Capacity Lab Pairing (Shared Usage) ───
  private checkThirtyFiveCapacityLabPairing(sessions: ClassSession[]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    // Group all sessions by day and slot
    const slotMap = new Map<string, ClassSession[]>();
    for (const s of sessions) {
      if (!s.labRoomId) continue;
      const key = `${s.day}-${s.slotIndex}`;
      if (!slotMap.has(key)) slotMap.set(key, []);
      slotMap.get(key)!.push(s);
    }

    const thirtyFiveCapLabIds = new Set(this.labRooms.filter(lr => lr.capacity === 35).map(lr => lr.id));
    if (thirtyFiveCapLabIds.size === 0) return violations;
    const maxSectionsAllowed = Math.floor(thirtyFiveCapLabIds.size / 2);
    if (maxSectionsAllowed === 0) return violations;

    for (const [key, slotSessions] of slotMap) {
       const sectionsUsing35Cap = new Set<string>();
       for (const s of slotSessions) {
          if (thirtyFiveCapLabIds.has(s.labRoomId!)) {
             sectionsUsing35Cap.add(s.sectionId);
          }
       }
       // If more sections are using 35-cap labs than we have pairs for, it's a conflict
       if (sectionsUsing35Cap.size > maxSectionsAllowed) {
          const [day, slot] = key.split('-');
          violations.push({
             type: 'hard',
             message: `Resource conflict: Multiple sections (${Array.from(sectionsUsing35Cap).join(', ')}) scheduled in 35-capacity labs at ${day} slot ${slot}. Only ${maxSectionsAllowed} section(s) can use 35-cap labs simultaneously.`,
             penalty: 1000,
          });
       }
    }

    return violations;
  }

  // ─── HARD: Faculty-Section Consistency ─────────────────────────
  private checkFacultySectionConsistency(sessions: ClassSession[]): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    // Rule 1: Same (subject, section) must always have the same faculty
    const subjectSectionGroups = new Map<string, Set<string>>();
    // Rule 2: Same (faculty, section) must only teach ONE subject
    const facultySectionGroups = new Map<string, Set<string>>();

    for (const s of sessions) {
      if (s.isCareerPath) continue; // Career Path sessions are handled differently

      // Rule 1 grouping
      const ssKey = `${s.sectionId}-${s.subjectCode}`;
      if (!subjectSectionGroups.has(ssKey)) subjectSectionGroups.set(ssKey, new Set());
      subjectSectionGroups.get(ssKey)!.add(s.facultyId);
      if (s.secondFacultyId) subjectSectionGroups.get(ssKey)!.add(s.secondFacultyId);

      // Rule 2 grouping
      const fsKey = `${s.facultyId}-${s.sectionId}`;
      if (!facultySectionGroups.has(fsKey)) facultySectionGroups.set(fsKey, new Set());
      facultySectionGroups.get(fsKey)!.add(s.subjectCode);
    }

    // Rule 1 violations: multiple faculties for same subject+section
    for (const [key, faculties] of subjectSectionGroups) {
      if (faculties.size > 1) {
        const [sectionId, subjectCode] = key.split('-');
        violations.push({
          type: 'hard',
          message: `Faculty inconsistency: ${subjectCode} in ${sectionId} has multiple faculties assigned: ${Array.from(faculties).join(', ')}`,
          penalty: 5000,  // Increased penalty for multiple faculty assignment
        });
      }
    }

    // Rule 2 violations: one faculty teaching multiple subjects in the same section
    for (const [key, subjects] of facultySectionGroups) {
      if (subjects.size > 1) {
        const [facultyId, sectionId] = key.split('-');
        violations.push({
          type: 'hard',
          message: `Faculty exclusivity violated: ${facultyId} teaches multiple subjects in ${sectionId}: ${Array.from(subjects).join(', ')}`,
          penalty: 5000,  // Increased penalty for faculty jumping
        });
      }
    }

    return violations;
  }
}

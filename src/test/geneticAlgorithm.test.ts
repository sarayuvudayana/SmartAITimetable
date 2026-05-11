import { describe, it, expect } from 'vitest';
import { TimeSlotManager, DAYS } from '@/core/timeSlotManager';
import { ConstraintEngine } from '@/core/constraintEngine';
import { GeneticAlgorithm } from '@/core/geneticAlgorithm';
import { buildFacultySectionMappings } from '@/core/facultySectionAssigner';
import { Subject, Section, Faculty, SubjectType, Day, ClassSession } from '@/types/timetable';

// ─── Test Data Setup ───────────────────────────────────────────

const faculty: Faculty[] = [
  { id: 'F1', shortName: 'Dr.A' },
  { id: 'F2', shortName: 'Dr.B' },
  { id: 'F3', shortName: 'Dr.C' },
  { id: 'F4', shortName: 'Dr.D' },
  { id: 'F5', shortName: 'Dr.E' },
  { id: 'F6', shortName: 'Dr.F' },
  { id: 'F7', shortName: 'Dr.G' },
  { id: 'F8', shortName: 'Dr.H' },
];

const subjects: Subject[] = [
  // Year 1 subjects
  { code: 'CS101', name: 'Programming', facultyId: 'F1', eligibleFacultyIds: ['F1'], weeklyHours: 4, subjectType: SubjectType.THEORY, labHours: 0, yearNumber: 1 },
  { code: 'CS102', name: 'Data Structures', facultyId: 'F2', eligibleFacultyIds: ['F2'], weeklyHours: 3, subjectType: SubjectType.THEORY, labHours: 0, yearNumber: 1 },
  { code: 'CS103', name: 'C Lab', facultyId: 'F3', eligibleFacultyIds: ['F3'], weeklyHours: 2, subjectType: SubjectType.LAB, labHours: 2, yearNumber: 1 },
  { code: 'CS104', name: 'Python Integrated', facultyId: 'F4', eligibleFacultyIds: ['F4'], weeklyHours: 4, subjectType: SubjectType.INTEGRATED, labHours: 2, yearNumber: 1 },
  // Year 2 subjects
  { code: 'CS201', name: 'OS', facultyId: 'F5', eligibleFacultyIds: ['F5'], weeklyHours: 3, subjectType: SubjectType.THEORY, labHours: 0, yearNumber: 2 },
  { code: 'CS202', name: 'DBMS Lab', facultyId: 'F6', eligibleFacultyIds: ['F6'], weeklyHours: 2, subjectType: SubjectType.LAB, labHours: 2, yearNumber: 2 },
  { code: 'CS203', name: 'Networks', facultyId: 'F7', eligibleFacultyIds: ['F7'], weeklyHours: 3, subjectType: SubjectType.THEORY, labHours: 0, yearNumber: 2 },
  { code: 'CS204', name: 'Web Lab', facultyId: 'F8', eligibleFacultyIds: ['F8'], weeklyHours: 4, subjectType: SubjectType.LAB, labHours: 4, yearNumber: 2 },
];

const sections: Section[] = [
  { id: '1A', yearNumber: 1, name: 'A' },
  { id: '1B', yearNumber: 1, name: 'B' },
  { id: '2A', yearNumber: 2, name: 'A' },
  { id: '2B', yearNumber: 2, name: 'B' },
];

// ─── Helpers ────────────────────────────────────────────────────

function countContinuousPairs(sessions: ClassSession[], sectionId: string, subjectCode: string, tsm: TimeSlotManager): number {
  const subjSessions = sessions.filter(s => !s.isCareerPath && s.sectionId === sectionId && s.subjectCode === subjectCode);
  const byDay = new Map<Day, number[]>();
  for (const s of subjSessions) {
    if (!byDay.has(s.day)) byDay.set(s.day, []);
    byDay.get(s.day)!.push(s.slotIndex);
  }
  let pairs = 0;
  for (const [, daySlots] of byDay) {
    daySlots.sort((a, b) => a - b);
    for (let i = 0; i < daySlots.length - 1; i++) {
      if (tsm.areSlotsConsecutive(daySlots[i], daySlots[i + 1])) {
        pairs++;
        i++;
      }
    }
  }
  return pairs;
}

// ─── Tests ──────────────────────────────────────────────────────

describe('Genetic Algorithm - Lab Scheduling', () => {
  const tsm = new TimeSlotManager();
  const mappings = buildFacultySectionMappings(subjects, sections);
  const ce = new ConstraintEngine(tsm, subjects, mappings, [], []);

  const ga = new GeneticAlgorithm(ce, tsm, subjects, sections, [], [], mappings);
  const result = ga.run();
  const timetable = result.timetable;

  it('should generate a timetable', () => {
    expect(timetable).toBeDefined();
    expect(timetable.length).toBeGreaterThan(0);
  });

  it('every pure LAB subject should have continuous 2-hour blocks for each section', () => {
    const labSubjects = subjects.filter(s => s.subjectType === SubjectType.LAB);
    for (const subject of labSubjects) {
      const yearSections = sections.filter(s => s.yearNumber === subject.yearNumber);
      for (const section of yearSections) {
        const expectedPairs = Math.floor(subject.weeklyHours / 2);
        const actualPairs = countContinuousPairs(timetable, section.id, subject.code, tsm);
        expect(actualPairs, `${subject.code} in ${section.id}: expected ${expectedPairs} pairs, got ${actualPairs}`)
          .toBeGreaterThanOrEqual(expectedPairs);
      }
    }
  });

  it('INTEGRATED subjects should have lab pairs AND theory hours', () => {
    const intSubjects = subjects.filter(s => s.subjectType === SubjectType.INTEGRATED);
    for (const subject of intSubjects) {
      const yearSections = sections.filter(s => s.yearNumber === subject.yearNumber);
      for (const section of yearSections) {
        const expectedLabPairs = Math.floor(subject.labHours / 2);
        const actualPairs = countContinuousPairs(timetable, section.id, subject.code, tsm);
        expect(actualPairs, `${subject.code} in ${section.id}: expected ${expectedLabPairs} lab pairs, got ${actualPairs}`)
          .toBeGreaterThanOrEqual(expectedLabPairs);

        // Total sessions should equal weeklyHours
        const totalSessions = timetable.filter(
          s => !s.isCareerPath && s.sectionId === section.id && s.subjectCode === subject.code
        ).length;
        expect(totalSessions, `${subject.code} in ${section.id}: expected ${subject.weeklyHours} total sessions, got ${totalSessions}`)
          .toBe(subject.weeklyHours);
      }
    }
  });

  it('no lab block should span the lunch break (slots 3→4)', () => {
    const labSubjects = subjects.filter(s => s.subjectType === SubjectType.LAB || s.subjectType === SubjectType.INTEGRATED);
    for (const subject of labSubjects) {
      const yearSections = sections.filter(s => s.yearNumber === subject.yearNumber);
      for (const section of yearSections) {
        const subjSessions = timetable.filter(
          s => s.sectionId === section.id && s.subjectCode === subject.code
        );
        for (const day of DAYS) {
          const daySlots = subjSessions.filter(s => s.day === day).map(s => s.slotIndex).sort((a, b) => a - b);
          for (let i = 0; i < daySlots.length - 1; i++) {
            if (daySlots[i] === 3 && daySlots[i + 1] === 4) {
              expect.fail(`${subject.code} in ${section.id} has lab spanning lunch on ${day} (slots 3→4)`);
            }
          }
        }
      }
    }
  });

  it('every section should have ALL its lab/integrated subjects scheduled', () => {
    for (const section of sections) {
      const yearLabSubjects = subjects.filter(
        s => s.yearNumber === section.yearNumber && (s.subjectType === SubjectType.LAB || s.subjectType === SubjectType.INTEGRATED)
      );
      for (const subject of yearLabSubjects) {
        const sessions = timetable.filter(s => s.sectionId === section.id && s.subjectCode === subject.code);
        expect(sessions.length, `${subject.code} missing from ${section.id}`)
          .toBeGreaterThan(0);
      }
    }
  });

  it('no faculty should be double-booked', () => {
    const slotMap = new Map<string, ClassSession[]>();
    for (const session of timetable) {
      const key = `${session.facultyId}-${session.day}-${session.slotIndex}`;
      if (!slotMap.has(key)) slotMap.set(key, []);
      slotMap.get(key)!.push(session);
    }
    for (const [key, sessions] of slotMap) {
      expect(sessions.length, `Faculty double-booked: ${key}`).toBe(1);
    }
  });

  it('no section should have duplicate day+slot', () => {
    const slotMap = new Map<string, number>();
    for (const session of timetable) {
      const key = `${session.sectionId}-${session.day}-${session.slotIndex}`;
      slotMap.set(key, (slotMap.get(key) || 0) + 1);
    }
    for (const [key, count] of slotMap) {
      expect(count, `Section slot conflict: ${key}`).toBe(1);
    }
  });

  it('4-hour lab subjects should have 2 separate 2-hour blocks', () => {
    const fourHourLabs = subjects.filter(s => s.subjectType === SubjectType.LAB && s.weeklyHours === 4);
    for (const subject of fourHourLabs) {
      const yearSections = sections.filter(s => s.yearNumber === subject.yearNumber);
      for (const section of yearSections) {
        const pairs = countContinuousPairs(timetable, section.id, subject.code, tsm);
        expect(pairs, `${subject.code} in ${section.id}: needs 2 pairs for 4-hour lab, got ${pairs}`)
          .toBeGreaterThanOrEqual(2);
      }
    }
  });
});

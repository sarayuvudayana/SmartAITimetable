import { describe, it, expect } from 'vitest';
import { TimeSlotManager } from '@/core/timeSlotManager';
import { ConstraintEngine } from '@/core/constraintEngine';
import { Subject, SubjectType, Day, ClassSession } from '@/types/timetable';

describe('New Constraints Verification', () => {
  const tsm = new TimeSlotManager();
  const subjects: Subject[] = [
    { code: 'CS101', name: 'Theory 1', facultyId: 'F1', eligibleFacultyIds: ['F1', 'F2'], weeklyHours: 3, subjectType: SubjectType.THEORY, labHours: 0, yearNumber: 1 },
    { code: 'CP1', name: 'Career Path 1', facultyId: 'F1', eligibleFacultyIds: ['F1'], weeklyHours: 2, subjectType: SubjectType.THEORY, labHours: 0, yearNumber: 3 },
    { code: 'CP2', name: 'Career Path 2', facultyId: 'F1', eligibleFacultyIds: ['F1'], weeklyHours: 2, subjectType: SubjectType.THEORY, labHours: 0, yearNumber: 3 },
  ];
  const ce = new ConstraintEngine(tsm, subjects);

  describe('checkFacultyConflicts with Career Path', () => {
    it('should NOT flag conflict for same faculty in SAME Career Path subject across multiple sections', () => {
      const sessions: ClassSession[] = [
        { sectionId: 'S1', yearNumber: 3, subjectCode: 'CP1', facultyId: 'F1', isCareerPath: true, day: Day.MONDAY, slotIndex: 0, isFixed: false },
        { sectionId: 'S2', yearNumber: 3, subjectCode: 'CP1', facultyId: 'F1', isCareerPath: true, day: Day.MONDAY, slotIndex: 0, isFixed: false },
      ];
      const violations = ce.evaluateAll(sessions).filter(v => v.message.includes('Faculty conflict'));
      expect(violations.length).toBe(0);
    });

    it('should flag conflict for same faculty in DIFFERENT Career Path subjects at the same time', () => {
      const sessions: ClassSession[] = [
        { sectionId: 'S1', yearNumber: 3, subjectCode: 'CP1', facultyId: 'F1', isCareerPath: true, day: Day.MONDAY, slotIndex: 0, isFixed: false },
        { sectionId: 'S2', yearNumber: 3, subjectCode: 'CP2', facultyId: 'F1', isCareerPath: true, day: Day.MONDAY, slotIndex: 0, isFixed: false },
      ];
      const violations = ce.evaluateAll(sessions).filter(v => v.message.includes('Faculty conflict'));
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].message).toContain('multiple Career Path subjects');
    });

    it('should flag conflict for faculty in Career Path and regular section at the same time', () => {
      const sessions: ClassSession[] = [
        { sectionId: 'S1', yearNumber: 3, subjectCode: 'CP1', facultyId: 'F1', isCareerPath: true, day: Day.MONDAY, slotIndex: 0, isFixed: false },
        { sectionId: 'S2', yearNumber: 1, subjectCode: 'CS101', facultyId: 'F1', isCareerPath: false, day: Day.MONDAY, slotIndex: 0, isFixed: false },
      ];
      const violations = ce.evaluateAll(sessions).filter(v => v.message.includes('Faculty conflict'));
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].message).toContain('is in Career Path but also assigned to sections');
    });
  });

  describe('checkFacultySectionConsistency', () => {
    it('should flag violation if same subject/section has multiple faculties', () => {
      const sessions: ClassSession[] = [
        { sectionId: 'S1', yearNumber: 1, subjectCode: 'CS101', facultyId: 'F1', isCareerPath: false, day: Day.MONDAY, slotIndex: 0, isFixed: false },
        { sectionId: 'S1', yearNumber: 1, subjectCode: 'CS101', facultyId: 'F2', isCareerPath: false, day: Day.TUESDAY, slotIndex: 1, isFixed: false },
      ];
      const violations = ce.evaluateAll(sessions).filter(v => v.message.includes('Faculty inconsistency'));
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].message).toContain('multiple faculties assigned');
    });

    it('should NOT flag violation if same subject/section has same faculty', () => {
      const sessions: ClassSession[] = [
        { sectionId: 'S1', yearNumber: 1, subjectCode: 'CS101', facultyId: 'F1', isCareerPath: false, day: Day.MONDAY, slotIndex: 0, isFixed: false },
        { sectionId: 'S1', yearNumber: 1, subjectCode: 'CS101', facultyId: 'F1', isCareerPath: false, day: Day.TUESDAY, slotIndex: 1, isFixed: false },
      ];
      const violations = ce.evaluateAll(sessions).filter(v => v.message.includes('Faculty inconsistency'));
      expect(violations.length).toBe(0);
    });

    it('should flag violation if same faculty teaches multiple subjects in the same section', () => {
      const sessions: ClassSession[] = [
        { sectionId: 'S1', yearNumber: 1, subjectCode: 'CS101', facultyId: 'F1', isCareerPath: false, day: Day.MONDAY, slotIndex: 0, isFixed: false },
        { sectionId: 'S1', yearNumber: 1, subjectCode: 'CP1', facultyId: 'F1', isCareerPath: false, day: Day.TUESDAY, slotIndex: 1, isFixed: false },
      ];
      const violations = ce.evaluateAll(sessions).filter(v => v.message.includes('Faculty exclusivity violated'));
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].message).toContain('teaches multiple subjects');
    });
  });
});

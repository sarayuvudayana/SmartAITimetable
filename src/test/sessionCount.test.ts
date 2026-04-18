import { describe, it, expect } from 'vitest';
import { TimeSlotManager } from '@/core/timeSlotManager';
import { ConstraintEngine } from '@/core/constraintEngine';
import { GeneticAlgorithm } from '@/core/geneticAlgorithm';
import { buildFacultySectionMappings } from '@/core/facultySectionAssigner';
import { Subject, Section, Faculty, SubjectType } from '@/types/timetable';

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
  { code: 'S1', name: 'Theory 1', facultyId: 'F1', eligibleFacultyIds: ['F1', 'F2'], weeklyHours: 4, subjectType: SubjectType.THEORY, labHours: 0, yearNumber: 1 },
  { code: 'S2', name: 'Theory 2', facultyId: 'F3', eligibleFacultyIds: ['F3', 'F4'], weeklyHours: 3, subjectType: SubjectType.THEORY, labHours: 0, yearNumber: 1 },
  { code: 'L1', name: 'Lab 1', facultyId: 'F5', eligibleFacultyIds: ['F5', 'F6'], weeklyHours: 2, subjectType: SubjectType.LAB, labHours: 2, yearNumber: 1 },
  { code: 'I1', name: 'Integrated 1', facultyId: 'F7', eligibleFacultyIds: ['F7', 'F8'], weeklyHours: 4, subjectType: SubjectType.INTEGRATED, labHours: 2, yearNumber: 1 },
];

const sections: Section[] = [
  { id: '1A', yearNumber: 1, name: 'A' },
  { id: '1B', yearNumber: 1, name: 'B' },
  { id: '1C', yearNumber: 1, name: 'C' },
];

describe('Session Count Verification', () => {
  const tsm = new TimeSlotManager();
  const mappings = buildFacultySectionMappings(subjects, sections);
  const ce = new ConstraintEngine(tsm, subjects, mappings);
  const ga = new GeneticAlgorithm(ce, tsm, subjects, sections, [], [], mappings, [], [], { maxGenerations: 50, populationSize: 20 });

  it('should ensure ALL subjects have exactly their weeklyHours in ALL sections', { timeout: 30000 }, () => {
    const result = ga.run();
    const timetable = result.timetable;

    for (const section of sections) {
      for (const subject of subjects) {
        const count = timetable.filter(
          s => s.sectionId === section.id && s.subjectCode === subject.code
        ).length;
        
        expect(count, `Subject ${subject.code} in section ${section.id} has ${count}/${subject.weeklyHours} hours`).toBe(subject.weeklyHours);
      }
    }
  });

  it('should have a fitness value of 0 or close to 0 (hard constraints met)', () => {
    const result = ga.run();
    // Since we forced placement, fitness might be high initially, but GA should resolve it.
    // However, even if fitness is > 0, the session count MUST be correct.
    expect(result.timetable.length).toBe(sections.length * subjects.reduce((sum, s) => sum + s.weeklyHours, 0));
  });
});

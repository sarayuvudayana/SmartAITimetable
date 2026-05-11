import { Subject, Section, Faculty, SubjectType } from '@/types/timetable';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class PreFlightValidator {
  /**
   * Checks if the given timetable configuration is mathematically solvable.
   * Focuses on time-slot availability for faculty and sections.
   */
  static validate(
    subjects: Subject[],
    sections: Section[],
    faculty: Faculty[],
    maxSlotsPerWeek: number = 30 // 6 slots * 5 days
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Check Section Overload
    for (const section of sections) {
      const sectionSubjects = subjects.filter(s => s.yearNumber === section.yearNumber);
      const totalHoursNeeded = sectionSubjects.reduce((sum, s) => sum + s.weeklyHours, 0);

      if (totalHoursNeeded > maxSlotsPerWeek) {
        errors.push(
          `Section ${section.id} requires ${totalHoursNeeded} hours, but only ${maxSlotsPerWeek} slots are available per week.`
        );
      } else if (totalHoursNeeded > maxSlotsPerWeek * 0.9) {
        warnings.push(
          `Section ${section.id} is very crowded (${totalHoursNeeded}/${maxSlotsPerWeek} slots). Generation might be difficult.`
        );
      }
    }

    // 2. Check Faculty Overload
    const facultyLoad = new Map<string, number>();
    for (const subject of subjects) {
      // If only one faculty is eligible, they MUST take the full load for all sections of that year
      if (subject.eligibleFacultyIds.length === 1) {
        const fid = subject.eligibleFacultyIds[0];
        const yearSections = sections.filter(s => s.yearNumber === subject.yearNumber);
        const hours = subject.weeklyHours * yearSections.length;
        facultyLoad.set(fid, (facultyLoad.get(fid) || 0) + hours);
      } else if (subject.eligibleFacultyIds.length > 1) {
        // For multi-faculty, estimate average load (actual assignment happens in FacultySectionAssigner)
        const yearSections = sections.filter(s => s.yearNumber === subject.yearNumber);
        const totalHours = subject.weeklyHours * yearSections.length;
        const avgHours = totalHours / subject.eligibleFacultyIds.length;
        
        for (const fid of subject.eligibleFacultyIds) {
          facultyLoad.set(fid, (facultyLoad.get(fid) || 0) + avgHours);
        }
      }
    }

    for (const [fid, load] of facultyLoad.entries()) {
      const fac = faculty.find(f => f.id === fid);
      const name = fac ? fac.shortName : fid;
      
      if (load > maxSlotsPerWeek) {
        errors.push(
          `Faculty ${name} is over-allocated with ~${Math.round(load)} hours across all sections (max ${maxSlotsPerWeek}).`
        );
      } else if (load > maxSlotsPerWeek * 0.8) {
        warnings.push(
          `Faculty ${name} has a high load (~${Math.round(load)} hours). This might cause scheduling conflicts.`
        );
      }
    }

    // 3. Check for subjects with NO eligible faculty
    for (const subject of subjects) {
      if (subject.eligibleFacultyIds.length === 0) {
        errors.push(`Subject ${subject.code} has no eligible faculty assigned.`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Faculty-to-Section Pre-Assignment Engine
 *
 * Handles automatic, immutable faculty-section mapping before GA scheduling.
 * Supports 3 scenarios:
 *   Scenario 1: 2 faculty – 4 sections → 2 each
 *   Scenario 2: 4 faculty – 4 sections → 1 each
 *   Scenario 3: 3 faculty – 4 sections → 1+1+2 (lowest-load gets 2)
 *
 * THEORY+LAB RULE: For subjects with a linkedSubjectCode, the same faculty
 * is automatically assigned to the lab portion (linked code) for every section.
 */

import { Subject, Section, SubjectType } from '@/types/timetable';

/** One mapping entry: "faculty F teaches subject S for section SEC" */
export interface FacultySectionMapping {
  subjectCode: string;
  sectionId: string;
  facultyId: string;
  yearNumber: number;
}

/** Shuffle an array in-place (Fisher-Yates) and return it */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Compute the total weekly teaching load per faculty across ALL subjects
 * that have already been mapped.
 */
function computeGlobalLoad(
  mappings: FacultySectionMapping[],
  subjects: Subject[],
): Map<string, number> {
  const subjectMap = new Map(subjects.map(s => [s.code, s]));
  const load = new Map<string, number>();
  for (const m of mappings) {
    const sub = subjectMap.get(m.subjectCode);
    const hours = sub ? sub.weeklyHours : 1;
    load.set(m.facultyId, (load.get(m.facultyId) || 0) + hours);
  }
  return load;
}

/**
 * Build all faculty-section mappings for every multi-faculty subject.
 *
 * Single-faculty subjects (eligibleFacultyIds.length <= 1) are skipped —
 * they are trivially assigned in the GA.
 *
 * After building primary mappings, Theory+Lab subjects automatically propagate
 * their faculty assignment to the linked lab subject code (same faculty, same section).
 */
export function buildFacultySectionMappings(
  subjects: Subject[],
  sections: Section[],
): FacultySectionMapping[] {
  const mappings: FacultySectionMapping[] = [];

  // Track which faculty is already assigned to which section (for any subject)
  const sectionFacultyMap = new Map<string, Set<string>>();

  const isFacultyTakenInSection = (sectionId: string, facultyId: string): boolean => {
    return sectionFacultyMap.get(sectionId)?.has(facultyId) || false;
  };
  const markFacultyForSection = (sectionId: string, facultyId: string) => {
    if (!sectionFacultyMap.has(sectionId)) sectionFacultyMap.set(sectionId, new Set());
    sectionFacultyMap.get(sectionId)!.add(facultyId);
  };

  // Process subjects sorted by fewer eligible faculty first
  const multiFacultySubjects = subjects
    .filter(s => s.eligibleFacultyIds.length > 1)
    .sort((a, b) => a.eligibleFacultyIds.length - b.eligibleFacultyIds.length);

  for (const subject of multiFacultySubjects) {
    const yearSections = sections.filter(s => s.yearNumber === subject.yearNumber);
    if (yearSections.length === 0) continue;

    const numFaculty = subject.eligibleFacultyIds.length;
    const numSections = yearSections.length;

    const globalLoad = computeGlobalLoad(mappings, subjects);
    const sortedSections = [...yearSections].sort((a, b) => a.id.localeCompare(b.id));
    const baseCount = Math.floor(numSections / numFaculty);
    const extraCount = numSections % numFaculty;

    const sortedFaculty = [...subject.eligibleFacultyIds].sort((a, b) => {
      return (globalLoad.get(a) || 0) - (globalLoad.get(b) || 0);
    });

    // Create assignment pool
    const assignmentPool: string[] = [];
    for (let i = 0; i < numFaculty; i++) {
      const seats = i < extraCount ? baseCount + 1 : baseCount;
      for (let s = 0; s < seats; s++) {
        assignmentPool.push(sortedFaculty[i]);
      }
    }

    const usedFacultyInSubject = new Set<string>();

    for (const section of sortedSections) {
      let bestSeatIdx = -1;

      // Attempt 1: Perfect match (not in section AND not yet in this subject)
      for (let i = 0; i < assignmentPool.length; i++) {
        const fid = assignmentPool[i];
        if (!isFacultyTakenInSection(section.id, fid) && !usedFacultyInSubject.has(fid)) {
          bestSeatIdx = i;
          break;
        }
      }

      // Attempt 2: Relaxed match (not in section)
      if (bestSeatIdx === -1) {
        for (let i = 0; i < assignmentPool.length; i++) {
          const fid = assignmentPool[i];
          if (!isFacultyTakenInSection(section.id, fid)) {
            bestSeatIdx = i;
            break;
          }
        }
      }

      // Final fallback: take any remaining seat
      if (bestSeatIdx === -1) bestSeatIdx = 0;

      const chosenFaculty = assignmentPool.splice(bestSeatIdx, 1)[0];

      mappings.push({
        subjectCode: subject.code,
        sectionId: section.id,
        facultyId: chosenFaculty,
        yearNumber: subject.yearNumber,
      });
      markFacultyForSection(section.id, chosenFaculty);
      usedFacultyInSubject.add(chosenFaculty);
    }
  }

  // ─── THEORY+LAB FACULTY SYNC ─────────────────────────────────────────────────
  // For Theory+Lab subjects with a linkedSubjectCode (the lab's separate course code),
  // the SAME faculty that teaches the theory MUST also teach the lab for each section.
  // We mirror mappings from the theory code to the lab code here.
  for (const subject of subjects) {
    if (subject.subjectType !== SubjectType.THEORY_LAB || !subject.linkedSubjectCode) continue;
    const labCode = subject.linkedSubjectCode;

    // Case 1: Theory subject had multiple faculty → find its pre-assigned mappings
    const theoryMappings = mappings.filter(m => m.subjectCode === subject.code);
    for (const tm of theoryMappings) {
      const alreadyMapped = mappings.some(
        m => m.subjectCode === labCode && m.sectionId === tm.sectionId
      );
      if (!alreadyMapped) {
        mappings.push({
          subjectCode: labCode,
          sectionId: tm.sectionId,
          facultyId: tm.facultyId, // ← SAME faculty as theory
          yearNumber: tm.yearNumber,
        });
      }
    }

    // Case 2: Single-faculty theory subject (skipped in multiFaculty loop above)
    // Propagate to lab code for all sections of the same year
    if (theoryMappings.length === 0) {
      const yearSections = sections.filter(s => s.yearNumber === subject.yearNumber);
      for (const sec of yearSections) {
        const alreadyMapped = mappings.some(
          m => m.subjectCode === labCode && m.sectionId === sec.id
        );
        if (!alreadyMapped) {
          mappings.push({
            subjectCode: labCode,
            sectionId: sec.id,
            facultyId: subject.facultyId, // The only faculty
            yearNumber: subject.yearNumber,
          });
        }
      }
    }
  }

  return mappings;
}

/**
 * Look up the pre-assigned faculty for a given subject+section.
 * Returns undefined for subjects without pre-assignment (single-faculty).
 */
export function getAssignedFaculty(
  mappings: FacultySectionMapping[],
  subjectCode: string,
  sectionId: string,
): string | undefined {
  return mappings.find(
    m => m.subjectCode === subjectCode && m.sectionId === sectionId,
  )?.facultyId;
}

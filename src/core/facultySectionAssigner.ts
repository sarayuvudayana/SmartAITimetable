/**
 * Faculty-to-Section Pre-Assignment Engine
 *
 * Handles automatic, immutable faculty-section mapping before GA scheduling.
 * Supports 3 scenarios:
 *   Scenario 1: 2 faculty – 4 sections → 2 each
 *   Scenario 2: 4 faculty – 4 sections → 1 each
 *   Scenario 3: 3 faculty – 4 sections → 1+1+2 (lowest-load gets 2)
 *
 * Generalises gracefully to other ratios.
 */

import { Subject, Section, ClassSession } from '@/types/timetable';

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
 * that have already been mapped. Used to decide who gets the extra section
 * in Scenario 3.
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
 */
export function buildFacultySectionMappings(
  subjects: Subject[],
  sections: Section[],
): FacultySectionMapping[] {
  const mappings: FacultySectionMapping[] = [];

  // Track which faculty is already assigned to which section (for any subject)
  // key = `${sectionId}`, value = set of faculty IDs already assigned to that section
  const sectionFacultyMap = new Map<string, Set<string>>();

  const isFacultyTakenInSection = (sectionId: string, facultyId: string): boolean => {
    return sectionFacultyMap.get(sectionId)?.has(facultyId) || false;
  };
  const markFacultyForSection = (sectionId: string, facultyId: string) => {
    if (!sectionFacultyMap.has(sectionId)) sectionFacultyMap.set(sectionId, new Set());
    sectionFacultyMap.get(sectionId)!.add(facultyId);
  };

  // Process subjects sorted by fewer eligible faculty first so their load
  // counts can feed into later decisions (Scenario 3).
  const multiFacultySubjects = subjects
    .filter(s => s.eligibleFacultyIds.length > 1)
    .sort((a, b) => a.eligibleFacultyIds.length - b.eligibleFacultyIds.length);

  for (const subject of multiFacultySubjects) {
    const yearSections = sections.filter(s => s.yearNumber === subject.yearNumber);
    if (yearSections.length === 0) continue;

    const numFaculty = subject.eligibleFacultyIds.length;
    const numSections = yearSections.length;

    // Shuffle both lists for randomness
    const shuffledFaculty = shuffle([...subject.eligibleFacultyIds]);
    const shuffledSections = shuffle([...yearSections]);

    // Scenario 4: Smart spread with load balancing and exclusivity
    const globalLoad = computeGlobalLoad(mappings, subjects);
    
    // Sort faculty by their global load to distribute 'extras' fairly
    const sortedFaculty = [...subject.eligibleFacultyIds].sort((a, b) => {
      const loadA = globalLoad.get(a) || 0;
      const loadB = globalLoad.get(b) || 0;
      return loadA - loadB;
    });

    // Calculate how many sections each faculty SHOULD get
    const baseCount = Math.floor(numSections / numFaculty);
    const extraCount = numSections % numFaculty;

    // We will try multiple random shuffles of the sections to find a mapping 
    // that respects the 'One Faculty per Section' rule as best as possible.
    let bestMappingsForSubject: FacultySectionMapping[] = [];
    let bestViolationCount = Infinity;

    for (let attempt = 0; attempt < 20; attempt++) {
      const currentAttemptMappings: FacultySectionMapping[] = [];
      const currentAssignmentPool: string[] = [];
      
      // Build pool for this attempt (shuffling who gets the extra seats if load is equal)
      for (let i = 0; i < numFaculty; i++) {
        const seats = i < extraCount ? baseCount + 1 : baseCount;
        for (let s = 0; s < seats; s++) {
          currentAssignmentPool.push(sortedFaculty[i]);
        }
      }

      const shuffledSections = shuffle([...yearSections]);
      const shuffledPool = shuffle([...currentAssignmentPool]);
      let violations = 0;

      for (const section of shuffledSections) {
        let bestSeatIdx = -1;
        
        // Attempt 1: Perfect match (Not in this section yet)
        for (let i = 0; i < shuffledPool.length; i++) {
          if (!isFacultyTakenInSection(section.id, shuffledPool[i])) {
            bestSeatIdx = i;
            break;
          }
        }

        // Attempt 2: Forced match (if perfect fail)
        if (bestSeatIdx === -1) {
          bestSeatIdx = 0; // Take the first available if all are conflicting
          violations++;
        }

        if (shuffledPool.length > 0) {
          const fid = shuffledPool.splice(bestSeatIdx, 1)[0];
          currentAttemptMappings.push({
            subjectCode: subject.code,
            sectionId: section.id,
            facultyId: fid,
            yearNumber: subject.yearNumber,
          });
        }
      }

      if (violations < bestViolationCount) {
        bestViolationCount = violations;
        bestMappingsForSubject = currentAttemptMappings;
        if (violations === 0) break; // Found a perfect one
      }
    }

    // Apply the best attempt
    for (const m of bestMappingsForSubject) {
      mappings.push(m);
      markFacultyForSection(m.sectionId, m.facultyId);
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

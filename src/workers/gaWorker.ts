import { GeneticAlgorithm } from '../core/geneticAlgorithm';
import { ConstraintEngine } from '../core/constraintEngine';
import { TimeSlotManager } from '../core/timeSlotManager';
import { PreFlightValidator } from '../core/preFlightValidator';


self.onmessage = (e: MessageEvent) => {
  const {
    faculty,
    subjects,
    sections,
    fixedClasses,
    careerPathClasses,
    facultyMappings,
    labRooms,
    labRoomMappings,
    config
  } = e.data;

  // --- PRE-FLIGHT VALIDATION ---
  const validation = PreFlightValidator.validate(subjects, sections, faculty || []);
  if (!validation.isValid) {
    self.postMessage({ 
      type: 'error', 
      message: `Scheduling is mathematically impossible:\n${validation.errors.join('\n')}` 
    });
    return;
  }

  try {
    const tsm = new TimeSlotManager();
    const ce = new ConstraintEngine(
      tsm,
      subjects,
      facultyMappings,
      labRooms,
    );

    const ga = new GeneticAlgorithm(
      ce, tsm, subjects, sections,
      fixedClasses, careerPathClasses,
      facultyMappings, labRooms, labRoomMappings,
      config  // ← If config is {60, 500, 0.2}, GA improved params ignored
    );

    const result = ga.run((gen, fitness) => {
      self.postMessage({ type: 'progress', gen, fitness });
    });

    self.postMessage({ type: 'result', result });
  } catch (error: any) {
    self.postMessage({ type: 'error', message: error.message });
  }
};

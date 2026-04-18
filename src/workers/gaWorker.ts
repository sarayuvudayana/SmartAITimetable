import { GeneticAlgorithm } from '../core/geneticAlgorithm';
import { ConstraintEngine } from '../core/constraintEngine';
import { TimeSlotManager } from '../core/timeSlotManager';

self.onmessage = (e: MessageEvent) => {
  const {
    subjects,
    sections,
    fixedClasses,
    careerPathClasses,
    facultyMappings,
    labRooms,
    labRoomMappings,
    config
  } = e.data;

  try {
    const tsm = new TimeSlotManager();
    const ce = new ConstraintEngine(
      tsm,
      subjects,
      facultyMappings,
      labRooms,
      labRoomMappings
    );

    const ga = new GeneticAlgorithm(
      ce,
      tsm,
      subjects,
      sections,
      fixedClasses,
      careerPathClasses,
      facultyMappings,
      labRooms,
      labRoomMappings,
      config
    );

    const result = ga.run((gen, fitness) => {
      self.postMessage({ type: 'progress', gen, fitness });
    });

    self.postMessage({ type: 'result', result });
  } catch (error: any) {
    self.postMessage({ type: 'error', message: error.message });
  }
};

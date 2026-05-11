import React, { useState, useCallback } from 'react';
import { useTimetable } from '@/contexts/TimetableContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Play, Square, AlertCircle, CheckCircle2, Database, Zap, Cpu, RotateCcw } from 'lucide-react';
import { TimeSlotManager } from '@/core/timeSlotManager';
import { ConstraintEngine } from '@/core/constraintEngine';
import { GeneticAlgorithm, GAResult } from '@/core/geneticAlgorithm';
import { buildFacultySectionMappings } from '@/core/facultySectionAssigner';
import { Subject, SubjectType, LabRoomMapping } from '@/types/timetable';
import GAWorker from '@/workers/gaWorker?worker';
import { Sparkles, Calculator, Loader2 } from 'lucide-react';

/** Build lab-room-to-section mappings for lab/integrated subjects before generation */
function buildLabRoomMappings(
  subjects: Subject[],
  sections: { id: string; yearNumber: number }[],
  labRooms: { id: string; subjectCodes: string[] }[],
): LabRoomMapping[] {
  const mappings: LabRoomMapping[] = [];
  if (labRooms.length === 0) return mappings;

  // Track lab room load for balanced assignment
  const labLoad = new Map<string, number>();

  for (const subject of subjects) {
    if (subject.subjectType === SubjectType.THEORY) continue;

    // Find eligible labs for this subject
    const eligibleLabs = labRooms.filter(l => l.subjectCodes.includes(subject.code));
    if (eligibleLabs.length === 0) continue;

    const yearSections = sections.filter(s => s.yearNumber === subject.yearNumber);
    for (const section of yearSections) {
      // Pick the lab with the lowest current load
      const sorted = [...eligibleLabs].sort((a, b) =>
        (labLoad.get(a.id) || 0) - (labLoad.get(b.id) || 0)
      );
      const chosenLab = sorted[0];
      mappings.push({
        subjectCode: subject.code,
        sectionId: section.id,
        labRoomId: chosenLab.id,
        yearNumber: subject.yearNumber,
      });
      labLoad.set(chosenLab.id, (labLoad.get(chosenLab.id) || 0) + 1);
    }
  }

  return mappings;
}

export default function Generate() {
  const { data, dispatch } = useTimetable();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<GAResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const validate = useCallback(() => {
    const errs: string[] = [];
    if (data.faculty.length === 0) errs.push('No faculty added');
    if (data.subjects.length === 0) errs.push('No subjects added');
    if (data.sections.length === 0) errs.push('No sections added');

    for (const sub of data.subjects) {
      if (!data.faculty.find((f) => f.id === sub.facultyId)) {
        errs.push(`Subject ${sub.code} references unknown faculty ${sub.facultyId}`);
      }
    }

    for (const fc of data.fixedClasses) {
      if (!data.subjects.find((s) => s.code === fc.subjectCode)) {
        errs.push(`Fixed class references unknown subject ${fc.subjectCode}`);
      }
    }

    // Validate career path years
    for (const cp of data.careerPathClasses) {
      if (cp.yearNumber < 3 || cp.yearNumber > 4) {
        errs.push(`Career path ${cp.subjectCode} has invalid year ${cp.yearNumber} (must be 3 or 4)`);
      }
    }

    return errs;
  }, [data]);

  const reset = () => {
    dispatch({ type: 'SET_TIMETABLE', payload: null });
    setResult(null);
    setProgress(0);
    setErrors([]);
  };

  const generate = useCallback(() => {
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setRunning(true);
    setProgress(0);
    setResult(null);

    // Build immutable faculty-section mappings
    const mappings = buildFacultySectionMappings(data.subjects, data.sections);
    dispatch({ type: 'SET_FACULTY_SECTION_MAPPINGS', payload: mappings });

    // Build lab room mappings
    const labMappings = buildLabRoomMappings(data.subjects, data.sections, data.labRooms);
    dispatch({ type: 'SET_LAB_ROOM_MAPPINGS', payload: labMappings });

    // Instantiate and run GA in a Web Worker
    const worker = new GAWorker();

    worker.postMessage({
      subjects: data.subjects,
      sections: data.sections,
      fixedClasses: data.fixedClasses,
      careerPathClasses: data.careerPathClasses,
      facultyMappings: mappings,
      labRooms: data.labRooms,
      labRoomMappings: labMappings,
      config: {
        populationSize: 60,      // ❌ Should be 100
        maxGenerations: 500,     // ❌ Should be 800
        mutationRate: 0.2        // ❌ Should be 0.25
      }
    });

    worker.onmessage = (e) => {
      const { type, gen, fitness, result, message } = e.data;
      if (type === 'progress') {
        setProgress(Math.min((gen / 500) * 100, 99.9));
      } else if (type === 'result') {
        setResult(result);
        setProgress(100);
        dispatch({ type: 'SET_TIMETABLE', payload: result.timetable });
        setRunning(false);
        worker.terminate();

        if (result.converged) {
          toast({ title: 'Perfect timetable generated!', description: `Converged at generation ${result.generation}` });
        } else {
          toast({ title: 'Best timetable found', description: `Fitness: ${result.fitness} (lower is better)` });
        }
      } else if (type === 'error') {
        toast({ title: 'Generation failed', description: message, variant: 'destructive' });
        setRunning(false);
        worker.terminate();
      }
    };

    worker.onerror = (err) => {
      console.error('Worker error:', err);
      toast({ title: 'Worker error', description: 'Timetable generation encountered a technical issue.', variant: 'destructive' });
      setRunning(false);
      worker.terminate();
    };
  }, [data, validate, dispatch]);

  return (
    <div className="p-6 space-y-8 animate-fade-in max-w-4xl mx-auto pb-24">
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">Generate Timetable</h1>
        <p className="text-sm text-muted-foreground mt-1 font-medium italic">Powered by Intelligent Genetic Optimization</p>
      </div>

      {errors.length > 0 && (
        <Card className="border-destructive">
          <CardContent className="p-3 space-y-1">
            {errors.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-destructive">
                <AlertCircle className="h-3 w-3 flex-shrink-0" /> {e}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2 border-slate-900/5 dark:border-white/5 shadow-xl">
          <CardHeader className="pb-3 border-b border-border/60 mb-4">
            <CardTitle className="text-base font-black flex items-center gap-2 uppercase tracking-widest">
              <Database className="h-5 w-5 text-primary" /> Configuration Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-xl bg-muted/50">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Faculty</span>
              <Badge className="font-black">{data.faculty.length}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-muted/50">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Subjects</span>
              <Badge className="font-black">{data.subjects.length}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-muted/50">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Sections</span>
              <Badge className="font-black">{data.sections.length}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-muted/50">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Fixed Classes</span>
              <Badge className="font-black">{data.fixedClasses.length}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-muted/50">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Career Paths</span>
              <Badge className="font-black">{data.careerPathClasses.length}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-muted/50">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Lab Rooms</span>
              <Badge className="font-black">{data.labRooms.length}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-slate-900/5 dark:border-white/5 shadow-xl">
          <CardHeader className="pb-3 border-b border-border/60 mb-4">
            <CardTitle className="text-base font-black flex items-center gap-2 uppercase tracking-widest">
              <Zap className="h-5 w-5 text-amber-500" /> Active Constraints
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              'Faculty Availability',
              'Section Conflicts',
              'Lab Room Requirements',
              'Integrated Lab Continuity',
              'Break/Lunch Guardrails',
              'No back-to-back faculty classes',
              'First-hour subject diversity',
              'Leisure only at 12:10–1:10 or 3:00–4:00',
              'Max 1 leisure/day',
              'No leisure at first period or after lunch',
              'Break: 11:00–11:10 (fixed)'
            ].map(c => (
              <div key={c} className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {c}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-slate-900/5 dark:border-white/5 shadow-xl">
        <CardHeader className="pb-3 border-b border-border/60 mb-4">
          <CardTitle className="text-base font-black flex items-center gap-2 uppercase tracking-widest">
            <Cpu className="h-5 w-5 text-blue-500" /> Genetic Algorithm Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground">
            <div className="flex flex-col items-center p-3 rounded-xl bg-muted/50">
              <span className="text-xs uppercase tracking-widest">Population Size</span>
              <Badge className="mt-1 font-black text-base">60</Badge>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-muted/50">
              <span className="text-xs uppercase tracking-widest">Max Generations</span>
              <Badge className="mt-1 font-black text-base">500</Badge>
            </div>
            <div className="flex flex-col items-center p-3 rounded-xl bg-muted/50">
              <span className="text-xs uppercase tracking-widest">Mutation Rate</span>
              <Badge className="mt-1 font-black text-base">20%</Badge>
            </div>
          </div>

          {running && (
            <div className="py-8 flex flex-col items-center justify-center space-y-6 animate-in fade-in zoom-in duration-500">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-dashed border-primary/30 animate-spin transition-all duration-1000" style={{ animationDuration: '6s' }}></div>
                <div className="absolute inset-2 rounded-full border-2 border-dashed border-accent/40 animate-spin-reverse" style={{ animationDuration: '4s' }}></div>

                <div className="z-10 bg-background p-4 rounded-xl shadow-xl flex items-center justify-center border-2 border-primary/20 animate-bounce">
                  <Sparkles className="h-10 w-10 text-yellow-500 animate-pulse" />
                </div>

                <div className="absolute -top-2 -right-2 bg-blue-500 p-1.5 rounded-lg shadow-lg animate-bounce" style={{ animationDelay: '0.2s' }}>
                  <Cpu className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -bottom-1 -left-1 bg-purple-500 p-1.5 rounded-lg shadow-lg animate-bounce" style={{ animationDelay: '0.4s' }}>
                  <Calculator className="h-4 w-4 text-white" />
                </div>
                <div className="absolute top-1/2 -left-4 -translate-y-1/2 bg-amber-500 p-1.5 rounded-lg shadow-lg animate-pulse">
                  <Zap className="h-4 w-4 text-white" />
                </div>
              </div>

              <div className="w-full space-y-3 px-4">
                <div className="flex justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wider italic">
                  <span>Simulating DNA...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2.5 bg-secondary/50" />
                <div className="flex items-center justify-center gap-2 text-xs text-primary font-medium">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Generating the best schedule for you...
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className={`p-3 rounded text-xs ${result.converged ? 'bg-primary/10 text-primary' : 'bg-accent/15 text-accent-foreground'}`}>
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                {result.converged ? 'Perfect Solution Found' : 'Best Solution Found'}
              </div>
              <p className="mt-1">Generation: {result.generation} | Fitness: {result.fitness}</p>
              <p>Sessions: {result.timetable.length}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={generate} disabled={running} className="flex-1">
              <Play className="h-4 w-4 mr-1" /> {running ? 'Running...' : 'Generate'}
            </Button>
            <Button variant="outline" onClick={reset} disabled={running}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

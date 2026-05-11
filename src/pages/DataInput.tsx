import React, { useState, useRef } from 'react';
import { useTimetable } from '@/contexts/TimetableContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Upload, Plus, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { Day, SubjectType, Faculty, Subject, Section, FixedClass, CareerPathClass, LabRoom } from '@/types/timetable';
import { parseFacultyCSV, parseSubjectCSV, parseSectionCSV, parseFixedClassCSV, parseCareerPathCSV } from '@/utils/csvParser';
import { DAYS, SLOT_DEFINITIONS } from '@/core/timeSlotManager';

function CSVUpload({ label, onParse }: { label: string; onParse: (text: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-2">
      <input
        ref={ref}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => onParse(ev.target?.result as string);
            reader.readAsText(file);
          }
        }}
      />
      <Button variant="outline" size="sm" onClick={() => ref.current?.click()}>
        <Upload className="h-3 w-3 mr-1" /> {label}
      </Button>
    </div>
  );
}

export default function DataInput() {
  const { data, dispatch } = useTimetable();

  // Faculty form
  const [facId, setFacId] = useState('');
  const [facName, setFacName] = useState('');

  // Faculty edit state
  const [editFacOpen, setEditFacOpen] = useState(false);
  const [editFac, setEditFac] = useState<Faculty | null>(null);
  const [editFacName, setEditFacName] = useState('');

  // Faculty delete confirmation
  const [deleteFacOpen, setDeleteFacOpen] = useState(false);
  const [deleteFacId, setDeleteFacId] = useState<string | null>(null);

  // Subject edit state
  const [editSubOpen, setEditSubOpen] = useState(false);
  const [editSub, setEditSub] = useState<Subject | null>(null);
  const [editSubFaculty, setEditSubFaculty] = useState('');
  const [editSubYear, setEditSubYear] = useState('1');
  const [editSubName, setEditSubName] = useState('');
  const [editSubHours, setEditSubHours] = useState('3');
  const [editSubLabHours, setEditSubLabHours] = useState('0');
  const [editSubEligible, setEditSubEligible] = useState<string[]>([]);
  const [editSubTheoryCredits, setEditSubTheoryCredits] = useState('3.0');
  const [editSubLabCredits, setEditSubLabCredits] = useState('1.0');

  const openEditSubject = (s: Subject) => {
    setEditSub(s);
    setEditSubFaculty(s.facultyId);
    setEditSubYear(String(s.yearNumber));
    setEditSubName(s.name);
    setEditSubHours(String(s.weeklyHours - (s.labHours || 0)));
    setEditSubLabHours(String((s.labHours || 0) / 2));
    setEditSubEligible(s.eligibleFacultyIds);
    setEditSubTheoryCredits(String(s.theoryCredits ?? (s.subjectType === SubjectType.LAB ? 0 : 3.0)));
    setEditSubLabCredits(String(s.labCredits ?? (s.subjectType === SubjectType.THEORY ? 0 : (s.subjectType === SubjectType.INTEGRATED ? 1.0 : 1.5))));
    setEditSubOpen(true);
  };

  const saveEditSubject = () => {
    if (!editSub) return;
    const theoryHrs = parseInt(editSubHours) || 0;
    const labSessions = parseInt(editSubLabHours) || 0;
    const labHrs = labSessions * 2;
    const totalHrs = theoryHrs + labHrs;
    
    let autoType = SubjectType.THEORY;
    if (labHrs > 0 && theoryHrs === 0) autoType = SubjectType.LAB;
    else if (labHrs > 0 && theoryHrs > 0) autoType = SubjectType.INTEGRATED;

    const updatedEligible = editSubEligible.includes(editSubFaculty)
      ? editSubEligible
      : [editSubFaculty, ...editSubEligible.filter(f => f !== editSub.facultyId)];

    const theoryC = parseFloat(editSubTheoryCredits) || 0;
    const labC = parseFloat(editSubLabCredits) || 0;
    
    dispatch({
      type: 'UPDATE_SUBJECT',
      payload: {
        ...editSub,
        name: editSubName.trim() || editSub.name,
        facultyId: editSubFaculty,
        yearNumber: parseInt(editSubYear),
        eligibleFacultyIds: updatedEligible,
        weeklyHours: totalHrs,
        labHours: labHrs,
        subjectType: autoType,
        credits: theoryC + labC,
        theoryCredits: theoryC,
        labCredits: labC,
      },
    });
    setEditSubOpen(false);
    toast({ title: 'Subject updated' });
  };
  const addFaculty = () => {
    if (!facId || !facName) return;
    if (data.faculty.find((f) => f.id === facId)) {
      toast({ title: 'Duplicate ID', variant: 'destructive' });
      return;
    }
    dispatch({ type: 'ADD_FACULTY', payload: { id: facId, shortName: facName } });
    setFacId(''); setFacName('');
  };

  const openEditFaculty = (f: Faculty) => {
    setEditFac(f);
    setEditFacName(f.shortName);
    setEditFacOpen(true);
  };

  const saveEditFaculty = () => {
    if (!editFac || !editFacName.trim()) return;
    dispatch({ type: 'UPDATE_FACULTY', payload: { id: editFac.id, shortName: editFacName.trim() } });
    setEditFacOpen(false);
    toast({ title: 'Faculty updated' });
  };

  const confirmDeleteFaculty = (fid: string) => {
    const isMapped = data.subjects.some(s => s.facultyId === fid || s.eligibleFacultyIds.includes(fid));
    if (isMapped) {
      setDeleteFacId(fid);
      setDeleteFacOpen(true);
    } else {
      dispatch({ type: 'REMOVE_FACULTY', payload: fid });
    }
  };

  const executeDeleteFaculty = () => {
    if (deleteFacId) {
      dispatch({ type: 'REMOVE_FACULTY', payload: deleteFacId });
      setDeleteFacOpen(false);
      setDeleteFacId(null);
    }
  };

  // Lab Room edit state
  const [editLabOpen, setEditLabOpen] = useState(false);
  const [editLab, setEditLab] = useState<LabRoom | null>(null);
  const [editLabName, setEditLabName] = useState('');
  const [editLabCapacity, setEditLabCapacity] = useState('30');
  const [editLabSubs, setEditLabSubs] = useState<string[]>([]);

  const openEditLab = (l: LabRoom) => {
    setEditLab(l);
    setEditLabName(l.name);
    setEditLabCapacity(String(l.capacity));
    setEditLabSubs(l.subjectCodes);
    setEditLabOpen(true);
  };

  const saveEditLab = () => {
    if (!editLab) return;
    dispatch({
      type: 'UPDATE_LAB_ROOM',
      payload: {
        ...editLab,
        name: editLabName,
        capacity: parseInt(editLabCapacity) || 30,
        subjectCodes: editLabSubs,
      }
    });
    setEditLabOpen(false);
    toast({ title: 'Lab Room updated' });
  };

  // Fixed Class edit state
  const [editFixedOpen, setEditFixedOpen] = useState(false);
  const [editFixedIndex, setEditFixedIndex] = useState<number | null>(null);
  const [editFixedSub, setEditFixedSub] = useState('');
  const [editFixedFac, setEditFixedFac] = useState('');
  const [editFixedYear, setEditFixedYear] = useState('1');
  const [editFixedSec, setEditFixedSec] = useState('');
  const [editFixedDay, setEditFixedDay] = useState<Day>(Day.MONDAY);
  const [editFixedSlot, setEditFixedSlot] = useState('0');

  const openEditFixed = (fc: FixedClass, index: number) => {
    setEditFixedIndex(index);
    setEditFixedSub(fc.subjectCode);
    setEditFixedFac(fc.facultyId);
    setEditFixedYear(String(fc.yearNumber));
    setEditFixedSec(fc.sectionId);
    setEditFixedDay(fc.day);
    setEditFixedSlot(String(fc.slotIndex));
    setEditFixedOpen(true);
  };

  const saveEditFixed = () => {
    if (editFixedIndex === null) return;
    const updated = [...data.fixedClasses];
    updated[editFixedIndex] = {
      subjectCode: editFixedSub,
      facultyId: editFixedFac,
      yearNumber: parseInt(editFixedYear),
      sectionId: editFixedSec,
      day: editFixedDay,
      slotIndex: parseInt(editFixedSlot),
    };
    dispatch({ type: 'SET_FIXED_CLASSES', payload: updated });
    setEditFixedOpen(false);
    toast({ title: 'Fixed Class updated' });
  };

  // Career Path edit state
  const [editCpOpen, setEditCpOpen] = useState(false);
  const [editCpIndex, setEditCpIndex] = useState<number | null>(null);
  const [editCpFaculties, setEditCpFaculties] = useState<string[]>([]);
  const [editCpYear, setEditCpYear] = useState('3');
  const [editCpDay, setEditCpDay] = useState<Day>(Day.MONDAY);
  const [editCpSlot, setEditCpSlot] = useState('0');
  const [editCpType, setEditCpType] = useState<'theory' | 'lab'>('theory');
  const [editCpCredits, setEditCpCredits] = useState('2.0');

  const openEditCp = (cp: CareerPathClass, index: number) => {
    setEditCpIndex(index);
    setEditCpFaculties(cp.facultyIds || []);
    setEditCpYear(String(cp.yearNumber));
    setEditCpDay(cp.day);
    setEditCpSlot(String(cp.slotIndex));
    setEditCpType(cp.slotType);
    setEditCpCredits(String(cp.credits || 2.0));
    setEditCpOpen(true);
  };

  const saveEditCp = () => {
    if (editCpIndex === null) return;
    const updated = [...data.careerPathClasses];
    updated[editCpIndex] = {
      subjectCode: 'career',
      facultyIds: editCpFaculties,
      yearNumber: parseInt(editCpYear),
      day: editCpDay,
      slotIndex: parseInt(editCpSlot),
      slotType: editCpType,
      credits: parseFloat(editCpCredits) || 2.0,
    };
    dispatch({ type: 'SET_CAREER_CLASSES', payload: updated });
    setEditCpOpen(false);
    toast({ title: 'Career Path updated' });
  };

  // Subject form
  const [subCode, setSubCode] = useState('');
  const [subName, setSubName] = useState('');
  const [subFaculty, setSubFaculty] = useState('');
  const [subEligibleFaculty, setSubEligibleFaculty] = useState<string[]>([]);
  const [subHours, setSubHours] = useState('3');
  const [subTheoryCredits, setSubTheoryCredits] = useState('3.0');
  const [subLabCredits, setSubLabCredits] = useState('0');
  const [subLabHours, setSubLabHours] = useState('0');
  const [subYear, setSubYear] = useState('1');
  const [subType, setSubType] = useState<SubjectType>(SubjectType.THEORY);
  const [subLinkedCode, setSubLinkedCode] = useState(''); // Lab Course Code for Theory+Lab subjects

  const toggleEligibleFaculty = (fid: string) => {
    setSubEligibleFaculty(prev =>
      prev.includes(fid) ? prev.filter(f => f !== fid) : [...prev, fid]
    );
  };

  const addSubject = () => {
    if (!subCode || !subName || !subFaculty) return;
    const theoryHrs = parseInt(subHours) || 0;
    const labSessionsCount = parseInt(subLabHours) || 0;
    const labHrs = labSessionsCount * 2; // Each lab session is 2 hours
    const totalHrs = theoryHrs + labHrs;
    if (totalHrs <= 0) {
      toast({ title: 'Total hours must be > 0', variant: 'destructive' });
      return;
    }
    // Auto-determine type: lab only, theory only, or integrated (both)
    const theoryC = parseFloat(subTheoryCredits) || 0;
    const labC = parseFloat(subLabCredits) || 0;
    const autoType = theoryHrs > 0 && labHrs > 0 ? SubjectType.INTEGRATED : (labHrs > 0 ? SubjectType.LAB : SubjectType.THEORY);
    const eligibleFacultyIds = [...new Set([subFaculty, ...subEligibleFaculty])];
    
    dispatch({
      type: 'ADD_SUBJECT',
      payload: {
        code: subCode, name: subName, facultyId: subFaculty,
        eligibleFacultyIds,
        weeklyHours: totalHrs, subjectType: subType || autoType,
        labHours: labHrs, yearNumber: parseInt(subYear),
        credits: theoryC + labC,
        theoryCredits: theoryC,
        labCredits: labC,
        linkedSubjectCode: subLinkedCode || undefined,
      },
    });
    setSubCode(''); 
    setSubName(''); 
    setSubHours('3');
    setSubLabHours('0');
    setSubTheoryCredits('3.0'); 
    setSubLabCredits('0');
    setSubEligibleFaculty([]);
    setSubLinkedCode('');
    setSubType(SubjectType.THEORY);
  };

  // Section form
  const [secId, setSecId] = useState('');
  const [secYear, setSecYear] = useState('1');
  const [secName, setSecName] = useState('');

  const addSection = () => {
    if (!secId || !secName) return;
    dispatch({ type: 'ADD_SECTION', payload: { id: secId, yearNumber: parseInt(secYear), name: secName } });
    setSecId(''); setSecName('');
  };

  // Fixed class form
  const [fcSubject, setFcSubject] = useState('');
  const [fcFaculty, setFcFaculty] = useState('');
  const [fcYear, setFcYear] = useState('1');
  const [fcSection, setFcSection] = useState('');
  const [fcDay, setFcDay] = useState<Day>(Day.MONDAY);
  const [fcSlot, setFcSlot] = useState('0');

  const addFixed = () => {
    if (!fcSubject || !fcFaculty || !fcSection) return;
    const conflict = data.fixedClasses.find(
      (f) => f.facultyId === fcFaculty && f.day === fcDay && f.slotIndex === parseInt(fcSlot)
    );
    if (conflict) {
      toast({ title: 'Faculty already occupied at this slot', variant: 'destructive' });
      return;
    }
    dispatch({
      type: 'ADD_FIXED_CLASS',
      payload: {
        subjectCode: fcSubject, facultyId: fcFaculty, yearNumber: parseInt(fcYear),
        sectionId: fcSection, day: fcDay, slotIndex: parseInt(fcSlot),
      },
    });
  };

  // Career path form
  const [cpFaculties, setCpFaculties] = useState<string[]>([]);
  const [cpYear, setCpYear] = useState('3');
  const [cpDay, setCpDay] = useState<Day>(Day.MONDAY);
  const [cpSlot, setCpSlot] = useState('0');
  const [cpSlotType, setCpSlotType] = useState<'theory' | 'lab'>('theory');
  const [cpCredits, setCpCredits] = useState('2.0');

  const toggleCpFaculty = (fid: string) => {
    setCpFaculties(prev =>
      prev.includes(fid) ? prev.filter(f => f !== fid) : [...prev, fid]
    );
  };

  const addCareer = () => {
    if (cpFaculties.length === 0) {
      toast({ title: 'Select at least one faculty', variant: 'destructive' });
      return;
    }
    const yearNum = parseInt(cpYear);
    const slotIdx = parseInt(cpSlot);
    if (yearNum < 3 || yearNum > 4) {
      toast({ title: 'Career path is only allowed for 3rd and 4th year', variant: 'destructive' });
      return;
    }
    
    // Add primary slot
    dispatch({
      type: 'ADD_CAREER_CLASS',
      payload: {
        subjectCode: 'career', facultyIds: cpFaculties,
        yearNumber: yearNum, day: cpDay, slotIndex: slotIdx,
        slotType: cpSlotType,
        credits: parseFloat(cpCredits) || 2.0,
      },
    });

    // If Lab, auto-add 2nd slot
    if (cpSlotType === 'lab' && slotIdx < 5) {
      dispatch({
        type: 'ADD_CAREER_CLASS',
        payload: {
          subjectCode: 'career', facultyIds: cpFaculties,
          yearNumber: yearNum, day: cpDay, slotIndex: slotIdx + 1,
          slotType: cpSlotType,
        },
      });
    }
    toast({ title: cpSlotType === 'lab' ? 'Career Lab block added (2hrs)' : 'Career Theory added' });
    setCpFaculties([]);
  };

  // Lab room form
  const [labId, setLabId] = useState('');
  const [labName, setLabName] = useState('');
  const [labCapacity, setLabCapacity] = useState('30');
  const [labSubjects, setLabSubjects] = useState<string[]>([]);

  const toggleLabSubject = (code: string) => {
    setLabSubjects(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const addLabRoom = () => {
    if (!labId || !labName) return;
    if (data.labRooms.find(l => l.id === labId)) {
      toast({ title: 'Duplicate Lab ID', variant: 'destructive' });
      return;
    }
    dispatch({
      type: 'ADD_LAB_ROOM',
      payload: { id: labId, name: labName, capacity: parseInt(labCapacity), subjectCodes: labSubjects },
    });
    setLabId(''); setLabName(''); setLabCapacity('30'); setLabSubjects([]);
    toast({ title: 'Lab room added' });
  };

  const hasGeneratedTimetable = !!data.generatedTimetable;

  return (
    <div className="p-6 space-y-8 animate-fade-in max-w-6xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Data Management</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Configure faculty, subjects, and scheduling constraints</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="px-3 py-1 text-xs font-bold uppercase tracking-wider">
            {data.faculty.length} Faculty
          </Badge>
          <Badge variant="secondary" className="px-3 py-1 text-xs font-bold uppercase tracking-wider">
            {data.subjects.length} Subjects
          </Badge>
        </div>
      </div>

      {hasGeneratedTimetable && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
          <span className="font-semibold">⚠ Timetable already generated.</span>
          <span>Any changes here will require re-generation.</span>
        </div>
      )}

      <Tabs defaultValue="faculty" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 h-auto p-1 bg-muted/50 rounded-xl mb-6">
          <TabsTrigger value="faculty" className="py-2.5 px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md text-sm font-bold">Faculty</TabsTrigger>
          <TabsTrigger value="subjects" className="py-2.5 px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md text-sm font-bold">Subjects</TabsTrigger>
          <TabsTrigger value="sections" className="py-2.5 px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md text-sm font-bold">Sections</TabsTrigger>
          <TabsTrigger value="labRooms" className="py-2.5 px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md text-sm font-bold">Lab Rooms</TabsTrigger>
          <TabsTrigger value="fixed" className="py-2.5 px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md text-sm font-bold">Fixed</TabsTrigger>
          <TabsTrigger value="career" className="py-2.5 px-4 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md text-sm font-bold">Career</TabsTrigger>
        </TabsList>

        {/* FACULTY */}
        <TabsContent value="faculty">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-black uppercase tracking-widest">Faculty ({data.faculty.length})</CardTitle>
                <CSVUpload label="CSV" onParse={(t) => {
                  const parsed = parseFacultyCSV(t);
                  dispatch({ type: 'SET_FACULTY', payload: [...data.faculty, ...parsed] });
                  toast({ title: `${parsed.length} faculty imported` });
                }} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-sm font-bold mb-1.5 block">ID</Label><Input value={facId} onChange={(e) => setFacId(e.target.value)} placeholder="F001" className="h-8 text-sm" /></div>
                <div><Label className="text-sm font-bold mb-1.5 block">Short Name</Label><Input value={facName} onChange={(e) => setFacName(e.target.value)} placeholder="Dr.K" className="h-8 text-sm" /></div>
              </div>
              <Button size="sm" onClick={addFaculty} className="w-full"><Plus className="h-3 w-3 mr-1" /> Add Faculty</Button>
              <div className="space-y-3 mt-4 max-h-96 overflow-auto custom-scrollbar">
                {data.faculty.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-5 bg-muted/40 rounded-[1.5rem] border border-border/50 transition-all hover:bg-muted/60 hover:shadow-lg group">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xl font-black tracking-tighter text-foreground uppercase group-hover:text-primary transition-colors">{f.shortName}</span>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs font-black uppercase tracking-widest border-border/60">ID: {f.id}</Badge>
                        <Badge variant="secondary" className="text-xs font-black uppercase tracking-[0.1em] bg-primary/10 text-primary border-none">Active Faculty</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-primary/10 rounded-xl" onClick={() => openEditFaculty(f)}>
                        <Pencil className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-muted-destructive rounded-xl" onClick={() => confirmDeleteFaculty(f.id)}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUBJECTS */}
        <TabsContent value="subjects">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-black uppercase tracking-widest">Subjects ({data.subjects.length})</CardTitle>
                <CSVUpload label="CSV" onParse={(t) => {
                  const parsed = parseSubjectCSV(t);
                  dispatch({ type: 'SET_SUBJECTS', payload: [...data.subjects, ...parsed] });
                  toast({ title: `${parsed.length} subjects imported` });
                }} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-sm font-bold mb-1.5 block">Code</Label><Input value={subCode} onChange={(e) => {
                setSubCode(e.target.value);
                // Auto-suggest lab code for Theory+Lab subjects
                if (subType === SubjectType.THEORY_LAB) {
                  setSubLinkedCode(e.target.value + 'L');
                }
              }} placeholder="CS101" className="h-8 text-sm" /></div>
                <div><Label className="text-sm font-bold mb-1.5 block">Name</Label><Input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="Data Structures" className="h-8 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-sm font-bold mb-1.5 block">Faculty</Label>
                  <Select value={subFaculty} onValueChange={setSubFaculty}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{data.faculty.map((f) => <SelectItem key={f.id} value={f.id}>{f.shortName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-sm font-bold mb-1.5 block">Year</Label><Input type="number" value={subYear} onChange={(e) => setSubYear(e.target.value)} min="1" max="4" className="h-8 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <Label className="text-sm font-bold mb-1.5 block">Theory Hrs/Week</Label>
                  <Input 
                    type="number" 
                    value={subHours} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setSubHours(val);
                      if (parseFloat(val) > 0) setSubTheoryCredits('3.0');
                      else setSubTheoryCredits('0');
                    }} 
                    min="0" 
                    className="h-8 text-sm" 
                  />
                </div>
                <div>
                  <Label className="text-sm font-bold mb-1.5 block">Lab Sessions (2h each)</Label>
                  <Input 
                    type="number" 
                    value={subLabHours} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setSubLabHours(val);
                      if (parseFloat(val) > 0) {
                        const th = parseFloat(subHours) || 0;
                        setSubLabCredits(th > 0 ? '1.0' : '1.5');
                      } else {
                        setSubLabCredits('0');
                      }
                    }} 
                    min="0" 
                    className="h-8 text-sm" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-sm font-bold mb-1.5 block text-primary/80">Theory Credits</Label>
                  <Input type="number" step="0.5" value={subTheoryCredits} onChange={(e) => setSubTheoryCredits(e.target.value)} min="0" className="h-8 text-sm border-primary/20" />
                </div>
                <div>
                  <Label className="text-sm font-bold mb-1.5 block text-primary/80">Lab Credits</Label>
                  <Input type="number" step="0.5" value={subLabCredits} onChange={(e) => setSubLabCredits(e.target.value)} min="0" className="h-8 text-sm border-primary/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <Label className="text-sm font-bold mb-1.5 block">Category</Label>
                  <Select 
                    value={subType} 
                    onValueChange={(val: SubjectType) => {
                      setSubType(val);
                      if (val === SubjectType.INTEGRATED) {
                        setSubHours('3');
                        setSubLabHours('1'); // 1 session = 2h
                        setSubTheoryCredits('3.0');
                        setSubLabCredits('1.0');
                      } else if (val === SubjectType.THEORY_LAB) {
                        setSubHours('4');
                        setSubLabHours('1');
                        setSubTheoryCredits('4.0');
                        setSubLabCredits('1.0');
                      } else if (val === SubjectType.LAB) {
                        setSubHours('0');
                        setSubLabHours('1');
                        setSubTheoryCredits('0');
                        setSubLabCredits('1.5');
                      } else {
                        setSubHours('3');
                        setSubLabHours('0');
                        setSubTheoryCredits('3.0');
                        setSubLabCredits('0');
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SubjectType.THEORY}>Theory Only</SelectItem>
                      <SelectItem value={SubjectType.LAB}>Lab Only</SelectItem>
                      <SelectItem value={SubjectType.INTEGRATED}>Integrated (3+2)</SelectItem>
                      <SelectItem value={SubjectType.THEORY_LAB}>Theory+Lab (Split Codes)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {subType === SubjectType.THEORY_LAB && (
                  <div>
                    <Label className="text-sm font-bold mb-1.5 block text-amber-600 dark:text-amber-400">
                      Lab Course Code
                    </Label>
                    <Input
                      value={subLinkedCode}
                      onChange={(e) => setSubLinkedCode(e.target.value.toUpperCase())}
                      placeholder={`${subCode || 'CS101'}L`}
                      className="h-8 text-sm border-amber-500/40 focus:border-amber-500"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                      The separate course code for the Lab portion (e.g. CS101L). Same faculty teaches both.
                    </p>
                  </div>
                )}
              </div>
              {data.faculty.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-black uppercase tracking-tight text-foreground/70">Additional Eligible Faculty (Click to Select)</Label>
                  <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-2xl border border-border/40">
                    {data.faculty.filter(f => f.id !== subFaculty).map(f => (
                      <Badge
                        key={f.id}
                        variant={subEligibleFaculty.includes(f.id) ? 'default' : 'outline'}
                        className={cn(
                          "text-sm font-bold px-4 py-2 cursor-pointer transition-all uppercase tracking-tight",
                          subEligibleFaculty.includes(f.id) ? "shadow-md shadow-primary/20 scale-105" : "hover:bg-muted/50"
                        )}
                        onClick={() => toggleEligibleFaculty(f.id)}
                      >
                        {f.shortName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <Button size="sm" onClick={addSubject} className="w-full"><Plus className="h-3 w-3 mr-1" /> Add Subject</Button>
              <div className="space-y-3 mt-4 max-h-96 overflow-auto pr-2 custom-scrollbar">
                {data.subjects.map((s) => (
                  <div key={s.code} className="p-5 bg-muted/40 rounded-[2rem] border border-border/50 space-y-3 transition-all hover:bg-muted/60 hover:shadow-xl group">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-xl font-black tracking-tighter text-foreground uppercase leading-tight group-hover:text-primary transition-colors">{s.code} — {s.name}</span>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs font-black uppercase tracking-widest border-primary/30 text-primary px-3 py-1 bg-primary/5">
                            {s.credits === 2 ? "EMPLOYABILITY SKILLS" : (s.credits === 4 ? "INTEGRATED" : (s.credits && s.credits > 4 ? "(THEORY+LAB)" : s.subjectType))}
                          </Badge>
                          <Badge variant="secondary" className="text-xs font-black uppercase tracking-[0.1em] px-3 py-1">{s.weeklyHours}h/w</Badge>
                          {s.credits !== undefined && <Badge variant="secondary" className="text-xs font-black uppercase tracking-[0.1em] px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400">{s.credits} Credits</Badge>}
                          <Badge variant="secondary" className="text-xs font-black uppercase tracking-[0.1em] px-3 py-1">Year {s.yearNumber}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-primary/10 rounded-xl" onClick={() => openEditSubject(s)}>
                          <Pencil className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-muted-destructive rounded-xl" onClick={() => dispatch({ type: 'REMOVE_SUBJECT', payload: s.code })}>
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                    {s.eligibleFacultyIds.length > 0 && (
                      <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-border/20">
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mr-2">Assigned Faculty:</span>
                        {s.eligibleFacultyIds.map(fid => (
                          <Badge key={fid} variant="outline" className="text-xs font-bold px-3 py-1 border-border/60 bg-white/5 uppercase tracking-tight">
                            {data.faculty.find(f => f.id === fid)?.shortName || fid}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECTIONS */}
        <TabsContent value="sections">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-black uppercase tracking-widest">Sections ({data.sections.length})</CardTitle>
                <CSVUpload label="CSV" onParse={(t) => {
                  const parsed = parseSectionCSV(t);
                  dispatch({ type: 'SET_SECTIONS', payload: [...data.sections, ...parsed] });
                  toast({ title: `${parsed.length} sections imported` });
                }} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-sm font-bold mb-1.5 block">ID</Label><Input value={secId} onChange={(e) => setSecId(e.target.value)} placeholder="1A" className="h-8 text-sm" /></div>
                <div><Label className="text-sm font-bold mb-1.5 block">Year</Label><Input type="number" value={secYear} onChange={(e) => setSecYear(e.target.value)} className="h-8 text-sm" /></div>
                <div><Label className="text-sm font-bold mb-1.5 block">Name</Label><Input value={secName} onChange={(e) => setSecName(e.target.value)} placeholder="A" className="h-8 text-sm" /></div>
              </div>
              <Button size="sm" onClick={addSection} className="w-full"><Plus className="h-3 w-3 mr-1" /> Add Section</Button>
              <div className="flex flex-wrap gap-3 mt-4 max-h-96 overflow-auto">
                {data.sections.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-4 bg-muted/40 rounded-[1.5rem] border border-border/50 transition-all hover:bg-muted/60 hover:shadow-lg w-full">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xl font-black tracking-tighter text-foreground uppercase">{s.name}</span>
                      <div className="flex gap-3">
                        <Badge className="text-xs font-black uppercase tracking-widest bg-primary/10 text-primary border-none">Year {s.yearNumber}</Badge>
                        <Badge variant="outline" className="text-xs font-black uppercase tracking-widest border-border/60">ID: {s.id}</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => dispatch({ type: 'REMOVE_SECTION', payload: s.id })}>
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LAB ROOMS */}
        <TabsContent value="labRooms">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-black uppercase tracking-widest">Lab Rooms ({data.labRooms.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-sm font-bold mb-1.5 block">Lab ID</Label><Input value={labId} onChange={(e) => setLabId(e.target.value)} placeholder="LAB-1" className="h-8 text-sm" /></div>
                <div><Label className="text-sm font-bold mb-1.5 block">Lab Name</Label><Input value={labName} onChange={(e) => setLabName(e.target.value)} placeholder="CS Lab 1" className="h-8 text-sm" /></div>
                <div><Label className="text-sm font-bold mb-1.5 block">Capacity</Label><Input type="number" value={labCapacity} onChange={(e) => setLabCapacity(e.target.value)} className="h-8 text-sm" /></div>
              </div>
              {data.subjects.filter(s => s.subjectType !== SubjectType.THEORY).length > 0 && (
                <div>
                  <Label className="text-sm font-bold mb-1.5 block">Subjects Assigned to This Lab</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {data.subjects.filter(s => s.subjectType !== SubjectType.THEORY).map(s => (
                      <Badge
                        key={s.code}
                        variant={labSubjects.includes(s.code) ? 'default' : 'outline'}
                        className="text-sm font-bold px-3 py-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95 uppercase tracking-tight shadow-sm"
                        onClick={() => toggleLabSubject(s.code)}
                      >
                        {s.code}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <Button size="sm" onClick={addLabRoom} className="w-full"><Plus className="h-3 w-3 mr-1" /> Add Lab Room</Button>
              <div className="space-y-3 mt-4 max-h-96 overflow-auto custom-scrollbar">
                {data.labRooms.map((lab) => (
                  <div key={lab.id} className="flex items-center justify-between p-5 bg-muted/40 rounded-[2rem] border border-border/50 group transition-all hover:bg-muted/60 hover:shadow-lg">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-black tracking-tighter text-foreground uppercase leading-tight group-hover:text-primary transition-colors">{lab.name}</span>
                        <Badge variant="outline" className="text-xs font-black uppercase tracking-widest border-border/60">ID: {lab.id}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="outline" className="text-xs font-black uppercase tracking-widest border-amber-500/30 text-amber-600 bg-amber-500/5 px-3 py-1">Capacity: {lab.capacity}</Badge>
                        {lab.subjectCodes.length > 0 && (
                          <Badge variant="secondary" className="text-xs font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 px-3 py-1 border-none">{lab.subjectCodes.length} Subjects Assigned</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-primary/10 rounded-xl group-hover:scale-110 transition-transform" onClick={() => openEditLab(lab)}>
                        <Pencil className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-muted-destructive rounded-xl group-hover:scale-110 transition-transform" onClick={() => dispatch({ type: 'REMOVE_LAB_ROOM', payload: lab.id })}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {data.labRooms.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">Add lab rooms to enable lab-aware scheduling. Each lab session will be assigned a specific room, and no two sessions can use the same room simultaneously.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FIXED CLASSES */}
        <TabsContent value="fixed">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-black uppercase tracking-widest">Fixed Classes ({data.fixedClasses.length})</CardTitle>
                <CSVUpload label="CSV" onParse={(t) => {
                  const parsed = parseFixedClassCSV(t);
                  dispatch({ type: 'SET_FIXED_CLASSES', payload: [...data.fixedClasses, ...parsed] });
                  toast({ title: `${parsed.length} fixed classes imported` });
                }} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-sm font-bold mb-1.5 block">Subject</Label>
                  <Select value={fcSubject} onValueChange={setFcSubject}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{data.subjects.map((s) => <SelectItem key={s.code} value={s.code}>{s.code}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-bold mb-1.5 block">Faculty</Label>
                  <Select value={fcFaculty} onValueChange={setFcFaculty}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{data.faculty.map((f) => <SelectItem key={f.id} value={f.id}>{f.shortName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-sm font-bold mb-1.5 block">Year</Label><Input type="number" value={fcYear} onChange={(e) => setFcYear(e.target.value)} className="h-8 text-sm" /></div>
                <div>
                  <Label className="text-sm font-bold mb-1.5 block">Section</Label>
                  <Select value={fcSection} onValueChange={setFcSection}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sec" /></SelectTrigger>
                    <SelectContent>{data.sections.filter(s => s.yearNumber === parseInt(fcYear)).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-bold mb-1.5 block">Day</Label>
                  <Select value={fcDay} onValueChange={(v) => setFcDay(v as Day)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map((d) => <SelectItem key={d} value={d}>{d.slice(0, 3)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-sm font-bold mb-1.5 block">Slot</Label>
                <Select value={fcSlot} onValueChange={setFcSlot}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{SLOT_DEFINITIONS.slice(0, 6).map((s) => <SelectItem key={s.slotIndex} value={String(s.slotIndex)}>{s.startTime}-{s.endTime}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={addFixed} className="w-full"><Plus className="h-3 w-3 mr-1" /> Add Fixed Class</Button>
              <div className="space-y-3 mt-4 max-h-96 overflow-auto custom-scrollbar">
                {data.fixedClasses.map((fc, i) => (
                  <div key={i} className="flex items-center justify-between p-5 bg-muted/40 rounded-[1.5rem] border border-border/50 transition-all hover:bg-muted/60 hover:shadow-lg group">
                    <div className="flex flex-col gap-1">
                      <span className="text-xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors underline underline-offset-4 decoration-primary/30 uppercase">{fc.subjectCode} — Section {fc.sectionId}</span>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge className="text-xs font-black uppercase tracking-widest bg-primary/10 text-primary border-none">{fc.day}</Badge>
                        <Badge variant="outline" className="text-xs font-black uppercase tracking-widest border-border/60">Slot {fc.slotIndex}</Badge>
                        <Badge variant="outline" className="text-xs font-black uppercase tracking-widest border-border/60">Year {fc.yearNumber}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-primary/10 rounded-xl transition-all" onClick={() => openEditFixed(fc, i)}>
                        <Pencil className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-muted-destructive rounded-xl transition-all" onClick={() => dispatch({ type: 'REMOVE_FIXED_CLASS', payload: i })}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CAREER PATH */}
        <TabsContent value="career">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-black uppercase tracking-widest">Career Path ({data.careerPathClasses.length})</CardTitle>
                <CSVUpload label="CSV" onParse={(t) => {
                  const parsed = parseCareerPathCSV(t);
                  dispatch({ type: 'SET_CAREER_CLASSES', payload: [...data.careerPathClasses, ...parsed] });
                  toast({ title: `${parsed.length} career path classes imported` });
                }} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-2 rounded bg-muted/50 text-xs text-muted-foreground font-medium">
                Career path classes are allowed only for <strong>3rd and 4th year</strong>. They are scheduled simultaneously across all sections of the selected year.
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-black uppercase tracking-widest text-primary opacity-80">Select Careers Faculty (AI, Web, Cyber, Cloud)</Label>
                <div className="flex flex-wrap gap-1.5 p-3 bg-muted/40 rounded-xl border border-border/50 max-h-40 overflow-auto custom-scrollbar shadow-inner">
                  {data.faculty.map(f => (
                    <Badge 
                      key={f.id} 
                      variant={cpFaculties.includes(f.id) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer text-[11px] font-black py-1.5 px-3 uppercase tracking-tighter transition-all hover:scale-105 active:scale-95",
                        cpFaculties.includes(f.id) ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/10"
                      )}
                      onClick={() => toggleCpFaculty(f.id)}
                    >
                      {f.shortName}
                    </Badge>
                  ))}
                </div>
                {cpFaculties.length > 0 && (
                  <div className="text-[10px] font-black uppercase text-primary tracking-widest px-1">
                    Selected: {cpFaculties.map(fid => data.faculty.find(f => f.id === fid)?.shortName).join(', ')}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-sm font-bold mb-1.5 block">Year</Label>
                  <Select value={cpYear} onValueChange={setCpYear}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-bold mb-1.5 block">Day</Label>
                  <Select value={cpDay} onValueChange={(v) => setCpDay(v as Day)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map((d) => <SelectItem key={d} value={d}>{d.slice(0, 3)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-bold mb-1.5 block">Slot</Label>
                  <Select value={cpSlot} onValueChange={setCpSlot}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{SLOT_DEFINITIONS.slice(0, 6).map((s) => <SelectItem key={s.slotIndex} value={String(s.slotIndex)}>{s.startTime}-{s.endTime}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-bold mb-1.5 block">Slot Type</Label>
                  <RadioGroup value={cpSlotType} onValueChange={(v) => setCpSlotType(v as 'theory' | 'lab')} className="flex gap-4 mt-1">
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="theory" id="cp-theory" />
                      <Label htmlFor="cp-theory" className="text-xs">Theory</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="lab" id="cp-lab" />
                      <Label htmlFor="cp-lab" className="text-xs">Lab</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label className="text-sm font-black mb-1.5 block px-1 text-primary">Credits</Label>
                  <Input type="number" step="0.5" value={cpCredits} onChange={(e) => setCpCredits(e.target.value)} min="0" max="5" className="h-9 text-base font-black border-primary/20" />
                </div>
              </div>
              <Button size="sm" onClick={addCareer} className="w-full"><Plus className="h-3 w-3 mr-1" /> Add Career Path</Button>
              <div className="space-y-3 mt-4 max-h-96 overflow-auto custom-scrollbar">
                {data.careerPathClasses.map((cp, i) => (
                  <div key={i} className="flex items-center justify-between p-5 bg-muted/40 rounded-[2rem] border border-border/50 transition-all hover:bg-muted/60 hover:shadow-lg group">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-black tracking-tighter text-foreground uppercase group-hover:text-primary transition-all">Year {cp.yearNumber} — {cp.subjectCode}</span>
                        <Badge variant="outline" className="text-xs font-black uppercase tracking-widest border-primary/40 text-primary bg-primary/5 px-3 py-1">{cp.slotType}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {cp.facultyIds?.map(fid => (
                          <Badge key={fid} variant="secondary" className="text-[10px] font-black uppercase tracking-widest bg-slate-900/5 dark:bg-white/5 border border-border/50">
                            {data.faculty.find(f => f.id === fid)?.shortName || fid}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge className="text-xs font-black uppercase tracking-widest bg-muted text-muted-foreground border-none px-3 py-1">{cp.day}</Badge>
                        <Badge variant="outline" className="text-xs font-black uppercase tracking-widest border-border/60 px-3 py-1">Slot Index: {cp.slotIndex}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-primary/10 rounded-xl transition-transform hover:scale-110" onClick={() => openEditCp(cp, i)}>
                        <Pencil className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-muted-destructive rounded-xl transition-transform hover:scale-110" onClick={() => dispatch({ type: 'REMOVE_CAREER_CLASS', payload: i })}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Faculty Edit Dialog */}
      <Dialog open={editFacOpen} onOpenChange={setEditFacOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit Faculty</DialogTitle>
          </DialogHeader>
          {editFac && (
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-bold mb-1.5 block">Faculty ID (e.g., 101)</Label>
                <Input value={editFac.id} disabled className="h-8 text-sm bg-muted" />
              </div>
              <div>
                <Label className="text-sm font-black mb-1.5 block px-1">Short Name (Ex: ABC)</Label>
                <Input value={editFacName} onChange={(e) => setEditFacName(e.target.value)} className="h-10 text-base font-bold shadow-sm focus:ring-primary/20" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditFacOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={saveEditFaculty}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Faculty Delete Confirmation */}
      <AlertDialog open={deleteFacOpen} onOpenChange={setDeleteFacOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Faculty?</AlertDialogTitle>
            <AlertDialogDescription>
              This faculty is currently mapped to one or more subjects. Deleting will remove the mapping. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDeleteFaculty}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Subject Edit Dialog */}
      <Dialog open={editSubOpen} onOpenChange={setEditSubOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit Subject: {editSub?.code}</DialogTitle>
          </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-black mb-1.5 block px-1">Subject Name</Label>
                <Input value={editSubName} onChange={e => setEditSubName(e.target.value)} className="h-11 text-lg font-black tracking-tight" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-black mb-1.5 block px-1">Theory Hrs/Week</Label>
                  <Input type="number" value={editSubHours} onChange={e => setEditSubHours(e.target.value)} className="h-11 text-lg font-black" />
                </div>
                <div>
                  <Label className="text-sm font-black mb-1.5 block px-1">Lab Sessions/Week</Label>
                  <Input type="number" value={editSubLabHours} onChange={e => setEditSubLabHours(e.target.value)} className="h-11 text-lg font-black" />
                </div>
                <div>
                  <Label className="text-sm font-black mb-1.5 block px-1">Theory Credits</Label>
                  <Input type="number" step="0.5" value={editSubTheoryCredits} onChange={e => setEditSubTheoryCredits(e.target.value)} min="0" max="5" className="h-11 text-lg font-black" />
                </div>
                <div>
                  <Label className="text-sm font-black mb-1.5 block px-1">Lab Credits</Label>
                  <Input type="number" step="0.5" value={editSubLabCredits} onChange={e => setEditSubLabCredits(e.target.value)} min="0" max="5" className="h-11 text-lg font-black" />
                </div>
              </div>
              <div>
                <Label className="text-sm font-black mb-1.5 block px-1 text-primary">Assigned Faculty</Label>
                <Select value={editSubFaculty} onValueChange={setEditSubFaculty}>
                  <SelectTrigger className="h-11 text-base font-bold border-2 focus:ring-primary/20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {data.faculty.map(f => (
                      <SelectItem key={f.id} value={f.id} className="text-sm font-medium">{f.shortName} ({f.id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block px-1 text-muted-foreground opacity-70">Eligible Faculty (Click to Toggle)</Label>
              <div className="flex flex-wrap gap-1.5 p-3 bg-muted/40 rounded-xl border border-border/50 max-h-32 overflow-auto">
                {data.faculty.map(f => (
                  <Badge 
                    key={f.id} 
                    variant={editSubEligible.includes(f.id) ? "default" : "outline"}
                    className="cursor-pointer text-[11px] font-bold py-1 px-2 uppercase tracking-tight transition-all"
                    onClick={() => {
                       setEditSubEligible(prev => 
                         prev.includes(f.id) ? prev.filter(id => id !== f.id) : [...prev, f.id]
                       )
                    }}
                  >
                    {f.shortName}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditSubOpen(false)} className="font-bold">Cancel</Button>
            <Button onClick={saveEditSubject} className="font-bold">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lab Room Edit Dialog */}
      <Dialog open={editLabOpen} onOpenChange={setEditLabOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit Lab Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-bold mb-1.5 block">Room Name</Label>
              <Input value={editLabName} onChange={e => setEditLabName(e.target.value)} className="h-10 text-base font-medium" />
            </div>
            <div>
              <Label className="text-sm font-bold mb-1.5 block">Capacity</Label>
              <Input type="number" value={editLabCapacity} onChange={e => setEditLabCapacity(e.target.value)} className="h-10 text-base" />
            </div>
            <div>
              <Label className="text-sm font-bold mb-1.5 block">Supported Subjects</Label>
              <div className="flex flex-wrap gap-1.5 p-3 bg-muted/40 rounded-xl border border-border/50 max-h-32 overflow-auto">
                {data.subjects.filter(s => s.labHours > 0).map(s => (
                  <Badge 
                    key={s.code} 
                    variant={editLabSubs.includes(s.code) ? "default" : "outline"}
                    className="cursor-pointer text-[11px] font-bold py-1 px-2 uppercase tracking-tight transition-all"
                    onClick={() => {
                       setEditLabSubs(prev => 
                         prev.includes(s.code) ? prev.filter(c => c !== s.code) : [...prev, s.code]
                       )
                    }}
                  >
                    {s.code}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditLabOpen(false)} className="font-bold">Cancel</Button>
            <Button onClick={saveEditLab} className="font-bold">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fixed Class Edit Dialog */}
      <Dialog open={editFixedOpen} onOpenChange={setEditFixedOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit Fixed Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-bold mb-1.5 block">Subject</Label>
                <Select value={editFixedSub} onValueChange={setEditFixedSub}>
                  <SelectTrigger className="h-10 text-base"><SelectValue /></SelectTrigger>
                  <SelectContent>{data.subjects.map(s => <SelectItem key={s.code} value={s.code}>{s.code}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-bold mb-1.5 block">Faculty</Label>
                <Select value={editFixedFac} onValueChange={setEditFixedFac}>
                  <SelectTrigger className="h-10 text-base"><SelectValue /></SelectTrigger>
                  <SelectContent>{data.faculty.map(f => <SelectItem key={f.id} value={f.id}>{f.shortName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-bold mb-1.5 block">Day</Label>
                <Select value={editFixedDay} onValueChange={v => setEditFixedDay(v as Day)}>
                  <SelectTrigger className="h-10 text-base"><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-bold mb-1.5 block">Slot</Label>
                <Select value={editFixedSlot} onValueChange={setEditFixedSlot}>
                  <SelectTrigger className="h-10 text-base"><SelectValue /></SelectTrigger>
                  <SelectContent>{SLOT_DEFINITIONS.slice(0, 6).map(s => <SelectItem key={s.slotIndex} value={String(s.slotIndex)}>{s.startTime}-{s.endTime}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditFixedOpen(false)} className="font-bold">Cancel</Button>
            <Button onClick={saveEditFixed} className="font-bold">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Career Path Edit Dialog */}
      <Dialog open={editCpOpen} onOpenChange={setEditCpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit Career Path</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-black mb-1.5 block px-1 uppercase tracking-widest text-primary opacity-80">Faculty Members</Label>
              <div className="flex flex-wrap gap-1.5 p-3 bg-muted/40 rounded-xl border border-border/50 max-h-40 overflow-auto custom-scrollbar shadow-inner">
                {data.faculty.map(f => (
                  <Badge 
                    key={f.id} 
                    variant={editCpFaculties.includes(f.id) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer text-[11px] font-black py-1 px-2.5 uppercase tracking-tighter transition-all",
                      editCpFaculties.includes(f.id) ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/10"
                    )}
                    onClick={() => {
                        setEditCpFaculties(prev => 
                          prev.includes(f.id) ? prev.filter(id => id !== f.id) : [...prev, f.id]
                        )
                    }}
                  >
                    {f.shortName}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-bold mb-1.5 block">Day</Label>
                <Select value={editCpDay} onValueChange={v => setEditCpDay(v as Day)}>
                  <SelectTrigger className="h-10 text-base"><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-bold mb-1.5 block">Slot</Label>
                <Select value={editCpSlot} onValueChange={setEditCpSlot}>
                  <SelectTrigger className="h-10 text-base"><SelectValue /></SelectTrigger>
                  <SelectContent>{SLOT_DEFINITIONS.slice(0, 6).map(s => <SelectItem key={s.slotIndex} value={String(s.slotIndex)}>{s.startTime}-{s.endTime}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-bold mb-1.5 block">Slot Type</Label>
                <RadioGroup value={editCpType} onValueChange={v => setEditCpType(v as 'theory' | 'lab')} className="flex gap-4 mt-2 p-3 bg-muted/40 rounded-xl border border-border/50 transition-all">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="theory" id="edit-cp-theory" />
                    <Label htmlFor="edit-cp-theory" className="text-sm font-bold uppercase tracking-tight">Theory</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="lab" id="edit-cp-lab" />
                    <Label htmlFor="edit-cp-lab" className="text-sm font-bold uppercase tracking-tight">Lab (2hrs)</Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label className="text-sm font-black mb-1.5 block px-1 text-primary">Academic Credits</Label>
                <Input type="number" step="0.5" value={editCpCredits} onChange={(e) => setEditCpCredits(e.target.value)} min="0" max="5" className="h-11 text-lg font-black border-primary/20" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditCpOpen(false)} className="font-bold">Cancel</Button>
            <Button onClick={saveEditCp} className="font-bold">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

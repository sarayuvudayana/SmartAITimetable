import React, { useState } from 'react';
import { ClassSession, Section, Subject, Faculty, Day, SubjectType, FacultySectionMapping } from '@/types/timetable';
import { DAYS, SLOT_DEFINITIONS } from '@/core/timeSlotManager';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { TimeSlotManager } from '@/core/timeSlotManager';
import { ConstraintEngine } from '@/core/constraintEngine';
import { Pencil } from 'lucide-react';

interface Props {
  sessions: ClassSession[];
  section?: Section; // Optional now because we might be in lab/faculty mode
  subjects: Subject[];
  faculty: Faculty[];
  facultyMappings?: FacultySectionMapping[];
  onEditSession?: (newSessions: ClassSession[]) => void;
  editable?: boolean;
  viewMode?: 'section' | 'faculty' | 'lab';
  filterId?: string; // Room ID if in lab mode, Faculty ID if in faculty mode
}

export default function TimetableGrid({
  sessions, section, subjects, faculty,
  facultyMappings = [], onEditSession, editable = false,
  viewMode = 'section', filterId
}: Props) {
  const sectionSessions = sessions.filter((s) => {
    if (viewMode === 'lab') return s.labRoomId === filterId;
    if (viewMode === 'faculty') return (s.facultyId === filterId || s.secondFacultyId === filterId || s.facultyIds?.includes(filterId || ''));
    return s.sectionId === section?.id;
  });

  const displaySlots = [
    ...SLOT_DEFINITIONS.slice(0, 2),
    { slotIndex: -2, startTime: '11:00', endTime: '11:10' },
    ...SLOT_DEFINITIONS.slice(2, 4),
    { slotIndex: -1, startTime: '13:10', endTime: '14:00' },
    ...SLOT_DEFINITIONS.slice(4, 7), // Now includes indices 4, 5, and 6
  ];

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ClassSession | null>(null);
  const [editSubjectCode, setEditSubjectCode] = useState('');
  const [editFacultyId, setEditFacultyId] = useState('');
  const [editSecondFacultyId, setEditSecondFacultyId] = useState<string>('');

  const getSession = (day: Day, slotIndex: number) =>
    sectionSessions.find((s) => s.day === day && s.slotIndex === slotIndex);

  const isLabSession = (session: ClassSession): boolean => {
    if (session.isCareerPath) return session.careerPathSlotType === 'lab';
    const subj = subjects.find(s => s.code === session.subjectCode);
    if (!subj) return false;
    
    // Only subjects that are meant to have labs (LAB or INTEGRATED) should be checked for 2-hour occupancy
    const canBeLab = subj.subjectType === SubjectType.LAB || subj.subjectType === SubjectType.INTEGRATED;
    if (!canBeLab) return false;

    const sameDaySessions = sectionSessions.filter(
      s => s.subjectCode === session.subjectCode && s.day === session.day && s.sectionId === session.sectionId
    ).map(s => s.slotIndex).sort((a, b) => a - b);

    const tsm = new TimeSlotManager();
    for (let i = 0; i < sameDaySessions.length - 1; i++) {
      const slotA = sameDaySessions[i];
      const slotB = sameDaySessions[i + 1];
      if (tsm.areSlotsConsecutive(slotA, slotB)) {
        if (slotA === session.slotIndex || slotB === session.slotIndex) return true;
      }
    }
    return false;
  };

  const getLabPairStatus = (day: Day, slotIndex: number) => {
    const session = getSession(day, slotIndex);
    if (!session || !isLabSession(session)) return { isFirst: false, isSecond: false };

    const tsm = new TimeSlotManager();
    const prevSlot = slotIndex - 1;
    const isPrevConsecutive = tsm.areSlotsConsecutive(prevSlot, slotIndex);
    const prevSession = getSession(day, prevSlot);
    const isSecond = isPrevConsecutive && prevSession && prevSession.subjectCode === session.subjectCode && prevSession.sectionId === session.sectionId;

    const nextSlot = slotIndex + 1;
    const isNextConsecutive = tsm.areSlotsConsecutive(slotIndex, nextSlot);
    const nextSession = getSession(day, nextSlot);
    const isFirst = isNextConsecutive && nextSession && nextSession.subjectCode === session.subjectCode && nextSession.sectionId === session.sectionId;

    return { isFirst: isFirst && !isSecond, isSecond };
  };

  const openEdit = (session: ClassSession) => {
    if (!editable || session.isFixed) return;
    setEditTarget(session);
    setEditSubjectCode(session.subjectCode);
    setEditFacultyId(session.facultyId);
    setEditSecondFacultyId(session.secondFacultyId || '');
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!editTarget || !onEditSession) return;
    const editSubj = subjects.find(s => s.code === editSubjectCode);
    const wasLab = isLabSession(editTarget);

    let relatedOriginals = [editTarget];
    if (wasLab) {
      relatedOriginals = sessions.filter(s =>
        s.sectionId === editTarget.sectionId &&
        s.day === editTarget.day &&
        s.subjectCode === editTarget.subjectCode
      );
    }

    if (editSecondFacultyId && editSecondFacultyId !== '__none__') {
      const clash = sessions.find(s =>
        !relatedOriginals.includes(s) &&
        (s.facultyId === editSecondFacultyId || s.secondFacultyId === editSecondFacultyId) &&
        s.day === editTarget.day &&
        relatedOriginals.some(r => r.slotIndex === s.slotIndex)
      );
      if (clash) {
        toast({ title: 'Second faculty has a clash at this slot', variant: 'destructive' });
        return;
      }
    }

    const updatedMap = new Map(relatedOriginals.map(r => [r.slotIndex, {
      ...r,
      subjectCode: editSubjectCode,
      facultyId: editFacultyId,
      secondFacultyId: (editSecondFacultyId && editSecondFacultyId !== '__none__') ? editSecondFacultyId : undefined,
    }]));

    const hypothetical = sessions.map(s => {
      if (updatedMap.has(s.slotIndex) && relatedOriginals.includes(s)) return updatedMap.get(s.slotIndex)!;
      return s;
    });

    const tsm = new TimeSlotManager();
    const ce = new ConstraintEngine(tsm, subjects, facultyMappings);

    const originalViolations = ce.evaluateAll(sessions).filter(v => v.type === 'hard').map(v => v.message);
    const newViolations = ce.evaluateAll(hypothetical).filter(v => v.type === 'hard').map(v => v.message);
    const errors = newViolations.filter(msg => !originalViolations.includes(msg));

    if (errors.length > 0) {
      toast({ title: 'Edit rejected — constraint violation', description: errors.slice(0, 3).join('; '), variant: 'destructive' });
      return;
    }

    onEditSession(hypothetical);
    setEditOpen(false);
    toast({ title: 'Cell updated successfully' });
  };

  const currentSection = section; // for local use in loops

  return (
    <>
      <div className="overflow-x-auto animate-fade-in rounded-xl shadow-2xl border-2 border-slate-900/20 dark:border-slate-100/10 overflow-hidden bg-card">
        <table className="w-full text-sm border-collapse min-w-[800px]">
          <thead>
            <tr>
              <th className="p-4 border-2 border-slate-900/40 dark:border-white/10 bg-slate-950 text-white font-black text-left uppercase tracking-widest text-sm">Day</th>
              {displaySlots.map((s, i) => (
                <th
                  key={i}
                  className={cn(
                    'p-4 border-2 border-white/5 font-black text-center bg-slate-950 text-white uppercase tracking-tighter text-sm',
                    (s.slotIndex === -1 || s.slotIndex === -2) ? 'w-12 px-1' : ''
                  )}
                >
                  {s.slotIndex === -1 || s.slotIndex === -2 ? (
                    <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', fontSize: '13px', fontWeight: 900, letterSpacing: '0.15em', whiteSpace: 'nowrap' }}>
                      {s.startTime}–{s.endTime}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-base font-black opacity-100">{s.startTime}</span>
                      <span className="text-[10px] font-black opacity-40 leading-none uppercase tracking-tighter">to</span>
                      <span className="text-base font-black opacity-100">{s.endTime}</span>
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day, dayIdx) => (
              <tr key={day} className="hover:bg-muted/30 transition-colors">
                <td className="p-4 border-2 border-slate-900/20 dark:border-slate-100/10 font-black bg-slate-100 dark:bg-slate-950/80 text-foreground uppercase tracking-widest text-sm">{day.slice(0, 3)}</td>
                {displaySlots.map((slot, i) => {
                  if (slot.slotIndex === -2) {
                    if (dayIdx !== 0) return null;
                    return (
                      <td
                        key={i}
                        rowSpan={DAYS.length}
                        className="border-2 border-slate-900/20 dark:border-slate-100/10 text-center bg-slate-50 dark:bg-slate-950 text-primary font-black px-0 relative"
                        style={{ width: '40px' }}
                      >
                        <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', fontWeight: 900, fontSize: '15px', letterSpacing: '0.45em', whiteSpace: 'nowrap', padding: '24px 0' }}>
                          S H O R T - B R E A K
                        </div>
                      </td>
                    );
                  }
                  if (slot.slotIndex === -1) {
                    if (dayIdx !== 0) return null;
                    return (
                      <td
                        key={i}
                        rowSpan={DAYS.length}
                        className="border-2 border-slate-900/20 dark:border-slate-100/10 text-center bg-slate-50 dark:bg-slate-950 text-primary font-black px-0 relative"
                        style={{ width: '40px' }}
                      >
                        <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', fontWeight: 900, fontSize: '15px', letterSpacing: '0.45em', whiteSpace: 'nowrap', padding: '24px 0' }}>
                          L U N C H - B R E A K
                        </div>
                      </td>
                    );
                  }
                  const session = getSession(day, slot.slotIndex);
                  const { isFirst, isSecond } = getLabPairStatus(day, slot.slotIndex);
                  if (isSecond) return null;

                  if (!session) return <td key={i} className="p-3 border-2 border-slate-900/15 dark:border-slate-100/10 bg-slate-50/20 dark:bg-slate-950/20 shadow-inner"></td>;
                  const isLab = isLabSession(session);
                  
                  // In Lab view mode, only show 2-hour continuous lab sessions
                  if (viewMode === 'lab' && !isLab) {
                    return <td key={i} className="p-3 border-2 border-slate-900/15 dark:border-slate-100/10 bg-slate-50/20 dark:bg-slate-950/20 shadow-inner"></td>;
                  }
                  const subj = subjects.find((s) => s.code === session.subjectCode);
                  const fac = faculty.find((f) => f.id === session.facultyId);
                  const fac2 = session.secondFacultyId ? faculty.find(f => f.id === session.secondFacultyId) : null;
                  const cpLabel = session.isCareerPath ? (session.careerPathSlotType === 'lab' ? 'CP-LAB' : 'CP') : null;

                   return (
                    <td
                      key={i}
                      colSpan={isFirst ? 2 : 1}
                      className={cn(
                        'p-2 border-2 border-slate-900/20 dark:border-slate-100/20 transition-all relative overflow-hidden group',
                        isLab ? 'bg-gradient-to-br from-primary/15 to-primary/5 text-foreground' : 'bg-card text-foreground font-medium',
                        editable && !session.isFixed && 'cursor-pointer hover:bg-primary/10 transition-transform active:scale-95'
                      )}
                      onClick={() => openEdit(session)}
                    >
                      <div className="flex flex-col items-center justify-center min-h-[55px] text-center gap-1.5 p-1 relative z-10">
                        {isFirst ? (
                          <div className="flex items-center w-full gap-2 justify-center">
                            <div className="h-[2px] flex-grow bg-primary/40 rounded-full max-w-[30px]"></div>
                            <span className="whitespace-nowrap px-5 py-1.5 bg-primary/10 rounded-xl text-base tracking-[0.25em] font-black uppercase text-primary shadow-sm ring-1 ring-primary/30">
                              {subj?.code || session.subjectCode}
                            </span>
                            <div className="h-[2px] flex-grow bg-primary/40 rounded-full max-w-[30px]"></div>
                          </div>
                        ) : (
                          <div className="text-base font-black uppercase tracking-[0.2em] text-primary">
                            {subj?.code || session.subjectCode}
                          </div>
                        )}

                        <div className="flex flex-col items-center mt-1 space-y-1">
                          <div className={cn(
                            "text-[11px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-tight shadow-sm text-center transition-all",
                            session.isCareerPath 
                              ? "bg-primary/10 text-primary border-primary/20 shadow-primary/5" 
                              : "bg-slate-900/10 dark:bg-white/10 border-slate-900/20 dark:border-white/20"
                          )}>
                            {session.isCareerPath && session.facultyIds ? (
                              <div className="leading-tight">
                                {session.facultyIds.map((fid, idx) => {
                                  const name = faculty.find(f => f.id === fid)?.shortName || fid;
                                  return (
                                    <React.Fragment key={fid}>
                                      {name}{idx < session.facultyIds!.length - 1 ? " / " : ""}
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            ) : (
                              fac?.shortName || session.facultyId
                            )}
                          </div>
                          {fac2 && !session.isCareerPath && (
                            <div className="text-[10px] font-black opacity-60 uppercase">
                              & {fac2.shortName}
                            </div>
                          )}
                        </div>

                        {session.labRoomId && viewMode !== 'section' && (
                          <div className="text-[10px] font-black bg-primary/20 text-primary px-2.5 py-1 rounded-lg border-2 border-primary/40 uppercase tracking-widest shadow-md text-center group-hover:scale-105 transition-transform">
                            Room: {session.labRoomId}
                          </div>
                        )}

                        {viewMode === 'lab' && (
                          <div className="text-[10px] font-black bg-primary/20 text-primary px-2.5 py-1 rounded-lg border-2 border-primary/40 uppercase tracking-widest shadow-md text-center group-hover:scale-105 transition-transform">
                            Sec: {session.sectionId}
                          </div>
                        )}

                        {cpLabel && (
                          <div className="mt-1.5">
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-black uppercase border-primary/50 text-primary bg-primary/5 shadow-sm">
                              {cpLabel}
                            </Badge>
                          </div>
                        )}
                      </div>
                      {editable && !session.isFixed && (
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md rounded-2xl border-2 border-primary/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-primary uppercase tracking-wider">Modify Class Information</DialogTitle>
          </DialogHeader>
          {editTarget && (() => {
            const editSubj = subjects.find(s => s.code === editSubjectCode);
            const isLabSess = editSubj && (editSubj.subjectType === SubjectType.LAB || editSubj.subjectType === SubjectType.INTEGRATED);
            return (
              <div className="space-y-6 pt-2">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-xl border border-border">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Scheduled Slot</span>
                    <span className="text-sm font-bold text-foreground">{editTarget.day} — Slot {editTarget.slotIndex} {section ? `— Sec ${section.name}` : ""}</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Subject</Label>
                    <Select value={editSubjectCode} onValueChange={setEditSubjectCode}>
                      <SelectTrigger className="h-11 border-2 focus:ring-primary/20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {subjects.filter(s => !section || s.yearNumber === section.yearNumber).map(s => (
                          <SelectItem key={s.code} value={s.code} className="text-sm font-medium">{s.code} — {s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Primary Educator</Label>
                    <Select value={editFacultyId} onValueChange={setEditFacultyId}>
                      <SelectTrigger className="h-11 border-2 focus:ring-primary/20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {faculty.map(f => (
                          <SelectItem key={f.id} value={f.id} className="text-sm font-medium">{f.shortName} ({f.id})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {isLabSess && (
                    <div className="space-y-1.5 p-4 bg-primary/5 rounded-xl border border-primary/10">
                      <Label className="text-xs font-black uppercase tracking-widest text-primary px-1">Secondary Educator (Asst.)</Label>
                      <Select value={editSecondFacultyId} onValueChange={setEditSecondFacultyId}>
                        <SelectTrigger className="h-11 border-2 border-primary/20 bg-card focus:ring-primary/40 mt-1"><SelectValue placeholder="No secondary educator" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {faculty.filter(f => f.id !== editFacultyId).map(f => (
                            <SelectItem key={f.id} value={f.id} className="text-sm font-medium">{f.shortName} ({f.id})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          <DialogFooter className="pt-4 border-t gap-2">
            <Button variant="ghost" className="font-bold text-muted-foreground hover:bg-muted" onClick={() => setEditOpen(false)}>Dismiss</Button>
            <Button className="font-black uppercase tracking-widest shadow-lg shadow-primary/20 px-8" onClick={handleSave}>Confirm Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import React, { useState } from 'react';
import { useTimetable } from '@/contexts/TimetableContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ClassSession, Day, SubjectType } from '@/types/timetable';
import { DAYS, SLOT_DEFINITIONS, TimeSlotManager } from '@/core/timeSlotManager';
import { cn } from '@/lib/utils';

const DISPLAY_SLOTS = [
  ...SLOT_DEFINITIONS.slice(0, 2),
  { slotIndex: -2, startTime: '11:00', endTime: '11:10' }, // Break
  ...SLOT_DEFINITIONS.slice(2, 4),
  { slotIndex: -1, startTime: '13:10', endTime: '14:00' }, // Lunch
  ...SLOT_DEFINITIONS.slice(4, 7),
];

export default function FacultyTimetable() {
  const { data } = useTimetable();
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');

  if (!data.generatedTimetable) {
    return (
      <div className="p-6 animate-fade-in">
        <h1 className="text-2xl font-bold">Faculty Timetable</h1>
        <p className="text-sm text-muted-foreground mt-4 italic">No timetable generated yet. Go to Generate tab first.</p>
      </div>
    );
  }

  const facultyList = selectedFaculty && selectedFaculty !== 'all'
    ? data.faculty.filter(f => f.id === selectedFaculty)
    : data.faculty;

  const getSession = (facultyId: string, day: Day, slotIndex: number): ClassSession | undefined =>
    data.generatedTimetable!.find(s =>
      (s.facultyId === facultyId || s.secondFacultyId === facultyId || s.facultyIds?.includes(facultyId)) &&
      s.day === day && s.slotIndex === slotIndex
    );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Faculty Timetable</h1>
        <p className="text-sm text-muted-foreground mt-1">Detailed schedule and workload for educators</p>
      </div>

      <div className="max-w-sm">
        <Label className="text-sm font-semibold mb-1.5 block">Filter by Faculty</Label>
        <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
          <SelectTrigger className="h-10 text-sm">
            <SelectValue placeholder="All Faculty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Faculty</SelectItem>
            {data.faculty.map(f => (
              <SelectItem key={f.id} value={f.id}>{f.shortName} ({f.id})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-12">
        {facultyList.map(fac => {
          const allSessions = data.generatedTimetable!.filter(
            s => s.facultyId === fac.id || s.secondFacultyId === fac.id || s.facultyIds?.includes(fac.id)
          );
          
          // Deduplicate Career Path sessions by day and slot index
          const facSessions: typeof allSessions = [];
          const seenCpSlots = new Set<string>();
          
          allSessions.forEach(s => {
            if (s.isCareerPath) {
              const key = `${s.day}-${s.slotIndex}`;
              if (!seenCpSlots.has(key)) {
                seenCpSlots.add(key);
                facSessions.push(s);
              }
            } else {
              facSessions.push(s);
            }
          });

          if (facSessions.length === 0 && selectedFaculty === 'all') return null;

          const totalHours = facSessions.length;
          const uniqueSections = [...new Set(facSessions.map(s => s.sectionId))];

          return (
            <div key={fac.id} className="space-y-4">
              <div className="flex items-center gap-3 border-l-4 border-primary pl-4 py-1">
                <h2 className="text-lg font-bold text-foreground">{fac.shortName} <span className="text-muted-foreground font-medium text-sm ml-1">({fac.id})</span></h2>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary font-bold px-2.5 py-0.5">{totalHours} hrs/wk</Badge>
                  <Badge variant="secondary" className="text-xs font-bold px-2.5 py-0.5">{uniqueSections.length} sections</Badge>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl shadow-xl border-2 border-slate-900/10 dark:border-slate-100/10">
                <table className="w-full text-sm border-collapse min-w-[800px] bg-card">
                  <thead>
                    <tr>
                      <th className="p-3 border-2 border-slate-900/20 dark:border-slate-100/20 bg-slate-950 text-white font-bold text-left uppercase tracking-wider text-xs">Day</th>
                      {DISPLAY_SLOTS.map((s, i) => (
                        <th
                          key={i}
                          className={cn(
                            'p-3 border-2 border-white/10 dark:border-white/5 font-bold text-center bg-slate-950 text-white uppercase tracking-tighter text-xs',
                            (s.slotIndex === -1 || s.slotIndex === -2) ? 'w-10 px-1' : ''
                          )}
                        >
                          {s.slotIndex === -1 || s.slotIndex === -2 ? (
                            <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', fontSize: '13px', fontWeight: 800, letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
                              {s.startTime}–{s.endTime}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-black opacity-100">{s.startTime}</span>
                              <span className="text-[11px] font-bold opacity-60">to</span>
                              <span className="text-sm font-black opacity-100">{s.endTime}</span>
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day, dayIdx) => (
                      <tr key={day} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 border-2 border-slate-900/20 dark:border-slate-100/20 font-bold bg-slate-100 dark:bg-slate-900/50 text-foreground uppercase tracking-wider text-xs">{day.slice(0, 3)}</td>
                        {DISPLAY_SLOTS.map((slot, i) => {
                          if (slot.slotIndex === -2) {
                            if (dayIdx !== 0) return null;
                            return (
                              <td
                                key={i}
                                rowSpan={DAYS.length}
                                className="border-2 border-slate-900/20 dark:border-slate-100/20 text-center bg-slate-50 dark:bg-slate-950 text-primary font-black px-0 relative"
                                style={{ width: '40px' }}
                              >
                                <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', fontWeight: 900, fontSize: '15px', letterSpacing: '0.4em', whiteSpace: 'nowrap', padding: '20px 0' }}>
                                  SHORT BREAK
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
                                className="border-2 border-slate-900/20 dark:border-slate-100/20 text-center bg-slate-50 dark:bg-slate-950 text-primary font-black px-0 relative"
                                style={{ width: '40px' }}
                              >
                                <div style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', fontWeight: 900, fontSize: '15px', letterSpacing: '0.4em', whiteSpace: 'nowrap', padding: '20px 0' }}>
                                  LUNCH BREAK
                                </div>
                              </td>
                            );
                          }
                          
                          const session = getSession(fac.id, day, slot.slotIndex);
                          
                          const isLabSession = (): boolean => {
                            if (!session) return false;
                            if (session.isCareerPath) return session.careerPathSlotType === 'lab';
                            const subj = data.subjects.find(s => s.code === session.subjectCode);
                            if (!subj) return false;
                            if (subj.subjectType === SubjectType.LAB) return true;
                            if (subj.subjectType === SubjectType.INTEGRATED) {
                              const sectionSessions = data.generatedTimetable!
                                .filter(s => s.sectionId === session.sectionId && s.subjectCode === session.subjectCode && s.day === session.day)
                                .map(s => s.slotIndex)
                                .sort((a, b) => a - b);
                              
                              const tsm = new TimeSlotManager();
                              for (let i = 0; i < sectionSessions.length - 1; i++) {
                                if (tsm.areSlotsConsecutive(sectionSessions[i], sectionSessions[i + 1])) {
                                  if (sectionSessions[i] === session.slotIndex || sectionSessions[i + 1] === session.slotIndex) {
                                    return true;
                                  }
                                }
                              }
                            }
                            return false;
                          };

                          const getLabPairStatus = (day: Day, slotIndex: number) => {
                            const sess = getSession(fac.id, day, slotIndex);
                            if (!sess || !isLabSession()) return { isFirst: false, isSecond: false };

                            const tsm = new TimeSlotManager();
                            const prevSlot = slotIndex - 1;
                            const isPrevConsecutive = tsm.areSlotsConsecutive(prevSlot, slotIndex);
                            const prevSession = getSession(fac.id, day, prevSlot);
                            const isSecond = isPrevConsecutive && prevSession && prevSession.subjectCode === sess.subjectCode;

                            const nextSlot = slotIndex + 1;
                            const isNextConsecutive = tsm.areSlotsConsecutive(slotIndex, nextSlot);
                            const nextSession = getSession(fac.id, day, nextSlot);
                            const isFirst = isNextConsecutive && nextSession && nextSession.subjectCode === sess.subjectCode;

                            return { isFirst: isFirst && !isSecond, isSecond };
                          };

                          const { isFirst, isSecond } = getLabPairStatus(day, slot.slotIndex);
                          if (isSecond) return null;

                          if (!session) {
                            return <td key={i} className="p-3 border-2 border-slate-900/15 dark:border-slate-100/10 bg-slate-50/30 dark:bg-slate-900/20"></td>;
                          }
                          const subj = data.subjects.find(s => s.code === session.subjectCode);
                          const section = data.sections.find(s => s.id === session.sectionId);
                          
                          const isLab = isLabSession();
                          const isSecondFac = session.secondFacultyId === fac.id;

                          return (
                            <td
                              key={i}
                              colSpan={isFirst ? 2 : 1}
                              className={cn(
                                'p-2 border-2 border-slate-900/20 dark:border-slate-100/20 transition-all relative overflow-hidden',
                                isLab 
                                  ? 'bg-gradient-to-br from-primary/20 to-primary/10 text-foreground' 
                                  : 'bg-card text-foreground font-medium'
                              )}
                            >
                              <div className="flex flex-col items-center justify-center min-h-[50px] text-center gap-1.5 p-1">
                                {isFirst ? (
                                  <div className="flex items-center w-full gap-2 justify-center">
                                    <div className="h-[1.5px] flex-grow bg-primary/30 rounded-full max-w-[20px]"></div>
                                    <span className="whitespace-nowrap px-3 py-1 bg-primary/10 rounded-lg text-sm tracking-widest font-black uppercase text-primary shadow-sm ring-1 ring-primary/20">
                                      {subj?.code || session.subjectCode}
                                    </span>
                                    <div className="h-[1.5px] flex-grow bg-primary/30 rounded-full max-w-[20px]"></div>
                                  </div>
                                ) : (
                                  <div className="text-sm font-black uppercase tracking-wider text-primary">
                                    {subj?.code || session.subjectCode}
                                  </div>
                                )}
                                
                                {!isFirst && subj?.name && (
                                  <div className="text-xs opacity-80 font-bold uppercase tracking-tight line-clamp-1 italic px-1">
                                    {subj.name}
                                  </div>
                                )}

                                <div className="flex flex-col items-center gap-1 mt-1">
                                  <div className="text-[11px] font-black bg-slate-900/5 dark:bg-white/5 px-2.5 py-1 rounded-md border border-slate-900/10 dark:border-white/10 uppercase tracking-widest text-primary shadow-sm leading-tight">
                                    {session.isCareerPath 
                                      ? (session.yearNumber === 3 ? "3rd Year" : "4th Year")
                                      : `Y${session.yearNumber}-${section?.name || session.sectionId}`}
                                  </div>
                                  
                                  {session.isCareerPath && session.facultyIds && (
                                    <div className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-tighter leading-none bg-muted/40 px-2 py-0.5 rounded-sm">
                                      {session.facultyIds.map((fid, idx) => {
                                        const name = data.faculty.find(f => f.id === fid)?.shortName || fid;
                                        return (
                                          <React.Fragment key={fid}>
                                            {name}{idx < session.facultyIds!.length - 1 ? "/" : ""}
                                          </React.Fragment>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {isSecondFac && !session.isCareerPath && (
                                    <Badge variant="outline" className="text-[10px] mt-0.5 px-1.5 py-0 font-black uppercase border-amber-500/30 text-amber-600 bg-amber-500/5">
                                      Asst. Faculty
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Workload Table */}
              <div className="mt-8 max-w-lg">
                <h3 className="text-xs font-black text-primary mb-3 uppercase tracking-[0.2em] border-b border-primary/20 pb-1 w-fit">
                  Instructional Workload Details
                </h3>
                <div className="rounded-xl overflow-hidden border-2 border-slate-900/20 dark:border-slate-100/20 shadow-lg">
                  <table className="w-full text-sm border-collapse bg-card">
                    <thead>
                      <tr className="bg-slate-950 text-white font-bold uppercase tracking-widest text-[10px]">
                        <th className="p-3 border-r border-white/10 text-center w-1/3">Theory Hours</th>
                        <th className="p-3 border-r border-white/10 text-center w-1/3">Lab Hours</th>
                        <th className="p-3 bg-primary text-white text-center w-1/3">Total (Weekly)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let theoryCount = 0;
                        let labCount = 0;
                        
                        facSessions.forEach(s => {
                          // Prioritize Career Path workload
                          if (s.isCareerPath) {
                            if (s.careerPathSlotType === 'lab') {
                              labCount++;
                            } else {
                              theoryCount++;
                            }
                            return;
                          }

                          const subj = data.subjects.find(sub => sub.code === s.subjectCode);
                          if (!subj) return;
                          
                          if (subj.subjectType === SubjectType.INTEGRATED) {
                            const daySessions = facSessions.filter(ds => ds.day === s.day && ds.subjectCode === s.subjectCode);
                            const isPair = daySessions.length === 2 && 
                              daySessions.some(ds1 => 
                                daySessions.some(ds2 => Math.abs(ds1.slotIndex - ds2.slotIndex) === 1)
                              );
                            if (isPair) labCount++; else theoryCount++;
                          } else if (subj.subjectType === SubjectType.LAB) {
                            labCount++;
                          } else {
                            theoryCount++;
                          }
                        });

                        return (
                          <tr className="bg-card font-black text-center text-lg">
                            <td className="p-4 border-r-2 border-slate-900/10 dark:border-slate-100/10 text-foreground">{theoryCount}</td>
                            <td className="p-4 border-r-2 border-slate-900/10 dark:border-slate-100/10 text-foreground">{labCount}</td>
                            <td className="p-4 bg-primary/5 text-primary text-2xl tracking-tighter">{theoryCount + labCount}</td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {(() => {
                const facSubjects = data.subjects.filter(s => 
                  facSessions.some(sess => sess.subjectCode === s.code)
                );
                const hasCareerPath = facSessions.some(s => s.isCareerPath);
                
                if (facSubjects.length === 0 && !hasCareerPath) return null;
                
                return (
                  <div className="mt-8 rounded-xl border border-border/50 overflow-hidden shadow-md max-w-4xl">
                    <div className="bg-slate-950 px-4 py-2.5 flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-white text-xs font-black uppercase tracking-[0.2em]">
                        Course Credits & Sections — {fac.shortName}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[17px] border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-900/70">
                            <th className="px-4 py-3 border border-border/40 text-center text-[11px] font-black uppercase tracking-widest text-muted-foreground w-14">S.No</th>
                            <th className="px-4 py-3 border border-border/40 text-left text-[11px] font-black uppercase tracking-widest text-muted-foreground w-24">Code</th>
                            <th className="px-4 py-3 border border-border/40 text-left text-[11px] font-black uppercase tracking-widest text-muted-foreground">Course Title</th>
                            <th className="px-4 py-3 border border-border/40 text-center text-[11px] font-black uppercase tracking-widest text-muted-foreground w-20">Credits</th>
                            <th className="px-4 py-3 border border-border/40 text-left text-[11px] font-black uppercase tracking-widest text-muted-foreground">Assigned Section(s)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            let sNo = 1;
                            const careerPathSessions = facSessions.filter(s => s.isCareerPath);
                            const careerPathRow = careerPathSessions.length > 0 ? (
                              <tr key="career-path" className="bg-card hover:bg-primary/5 transition-colors border-t-2 border-primary/10">
                                <td className="px-4 py-3 border border-border/30 text-center font-bold text-muted-foreground">{sNo++}</td>
                                <td className="px-4 py-3 border border-border/30">
                                  <span className="font-black uppercase tracking-wider text-primary">CP</span>
                                </td>
                                <td className="px-4 py-3 border border-border/30">
                                  <span className="font-semibold text-foreground">Career Path</span>
                                </td>
                                <td className="px-4 py-3 border border-border/30 text-center">
                                  <span className="inline-flex items-center justify-center min-w-[36px] h-9 px-2 rounded-full bg-primary/10 text-primary text-base font-black border border-primary/20 shadow-sm">
                                    {careerPathSessions[0]?.credits?.toFixed(1) || '2.0'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 border border-border/30">
                                  <div className="flex flex-wrap gap-1">
                                    {[...new Set(careerPathSessions.map(s => s.yearNumber === 3 ? "3rd Year" : "4th Year"))].map(yr => (
                                      <Badge key={yr} variant="secondary" className="text-[11px] font-bold px-2 py-0.5 whitespace-nowrap">{yr}</Badge>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ) : null;

                            return [
                              ...facSubjects.flatMap((subj) => {
                                const assignedSections = [...new Set(
                                  facSessions
                                    .filter(s => s.subjectCode === subj.code)
                                    .map(s => {
                                      const sec = data.sections.find(sec => sec.id === s.sectionId);
                                      const isAssisting = s.secondFacultyId === fac.id;
                                      return `Y${s.yearNumber}-${sec?.name || s.sectionId}${isAssisting ? " (Asst.)" : ""}`;
                                    })
                                )];

                                if (subj.credits && subj.credits > 4) {
                                  // Split into two rows
                                  const row1 = (
                                    <tr key={`${subj.code}-theory`} className="bg-card hover:bg-primary/5 transition-colors">
                                      <td className="px-4 py-3 border border-border/30 text-center font-bold text-muted-foreground">{sNo++}</td>
                                      <td className="px-4 py-3 border border-border/30">
                                        <span className="font-black uppercase tracking-wider text-primary">{subj.code}</span>
                                      </td>
                                      <td className="px-4 py-3 border border-border/30">
                                        <span className="font-semibold text-foreground">{subj.name}</span>
                                      </td>
                                      <td className="px-4 py-3 border border-border/30 text-center">
                                        <span className="inline-flex items-center justify-center min-w-[36px] h-9 px-2 rounded-full bg-primary/10 text-primary text-base font-black border border-primary/20 shadow-sm">
                                          {subj.theoryCredits?.toFixed(1) || '0.0'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 border border-border/30">
                                        <div className="flex flex-wrap gap-1">
                                          {assignedSections.map(secName => (
                                            <Badge key={secName} variant="secondary" className="text-[11px] font-bold px-2 py-0.5 whitespace-nowrap">{secName}</Badge>
                                          ))}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                  const row2 = (
                                    <tr key={`${subj.code}-lab`} className="bg-muted/10 hover:bg-primary/5 transition-colors">
                                      <td className="px-4 py-3 border border-border/30 text-center font-bold text-muted-foreground">{sNo++}</td>
                                      <td className="px-4 py-3 border border-border/30">
                                        <span className="font-black uppercase tracking-wider text-primary">{subj.code}</span>
                                      </td>
                                      <td className="px-4 py-3 border border-border/30">
                                        <span className="font-semibold text-foreground">{subj.name} Lab</span>
                                      </td>
                                      <td className="px-4 py-3 border border-border/30 text-center">
                                        <span className="inline-flex items-center justify-center min-w-[36px] h-9 px-2 rounded-full bg-primary/10 text-primary text-base font-black border border-primary/20 shadow-sm">
                                          {subj.labCredits?.toFixed(1) || '0.0'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 border border-border/30">
                                        <div className="flex flex-wrap gap-1">
                                          {assignedSections.map(secName => (
                                            <Badge key={secName} variant="secondary" className="text-[11px] font-bold px-2 py-0.5 whitespace-nowrap">{secName}</Badge>
                                          ))}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                  return [row1, row2];
                                } else {
                                  // Single row
                                  return (
                                    <tr key={subj.code} className="bg-card hover:bg-primary/5 transition-colors odd:bg-muted/20">
                                      <td className="px-4 py-3 border border-border/30 text-center font-bold text-muted-foreground">{sNo++}</td>
                                      <td className="px-4 py-3 border border-border/30">
                                        <span className="font-black uppercase tracking-wider text-primary">{subj.code}</span>
                                      </td>
                                      <td className="px-4 py-3 border border-border/30">
                                        <span className="font-semibold text-foreground">{subj.name}</span>
                                      </td>
                                      <td className="px-4 py-3 border border-border/30 text-center">
                                        <span className="inline-flex items-center justify-center min-w-[36px] h-9 px-2 rounded-full bg-primary/10 text-primary text-base font-black border border-primary/20 shadow-sm">
                                          {subj.credits?.toFixed(1) || '0.0'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 border border-border/30">
                                        <div className="flex flex-wrap gap-1">
                                          {assignedSections.map(secName => (
                                            <Badge key={secName} variant="secondary" className="text-[11px] font-bold px-2 py-0.5 whitespace-nowrap">{secName}</Badge>
                                          ))}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                }
                              }),
                              careerPathRow
                            ];
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

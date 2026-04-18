import React, { useState } from 'react';
import { useTimetable } from '@/contexts/TimetableContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import TimetableGrid from '@/components/timetable/TimetableGrid';
import { ClassSession } from '@/types/timetable';

export default function ViewTimetable() {
  const { data, dispatch } = useTimetable();
  const [selectedSection, setSelectedSection] = useState<string>('');

  if (!data.generatedTimetable) {
    return (
      <div className="p-4 animate-fade-in">
        <h1 className="text-xl font-bold">View Timetable</h1>
        <p className="text-sm text-muted-foreground mt-4">No timetable generated yet. Go to Generate tab first.</p>
      </div>
    );
  }

  const filteredSections = selectedSection && selectedSection !== 'all'
    ? data.sections.filter((s) => s.id === selectedSection)
    : data.sections;

  const handleEditSession = (newTimetable: ClassSession[]) => {
    dispatch({ type: 'SET_TIMETABLE', payload: newTimetable });
  };

  /** Resolve assigned faculty name for a given section + subject from the generated timetable */
  const getAssignedFacultyName = (sectionId: string, subjectCode: string): string => {
    const session = data.generatedTimetable!.find(
      s => s.sectionId === sectionId && s.subjectCode === subjectCode
    );
    if (!session) return '—';
    if (session.isCareerPath) {
      return (session.facultyIds || [])
        .map(fid => data.faculty.find(f => f.id === fid)?.shortName || fid)
        .join(' / ');
    }
    const primary = data.faculty.find(f => f.id === session.facultyId);
    const secondary = session.secondFacultyId
      ? data.faculty.find(f => f.id === session.secondFacultyId)
      : null;
    if (secondary) return `${primary?.shortName || session.facultyId} / ${secondary.shortName}`;
    return primary?.shortName || session.facultyId;
  };

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase">View Timetable</h1>
      </div>

      <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 shadow-sm transition-all hover:bg-muted/50">
        <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-2 block px-1">Filter by Section</Label>
        <Select value={selectedSection} onValueChange={setSelectedSection}>
          <SelectTrigger className="h-11 text-base font-bold border-2 focus:ring-primary/20 bg-card">
            <SelectValue placeholder="All Sections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {data.sections.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                Year {s.yearNumber} - Section {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs font-black uppercase tracking-widest text-primary/70 bg-primary/5 px-4 py-2 rounded-lg border border-primary/10 inline-block shadow-sm">
        <span className="mr-2">💡</span>
        Click any cell to edit subject or faculty. Fixed cells cannot be edited.
      </p>

      <div className="space-y-12">
        {filteredSections.map((section) => {
          // All subjects for this section's year
          const sectionSubjects = data.subjects.filter(s => s.yearNumber === section.yearNumber);

          return (
            <div key={section.id} className="space-y-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
                  Year {section.yearNumber} — Section {section.name}
                </h2>
                <div className="h-[2px] flex-grow bg-border/40 rounded-full" />
              </div>

              {/* Timetable Grid */}
              <div className="rounded-2xl border-2 border-border/40 overflow-hidden shadow-xl bg-card/30 backdrop-blur-sm">
                <TimetableGrid
                  sessions={data.generatedTimetable!}
                  section={section}
                  subjects={data.subjects}
                  faculty={data.faculty}
                  facultyMappings={data.facultySectionMappings}
                  onEditSession={handleEditSession}
                  editable
                />
              </div>

              {/* Credits Reference Table */}
              {sectionSubjects.length > 0 && (
                <div className="rounded-xl border border-border/50 overflow-hidden shadow-md">
                  {/* Table header bar */}
                  <div className="bg-slate-950 px-4 py-2.5 flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-white text-xs font-black uppercase tracking-[0.2em]">
                      Course Info — Section {section.name}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-[17px] border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-900/70">
                          <th className="px-4 py-3 border border-border/40 text-center text-[12px] font-black uppercase tracking-widest text-muted-foreground w-14">S.No</th>
                          <th className="px-4 py-3 border border-border/40 text-left text-[12px] font-black uppercase tracking-widest text-muted-foreground w-28">Code</th>
                          <th className="px-4 py-3 border border-border/40 text-left text-[12px] font-black uppercase tracking-widest text-muted-foreground">Course Title</th>
                          <th className="px-4 py-3 border border-border/40 text-center text-[12px] font-black uppercase tracking-widest text-muted-foreground w-24">Credits</th>
                          <th className="px-4 py-3 border border-border/40 text-left text-[12px] font-black uppercase tracking-widest text-muted-foreground">Faculty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let sNo = 1;
                          
                          // Sort subjects by code for a deterministic "correct" order
                          const sortedSubjects = [...sectionSubjects].sort((a, b) => a.code.localeCompare(b.code));
                          
                          const careerPathRow = data.careerPathClasses.some(cp => cp.yearNumber === section.yearNumber) ? (
                            <tr key="career-path" className="bg-primary/5 hover:bg-primary/10 transition-colors border-b-2 border-primary/10 group">
                              <td className="px-4 py-3 border border-border/30 text-center font-black text-primary/60 group-hover:text-primary transition-colors">{sNo++}</td>
                              <td className="px-4 py-3 border border-border/30">
                                <span className="font-black uppercase tracking-wider text-primary">CP</span>
                              </td>
                              <td className="px-4 py-3 border border-border/30">
                                <span className="font-bold text-foreground">Career Path</span>
                              </td>
                              <td className="px-4 py-3 border border-border/30 text-center">
                                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 text-primary text-base font-black border-2 border-primary/30 shadow-sm group-hover:scale-110 transition-transform">
                                  {data.careerPathClasses.find(cp => cp.yearNumber === section.yearNumber)?.credits?.toFixed(1) || '2.0'}
                                </span>
                              </td>
                              <td className="px-4 py-3 border border-border/30">
                                <span className="font-bold text-foreground/80">{getAssignedFacultyName(section.id, 'career')}</span>
                              </td>
                            </tr>
                          ) : null;

                          return [
                            careerPathRow,
                            ...sortedSubjects.flatMap((subj) => {
                            if (subj.credits && subj.credits > 4) {
                              // Split into two rows (Theory + Lab)
                              const row1 = (
                                <tr key={`${subj.code}-theory`} className="bg-card hover:bg-primary/5 transition-colors group">
                                  <td className="px-4 py-3 border border-border/30 text-center font-bold text-muted-foreground group-hover:text-primary transition-colors">{sNo++}</td>
                                  <td className="px-4 py-3 border border-border/30">
                                    <span className="font-black uppercase tracking-wider text-primary/80">{subj.code}</span>
                                  </td>
                                  <td className="px-4 py-3 border border-border/30">
                                    <span className="font-semibold text-foreground">{subj.name}</span>
                                  </td>
                                  <td className="px-4 py-3 border border-border/30 text-center">
                                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-muted text-foreground text-sm font-black border border-border/50 shadow-sm group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-colors">
                                      {subj.theoryCredits?.toFixed(1) || '0.0'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 border border-border/30">
                                    <span className="font-bold text-foreground/80">{getAssignedFacultyName(section.id, subj.code)}</span>
                                  </td>
                                </tr>
                              );
                              const row2 = (
                                <tr key={`${subj.code}-lab`} className="bg-muted/10 hover:bg-primary/5 transition-colors group">
                                  <td className="px-4 py-3 border border-border/30 text-center font-bold text-muted-foreground group-hover:text-primary transition-colors">{sNo++}</td>
                                  <td className="px-4 py-3 border border-border/30">
                                    <span className="font-black uppercase tracking-wider text-primary/80">{subj.code}</span>
                                  </td>
                                  <td className="px-4 py-3 border border-border/30">
                                    <span className="font-semibold text-foreground/70 italic">{subj.name} Lab</span>
                                  </td>
                                  <td className="px-4 py-3 border border-border/30 text-center">
                                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-muted text-foreground text-sm font-black border border-border/50 shadow-sm group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-colors">
                                      {subj.labCredits?.toFixed(1) || '0.0'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 border border-border/30">
                                    <span className="font-bold text-foreground/80">{getAssignedFacultyName(section.id, subj.code)}</span>
                                  </td>
                                </tr>
                              );
                              return [row1, row2];
                            } else {
                              // Single row
                              return (
                                <tr key={subj.code} className="bg-card hover:bg-primary/5 transition-colors odd:bg-muted/20 group">
                                  <td className="px-4 py-3 border border-border/30 text-center font-bold text-muted-foreground group-hover:text-primary transition-colors">{sNo++}</td>
                                  <td className="px-4 py-3 border border-border/30">
                                    <span className="font-black uppercase tracking-wider text-primary/80">{subj.code}</span>
                                  </td>
                                  <td className="px-4 py-3 border border-border/30">
                                    <span className="font-semibold text-foreground">{subj.name}</span>
                                  </td>
                                  <td className="px-4 py-3 border border-border/30 text-center">
                                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-muted text-foreground text-sm font-black border border-border/50 shadow-sm group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-colors">
                                      {subj.credits?.toFixed(1) || '0.0'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 border border-border/30">
                                    <span className="font-bold text-foreground/80">{getAssignedFacultyName(section.id, subj.code)}</span>
                                  </td>
                                </tr>
                              );
                            }
                          })
                          ];
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useTimetable } from '@/contexts/TimetableContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Building2, MapPin, Search, Calendar, Info, Clock } from 'lucide-react';
import TimetableGrid from '@/components/timetable/TimetableGrid';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function LabTimetable() {
  const { data } = useTimetable();
  const [selectedLab, setSelectedLab] = useState<string>('');

  if (!data.generatedTimetable) {
    return (
      <div className="p-4 animate-fade-in">
        <h1 className="text-xl font-bold">Lab Room Timetable</h1>
        <p className="text-sm text-muted-foreground mt-4">No timetable generated yet. Go to Generate tab first.</p>
      </div>
    );
  }

  const activeLab = data.labRooms.find(l => l.id === selectedLab);

  return (
    <div className="p-6 space-y-8 animate-fade-in max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 dark:bg-slate-950 p-8 rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-primary/20 blur-[100px] group-hover:bg-primary/30 transition-all duration-1000" />
        
        <div className="relative z-10 space-y-2">
          <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.3em] border-primary/40 text-primary bg-primary/10 px-4 py-1.5 mb-2 rounded-full">
            Infrastructure View
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 shadow-xl border border-white/20">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            Lab <span className="text-primary/80">Timetable</span>
          </h1>
          <p className="text-slate-400 font-bold max-w-md text-sm leading-relaxed ml-2">
            Monitor and manage laboratory occupancy across the department.
          </p>
        </div>

        <div className="relative z-10 w-full md:w-80">
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
            <CardHeader className="py-3 px-5 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-primary" />
                <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-300">Room Selection</Label>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <Select value={selectedLab} onValueChange={setSelectedLab}>
                <SelectTrigger className="h-12 text-sm font-bold border-white/10 focus:ring-primary/20 bg-slate-900/50 text-white rounded-xl">
                  <SelectValue placeholder="Identify Lab Room..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-white/10 shadow-2xl">
                  {data.labRooms.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="font-bold">
                      {l.name} ({l.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </div>

      {activeLab ? (
        <div className="space-y-6 mt-8 animate-slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-foreground uppercase tracking-tight leading-none">
                  {activeLab.name}
                </h2>
                <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">{activeLab.id} — Capacity: {activeLab.capacity} Students</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-muted/50 border-border/60 py-2 px-4 rounded-xl flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-black uppercase tracking-widest">Weekly Schedule</span>
              </Badge>
              <Badge variant="outline" className="bg-muted/50 border-border/60 py-2 px-4 rounded-xl flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-indigo-500 text-primary" />
                <span className="text-xs font-black uppercase tracking-widest">Active Status</span>
              </Badge>
            </div>
          </div>

          <div className="rounded-[2rem] border-2 border-border/40 overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] bg-card/30 backdrop-blur-md relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-indigo-500 to-violet-500 opacity-50" />
            <TimetableGrid
              sessions={data.generatedTimetable!}
              subjects={data.subjects}
              faculty={data.faculty}
              viewMode="lab"
              filterId={selectedLab}
              editable={false}
            />
          </div>
          
          <div className="p-6 rounded-2xl bg-muted/20 border border-border/40 flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Info className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase tracking-tight text-foreground">Occupancy Note</h4>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                This timetable displays continuous 2-hour laboratory sessions. Single-hour sessions or theory classes assigned to this room are filtered for administrative clarity.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-32 text-center space-y-6 max-w-md mx-auto animate-pulse">
            <div className="h-24 w-24 bg-muted/30 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-border/60">
              <Search className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground font-black text-sm uppercase tracking-[0.2em]">Select a lab room to view its weekly schedule</p>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useTimetable } from '@/contexts/TimetableContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import TimetableGrid from '@/components/timetable/TimetableGrid';

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
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase">Lab Timetable</h1>
      </div>

      <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 shadow-sm transition-all hover:bg-muted/50">
        <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-2 block px-1">Select Lab Room</Label>
        <Select value={selectedLab} onValueChange={setSelectedLab}>
          <SelectTrigger className="h-11 text-base font-bold border-2 focus:ring-primary/20 bg-card">
            <SelectValue placeholder="Select a Lab Room" />
          </SelectTrigger>
          <SelectContent>
            {data.labRooms.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name} ({l.id})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activeLab ? (
        <div className="space-y-6 mt-8">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
              {activeLab.name} — Capacity: {activeLab.capacity}
            </h2>
            <div className="h-[2px] flex-grow bg-border/40 rounded-full" />
          </div>

          <div className="rounded-2xl border-2 border-border/40 overflow-hidden shadow-xl bg-card/30 backdrop-blur-sm">
            <TimetableGrid
              sessions={data.generatedTimetable!}
              subjects={data.subjects}
              faculty={data.faculty}
              viewMode="lab"
              filterId={selectedLab}
              editable={false}
            />
          </div>
        </div>
      ) : (
        <div className="py-20 text-center">
            <p className="text-muted-foreground font-bold italic underline decoration-primary/30 underline-offset-4">Select a lab room to view its weekly schedule</p>
        </div>
      )}
    </div>
  );
}

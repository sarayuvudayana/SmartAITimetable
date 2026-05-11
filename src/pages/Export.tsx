import React from 'react';
import { useTimetable } from '@/contexts/TimetableContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Printer, RotateCcw, Users, FileText, Building2 } from 'lucide-react';
import { exportToCSV, downloadFile, printTimetable } from '@/utils/exportUtils';
import { exportFacultyToCSV } from '@/utils/facultyExportUtils';
import { exportFacultyTimetablePdf } from '@/utils/facultyPdfExport';
import { exportLabTimetablePdf } from '@/utils/labPdfExport';
import { exportLabToCSV } from '@/utils/labExportUtils';
import { toast } from '@/hooks/use-toast';

export default function ExportPage() {
  const { data, dispatch } = useTimetable();

  const hasTable = !!data.generatedTimetable;

  const handleCSV = () => {
    if (!data.generatedTimetable) return;
    const csv = exportToCSV({
      sessions: data.generatedTimetable,
      sections: data.sections,
      subjects: data.subjects,
      faculty: data.faculty,
      labRooms: data.labRooms,
    });
    downloadFile(csv, 'timetable.csv', 'text/csv');
    toast({ title: 'Section timetable CSV exported' });
  };

  const handleFacultyCSV = () => {
    if (!data.generatedTimetable) return;
    const csv = exportFacultyToCSV({
      sessions: data.generatedTimetable,
      faculty: data.faculty,
      subjects: data.subjects,
      sections: data.sections,
    });
    downloadFile(csv, 'faculty-timetable.csv', 'text/csv');
    toast({ title: 'Faculty timetable CSV exported' });
  };

  const handleLabCSV = () => {
    if (!data.generatedTimetable) return;
    const csv = exportLabToCSV({
      sessions: data.generatedTimetable,
      faculty: data.faculty,
      subjects: data.subjects,
      sections: data.sections,
      labRooms: data.labRooms,
    });
    downloadFile(csv, 'lab-timetable.csv', 'text/csv');
    toast({ title: 'Lab Room timetable CSV exported' });
  };

  const handleFacultyPdf = () => {
    if (!data.generatedTimetable) return;
    exportFacultyTimetablePdf({
      sessions: data.generatedTimetable,
      faculty: data.faculty,
      subjects: data.subjects,
      sections: data.sections,
    });
    toast({ title: 'Faculty timetable PDF opened for print' });
  };

  const handleLabPdf = () => {
    if (!data.generatedTimetable) return;
    exportLabTimetablePdf({
      sessions: data.generatedTimetable,
      faculty: data.faculty,
      subjects: data.subjects,
      sections: data.sections,
      labRooms: data.labRooms,
    });
    toast({ title: 'Lab Room PDF opened for print' });
  };

  const handlePrint = () => {
    if (!data.generatedTimetable) return;
    printTimetable({
      sessions: data.generatedTimetable,
      sections: data.sections,
      subjects: data.subjects,
      faculty: data.faculty,
      labRooms: data.labRooms,
    });
  };

  const handleReset = () => {
    dispatch({ type: 'RESET' });
    toast({ title: 'All data cleared' });
  };

  return (
    <div className="p-6 space-y-8 animate-fade-in max-w-4xl mx-auto pb-24">
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">Export & Distribution</h1>
        <p className="text-sm text-muted-foreground mt-1 font-medium italic">Generate professional documents for faculty and students</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card className="border-2 border-slate-900/5 dark:border-white/5 shadow-xl hover:border-primary/20 transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform">
            <FileSpreadsheet className="h-20 w-20" />
          </div>
          <CardHeader>
            <CardTitle className="text-lg font-black flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              CSV Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed font-bold uppercase tracking-wider opacity-60">
              Raw data for spreadsheets
            </p>
            <div className="space-y-2">
              <Button onClick={handleCSV} variant="outline" disabled={!hasTable} className="w-full font-bold uppercase tracking-widest h-10 text-[10px]">
                <FileSpreadsheet className="h-3.5 w-3.5 mr-2" /> Section CSV
              </Button>
              <Button onClick={handleFacultyCSV} variant="outline" disabled={!hasTable} className="w-full font-bold uppercase tracking-widest h-10 text-[10px]">
                <Users className="h-3.5 w-3.5 mr-2" /> Faculty CSV
              </Button>
              <Button onClick={handleLabCSV} variant="outline" disabled={!hasTable} className="w-full font-bold uppercase tracking-widest h-10 text-[10px]">
                <Building2 className="h-3.5 w-3.5 mr-2" /> Lab Room CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-slate-900/5 dark:border-white/5 shadow-xl hover:border-accent/20 transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform text-accent">
            <FileText className="h-20 w-20" />
          </div>
          <CardHeader>
            <CardTitle className="text-lg font-black flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all">
                <FileText className="h-5 w-5" />
              </div>
              PDF Timetables
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-accent/60 leading-relaxed font-bold uppercase tracking-wider opacity-80">
              Print-ready documents
            </p>
            <div className="space-y-2">
              <Button onClick={handlePrint} disabled={!hasTable} className="w-full font-black uppercase tracking-widest h-11 bg-slate-900 dark:bg-white dark:text-slate-900 hover:opacity-90">
                <Printer className="h-4 w-4 mr-2" /> Section PDFs
              </Button>
              <Button onClick={handleFacultyPdf} disabled={!hasTable} className="w-full font-black uppercase tracking-widest h-11" variant="outline">
                <Users className="h-4 w-4 mr-2" /> Faculty PDFs
              </Button>
              <Button onClick={handleLabPdf} disabled={!hasTable} className="w-full font-black uppercase tracking-widest h-11" variant="outline">
                <Building2 className="h-4 w-4 mr-2" /> Lab Room PDFs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-destructive/20 shadow-lg bg-destructive/5">
        <CardHeader className="pb-3 border-b border-destructive/10">
          <CardTitle className="text-sm font-black text-destructive uppercase tracking-[0.2em] flex items-center gap-2">
            <RotateCcw className="h-4 w-4" /> System Control
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-xs text-destructive/70 mb-4 font-bold">
            CAUTION: This will permanently delete all uploaded faculty, subjects, and generated timetables.
          </p>
          <Button variant="destructive" onClick={handleReset} className="w-full font-bold uppercase tracking-widest shadow-lg shadow-destructive/20">
            Clear All Application Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


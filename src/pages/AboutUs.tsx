import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cpu, Zap, Target, Calendar, FileSpreadsheet, Users, ShieldCheck, Code } from 'lucide-react';

const features = [
  { icon: Cpu, title: 'AI-Powered Scheduling', desc: 'Uses a Genetic Algorithm to generate conflict-free timetables in seconds.' },
  { icon: Target, title: 'Constraint Engine', desc: 'Enforces hard constraints like faculty conflicts, lab continuity, and break rules.' },
  { icon: Calendar, title: 'Section & Faculty Views', desc: 'View timetables from both section and faculty perspectives.' },
  { icon: FileSpreadsheet, title: 'Export Options', desc: 'Export to CSV and PDF with full formatting, including workload summaries.' },
  { icon: Users, title: 'Career Path Scheduling', desc: 'Supports synchronized career path slots for 3rd & 4th year students.' },
  { icon: Zap, title: 'Real-Time Editing', desc: 'Edit cells in the generated timetable with live constraint validation.' },
];

const techStack = [
  'React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'Supabase Auth',
  'Genetic Algorithm', 'Web Workers', 'shadcn/ui', 'Lucide Icons',
];

export default function AboutUs() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">About This Application</h1>
        <p className="text-sm text-muted-foreground mt-1">Smart CSE Timetable Generator — Built for the future of academic scheduling</p>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground leading-relaxed">
          <p>
            The <strong>Smart CSE Timetable Generator</strong> is a professional-grade academic scheduling solution
            designed specifically for the Department of Computer Science & Engineering at GMR Institute of Technology.
          </p>
          <p>
            It leverages an advanced <strong>Genetic Algorithm (GA)</strong> to produce optimal, conflict-free
            timetables while respecting a comprehensive set of scheduling constraints including faculty availability,
            lab continuity, break periods, and career path synchronization.
          </p>
          <p>
            The application features a modern web interface with dark mode support, CSV/PDF export capabilities,
            and real-time cell editing with live constraint validation.
          </p>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Key Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* How GA Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" /> How the Genetic Algorithm Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-foreground leading-relaxed">
          <p>The timetable generation uses a bio-inspired optimization approach:</p>
          <ol className="list-decimal list-inside space-y-1.5 text-sm">
            <li><strong>Initialization</strong> — Creates a population of 60 random candidate timetables.</li>
            <li><strong>Fitness Evaluation</strong> — Each candidate is scored based on constraint violations.</li>
            <li><strong>Selection & Crossover</strong> — Best candidates are combined to produce offspring.</li>
            <li><strong>Mutation</strong> — Random changes (20% rate) introduce diversity.</li>
            <li><strong>Convergence</strong> — Runs up to 500 generations until a perfect solution is found.</li>
          </ol>
          <p className="text-muted-foreground text-xs mt-2">
            The algorithm runs in a Web Worker to keep the UI responsive during generation.
          </p>
        </CardContent>
      </Card>

      {/* Tech Stack */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" /> Technology Stack
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {techStack.map((tech) => (
              <Badge key={tech} variant="secondary" className="text-xs px-3 py-1">
                {tech}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

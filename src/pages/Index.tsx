import React from 'react';
import { useTimetable } from '@/contexts/TimetableContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, Layers, MapPin, Clock, GraduationCap, Star, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function Index() {
  const { data } = useTimetable();
  const { user } = useAuth();

  const stats = [
    { label: 'Faculty Members', value: data.faculty.length, icon: Users, color: 'from-violet-600 to-indigo-600' },
    { label: 'Subjects', value: data.subjects.length, icon: BookOpen, color: 'from-blue-600 to-cyan-600' },
    { label: 'Sections', value: data.sections.length, icon: Layers, color: 'from-emerald-600 to-teal-600' },
    { label: 'Lab Rooms', value: data.labRooms.length, icon: MapPin, color: 'from-amber-600 to-orange-600' },
  ];

  const teamMembers = [
    { name: 'Sarayu Vudayana', id: '23341A05L7', role: 'Team Lead', icon: Star, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { name: 'Sai Sanjana Konapala', id: '24345A0526', role: 'Team Member', icon: User, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { name: 'Siva Teja Vershit Vemula', id: '23341A05O8', role: 'Team Member', icon: User, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { name: 'Sade Chaitanya', id: '23341A05L5', role: 'Team Member', icon: User, color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
    { name: 'Shaik Mohammed Sharif', id: '23341A05M2', role: 'Team Member', icon: User, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  ];

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const currentDate = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="p-6 space-y-10 animate-fade-in max-w-7xl mx-auto pb-24">
      {/* 3D-ish Hero Banner */}
      <div 
        className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-10 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.6)] border border-white/10 group perspective-1000"
      >
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-96 w-96 rounded-full bg-primary/20 blur-[120px] group-hover:bg-primary/40 transition-all duration-1000 active:scale-110" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px]" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10 transition-transform duration-500 group-hover:translate-z-10">
          <div className="space-y-4">
            <Badge variant="outline" className="text-[11px] font-black uppercase tracking-[0.3em] border-primary/40 text-primary bg-primary/10 px-4 py-1.5 mb-2 rounded-full">
              Enterprise Scheduler v2.0
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none">
              Control your <span className="bg-gradient-to-r from-primary via-indigo-400 to-violet-400 bg-clip-text text-transparent">
                Curriculum
              </span>
            </h1>
            <p className="text-slate-400 font-bold max-w-xl text-lg leading-relaxed">
              Professional genetic algorithm-driven timetable management for the Department of CSE, GMR Institute of Technology.
            </p>
          </div>
          
          <div className="flex items-center gap-6 bg-white/5 backdrop-blur-xl rounded-[2rem] p-6 border border-white/10 shadow-inner group-hover:rotate-y-12 transition-all duration-700">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center border border-white/20 shadow-2xl shadow-primary/40">
              <Clock className="h-8 w-8 text-white animate-pulse" />
            </div>
            <div>
              <div className="text-3xl font-black text-white tracking-tighter">{currentTime}</div>
              <div className="text-xs font-black text-primary uppercase tracking-[0.2em]">{currentDate}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Stats with 3D Tilt Hover */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat) => (
          <div 
            key={stat.label} 
            className="group perspective-1000"
          >
            <Card className="relative h-full overflow-hidden border-border/40 bg-card/40 backdrop-blur-md transition-all duration-500 shadow-xl group-hover:shadow-primary/20 group-hover:border-primary/50 group-hover:[transform:rotateX(6deg)_rotateY(6deg)] transform-gpu">
              <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br", stat.color)} />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className={cn("p-4 rounded-2xl bg-gradient-to-br shadow-xl group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 transform-gpu", stat.color)}>
                    <stat.icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="h-1 w-12 rounded-full bg-border/40 group-hover:bg-primary/40 transition-colors" />
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-5xl font-black text-foreground tracking-tighter mb-1 group-hover:scale-110 origin-left transition-transform duration-500">{stat.value}</div>
                <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">{stat.label}</p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* About the Project Section */}
        <Card className="lg:col-span-2 border-border/40 shadow-2xl overflow-hidden bg-card/30 backdrop-blur-xl relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-10 -mt-10" />
          <CardHeader className="border-b border-border/60 bg-muted/20 p-8">
            <CardTitle className="text-2xl font-black flex items-center gap-4 tracking-tight">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <BookOpen className="h-6 w-6" />
              </div>
              About Smart CSE Timetable
            </CardTitle>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-lg font-bold text-foreground leading-relaxed">
                A state-of-the-art automated scheduling solution designed specifically for higher education institutions.
              </p>
              <p className="text-muted-foreground font-medium leading-relaxed">
                By leveraging advanced <strong>Genetic Algorithms</strong>, our system solves the complex multi-dimensional problem of academic scheduling. It considers faculty preferences, room capacities, course requirements, and departmental constraints to generate optimal, conflict-free timetables in seconds.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              {[
                { title: 'GA Powered', desc: 'Evolutionary algorithm for complex constraint solving.' },
                { title: 'Constraint-Aware', desc: 'Auto-detects faculty & room overlaps.' },
                { title: 'Premium Exports', desc: 'High-fidelity PDF and CSV generation.' },
                { title: 'Interactive UX', desc: 'Real-time editing and visual verification.' }
              ].map((f, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-2xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary font-black">{i+1}</div>
                  <div className="space-y-1">
                    <h4 className="font-black text-sm uppercase tracking-tight">{f.title}</h4>
                    <p className="text-xs text-muted-foreground font-bold">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* About GMRIT Section */}
        <Card className="border-border/40 shadow-2xl dark:bg-slate-900/40 bg-white/70 backdrop-blur-xl overflow-hidden group border border-foreground/5 flex flex-col">
          <div className="h-48 dark:bg-gradient-to-br dark:from-[#0f172a] dark:to-[#1e293b] bg-gradient-to-br from-slate-100 to-white flex items-center justify-center relative border-b border-border/40">
            <div className="absolute inset-0 bg-[url('https://www.gmrit.org/images/logo.png')] opacity-10 bg-center bg-no-repeat bg-contain" />
            <div className="z-10 text-center space-y-2">
              <div className="h-20 w-20 mx-auto rounded-3xl dark:bg-white/10 bg-primary/10 backdrop-blur-md flex items-center justify-center border dark:border-white/20 border-primary/20 shadow-2xl mb-4 group-hover:scale-110 transition-transform duration-500">
                <MapPin className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-black dark:text-white text-slate-900 uppercase tracking-widest">GMRIT Rajam</h3>
            </div>
          </div>
          <CardContent className="p-8 space-y-6 flex-grow flex flex-col justify-between">
            <div>
              <div className="space-y-2">
                <h4 className="text-xs font-black text-primary uppercase tracking-[0.25em]">Our Faculty</h4>
                <p className="text-sm text-foreground font-bold italic leading-relaxed">
                  "To be a learning-centered educational institution that offers a path to professional excellence."
                </p>
              </div>
              <div className="space-y-4 pt-4 mt-4 border-t border-border/40">
                <p className="text-xs text-muted-foreground font-medium leading-relaxed uppercase tracking-wider">
                  <strong>GMR Institute of Technology</strong> is a premier engineering college located in Rajam, Andhra Pradesh. The Department of <strong>Computer Science & Engineering</strong> is committed to delivering world-class education and innovation.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-4">
              <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[10px] uppercase tracking-widest">NAAC A+</Badge>
              <Badge className="bg-blue-500/10 text-blue-500 border-none font-black text-[10px] uppercase tracking-widest">NBA Accredited</Badge>
              <Badge className="bg-amber-500/10 text-amber-500 border-none font-black text-[10px] uppercase tracking-widest">Autonomous</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* About Team Section */}
      <Card className="border-border/40 shadow-2xl overflow-hidden bg-card/30 backdrop-blur-xl relative">
        <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -ml-20 -mt-20" />
        <CardHeader className="border-b border-border/60 bg-muted/20 p-8 text-center flex flex-col items-center">
          <Badge className="bg-primary/10 text-primary border-primary/20 font-black uppercase tracking-[0.3em] mb-4">Team D12</Badge>
          <CardTitle className="text-3xl font-black text-foreground tracking-tight">
            Meet the Developers
          </CardTitle>
          <p className="text-muted-foreground font-medium mt-2 max-w-xl mx-auto">
            The dedicated minds behind the Smart CSE Timetable Generator.
          </p>
        </CardHeader>
        <CardContent className="p-10 space-y-10">
          
          {/* Mentor Section */}
          <div className="flex justify-center">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 p-8 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800/50 dark:to-slate-900/50 border border-slate-900/5 dark:border-white/5 shadow-xl max-w-4xl w-full">
              <div className="h-24 w-24 flex-shrink-0 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner mt-2">
                <GraduationCap className="h-12 w-12 text-indigo-500" />
              </div>
              <div className="text-center sm:text-left relative flex-1">
                <div className="mb-2">
                  <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 border-indigo-500/30">Project Mentor</Badge>
                </div>
                <h3 className="text-3xl font-black text-foreground mb-1">Dr. K. Laxman Rao</h3>
                <p className="text-xs font-black text-muted-foreground tracking-[0.15em] uppercase mb-4">Department of Computer Science & Engineering</p>
                <div className="pt-4 border-t border-border/40">
                  <p className="text-sm text-center sm:text-justify text-foreground/80 leading-relaxed font-medium">
                    A dedicated educator and researcher specializing in <strong className="text-foreground">Artificial Intelligence</strong>. Beyond his academic contributions, he is highly respected across the college for his deeply committed involvement in proactively resolving the <strong className="text-foreground text-indigo-500 dark:text-indigo-400">Pink Pass issue</strong>, ensuring smoother administrative workflows and supporting student welfare at GMRIT.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-border/60 relative">
            <div className="absolute left-1/2 -transparent -translate-x-1/2 -top-3 bg-card px-4 text-xs font-black text-muted-foreground uppercase tracking-widest">The Development Team</div>
          </div>

          {/* Team Members Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {teamMembers.map((member, idx) => (
              <div key={idx} className="group relative">
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl blur-xl", member.bg)} />
                <div className="relative flex flex-col items-center p-6 rounded-3xl bg-card border border-border/40 shadow-lg group-hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-2 h-full justify-between gap-4">
                  <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center border shadow-inner transition-transform duration-500 group-hover:scale-110", member.bg, member.color, member.border)}>
                    <member.icon className="h-8 w-8" />
                  </div>
                  <div className="text-center space-y-1">
                    <h4 className="font-black text-foreground uppercase tracking-tight text-sm">{member.name}</h4>
                    <p className={cn("text-xs font-black uppercase tracking-widest italic opacity-80", member.color)}>{member.id}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest bg-muted/50 border-none">{member.role}</Badge>
                </div>
              </div>
            ))}
          </div>
          
        </CardContent>
      </Card>
    </div>
  );
}

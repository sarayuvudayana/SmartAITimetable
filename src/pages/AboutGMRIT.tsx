import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Award, Eye, Target, GraduationCap, Globe, BookOpen } from 'lucide-react';

const highlights = [
  { icon: GraduationCap, text: 'Established in 1997' },
  { icon: Award, text: 'NAAC Accredited' },
  { icon: Award, text: 'NBA Accredited Programs' },
  { icon: Globe, text: 'AICTE Approved' },
  { icon: Building2, text: 'Affiliated to JNTUGV, Vizianagaram' },
  { icon: MapPin, text: 'Rajam, Srikakulam, AP — 532127' },
];

const departments = [
  'Computer Science & Engineering',
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Information Technology',
  'Artificial Intelligence & Machine Learning',
  'Data Science',
];

export default function AboutGMRIT() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">About GMRIT</h1>
        <p className="text-sm text-muted-foreground mt-1">GMR Institute of Technology — Excellence in Education</p>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Institute Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground leading-relaxed">
          <p>
            <strong>GMR Institute of Technology (GMRIT)</strong> is a premier engineering college located in
            Rajam, Srikakulam District, Andhra Pradesh. Established in 1997, the institute is run by the
            <strong> GMR Varalakshmi Foundation</strong>, the philanthropic arm of the GMR Group.
          </p>
          <p>
            GMRIT is affiliated to Jawaharlal Nehru Technological University, Gurajada, Vizianagaram (JNTUGV)
            and is approved by the All India Council for Technical Education (AICTE). The institute is recognized
            for its commitment to quality education, research, and innovation.
          </p>
          <p>
            With state-of-the-art infrastructure, experienced faculty, and a strong emphasis on holistic
            development, GMRIT has consistently produced graduates who excel in both industry and academia.
          </p>
        </CardContent>
      </Card>

      {/* Quick Facts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Facts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {highlights.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{text}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Vision & Mission */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" /> Vision
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground leading-relaxed">
              To emerge as a center of excellence in technical education and research, producing globally
              competent engineers and technologists with ethical values.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" /> Mission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-foreground space-y-1.5 leading-relaxed">
              <li>• Provide quality education with modern infrastructure</li>
              <li>• Foster innovation and research culture</li>
              <li>• Develop industry-ready professionals</li>
              <li>• Inculcate ethical and social values</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Department of CSE */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Department of CSE
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground leading-relaxed">
          <p>
            The Department of Computer Science & Engineering is one of the flagship departments at GMRIT,
            offering undergraduate (B.Tech) and postgraduate (M.Tech) programs. The department is recognized
            for its strong academic curriculum, well-equipped laboratories, and dedicated faculty members.
          </p>
          <p>
            With a focus on emerging technologies like Artificial Intelligence, Machine Learning, Cloud Computing,
            and Cybersecurity, the department prepares students for the rapidly evolving technology landscape.
          </p>
        </CardContent>
      </Card>

      {/* All Departments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Departments Offered</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {departments.map((dept) => (
              <Badge key={dept} variant={dept.includes('Computer') ? 'default' : 'secondary'} className="text-xs px-3 py-1.5">
                {dept}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User, Mail, Briefcase, Building2, GraduationCap, Save } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || '');
  const [designation, setDesignation] = useState(user?.user_metadata?.designation || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName,
          designation: designation,
        },
      });
      if (error) throw error;
      toast({ title: 'Profile updated successfully' });
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const userInitial = displayName
    ? displayName.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your faculty profile information</p>
      </div>

      {/* Profile Avatar Card */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/80 to-primary/40" />
        <CardContent className="relative pt-0 pb-6">
          <div className="flex items-end gap-4 -mt-10">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-3xl font-bold shadow-xl border-4 border-card">
              {userInitial}
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-bold text-foreground">{displayName || 'Faculty Member'}</h2>
              <p className="text-sm text-muted-foreground">{designation || 'Faculty'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm flex items-center gap-2 mb-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" /> Display Name
              </Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Dr. K. Ramesh"
                className="h-10"
              />
            </div>
            <div>
              <Label className="text-sm flex items-center gap-2 mb-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
              </Label>
              <Input value={user?.email || ''} disabled className="h-10 bg-muted" />
            </div>
          </div>
          <div>
            <Label className="text-sm flex items-center gap-2 mb-1.5">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" /> Position / Designation
            </Label>
            <Input
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="Assistant Professor / Associate Professor / Professor / HOD"
              className="h-10"
            />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* College Info (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> College Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Department</Label>
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" /> Computer Science & Engineering
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Institution</Label>
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> GMR Institute of Technology
              </p>
            </div>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground mb-1 block">Location</Label>
            <p className="text-sm text-foreground">Rajam, Srikakulam District, Andhra Pradesh — 532127</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

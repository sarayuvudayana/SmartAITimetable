import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { UserPlus, Eye, EyeOff } from 'lucide-react';

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, displayName);
      toast({ title: 'Account created!', description: 'Please check your email to confirm your account.' });
      navigate('/login');
    } catch (err: any) {
      toast({ title: 'Signup failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#020617] dark:bg-gradient-to-br dark:from-[#020617] dark:via-[#0f172a] dark:to-[#1e293b]">
      {/* Animated floating shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[10%] h-64 w-64 rounded-full bg-primary/5 blur-3xl animate-float-slow" />
        <div className="absolute bottom-[15%] right-[10%] h-80 w-80 rounded-full bg-accent/5 blur-3xl animate-float-slow-2" />
        <div className="absolute top-[50%] left-[60%] h-48 w-48 rounded-full bg-primary/5 blur-2xl animate-float" />
        <div className="absolute top-[20%] right-[20%] h-16 w-16 border-2 border-white/10 rounded-lg rotate-45 animate-float-slow" />
        <div className="absolute bottom-[30%] left-[15%] h-12 w-12 border-2 border-white/10 rounded-full animate-float-slow-2" />
      </div>

      {/* Signup Card */}
      <div className="relative z-10 w-full max-w-md animate-slide-up group perspective-1000">
        <Card className="bg-slate-900/40 backdrop-blur-xl border-border/40 shadow-2xl animate-glow-pulse transition-all duration-700 group-hover:[transform:rotateX(6deg)_rotateY(10deg)] transform-gpu">
          <CardHeader className="text-center pb-2 space-y-3">
            <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/20 group-hover:scale-110 group-hover:rotate-12 transition-all border border-white/10">
              <span className="text-white font-black text-3xl tracking-tighter">TT</span>
            </div>
            <div>
              <CardTitle className="text-3xl font-black text-white tracking-tighter uppercase">Join Smart TT</CardTitle>
              <p className="text-xs text-primary/70 mt-2 font-black uppercase tracking-[0.25em]">Create Faculty Account</p>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-black text-white/50 uppercase tracking-[0.2em] ml-1">Display Name</Label>
                <Input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Dr. K. Ramesh"
                  className="h-11 bg-slate-950/50 border-white/10 text-white placeholder:text-white/20 focus:border-primary focus:ring-primary/20 transition-all rounded-xl font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-black text-white/50 uppercase tracking-[0.2em] ml-1">Email Identifier</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@gmrit.edu.in"
                  required
                  className="h-11 bg-slate-950/50 border-white/10 text-white placeholder:text-white/20 focus:border-primary focus:ring-primary/20 transition-all rounded-xl font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-black text-white/50 uppercase tracking-[0.2em] ml-1">Secure Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-11 bg-slate-950/50 border-white/10 text-white placeholder:text-white/20 focus:border-primary focus:ring-primary/20 transition-all pr-12 rounded-xl font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] rounded-xl mt-2 border-0"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Create Account'}
              </Button>
            </form>
            <p className="text-xs text-center text-white/40 mt-6 font-bold uppercase tracking-widest">
              Already a member?{' '}
              <Link to="/login" className="text-primary hover:text-accent underline underline-offset-4 transition-colors">
                Sign In
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

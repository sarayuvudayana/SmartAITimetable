import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Database, Play, Eye, Users, Download, LogOut, Moon, Sun, User, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useDarkMode } from '@/hooks/use-dark-mode';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/input', icon: Database, label: 'Data' },
  { to: '/generate', icon: Play, label: 'Generate' },
  { to: '/view', icon: Eye, label: 'Section' },
  { to: '/faculty-view', icon: Users, label: 'Faculty' },
  { to: '/export', icon: Download, label: 'Export' },
];

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const { isDark, toggle } = useDarkMode();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      await signOut();
      toast({ title: 'Logged out successfully' });
      setProfileOpen(false);
    } catch (error) {
      toast({ title: 'Logout failed', variant: 'destructive' });
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const userInitial = user?.user_metadata?.display_name
    ? user.user_metadata.display_name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="flex flex-col min-h-screen bg-background transition-colors duration-300">
      {/* Professional Header */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-md px-5 py-3 flex items-center gap-4 sticky top-0 z-50">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="text-primary-foreground font-extrabold text-base tracking-tight">TT</span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-black leading-tight text-foreground tracking-tight uppercase">Smart CSE Timetable</h1>
          <p className="text-sm text-muted-foreground font-black tracking-widest uppercase">GMR Institute of Technology</p>
        </div>

        {/* Dark mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="h-9 w-9 rounded-full hover:bg-muted"
          aria-label="Toggle dark mode"
        >
          {isDark ? <Sun className="h-[18px] w-[18px] text-yellow-400" /> : <Moon className="h-[18px] w-[18px] text-muted-foreground" />}
        </Button>

        {/* Profile dropdown */}
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-sm shadow-md">
                {userInitial}
              </div>
              <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", profileOpen && "rotate-180")} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card shadow-xl py-2 animate-fade-in z-50">
                <div className="px-4 py-2 border-b border-border/60">
                  <p className="text-sm font-bold text-foreground truncate">{user.user_metadata?.display_name || 'Faculty'}</p>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => { navigate('/profile'); setProfileOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <User className="h-4 w-4 text-muted-foreground" /> My Profile
                </button>
                <div className="border-t border-border/60 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 overflow-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border/60 flex justify-around py-2 z-50">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'text-primary font-bold scale-105'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            <Icon className="h-6 w-6" />
            <span className="text-xs font-bold leading-none tracking-tight">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

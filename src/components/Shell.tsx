import { type ReactNode } from 'react';
import { LayoutDashboard, Users, UserPlus, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRoute, type Route } from '@/lib/router';
import { Button } from '@/components/ui';
import { BodyGarageBadge } from '@/components/BrandMarks';

export default function Shell({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const [route, go] = useRoute();

  const navItems: { label: string; icon: ReactNode; route: Route; active: boolean }[] = [
    { label: 'Dashboard', icon: <LayoutDashboard size={18} />, route: { name: 'dashboard' }, active: route.name === 'dashboard' },
    { label: 'Clients', icon: <Users size={18} />, route: { name: 'clients' }, active: route.name === 'clients' || route.name === 'client' },
    { label: 'Add Client', icon: <UserPlus size={18} />, route: { name: 'add-client' }, active: route.name === 'add-client' },
  ];

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <button onClick={() => go({ name: 'dashboard' })} className="flex items-center shrink-0 group">
            <div className="hidden sm:block text-left leading-none">
              <div className="font-display font-bold uppercase tracking-wider text-red-600 text-base sm:text-lg">Body Garage</div>
              <div className="font-display text-[9px] sm:text-[10px] tracking-[0.2em] sm:tracking-[0.25em] text-white uppercase">Fitness Club</div>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => go(item.route)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  item.active
                    ? 'bg-accent/15 text-accent border border-accent/30'
                    : 'text-ink/60 hover:text-ink hover:bg-panel-2 border border-transparent'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={signOut}>
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex items-center gap-1 px-4 pb-2.5 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => go(item.route)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                item.active
                  ? 'bg-accent/15 text-accent border border-accent/30'
                  : 'text-ink/60 hover:text-ink hover:bg-panel-2 border border-transparent'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Main */}
      <main className="flex-1 min-w-0 max-w-7xl mx-auto w-full px-3 sm:px-6 py-5 sm:py-6">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border py-4 px-6 text-center text-xs text-ink/30">
        Body Garage Fitness Club · Membership Tracker · Internal Staff Tool
      </footer>
    </div>
  );
}

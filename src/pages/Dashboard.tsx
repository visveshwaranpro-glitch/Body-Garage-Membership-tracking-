import { useEffect, useMemo, useState } from 'react';
import { Users, AlertTriangle, XCircle, Search, ChevronRight, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Client, ClientClassPackage } from '@/lib/types';
import { CLASS_TYPES } from '@/lib/types';
import { computeStatus, formatDate, todayKey } from '@/lib/dates';
import { useRoute } from '@/lib/router';
import { Card, Badge, Input, EmptyState, Spinner } from '@/components/ui';
import { CrossFitBadge, PersonalTrainingBadge, StretchBadge, ZumbaBadge } from '@/components/BrandMarks';

type ExpiringRow = {
  client: Client;
  kind: 'gym' | 'pt';
  daysRemaining: number;
  label: string;
};

export default function Dashboard() {
  const [, go] = useRoute();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [search, setSearch] = useState('');
  const [dateTick, setDateTick] = useState(() => todayKey());

  useEffect(() => {
    const timer = window.setInterval(() => setDateTick(todayKey()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    supabase
    Promise.all([
      supabase.from('clients').select('*').order('full_name'),
      supabase.from('client_class_packages').select('*'),
    ]).then(([{ data: clientData, error: clientError }, { data: classData, error: classError }]) => {
      if (clientError || classError) console.error(clientError ?? classError);
      const packages = (classData as ClientClassPackage[]) ?? [];
      setClients(((clientData ?? []) as Client[]).map((client) => ({
        ...client,
        class_packages: packages.filter((item) => item.client_id === client.id),
      })));
    });
  }, []);

  const stats = useMemo(() => {
    if (!clients) return null;
    let active = 0;
    let expiringSoon = 0;
    let expired = 0;
    let ptClients = 0;
    const classCounts = Object.fromEntries(CLASS_TYPES.map((type) => [type, 0])) as Record<(typeof CLASS_TYPES)[number], number>;
    for (const c of clients) {
      const gym = computeStatus(c.gym_package_expiry_date);
      const pt = c.has_personal_training ? computeStatus(c.pt_package_expiry_date) : null;
      const worst = pt && pt.status !== 'none' && (gym.status === 'none' || (pt.daysRemaining ?? Infinity) < (gym.daysRemaining ?? Infinity)) ? pt : gym;
      if (worst.status === 'active') active++;
      else if (worst.status === 'expiring') expiringSoon++;
      else if (worst.status === 'expired') expired++;
      if (c.has_personal_training) ptClients++;
      for (const classPackage of c.class_packages ?? []) {
        if (!classPackage.paused_at && computeStatus(classPackage.expiry_date ?? null).status === 'active') {
          classCounts[classPackage.class_type]++;
        }
      }
    }
    return { active, expiringSoon, expired, ptClients, total: clients.length, classCounts };
  }, [clients, dateTick]);

  const expiringRows = useMemo<ExpiringRow[]>(() => {
    if (!clients) return [];
    const rows: ExpiringRow[] = [];
    for (const c of clients) {
      const gym = computeStatus(c.gym_package_expiry_date);
      if (gym.status === 'expiring' || gym.status === 'expired') {
        rows.push({ client: c, kind: 'gym', daysRemaining: gym.daysRemaining ?? 0, label: gym.label });
      }
      if (c.has_personal_training) {
        const pt = computeStatus(c.pt_package_expiry_date);
        if (pt.status === 'expiring' || pt.status === 'expired') {
          rows.push({ client: c, kind: 'pt', daysRemaining: pt.daysRemaining ?? 0, label: pt.label });
        }
      }
    }
    return rows.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [clients, dateTick]);

  const searchResults = useMemo(() => {
    if (!clients || !search.trim()) return [];
    const q = search.trim().toLowerCase();
    return clients.filter(
      (c) => c.full_name.toLowerCase().includes(q) || c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))
    );
  }, [clients, search]);

  if (!clients || !stats) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="text-accent" />
      </div>
    );
  }

  const cards = [
    { label: 'Total Active Clients', value: stats.active, filter: { type: 'status' as const, value: 'active' }, icon: <Users size={20} />, tone: 'text-success', border: 'border-success/20' },
    ...CLASS_TYPES.map((type) => {
      const styles = {
        Zumba: { tone: 'text-zumba', border: 'border-zumba/30', icon: <ZumbaBadge size={22} /> },
        'Cross Fit': { tone: 'text-cross-fit', border: 'border-cross-fit/30', icon: <CrossFitBadge size={22} /> },
        Stretch: { tone: 'text-stretch', border: 'border-stretch/30', icon: <StretchBadge size={22} /> },
      }[type];
      return { label: type, value: stats.classCounts[type], filter: { type: 'package' as const, value: type }, ...styles };
    }),
    { label: 'Personal Training', value: stats.ptClients, filter: { type: 'package' as const, value: 'yes' }, icon: <PersonalTrainingBadge size={20} className="text-white" />, tone: 'text-white', border: 'border-accent/20' },
    { label: 'Expiring in 7 Days', value: stats.expiringSoon, filter: { type: 'status' as const, value: 'expiring' }, icon: <AlertTriangle size={20} />, tone: 'text-warning', border: 'border-warning/20' },
    { label: 'Expired', value: stats.expired, filter: { type: 'status' as const, value: 'expired' }, icon: <XCircle size={20} />, tone: 'text-expired', border: 'border-expired/30' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wide">Dashboard</h1>
        <p className="text-sm text-ink/40 mt-1">Overview of your gym memberships</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
        {cards.map((c) => (
          <button key={c.label} type="button" onClick={() => go({ name: 'clients', filter: c.filter })} className="text-left">
            <Card className={`h-full p-4 sm:p-5 border ${c.border} hover:shadow-glow-sm transition-shadow`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">{c.label}</span>
              <span className={c.tone}>{c.icon}</span>
            </div>
            <div className={`font-display text-3xl sm:text-4xl font-bold ${c.tone}`}>{c.value}</div>
            </Card>
          </button>
        ))}
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone number..."
            className="w-full bg-panel-2 border border-border rounded-xl pl-10 pr-3.5 py-2.5 text-ink placeholder:text-ink/30 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-colors"
          />
        </div>
        {searchResults.length > 0 && (
          <div className="mt-3 divide-y divide-border">
            {searchResults.slice(0, 6).map((c) => (
              <button
                key={c.id}
                onClick={() => go({ name: 'client', id: c.id })}
                className="w-full flex items-center justify-between py-2.5 group"
              >
                <div className="text-left">
                  <div className="font-semibold text-ink group-hover:text-accent transition-colors">{c.full_name}</div>
                  <div className="text-xs text-ink/40">{c.phone}</div>
                </div>
                <ChevronRight size={16} className="text-ink/30 group-hover:text-accent transition-colors" />
              </button>
            ))}
          </div>
        )}
        {search.trim() && searchResults.length === 0 && (
          <p className="text-sm text-ink/40 mt-3 text-center py-4">No clients found.</p>
        )}
      </Card>

      {/* Expiring soon panel */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-warning" />
          <h2 className="font-display text-lg font-bold uppercase tracking-wide">Expiring Soon</h2>
        </div>

        {expiringRows.length === 0 ? (
          <EmptyState icon={<AlertTriangle size={40} />} title="All clear" subtitle="No packages expiring soon." />
        ) : (
          <div className="space-y-2">
            {expiringRows.map((row) => {
              const tone = row.daysRemaining < 0 ? 'expired' : 'expiring';
              return (
                <button
                  key={`${row.client.id}-${row.kind}`}
                  onClick={() => go({ name: 'client', id: row.client.id })}
                  className="w-full flex items-center justify-between gap-3 bg-panel-2 hover:bg-panel-2/70 border border-border hover:border-accent/40 rounded-xl px-4 py-3 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-1.5 h-10 rounded-full ${tone === 'expired' ? 'bg-danger' : 'bg-warning'}`} />
                    <div className="text-left min-w-0">
                      <div className="font-semibold text-ink truncate group-hover:text-accent transition-colors">
                        {row.client.full_name}
                      </div>
                      <div className="text-xs text-ink/40 truncate">
                        {row.kind === 'gym' ? 'Gym Package' : `PT · ${row.client.pt_trainer ?? '—'}`} · Exp {formatDate(row.kind === 'gym' ? row.client.gym_package_expiry_date : row.client.pt_package_expiry_date)}
                      </div>
                    </div>
                  </div>
                  <Badge tone={tone}>{row.label}</Badge>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

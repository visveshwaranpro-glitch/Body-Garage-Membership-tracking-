import { useEffect, useMemo, useState } from 'react';
import { Users, Search, ChevronRight, Filter, ArrowUpDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/lib/types';
import { TRAINERS } from '@/lib/types';
import { computeStatus, formatDate } from '@/lib/dates';
import { useRoute } from '@/lib/router';
import { Card, Badge, Input, Select, EmptyState, Spinner, Button } from '@/components/ui';

type StatusFilter = 'all' | 'active' | 'expiring' | 'expired';
type SortBy = 'expiry' | 'name';

export default function ClientsList() {
  const [, go] = useRoute();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [ptFilter, setPtFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [trainerFilter, setTrainerFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortBy>('expiry');

  useEffect(() => {
    supabase
      .from('clients')
      .select('*')
      .then(({ data, error }) => {
        if (error) console.error(error);
        setClients(data ?? []);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!clients) return [];
    const q = search.trim().toLowerCase();
    let list = clients.filter((c) => {
      if (q && !c.full_name.toLowerCase().includes(q) && !c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))) return false;
      if (ptFilter === 'yes' && !c.has_personal_training) return false;
      if (ptFilter === 'no' && c.has_personal_training) return false;
      if (trainerFilter !== 'all' && c.trainer_assigned !== trainerFilter && c.pt_trainer !== trainerFilter) return false;
      const gym = computeStatus(c.gym_package_expiry_date);
      const pt = c.has_personal_training ? computeStatus(c.pt_package_expiry_date) : null;
      const worst = pt && pt.status !== 'none' && (gym.status === 'none' || (pt.daysRemaining ?? Infinity) < (gym.daysRemaining ?? Infinity)) ? pt : gym;
      if (statusFilter !== 'all' && worst.status !== statusFilter) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === 'name') return a.full_name.localeCompare(b.full_name);
      const aDays = Math.min(
        computeStatus(a.gym_package_expiry_date).daysRemaining ?? Infinity,
        a.has_personal_training ? computeStatus(a.pt_package_expiry_date).daysRemaining ?? Infinity : Infinity
      );
      const bDays = Math.min(
        computeStatus(b.gym_package_expiry_date).daysRemaining ?? Infinity,
        b.has_personal_training ? computeStatus(b.pt_package_expiry_date).daysRemaining ?? Infinity : Infinity
      );
      return aDays - bDays;
    });
    return list;
  }, [clients, search, statusFilter, ptFilter, trainerFilter, sortBy]);

  if (!clients) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wide">Clients</h1>
          <p className="text-sm text-ink/40 mt-1">{filtered.length} of {clients.length} members</p>
        </div>
        <Button onClick={() => go({ name: 'add-client' })}>+ Add Client</Button>
      </div>

      {/* Search + filters */}
      <Card className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full bg-panel-2 border border-border rounded-xl pl-10 pr-3.5 py-2.5 text-ink placeholder:text-ink/30 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-colors"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Select
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'expiring', label: 'Expiring Soon' },
              { value: 'expired', label: 'Expired' },
            ]}
          />
          <Select
            value={ptFilter}
            onChange={(v) => setPtFilter(v as 'all' | 'yes' | 'no')}
            options={[
              { value: 'all', label: 'All Clients' },
              { value: 'yes', label: 'Has PT' },
              { value: 'no', label: 'No PT' },
            ]}
          />
          <Select
            value={trainerFilter}
            onChange={setTrainerFilter}
            options={[
              { value: 'all', label: 'All Trainers' },
              ...TRAINERS.map((t) => ({ value: t, label: t })),
            ]}
          />
          <Select
            value={sortBy}
            onChange={(v) => setSortBy(v as SortBy)}
            options={[
              { value: 'expiry', label: 'Sort: Nearest Expiry' },
              { value: 'name', label: 'Sort: Name' },
            ]}
          />
        </div>
      </Card>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={<Users size={40} />} title="No clients found" subtitle="Try adjusting your filters or add a new client." />
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const gym = computeStatus(c.gym_package_expiry_date);
            const pt = c.has_personal_training ? computeStatus(c.pt_package_expiry_date) : null;
            return (
              <button
                key={c.id}
                onClick={() => go({ name: 'client', id: c.id })}
                className="w-full text-left bg-panel hover:bg-panel-2/60 border border-border hover:border-accent/40 rounded-2xl p-4 transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-lg text-ink group-hover:text-accent transition-colors uppercase tracking-wide">
                        {c.full_name}
                      </span>
                      {c.has_personal_training && <Badge tone="pt">PT</Badge>}
                    </div>
                    <div className="text-sm text-ink/50 mt-0.5">{c.phone}</div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-ink/40">
                      <span>Gym: <span className="text-ink/70">{c.gym_package_type ?? '—'}</span></span>
                      <span>Trainer Assigned: <span className="text-ink/70">{c.trainer_assigned ?? '—'}</span></span>
                      <span>Joined: <span className="text-ink/70">{formatDate(c.join_date)}</span></span>
                      {c.has_personal_training && c.pt_trainer && (
                        <span>PT Trainer: <span className="text-ink/70">{c.pt_trainer}</span></span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge tone={gym.status === 'active' ? 'active' : gym.status === 'expiring' ? 'expiring' : 'expired'}>
                      Gym: {gym.label}
                    </Badge>
                    {pt && pt.status !== 'none' && (
                      <Badge tone={pt.status === 'active' ? 'active' : pt.status === 'expiring' ? 'expiring' : 'expired'}>
                        PT: {pt.label}
                      </Badge>
                    )}
                    <ChevronRight size={16} className="text-ink/30 group-hover:text-accent transition-colors mt-1" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

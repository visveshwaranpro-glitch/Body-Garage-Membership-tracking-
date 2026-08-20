import { useEffect, useMemo, useState } from 'react';
import { Users, Search, ChevronRight, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Client, ClientClassPackage } from '@/lib/types';
import { TRAINERS } from '@/lib/types';
import { CLASS_TYPES } from '@/lib/types';
import { computeStatus, formatDate, todayKey } from '@/lib/dates';
import { useRoute } from '@/lib/router';
import { Card, Badge, Input, Select, EmptyState, Spinner, Button } from '@/components/ui';
import ClientContactActions from '@/components/ClientContactActions';

type StatusFilter = 'all' | 'active' | 'expiring' | 'expired';
type SortBy = 'expiry' | 'name';
type PackageFilter = 'all' | 'yes' | 'no' | 'favorites' | 'Zumba' | 'Cross Fit' | 'Stretch';

export default function ClientsList() {
  const [route, go] = useRoute();
  const initialFilter = route.name === 'clients' ? route.filter : undefined;
  const [clients, setClients] = useState<Client[] | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => initialFilter?.type === 'status' ? initialFilter.value as StatusFilter : 'all');
  const [ptFilter, setPtFilter] = useState<PackageFilter>(() => initialFilter?.type === 'package' ? initialFilter.value as PackageFilter : 'all');
  const [trainerFilter, setTrainerFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortBy>('expiry');
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const [dateTick, setDateTick] = useState(() => todayKey());

  useEffect(() => {
    const timer = window.setInterval(() => setDateTick(todayKey()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    Promise.all([
      supabase.from('clients').select('*'),
      supabase.from('client_class_packages').select('*'),
    ]).then(([{ data: clientData, error: clientError }, { data: classData, error: classError }]) => {
      if (clientError || classError) console.error(clientError ?? classError);
      const packages = (classData as ClientClassPackage[]) ?? [];
      const loadedClients = ((clientData ?? []) as Client[]).map((client) => ({
        ...client,
        class_packages: packages.filter((item) => item.client_id === client.id),
      }));
      const uniqueClients = new Map<string, Client>();
      for (const client of loadedClients) {
        const key = client.full_name.trim().toLowerCase();
        const existing = uniqueClients.get(key);
        if (!existing) {
          uniqueClients.set(key, client);
        } else {
          const classPackages = [...(existing.class_packages ?? []), ...(client.class_packages ?? [])]
            .filter((item, index, items) => items.findIndex((entry) => entry.class_type === item.class_type) === index);
          const preferred = (client.class_packages?.length ?? 0) > (existing.class_packages?.length ?? 0) ? client : existing;
          uniqueClients.set(key, { ...preferred, class_packages: classPackages });
        }
      }
      setClients([...uniqueClients.values()]);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!clients) return [];
    const q = search.trim().toLowerCase();
    let list = clients.filter((c) => {
      if (q && !c.full_name.toLowerCase().includes(q) && !c.phone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))) return false;
      if (ptFilter === 'yes' && !c.has_personal_training) return false;
      if (ptFilter === 'no' && c.has_personal_training) return false;
      if (ptFilter === 'favorites' && !c.is_favorite) return false;
      if (CLASS_TYPES.includes(ptFilter as (typeof CLASS_TYPES)[number]) && !c.class_packages?.some((item) => item.class_type === ptFilter)) return false;
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
        a.has_personal_training ? computeStatus(a.pt_package_expiry_date).daysRemaining ?? Infinity : Infinity,
        ...(a.class_packages?.map((item) => computeStatus(item.expiry_date ?? null).daysRemaining ?? Infinity) ?? [Infinity])
      );
      const bDays = Math.min(
        computeStatus(b.gym_package_expiry_date).daysRemaining ?? Infinity,
        b.has_personal_training ? computeStatus(b.pt_package_expiry_date).daysRemaining ?? Infinity : Infinity,
        ...(b.class_packages?.map((item) => computeStatus(item.expiry_date ?? null).daysRemaining ?? Infinity) ?? [Infinity])
      );
      return aDays - bDays;
    });
    return list;
  }, [clients, search, statusFilter, ptFilter, trainerFilter, sortBy, dateTick]);

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
        {favoriteError && <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-xl px-3 py-2">{favoriteError}</p>}
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
            onChange={(v) => setPtFilter(v as PackageFilter)}
            options={[
              { value: 'all', label: 'All Clients' },
              { value: 'yes', label: 'Has PT' },
              { value: 'no', label: 'No PT' },
              ...CLASS_TYPES.map((type) => ({ value: type, label: type })),
              { value: 'favorites', label: 'Favorites' },
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
            const classPackages = c.class_packages ?? [];
            const gymLabel = c.gym_paused_at ? 'Paused' : gym.label;
            const ptLabel = c.pt_paused_at ? 'Paused' : pt?.label;
            return (
              <div
                key={c.id}
                onClick={() => go({ name: 'client', id: c.id })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') go({ name: 'client', id: c.id });
                }}
                role="button"
                tabIndex={0}
                className="w-full text-left bg-panel hover:bg-panel-2/60 border border-border hover:border-accent/40 rounded-2xl p-4 transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-lg text-ink group-hover:text-accent transition-colors uppercase tracking-wide">
                        {c.full_name}
                      </span>
                      {c.has_personal_training && <Badge tone="pt">PT</Badge>}
                      {classPackages.map((item) => <Badge key={item.class_type} tone="neutral">{item.class_type}</Badge>)}
                      <button
                        type="button"
                        onClick={async (event) => {
                          event.stopPropagation();
                          setFavoriteError(null);
                          const nextFavorite = !c.is_favorite;
                          const { error } = await supabase.from('clients').update({ is_favorite: nextFavorite }).eq('id', c.id);
                          if (error) {
                            setFavoriteError('Favorites are not available until the database migration is applied.');
                            return;
                          }
                          setClients((current) => current?.map((client) => client.id === c.id ? { ...client, is_favorite: nextFavorite } : client) ?? null);
                        }}
                        aria-label={c.is_favorite ? `Remove ${c.full_name} from favorites` : `Add ${c.full_name} to favorites`}
                        title={c.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${c.is_favorite ? 'text-warning bg-warning/15' : 'text-ink/30 hover:text-warning hover:bg-warning/10'}`}
                      >
                        <Star size={17} fill={c.is_favorite ? 'currentColor' : 'none'} />
                      </button>
                      <ClientContactActions name={c.full_name} phone={c.phone} expiryDate={c.gym_package_expiry_date} status={gym.status} paused={Boolean(c.gym_paused_at)} />
                    </div>
                    {c.is_favorite && c.notes?.trim() && (
                      <div className="mt-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-ink/70">
                        {c.notes}
                      </div>
                    )}
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
                    <Badge tone={c.gym_paused_at ? 'neutral' : gym.status === 'active' ? 'active' : gym.status === 'expiring' ? 'expiring' : 'expired'}>
                      Gym: {gymLabel}
                    </Badge>
                    {pt && pt.status !== 'none' && (
                      <Badge tone={c.pt_paused_at ? 'neutral' : pt.status === 'active' ? 'active' : pt.status === 'expiring' ? 'expiring' : 'expired'}>
                        PT: {ptLabel}
                      </Badge>
                    )}
                    {classPackages.map((item) => {
                      const status = computeStatus(item.expiry_date ?? null);
                      return status.status !== 'none' && <Badge key={item.class_type} tone={item.paused_at ? 'neutral' : status.status === 'active' ? 'active' : status.status === 'expiring' ? 'expiring' : 'expired'}>{item.class_type}: {item.paused_at ? 'Paused' : status.label}</Badge>;
                    })}
                    <ChevronRight size={16} className="text-ink/30 group-hover:text-accent transition-colors mt-1" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Dumbbell, Save, Trash2, RefreshCw, XCircle, Plus, Check, AlertCircle, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Client, ClientClassPackage, Renewal } from '@/lib/types';
import { TRAINERS, PACKAGE_TYPES, CLASS_TYPES } from '@/lib/types';
import { computeStatus, formatDate, addDays, daysBetween, packageDurationDays, today, todayInputDate, todayKey, toInputDate } from '@/lib/dates';
import { useRoute } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { Card, Input, Select, Textarea, Button, Badge, Modal, Spinner, EmptyState } from '@/components/ui';
import ClientContactActions from '@/components/ClientContactActions';
import { CrossFitBadge, StretchBadge, ZumbaBadge } from '@/components/BrandMarks';

type RenewKind = 'gym' | 'pt';

export default function ClientProfile({ id }: { id: string }) {
  const [, go] = useRoute();
  const { session } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [classPackages, setClassPackages] = useState<ClientClassPackage[]>([]);
  const [classTableAvailable, setClassTableAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renewKind, setRenewKind] = useState<RenewKind | null>(null);
  const [addPtOpen, setAddPtOpen] = useState(false);
  const [cancelPtOpen, setCancelPtOpen] = useState(false);
  const [classRenewItem, setClassRenewItem] = useState<ClientClassPackage | null>(null);
  const [classRenewStart, setClassRenewStart] = useState(todayInputDate());
  const [classRenewDuration, setClassRenewDuration] = useState('30');
  const [classRenewPrice, setClassRenewPrice] = useState('');
  const [classCancelItem, setClassCancelItem] = useState<ClientClassPackage | null>(null);
  const [dateTick, setDateTick] = useState(() => todayKey());

  useEffect(() => {
    const timer = window.setInterval(() => setDateTick(todayKey()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Edit form state
  const [form, setForm] = useState<Partial<Client>>({});

  // Renew form state
  const [renewDuration, setRenewDuration] = useState('30');
  const [renewPrice, setRenewPrice] = useState('');
  const [renewStart, setRenewStart] = useState(todayInputDate());
  const [renewPackageType, setRenewPackageType] = useState(client?.gym_package_type ?? 'Monthly');
  const [renewDurationEdited, setRenewDurationEdited] = useState(false);

  // Add PT form state
  const [ptTrainer, setPtTrainer] = useState('');
  const [ptPkgName, setPtPkgName] = useState('');
  const [ptStart, setPtStart] = useState(todayInputDate());
  const [ptDuration, setPtDuration] = useState('30');
  const [ptPrice, setPtPrice] = useState('');

  const staffName = useMemo(() => {
    const email = session?.user?.email ?? '';
    if (email.includes('karthick')) return 'Karthick (Owner)';
    if (email.includes('arun')) return 'Arun';
    if (email.includes('bala')) return 'Bala Ganesh';
    if (email.includes('adhitya')) return 'Adhitya';
    if (email.includes('poorani')) return 'Poorani';
    return email || 'Staff';
  }, [session]);

  const loadClient = async () => {
    setLoading(true);
    const [{ data: c, error: cErr }, { data: r }, { data: classes, error: classError }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).maybeSingle(),
      supabase.from('renewals_log').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('client_class_packages').select('*').eq('client_id', id).order('class_type'),
    ]);
    if (cErr || !c) {
      setError('Client not found.');
      setLoading(false);
      return;
    }
    setClient(c as Client);
    setForm(c as Client);
    setRenewals((r as Renewal[]) ?? []);
    setClassTableAvailable(!classError);
    setClassPackages((classes as ClientClassPackage[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadClient(); /* eslint-disable-next-line */ }, [id]);

  const gymStatus = useMemo(() => (client ? computeStatus(client.gym_package_expiry_date) : null), [client, dateTick]);
  const ptStatus = useMemo(() => (client?.has_personal_training ? computeStatus(client.pt_package_expiry_date) : null), [client, dateTick]);

  const startEdit = () => {
    setForm(client ?? {});
    setEditing(true);
  };

  const toggleFavorite = async () => {
    if (!client) return;
    const nextFavorite = !client.is_favorite;
    const { error: favoriteError } = await supabase.from('clients').update({ is_favorite: nextFavorite }).eq('id', client.id);
    if (favoriteError) {
      setError('Could not update favorite status.');
      return;
    }
    setClient({ ...client, is_favorite: nextFavorite });
  };

  const toggleOverallPackagePause = async () => {
    if (!client) return;
    setError(null);
    const shouldPause = !client.gym_paused_at;
    const todayDate = todayInputDate();
    const clientUpdates = shouldPause
      ? { gym_paused_at: todayDate, ...(client.has_personal_training ? { pt_paused_at: todayDate } : {}) }
      : {
        gym_paused_at: null,
        gym_package_expiry_date: toInputDate(addDays(new Date(client.gym_package_expiry_date), daysBetween(new Date(client.gym_paused_at ?? todayDate), today())).toISOString()),
        gym_package_duration_days: client.gym_package_duration_days + daysBetween(new Date(client.gym_paused_at ?? todayDate), today()),
        ...(client.has_personal_training && client.pt_paused_at && client.pt_package_expiry_date && client.pt_package_duration_days != null ? {
          pt_paused_at: null,
          pt_package_expiry_date: toInputDate(addDays(new Date(client.pt_package_expiry_date), daysBetween(new Date(client.pt_paused_at), today())).toISOString()),
          pt_package_duration_days: client.pt_package_duration_days + daysBetween(new Date(client.pt_paused_at), today()),
        } : {}),
      };
    const { error: clientError } = await supabase.from('clients').update(clientUpdates).eq('id', client.id);
    if (clientError) { setError(`Could not ${shouldPause ? 'pause' : 'resume'} packages: ${clientError.message}`); return; }

    const classUpdates = (classPackages ?? []).filter((item) => item.id).map((item) => {
      if (shouldPause) return supabase.from('client_class_packages').update({ paused_at: todayDate }).eq('id', item.id);
      if (!item.paused_at) return null;
      const pauseDays = daysBetween(new Date(item.paused_at), today());
      return supabase.from('client_class_packages').update({
        paused_at: null,
        expiry_date: toInputDate(addDays(new Date(item.expiry_date ?? item.start_date), pauseDays).toISOString()),
        duration_days: item.duration_days + pauseDays,
      }).eq('id', item.id);
    }).filter(Boolean);
    const classResults = await Promise.all(classUpdates);
    const classError = classResults.find((result) => result?.error)?.error;
    if (classError) { setError(`Client ${shouldPause ? 'paused' : 'resumed'}, but class packages could not be updated: ${classError.message}`); return; }
    loadClient();
  };

  const openClassRenew = (item: ClientClassPackage) => {
    setClassRenewItem(item);
    setClassRenewStart(todayInputDate());
    setClassRenewDuration(String(item.duration_days || 30));
    setClassRenewPrice(item.price == null ? '' : String(item.price));
  };

  const submitClassRenew = async () => {
    if (!classRenewItem?.id || !classRenewStart || !Number(classRenewDuration)) return;
    const duration = Number(classRenewDuration);
    const expiryDate = toInputDate(addDays(new Date(classRenewStart), duration).toISOString());
    const { error } = await supabase.from('client_class_packages').update({
      start_date: classRenewStart,
      duration_days: duration,
      expiry_date: expiryDate,
      price: classRenewPrice ? Number(classRenewPrice) : null,
      paused_at: null,
    }).eq('id', classRenewItem.id);
    if (error) { setError(`Could not renew ${classRenewItem.class_type}: ${error.message}`); return; }
    setClassRenewItem(null);
    loadClient();
  };

  const submitClassCancel = async () => {
    if (!classCancelItem?.id) return;
    const { error } = await supabase.from('client_class_packages').delete().eq('id', classCancelItem.id);
    if (error) { setError(`Could not cancel ${classCancelItem.class_type}: ${error.message}`); return; }
    setClassCancelItem(null);
    loadClient();
  };

  const saveEdit = async () => {
    if (!client) return;
    setSaving(true);
    setError(null);

    const enablePt = Boolean(form.has_personal_training ?? client.has_personal_training);
    const updates = {
      full_name: form.full_name,
      phone: form.phone,
      email: form.email,
      trainer_assigned: form.trainer_assigned,
      join_date: form.join_date,
      gym_package_type: form.gym_package_type,
      gym_package_start_date: form.gym_package_start_date,
      gym_package_duration_days: form.gym_package_duration_days,
      gym_package_price: form.gym_package_price,
      has_personal_training: enablePt,
      pt_trainer: enablePt ? form.pt_trainer ?? null : null,
      pt_package_name: enablePt ? form.pt_package_name ?? null : null,
      pt_package_start_date: enablePt ? form.pt_package_start_date ?? null : null,
      pt_package_duration_days: enablePt ? form.pt_package_duration_days ?? null : null,
      pt_package_price: enablePt ? form.pt_package_price ?? null : null,
      notes: form.notes,
    };

    const { error: uErr } = await supabase.from('clients').update(updates).eq('id', client.id);
    setSaving(false);
    if (uErr) { setError(`Could not save changes: ${uErr.message}`); return; }
    if (classTableAvailable) {
      const { error: deleteClassesError } = await supabase.from('client_class_packages').delete().eq('client_id', client.id);
      if (deleteClassesError) { setError(`Client saved, but class packages could not be updated: ${deleteClassesError.message}`); return; }
      if (classPackages.length > 0) {
        const { error: classError } = await supabase.from('client_class_packages').insert(classPackages.map(({ id, expiry_date, ...item }) => ({ ...item, client_id: client.id, created_at: new Date().toISOString() })));
        if (classError) { setError(`Client saved, but class packages could not be updated: ${classError.message}`); return; }
      }
    }
    setEditing(false);
    loadClient();
  };

  const handleDelete = async () => {
    if (!client) return;
    await supabase.from('clients').delete().eq('id', client.id);
    go({ name: 'clients' });
  };

  const openRenew = (kind: RenewKind) => {
    setRenewKind(kind);
    const startDate = todayInputDate();
    const packageType = client?.gym_package_type ?? 'Monthly';
    const gymDuration = kind === 'gym' ? packageDurationDays(startDate, packageType) : 0;
    setRenewPackageType(packageType);
    setRenewDurationEdited(false);
    setRenewDuration(String(kind === 'gym' ? gymDuration || client?.gym_package_duration_days || 30 : client?.pt_package_duration_days ?? 30));
    setRenewPrice('');
    setRenewStart(startDate);
  };

  const handleRenewStartChange = (value: string) => {
    setRenewStart(value);
    if (renewKind === 'gym' && client && !renewDurationEdited) {
      const duration = packageDurationDays(value, renewPackageType);
      if (duration) setRenewDuration(String(duration));
    }
  };

  const handleRenewPackageTypeChange = (value: string) => {
    setRenewPackageType(value);
    if (!renewDurationEdited) {
      const duration = packageDurationDays(renewStart, value);
      if (duration) setRenewDuration(String(duration));
    }
  };

  const submitRenew = async () => {
    if (!client || !renewKind) return;
    const duration = Number(renewDuration);
    if (!duration || duration <= 0) { setError('Enter a valid duration.'); return; }
    const startDate = renewStart;
    const newExpiry = toInputDate(addDays(new Date(startDate), duration).toISOString());
    const prevExpiry = renewKind === 'gym' ? client.gym_package_expiry_date : client.pt_package_expiry_date;

    if (renewKind === 'gym') {
      const { error } = await supabase.from('clients').update({
        gym_package_type: renewPackageType,
        gym_package_start_date: startDate,
        gym_package_duration_days: duration,
        gym_package_price: renewPrice ? Number(renewPrice) : client.gym_package_price,
      }).eq('id', client.id);
      if (error) { setError('Renewal failed.'); return; }
    } else {
      const { error } = await supabase.from('clients').update({
        pt_package_start_date: startDate,
        pt_package_duration_days: duration,
        pt_package_price: renewPrice ? Number(renewPrice) : client.pt_package_price,
      }).eq('id', client.id);
      if (error) { setError('Renewal failed.'); return; }
    }

    await supabase.from('renewals_log').insert({
      client_id: client.id,
      renewed_on: startDate,
      package_kind: renewKind,
      previous_expiry_date: prevExpiry,
      new_expiry_date: newExpiry,
      amount_paid: renewPrice ? Number(renewPrice) : null,
      renewed_by: staffName,
    });

    setRenewKind(null);
    loadClient();
  };

  const submitAddPt = async () => {
    if (!client) return;
    if (!ptTrainer || !ptStart || !ptDuration) { setError('Fill all required PT fields.'); return; }
    const { error } = await supabase.from('clients').update({
      has_personal_training: true,
      pt_trainer: ptTrainer,
      pt_package_name: ptPkgName || null,
      pt_package_start_date: ptStart,
      pt_package_duration_days: Number(ptDuration),
      pt_package_price: ptPrice ? Number(ptPrice) : null,
    }).eq('id', client.id);
    if (error) { setError('Could not add personal training.'); return; }
    setAddPtOpen(false);
    setPtTrainer(''); setPtPkgName(''); setPtStart(todayInputDate()); setPtDuration('30'); setPtPrice('');
    loadClient();
  };

  const submitCancelPt = async () => {
    if (!client) return;
    const { error } = await supabase.from('clients').update({
      has_personal_training: false,
      pt_trainer: null,
      pt_package_name: null,
      pt_package_start_date: null,
      pt_package_duration_days: null,
      pt_package_price: null,
    }).eq('id', client.id);
    if (error) { setError('Could not cancel personal training.'); return; }
    setCancelPtOpen(false);
    loadClient();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="text-accent" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => go({ name: 'clients' })}><ArrowLeft size={16} /> Back</Button>
        <Card><EmptyState icon={<AlertCircle size={40} />} title="Client not found" /></Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => go({ name: 'clients' })} className="flex items-center gap-1.5 text-sm text-ink/50 hover:text-ink transition-colors">
          <ArrowLeft size={16} /> Back to Clients
        </button>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button size="sm" variant="success" onClick={saveEdit} disabled={saving}>
                {saving ? <Spinner className="text-success" /> : <><Save size={16} /> Save</>}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setForm(client); }}>Cancel</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant={client.gym_paused_at ? 'success' : 'ghost'} onClick={toggleOverallPackagePause}>
                {client.gym_paused_at ? 'Resume All Packages' : 'Pause All Packages'}
              </Button>
              <Button size="sm" variant="secondary" onClick={startEdit}>Edit</Button>
              <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)}><Trash2 size={16} /> Delete</Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Header card */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wide">
              {editing ? (
                <Input label="" value={form.full_name ?? ''} onChange={(v) => setForm({ ...form, full_name: v })} />
              ) : client.full_name}
              </h1>
              {!editing && (
                <>
                  <button
                    type="button"
                    onClick={toggleFavorite}
                    aria-label={client.is_favorite ? `Remove ${client.full_name} from favorites` : `Add ${client.full_name} to favorites`}
                    title={client.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${client.is_favorite ? 'text-warning bg-warning/15' : 'text-ink/30 hover:text-warning hover:bg-warning/10'}`}
                  >
                    <Star size={18} fill={client.is_favorite ? 'currentColor' : 'none'} />
                  </button>
                  <ClientContactActions name={client.full_name} phone={client.phone} expiryDate={client.gym_package_expiry_date} status={gymStatus?.status ?? 'none'} paused={Boolean(client.gym_paused_at)} />
                </>
              )}
            </div>
            {editing ? (
              <div className="grid sm:grid-cols-2 gap-4 mt-4 min-w-0">
                <Input label="Phone" value={form.phone ?? ''} onChange={(v) => setForm({ ...form, phone: v })} required />
                <Input label="Email" value={form.email ?? ''} onChange={(v) => setForm({ ...form, email: v || null })} type="email" />
                <Select
                  label="Trainer Assigned"
                  value={form.trainer_assigned ?? ''}
                  onChange={(v) => setForm({ ...form, trainer_assigned: v || null })}
                  placeholder="Select trainer"
                  options={TRAINERS.map((t) => ({ value: t, label: t }))}
                />
                <Input label="Join Date" value={form.join_date ?? ''} onChange={(v) => setForm({ ...form, join_date: v })} type="date" required />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-ink/50">
                <span>{client.phone}</span>
                {client.email && <span>{client.email}</span>}
                <span>Trainer: {client.trainer_assigned ?? '—'}</span>
                <span>Joined {formatDate(client.join_date)}</span>
              </div>
            )}
          </div>
          {client.has_personal_training && <Badge tone="pt"><Dumbbell size={12} /> PT</Badge>}
        </div>
      </Card>

      {/* Gym package */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide flex items-center gap-2">
            <Dumbbell size={18} className="text-accent" /> Gym Package
          </h2>
          {gymStatus && (
            <Badge tone={client.gym_paused_at ? 'neutral' : gymStatus.status === 'active' ? 'active' : gymStatus.status === 'expiring' ? 'expiring' : 'expired'}>
              {client.gym_paused_at ? 'Paused' : gymStatus.label}
            </Badge>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {editing ? (
            <>
              <Select label="Package Type" value={form.gym_package_type ?? ''} onChange={(v) => setForm({ ...form, gym_package_type: v, gym_package_duration_days: packageDurationDays(form.gym_package_start_date ?? client.gym_package_start_date, v) || form.gym_package_duration_days })} options={PACKAGE_TYPES.map((p) => ({ value: p, label: p }))} />
              <Input label="Price (₹)" value={String(form.gym_package_price ?? '')} onChange={(v) => setForm({ ...form, gym_package_price: v ? Number(v) : null })} type="number" />
              <Input label="Start Date" value={form.gym_package_start_date ?? ''} onChange={(v) => setForm({ ...form, gym_package_start_date: v, gym_package_duration_days: packageDurationDays(v, form.gym_package_type ?? client.gym_package_type) || form.gym_package_duration_days })} type="date" />
              <Input label="Duration (days)" value={String(form.gym_package_duration_days ?? '')} onChange={(v) => setForm({ ...form, gym_package_duration_days: Number(v) || 0 })} type="number" />
            </>
          ) : (
            <>
              <Field label="Package Type" value={client.gym_package_type ?? '—'} />
              <Field label="Price" value={client.gym_package_price != null ? `₹${client.gym_package_price}` : '—'} />
              <Field label="Start Date" value={formatDate(client.gym_package_start_date)} />
              <Field label="Expiry Date" value={formatDate(client.gym_package_expiry_date)} />
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => openRenew('gym')}><RefreshCw size={14} /> Renew Gym Package</Button>
          <Button variant={client.gym_paused_at ? 'success' : 'ghost'} size="sm" onClick={toggleOverallPackagePause}>{client.gym_paused_at ? 'Resume All Packages' : 'Pause All Packages'}</Button>
        </div>
      </Card>

      {/* PT section */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide flex items-center gap-2">
            <Dumbbell size={18} className="text-accent" /> Personal Training
          </h2>
          {ptStatus && (
            <Badge tone={client.pt_paused_at ? 'neutral' : ptStatus.status === 'active' ? 'active' : ptStatus.status === 'expiring' ? 'expiring' : 'expired'}>
              {client.pt_paused_at ? 'Paused' : ptStatus.label}
            </Badge>
          )}
        </div>

        {editing ? (
          <>
            <button
              type="button"
              onClick={() => setForm({ ...form, has_personal_training: !(form.has_personal_training ?? client.has_personal_training) })}
              className="w-full flex items-center justify-between rounded-xl border border-border bg-panel-2 px-4 py-3"
            >
              <span className="font-display text-sm font-bold uppercase tracking-wide text-ink">Personal Training</span>
              <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.has_personal_training ?? client.has_personal_training ? 'bg-accent' : 'bg-panel-2 border border-border'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.has_personal_training ?? client.has_personal_training ? 'translate-x-6' : 'translate-x-1'}`} />
              </span>
            </button>

            {(form.has_personal_training ?? client.has_personal_training) && (
              <div className="space-y-4 pt-2">
                <Select
                  label="PT Trainer"
                  value={form.pt_trainer ?? ''}
                  onChange={(v) => setForm({ ...form, pt_trainer: v })}
                  placeholder="Select trainer"
                  options={TRAINERS.map((t) => ({ value: t, label: t }))}
                  required
                />
                <Input label="PT Package Name" value={form.pt_package_name ?? ''} onChange={(v) => setForm({ ...form, pt_package_name: v })} placeholder="e.g. 12 Sessions" />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="PT Start Date" value={form.pt_package_start_date ?? ''} onChange={(v) => setForm({ ...form, pt_package_start_date: v })} type="date" required />
                  <Input label="PT Duration (days)" value={String(form.pt_package_duration_days ?? '')} onChange={(v) => setForm({ ...form, pt_package_duration_days: Number(v) || 0 })} type="number" required />
                </div>
                <Input label="PT Price (₹)" value={String(form.pt_package_price ?? '')} onChange={(v) => setForm({ ...form, pt_package_price: v ? Number(v) : null })} type="number" placeholder="Optional" />
              </div>
            )}
          </>
        ) : client.has_personal_training ? (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Trainer" value={client.pt_trainer ?? '—'} />
              <Field label="Package Name" value={client.pt_package_name ?? '—'} />
              <Field label="Start Date" value={formatDate(client.pt_package_start_date)} />
              <Field label="Expiry Date" value={formatDate(client.pt_package_expiry_date)} />
              <Field label="Price" value={client.pt_package_price != null ? `₹${client.pt_package_price}` : '—'} />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => openRenew('pt')}><RefreshCw size={14} /> Renew PT Package</Button>
              <Button variant="danger" size="sm" onClick={() => setCancelPtOpen(true)}><XCircle size={14} /> Cancel Personal Training</Button>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-ink/40 mb-3">This client is not enrolled in personal training.</p>
            <Button variant="secondary" size="sm" onClick={() => setAddPtOpen(true)}><Plus size={14} /> Add Personal Training</Button>
          </div>
        )}
      </Card>

      {/* Class package */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide flex items-center gap-2">
            <span className="flex items-center gap-1.5" aria-label="Class types">
              <ZumbaBadge size={18} className="text-zumba" />
              <CrossFitBadge size={18} className="text-cross-fit" />
              <StretchBadge size={18} className="text-stretch" />
            </span>
            Classes
          </h2>
          {classPackages.length > 0 && <Badge tone="neutral">{classPackages.length} selected</Badge>}
        </div>
        {editing ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              {CLASS_TYPES.map((type) => {
                const selected = classPackages.some((item) => item.class_type === type);
                return <button key={type} type="button" onClick={() => setClassPackages((current) => selected ? current.filter((item) => item.class_type !== type) : [...current, { class_type: type, start_date: todayInputDate(), duration_days: 30, price: null }])} className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${selected ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-panel-2 text-ink/60 hover:border-accent/50'}`}>{type}</button>;
              })}
            </div>
            {classPackages.map((item) => (
              <div key={item.class_type} className="space-y-4 rounded-xl border border-border bg-panel-2 p-4">
                <div className="font-display font-bold uppercase tracking-wide text-ink">{item.class_type}</div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Start Date" value={item.start_date} onChange={(v) => setClassPackages((current) => current.map((entry) => entry.class_type === item.class_type ? { ...entry, start_date: v } : entry))} type="date" required />
                  <Input label="Duration (days)" value={String(item.duration_days)} onChange={(v) => setClassPackages((current) => current.map((entry) => entry.class_type === item.class_type ? { ...entry, duration_days: Number(v) || 0 } : entry))} type="number" required />
                </div>
                <Input label="Price (₹)" value={String(item.price ?? '')} onChange={(v) => setClassPackages((current) => current.map((entry) => entry.class_type === item.class_type ? { ...entry, price: v ? Number(v) : null } : entry))} type="number" placeholder="Optional" />
              </div>
            ))}
          </>
        ) : classPackages.length > 0 ? (
          <div className="space-y-3">
            {classPackages.map((item) => {
              const status = computeStatus(item.expiry_date ?? null);
              return <div key={item.class_type} className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3 rounded-xl border border-border bg-panel-2 p-3 items-end">
                <Field label="Class" value={item.class_type} />
                <Field label="Start Date" value={formatDate(item.start_date)} />
                <Field label="Expiry" value={formatDate(item.expiry_date)} />
                <Field label="Status" value={item.paused_at ? 'Paused' : status.label} />
                <Button variant="secondary" size="sm" onClick={() => openClassRenew(item)}><RefreshCw size={14} /> Renew</Button>
                <Button variant="danger" size="sm" onClick={() => setClassCancelItem(item)}><XCircle size={14} /> Cancel</Button>
              </div>;
            })}
            <Button variant="secondary" size="sm" onClick={startEdit}><Plus size={14} /> Add Other Classes</Button>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-ink/40 mb-3">This client is not enrolled in classes.</p>
            <Button variant="secondary" size="sm" onClick={startEdit}><Plus size={14} /> Add Classes</Button>
          </div>
        )}
      </Card>

      {/* Notes */}
      {(editing || client.notes?.trim()) && (
        <Card className={`p-5 space-y-3 ${client.is_favorite ? 'border-warning/60 bg-warning/5' : ''}`}>
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink/70">Notes</h2>
          {editing ? (
            <Textarea label="" value={form.notes ?? ''} onChange={(v) => setForm({ ...form, notes: v })} rows={4} placeholder="Add notes..." />
          ) : (
            <p className="text-sm text-ink/60 whitespace-pre-wrap">{client.notes}</p>
          )}
        </Card>
      )}

      {/* Renewal history */}
      <Card className="p-5">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink/70 mb-3">Renewal History</h2>
        {renewals.length === 0 ? (
          <p className="text-sm text-ink/40 py-4 text-center">No renewals logged yet.</p>
        ) : (
          <div className="space-y-2">
            {renewals.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 bg-panel-2 rounded-xl px-4 py-3 border border-border">
                <div>
                  <div className="text-sm font-semibold text-ink">
                    {r.package_kind === 'gym' ? 'Gym Package' : 'Personal Training'}
                  </div>
                  <div className="text-xs text-ink/40">
                    {formatDate(r.previous_expiry_date)} → {formatDate(r.new_expiry_date)} · {r.renewed_by ?? 'Staff'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-ink/50">{formatDate(r.renewed_on)}</div>
                  {r.amount_paid != null && <div className="text-sm font-semibold text-success">₹{r.amount_paid}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Delete modal */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Client">
        <p className="text-sm text-ink/60 mb-5">
          Are you sure you want to delete <span className="font-semibold text-ink">{client.full_name}</span>? This action cannot be undone and will remove all their records including renewal history.
        </p>
        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}><Trash2 size={16} /> Delete Permanently</Button>
        </div>
      </Modal>

      <Modal open={classRenewItem !== null} onClose={() => setClassRenewItem(null)} title={`Renew ${classRenewItem?.class_type ?? 'Class'} Package`}>
        <div className="space-y-4">
          <div className="bg-panel-2 rounded-xl px-4 py-3 border border-border">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">Class</span>
            <div className="font-display font-bold text-ink mt-1">{classRenewItem?.class_type ?? '—'}</div>
          </div>
          <Input label="New Start Date" value={classRenewStart} onChange={setClassRenewStart} type="date" required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Duration (days)" value={classRenewDuration} onChange={setClassRenewDuration} type="number" required />
            <Input label="Price (₹)" value={classRenewPrice} onChange={setClassRenewPrice} type="number" placeholder="Optional" />
          </div>
          <div className="bg-panel-2 rounded-xl px-4 py-3 flex items-center justify-between border border-border">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">New Expiry</span>
            <span className="font-display font-bold text-accent">
              {classRenewStart && classRenewDuration ? formatDate(addDays(new Date(classRenewStart), Number(classRenewDuration)).toISOString()) : '—'}
            </span>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button variant="ghost" onClick={() => setClassRenewItem(null)}>Cancel</Button>
            <Button onClick={submitClassRenew}><RefreshCw size={16} /> Confirm Renewal</Button>
          </div>
        </div>
      </Modal>

      <Modal open={classCancelItem !== null} onClose={() => setClassCancelItem(null)} title={`Cancel ${classCancelItem?.class_type ?? 'Class'}`}>
        <p className="text-sm text-ink/60 mb-5">
          This will remove the <span className="font-semibold text-ink">{classCancelItem?.class_type ?? 'selected'}</span> class package for <span className="font-semibold text-ink">{client.full_name}</span>. Other classes will remain unchanged.
        </p>
        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" onClick={() => setClassCancelItem(null)}>Keep Class</Button>
          <Button variant="danger" onClick={submitClassCancel}><XCircle size={16} /> Cancel Class</Button>
        </div>
      </Modal>

      {/* Cancel PT modal */}
      <Modal open={cancelPtOpen} onClose={() => setCancelPtOpen(false)} title="Cancel Personal Training">
        <p className="text-sm text-ink/60 mb-5">
          This will remove all personal training details for <span className="font-semibold text-ink">{client.full_name}</span>. Their gym membership will remain active and unchanged.
        </p>
        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" onClick={() => setCancelPtOpen(false)}>Keep PT</Button>
          <Button variant="danger" onClick={submitCancelPt}><XCircle size={16} /> Cancel PT</Button>
        </div>
      </Modal>

      {/* Renew modal */}
      <Modal open={renewKind !== null} onClose={() => setRenewKind(null)} title={`Renew ${renewKind === 'gym' ? 'Gym' : 'PT'} Package`}>
        <div className="space-y-4">
          <Input label="New Start Date" value={renewStart} onChange={handleRenewStartChange} type="date" required />
          {renewKind === 'gym' && (
            <Select
              label="Package Type"
              value={renewPackageType}
              onChange={handleRenewPackageTypeChange}
              options={PACKAGE_TYPES.map((type) => ({ value: type, label: type }))}
              required
            />
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Duration (days)" value={renewDuration} onChange={(value) => { setRenewDurationEdited(true); setRenewDuration(value); }} type="number" required />
            <Input label="Amount Paid (₹)" value={renewPrice} onChange={setRenewPrice} type="number" placeholder="Optional" />
          </div>
          <div className="bg-panel-2 rounded-xl px-4 py-3 flex items-center justify-between border border-border">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">New Expiry</span>
            <span className="font-display font-bold text-accent">
              {renewStart && renewDuration ? formatDate(addDays(new Date(renewStart), renewKind === 'gym' ? packageDurationDays(renewStart, renewPackageType) || Number(renewDuration) : Number(renewDuration)).toISOString()) : '—'}
            </span>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button variant="ghost" onClick={() => setRenewKind(null)}>Cancel</Button>
            <Button onClick={submitRenew}><RefreshCw size={16} /> Confirm Renewal</Button>
          </div>
        </div>
      </Modal>

      {/* Add PT modal */}
      <Modal open={addPtOpen} onClose={() => setAddPtOpen(false)} title="Add Personal Training">
        <div className="space-y-4">
          <Select label="PT Trainer" value={ptTrainer} onChange={setPtTrainer} placeholder="Select trainer" options={TRAINERS.map((t) => ({ value: t, label: t }))} required />
          <Input label="Package Name" value={ptPkgName} onChange={setPtPkgName} placeholder="e.g. 12 Sessions" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" value={ptStart} onChange={setPtStart} type="date" required />
            <Input label="Duration (days)" value={ptDuration} onChange={setPtDuration} type="number" required />
          </div>
          <Input label="Price (₹)" value={ptPrice} onChange={setPtPrice} type="number" placeholder="Optional" />
          <div className="flex items-center gap-2 justify-end">
            <Button variant="ghost" onClick={() => setAddPtOpen(false)}>Cancel</Button>
            <Button onClick={submitAddPt}><Check size={16} /> Enroll</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-ink/50 mb-1">{label}</div>
      <div className="text-ink font-medium">{value}</div>
    </div>
  );
}

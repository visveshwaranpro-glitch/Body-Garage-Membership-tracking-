import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Dumbbell, Save, Trash2, RefreshCw, XCircle, Plus, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Client, Renewal } from '@/lib/types';
import { TRAINERS, PACKAGE_TYPES } from '@/lib/types';
import { computeStatus, formatDate, addDays, today, toInputDate } from '@/lib/dates';
import { useRoute } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { Card, Input, Select, Textarea, Button, Badge, Modal, Spinner, EmptyState } from '@/components/ui';

type RenewKind = 'gym' | 'pt';

export default function ClientProfile({ id }: { id: string }) {
  const [, go] = useRoute();
  const { session } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renewKind, setRenewKind] = useState<RenewKind | null>(null);
  const [addPtOpen, setAddPtOpen] = useState(false);
  const [cancelPtOpen, setCancelPtOpen] = useState(false);

  // Edit form state
  const [form, setForm] = useState<Partial<Client>>({});

  // Renew form state
  const [renewDuration, setRenewDuration] = useState('30');
  const [renewPrice, setRenewPrice] = useState('');
  const [renewStart, setRenewStart] = useState(toInputDate(today().toISOString()));

  // Add PT form state
  const [ptTrainer, setPtTrainer] = useState('');
  const [ptPkgName, setPtPkgName] = useState('');
  const [ptStart, setPtStart] = useState(toInputDate(today().toISOString()));
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
    const [{ data: c, error: cErr }, { data: r }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).maybeSingle(),
      supabase.from('renewals_log').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    ]);
    if (cErr || !c) {
      setError('Client not found.');
      setLoading(false);
      return;
    }
    setClient(c as Client);
    setForm(c as Client);
    setRenewals((r as Renewal[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadClient(); /* eslint-disable-next-line */ }, [id]);

  const gymStatus = useMemo(() => (client ? computeStatus(client.gym_package_expiry_date) : null), [client]);
  const ptStatus = useMemo(() => (client?.has_personal_training ? computeStatus(client.pt_package_expiry_date) : null), [client]);

  const startEdit = () => {
    setForm(client ?? {});
    setEditing(true);
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
    if (uErr) { setError('Could not save changes.'); return; }
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
    setRenewDuration(kind === 'gym' ? String(client?.gym_package_duration_days ?? 30) : String(client?.pt_package_duration_days ?? 30));
    setRenewPrice('');
    setRenewStart(toInputDate(today().toISOString()));
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
    setPtTrainer(''); setPtPkgName(''); setPtStart(toInputDate(today().toISOString())); setPtDuration('30'); setPtPrice('');
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
            <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wide">
              {editing ? (
                <Input label="" value={form.full_name ?? ''} onChange={(v) => setForm({ ...form, full_name: v })} />
              ) : client.full_name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-ink/50">
              <span>{client.phone}</span>
              {client.email && <span>{client.email}</span>}
              <span>Trainer: {client.trainer_assigned ?? '—'}</span>
              <span>Joined {formatDate(client.join_date)}</span>
            </div>
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
            <Badge tone={gymStatus.status === 'active' ? 'active' : gymStatus.status === 'expiring' ? 'expiring' : 'expired'}>
              {gymStatus.label}
            </Badge>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {editing ? (
            <>
              <Select label="Package Type" value={form.gym_package_type ?? ''} onChange={(v) => setForm({ ...form, gym_package_type: v })} options={PACKAGE_TYPES.map((p) => ({ value: p, label: p }))} />
              <Input label="Price (₹)" value={String(form.gym_package_price ?? '')} onChange={(v) => setForm({ ...form, gym_package_price: v ? Number(v) : null })} type="number" />
              <Input label="Start Date" value={form.gym_package_start_date ?? ''} onChange={(v) => setForm({ ...form, gym_package_start_date: v })} type="date" />
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
        <Button variant="secondary" size="sm" onClick={() => openRenew('gym')}><RefreshCw size={14} /> Renew Gym Package</Button>
      </Card>

      {/* PT section */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide flex items-center gap-2">
            <Dumbbell size={18} className="text-accent" /> Personal Training
          </h2>
          {ptStatus && (
            <Badge tone={ptStatus.status === 'active' ? 'active' : ptStatus.status === 'expiring' ? 'expiring' : 'expired'}>
              {ptStatus.label}
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

      {/* Notes */}
      <Card className="p-5 space-y-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink/70">Notes</h2>
        {editing ? (
          <Textarea label="" value={form.notes ?? ''} onChange={(v) => setForm({ ...form, notes: v })} rows={4} placeholder="Add notes..." />
        ) : (
          <p className="text-sm text-ink/60 whitespace-pre-wrap">{client.notes || 'No notes.'}</p>
        )}
      </Card>

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
          <Input label="New Start Date" value={renewStart} onChange={setRenewStart} type="date" required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Duration (days)" value={renewDuration} onChange={setRenewDuration} type="number" required />
            <Input label="Amount Paid (₹)" value={renewPrice} onChange={setRenewPrice} type="number" placeholder="Optional" />
          </div>
          <div className="bg-panel-2 rounded-xl px-4 py-3 flex items-center justify-between border border-border">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">New Expiry</span>
            <span className="font-display font-bold text-accent">
              {renewStart && renewDuration ? formatDate(addDays(new Date(renewStart), Number(renewDuration)).toISOString()) : '—'}
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

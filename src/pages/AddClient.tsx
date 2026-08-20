import { useEffect, useMemo, useState } from 'react';
import { UserPlus, Dumbbell, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TRAINERS, PACKAGE_TYPES, CLASS_TYPES, type ClientClassPackage, type ClassType } from '@/lib/types';
import { addDays, formatDate, packageDurationDays, todayInputDate, toInputDate } from '@/lib/dates';
import { useRoute } from '@/lib/router';
import { Card, Input, Select, Textarea, Button, Spinner } from '@/components/ui';

export default function AddClient() {
  const [, go] = useRoute();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [trainerAssigned, setTrainerAssigned] = useState('');
  const [joinDate, setJoinDate] = useState(todayInputDate());
  const [pkgType, setPkgType] = useState<string>('Monthly');
  const [gymStart, setGymStart] = useState(todayInputDate());
  const [gymDuration, setGymDuration] = useState<number>(() => packageDurationDays(todayInputDate(), 'Monthly'));
  const [gymDurationEdited, setGymDurationEdited] = useState(false);
  const [gymPrice, setGymPrice] = useState('');
  const [hasPt, setHasPt] = useState(false);
  const [ptTrainer, setPtTrainer] = useState('');
  const [ptPkgName, setPtPkgName] = useState('');
  const [ptStart, setPtStart] = useState(todayInputDate());
  const [ptDuration, setPtDuration] = useState<number>(30);
  const [ptPrice, setPtPrice] = useState('');
  const [classPackages, setClassPackages] = useState<ClientClassPackage[]>([]);
  const [notes, setNotes] = useState('');
  const [, setFormDate] = useState(todayInputDate());

  useEffect(() => {
    const timer = window.setInterval(() => {
      const currentDate = todayInputDate();
      setFormDate((previousDate) => {
        if (currentDate === previousDate) return previousDate;
        setJoinDate((value) => value === previousDate ? currentDate : value);
        setGymStart((value) => value === previousDate ? currentDate : value);
        setPtStart((value) => value === previousDate ? currentDate : value);
        setClassPackages((current) => current.map((item) => item.start_date === previousDate ? { ...item, start_date: currentDate } : item));
        return currentDate;
      });
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const gymExpiry = useMemo(() => (gymStart ? toInputDate(addDays(new Date(gymStart), gymDuration).toISOString()) : ''), [gymStart, gymDuration]);
  const ptExpiry = useMemo(() => (hasPt && ptStart ? toInputDate(addDays(new Date(ptStart), ptDuration).toISOString()) : ''), [hasPt, ptStart, ptDuration]);

  const handlePkgTypeChange = (v: string) => {
    setPkgType(v);
    if (!gymDurationEdited) {
      const duration = packageDurationDays(gymStart, v);
      if (duration) setGymDuration(duration);
    }
  };

  const handleGymStartChange = (v: string) => {
    setGymStart(v);
  };

  const toggleClass = (classType: ClassType) => {
    setClassPackages((current) => current.some((item) => item.class_type === classType)
      ? current.filter((item) => item.class_type !== classType)
      : [...current, { class_type: classType, start_date: gymStart, duration_days: gymDuration, price: null }]);
  };

  const updateClass = (classType: ClassType, updates: Partial<ClientClassPackage>) => {
    setClassPackages((current) => current.map((item) => item.class_type === classType ? { ...item, ...updates } : item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !phone.trim() || !joinDate || !gymStart || !gymDuration) {
      setError('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    const payload = {
      full_name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      trainer_assigned: trainerAssigned || null,
      join_date: joinDate,
      gym_package_type: pkgType,
      gym_package_start_date: gymStart,
      gym_package_duration_days: gymDuration,
      gym_package_price: gymPrice ? Number(gymPrice) : null,
      has_personal_training: hasPt,
      pt_trainer: hasPt ? ptTrainer || null : null,
      pt_package_name: hasPt ? ptPkgName.trim() || null : null,
      pt_package_start_date: hasPt ? ptStart || null : null,
      pt_package_duration_days: hasPt ? ptDuration || null : null,
      pt_package_price: hasPt && ptPrice ? Number(ptPrice) : null,
      notes: notes.trim() || null,
    };
    const { data: insertedClient, error: insertError } = await supabase.from('clients').insert(payload).select('id').single();
    if (!insertError && classPackages.length > 0 && insertedClient) {
      const { error: classError } = await supabase.from('client_class_packages').insert(classPackages.map(({ id, expiry_date, ...item }) => ({ ...item, client_id: insertedClient.id, created_at: new Date().toISOString() })));
      if (classError) {
        setSaving(false);
        setError(`Client saved, but class packages could not be saved: ${classError.message}`);
        return;
      }
    }
    setSaving(false);
    if (insertError) {
      setError(`Could not save client: ${insertError.message}`);
      return;
    }
    setSuccess(true);
    setTimeout(() => go({ name: 'clients' }), 700);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mb-4">
          <Check className="text-success" size={32} />
        </div>
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Client Added</h2>
        <p className="text-sm text-ink/40 mt-1">Redirecting to clients list...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wide flex items-center gap-2">
          <UserPlus className="text-accent" size={24} /> Add New Client
        </h1>
        <p className="text-sm text-ink/40 mt-1">Create a new gym membership record</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Personal info */}
        <Card className="p-5 space-y-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink/70">Personal Information</h2>
          <Input label="Full Name" value={fullName} onChange={setFullName} required placeholder="e.g. Ramesh Kumar" />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Phone" value={phone} onChange={setPhone} required placeholder="e.g. 98765 43210" />
            <Input label="Email (optional)" value={email} onChange={setEmail} type="email" placeholder="email@example.com" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label="Trainer Assigned"
              value={trainerAssigned}
              onChange={setTrainerAssigned}
              required
              placeholder="Select trainer"
              options={TRAINERS.map((t) => ({ value: t, label: t }))}
            />
            <Input label="Join Date" value={joinDate} onChange={setJoinDate} type="date" required />
          </div>
        </Card>

        {/* Gym package */}
        <Card className="p-5 space-y-4">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink/70 flex items-center gap-2">
            <Dumbbell size={16} className="text-accent" /> Gym Package
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label="Package Type"
              value={pkgType}
              onChange={handlePkgTypeChange}
              required
              options={PACKAGE_TYPES.map((p) => ({ value: p, label: p }))}
            />
            <Input label="Price (₹)" value={gymPrice} onChange={setGymPrice} type="number" placeholder="e.g. 1500" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Start Date" value={gymStart} onChange={handleGymStartChange} type="date" required />
            <Input label="Duration (days)" value={String(gymDuration)} onChange={(v) => { setGymDurationEdited(true); setGymDuration(Number(v) || 0); }} type="number" required />
          </div>
          <div className="bg-panel-2 rounded-xl px-4 py-3 flex items-center justify-between border border-border">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">Expiry Date</span>
            <span className="font-display font-bold text-accent">{gymExpiry || '—'}</span>
          </div>
        </Card>

        {/* PT toggle */}
        <Card className="p-5 space-y-4">
          <button
            type="button"
            onClick={() => setHasPt(!hasPt)}
            className="w-full flex items-center justify-between"
          >
            <span className="font-display text-sm font-bold uppercase tracking-wide text-ink/70">Personal Training</span>
            <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hasPt ? 'bg-accent' : 'bg-panel-2 border border-border'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hasPt ? 'translate-x-6' : 'translate-x-1'}`} />
            </span>
          </button>

          {hasPt && (
            <div className="space-y-4 pt-2 animate-fade-in">
              <Select
                label="PT Trainer"
                value={ptTrainer}
                onChange={setPtTrainer}
                placeholder="Select trainer"
                options={TRAINERS.map((t) => ({ value: t, label: t }))}
                required
              />
              <Input label="PT Package Name" value={ptPkgName} onChange={setPtPkgName} placeholder="e.g. 12 Sessions" />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="PT Start Date" value={ptStart} onChange={setPtStart} type="date" required />
                <Input label="PT Duration (days)" value={String(ptDuration)} onChange={(v) => setPtDuration(Number(v) || 0)} type="number" required />
              </div>
              <Input label="PT Price (₹)" value={ptPrice} onChange={setPtPrice} type="number" placeholder="e.g. 5000" />
              <div className="bg-panel-2 rounded-xl px-4 py-3 flex items-center justify-between border border-border">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">PT Expiry Date</span>
                <span className="font-display font-bold text-accent">{ptExpiry || '—'}</span>
              </div>
            </div>
          )}
        </Card>

        {/* Class package */}
        <Card className="p-5 space-y-4">
          <span className="font-display text-sm font-bold uppercase tracking-wide text-ink/70">Classes</span>
          <div className="grid grid-cols-3 gap-2">
            {CLASS_TYPES.map((type) => {
              const selected = classPackages.some((item) => item.class_type === type);
              return <button key={type} type="button" onClick={() => toggleClass(type)} className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${selected ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-panel-2 text-ink/60 hover:border-accent/50'}`}>{type}</button>;
            })}
          </div>
          {classPackages.map((item) => (
            <div key={item.class_type} className="space-y-4 rounded-xl border border-border bg-panel-2 p-4 animate-fade-in">
              <div className="font-display font-bold uppercase tracking-wide text-ink">{item.class_type}</div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Start Date" value={item.start_date} onChange={(v) => updateClass(item.class_type, { start_date: v })} type="date" required />
                <Input label="Duration (days)" value={String(item.duration_days)} onChange={(v) => updateClass(item.class_type, { duration_days: Number(v) || 0 })} type="number" required />
              </div>
              <Input label="Price (₹)" value={String(item.price ?? '')} onChange={(v) => updateClass(item.class_type, { price: v ? Number(v) : null })} type="number" placeholder="Optional" />
              <div className="text-sm text-ink/50">Expiry: <span className="font-semibold text-accent">{formatDate(addDays(new Date(item.start_date), item.duration_days).toISOString())}</span></div>
            </div>
          ))}
        </Card>

        {/* Notes */}
        <Card className="p-5">
          <Textarea label="Notes (optional)" value={notes} onChange={setNotes} placeholder="Any extra info about this client..." />
        </Card>

        {error && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? <Spinner className="text-white" /> : 'Save Client'}
          </Button>
          <Button variant="secondary" onClick={() => go({ name: 'clients' })}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}

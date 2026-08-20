import type { PackageStatus } from './types';

export function daysBetween(from: Date, to: Date): number {
  const ms = 24 * 60 * 60 * 1000;
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / ms);
}

export function today(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return new Date(Number(values.year), Number(values.month) - 1, Number(values.day), 12);
}

export function todayKey(): string {
  const d = today();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayInputDate(): string {
  return todayKey();
}

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatDate(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function computeStatus(expiryDate: string | null): PackageStatus {
  const exp = parseDate(expiryDate);
  if (!exp) {
    return { status: 'none', daysRemaining: null, expiryDate: null, label: 'No package' };
  }
  const remaining = daysBetween(today(), exp);
  if (remaining < 0) {
    return {
      status: 'expired',
      daysRemaining: remaining,
      expiryDate,
      label: `Expired ${Math.abs(remaining)} day${Math.abs(remaining) === 1 ? '' : 's'} ago`,
    };
  }
  if (remaining <= 7) {
    return {
      status: 'expiring',
      daysRemaining: remaining,
      expiryDate,
      label: `${remaining} day${remaining === 1 ? '' : 's'} remaining`,
    };
  }
  return {
    status: 'active',
    daysRemaining: remaining,
    expiryDate,
    label: `${remaining} days remaining`,
  };
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth() + months;
  const day = date.getDate();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

export function packageDurationDays(startDate: string, packageType: string | null | undefined): number {
  const start = parseDate(startDate);
  if (!start) return 0;
  const months = {
    Monthly: 1,
    Quarterly: 3,
    'Half-Yearly': 6,
    Annual: 12,
  }[packageType ?? ''];
  return months ? daysBetween(start, addMonths(start, months)) : 0;
}

export function toInputDate(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}

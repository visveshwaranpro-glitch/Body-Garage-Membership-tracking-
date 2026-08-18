import type { PackageStatus } from './types';

export function daysBetween(from: Date, to: Date): number {
  const ms = 24 * 60 * 60 * 1000;
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / ms);
}

export function today(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
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

export function toInputDate(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}

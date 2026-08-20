import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} size={20} />;
}

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <Spinner className="text-accent" />
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-panel rounded-2xl border border-border shadow-card ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
  };
  const variants = {
    primary: 'bg-accent text-white hover:bg-accent-dark hover:shadow-glow-sm active:scale-[0.98]',
    secondary: 'bg-panel-2 text-ink border border-border hover:border-accent/60 hover:bg-panel-2/80 active:scale-[0.98]',
    ghost: 'text-ink/70 hover:text-ink hover:bg-panel-2 active:scale-[0.98]',
    danger: 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25 active:scale-[0.98]',
    success: 'bg-success/15 text-success border border-success/30 hover:bg-success/25 active:scale-[0.98]',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: 'active' | 'expiring' | 'expired' | 'neutral' | 'pt';
  className?: string;
}) {
  const tones = {
    active: 'bg-success/15 text-success border-success/30',
    expiring: 'bg-warning/15 text-warning border-warning/30',
    expired: 'bg-danger/15 text-danger border-danger/30',
    neutral: 'bg-panel-2 text-ink/70 border-border',
    pt: 'bg-accent/15 text-accent border-accent/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  error,
  className = '',
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="block text-xs font-semibold uppercase tracking-wide text-ink/60 mb-1.5">
          {label}{required && <span className="text-accent">*</span>}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-panel-2 border border-border rounded-xl px-3.5 py-2.5 text-ink placeholder:text-ink/30 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      />
      {error && <span className="block text-xs text-danger mt-1">{error}</span>}
    </label>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
  required = false,
  placeholder,
  className = '',
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="block text-xs font-semibold uppercase tracking-wide text-ink/60 mb-1.5">
          {label}{required && <span className="text-accent">*</span>}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-panel-2 border border-border rounded-xl px-3.5 py-2.5 text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-colors appearance-none"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  className = '',
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="block text-xs font-semibold uppercase tracking-wide text-ink/60 mb-1.5">
          {label}
        </span>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-panel-2 border border-border rounded-xl px-3.5 py-2.5 text-ink placeholder:text-ink/30 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-colors resize-none"
      />
    </label>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-panel rounded-2xl border border-border shadow-card animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-panel rounded-t-2xl">
          <h3 className="font-display text-lg font-bold uppercase tracking-wide">{title}</h3>
          <button onClick={onClose} className="text-ink/50 hover:text-ink text-2xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-ink/20 mb-3">{icon}</div>
      <p className="font-display uppercase tracking-wide text-ink/60">{title}</p>
      {subtitle && <p className="text-sm text-ink/40 mt-1">{subtitle}</p>}
    </div>
  );
}

import { useState } from 'react';
import { Lock, User, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui';
import { BodyGarageBadge } from '@/components/BrandMarks';

const AUTH_USERNAME = 'Body_Garagefc';
const AUTH_PASSWORD = 'bodyGfc1234509876';
const AUTH_EMAIL = 'body_garagefc@bodygarage.in';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (username.trim() !== AUTH_USERNAME || password !== AUTH_PASSWORD) {
      setError('Invalid username or password.');
      return;
    }

    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: AUTH_EMAIL,
      password: AUTH_PASSWORD,
    });

    setLoading(false);

    if (signInError) {
      setError('Invalid username or password. Please try again.');
      return;
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Wordmark */}
      <div className="mb-8 text-center relative z-10">
        <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-wider text-red-600 leading-tight">
          Body Garage
        </h1>
        <p className="font-display text-base sm:text-lg tracking-[0.25em] sm:tracking-[0.35em] text-white uppercase mt-1">
          Fitness Club
        </p>
        <p className="text-xs text-ink/40 mt-2 tracking-wide uppercase">Tiruppur · Tamil Nadu</p>
      </div>

      {/* Login card */}
      <div className="w-full max-w-sm bg-panel rounded-2xl border border-border shadow-card p-6 relative z-10 animate-fade-in">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide mb-1">Staff Login</h2>
        <p className="text-sm text-ink/40 mb-5">Authorized personnel only</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink/60 mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" size={18} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="Body_Garagefc"
                className="w-full bg-panel-2 border border-border rounded-xl pl-10 pr-3.5 py-2.5 text-ink placeholder:text-ink/30 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink/60 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-panel-2 border border-border rounded-xl pl-10 pr-3.5 py-2.5 text-ink placeholder:text-ink/30 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 border border-danger/30 rounded-xl px-3.5 py-2.5">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white font-semibold rounded-xl py-3 hover:bg-accent-dark hover:shadow-glow-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Spinner className="text-white" /> : 'Sign In'}
          </button>
        </form>
      </div>

      <p className="text-xs text-ink/30 mt-6 relative z-10">
        Membership Tracker · Internal Tool
      </p>
    </div>
  );
}

'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await apiFetch<{
        data: {
          accessToken: string;
          user: { id: string; fullName: string; email: string; roles: string[] };
        };
      }>('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, ...(adminKey ? { adminKey } : {}) }),
      });

      localStorage.setItem('rv_access_token', result.data.accessToken);
      localStorage.setItem('rv_user', JSON.stringify(result.data.user));
      router.push('/dashboard/admin');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Administrator sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl shadow-black/30">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
            <ShieldCheck className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
            RentalVala Secure Access
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-white">Administrator Portal</h1>
          <p className="mt-2 text-sm text-slate-400">
            Authorized administrators only. Sign in with your admin account.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="mb-1 block text-xs font-semibold text-slate-300">
              Administrator Email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-1 block text-xs font-semibold text-slate-300">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label htmlFor="admin-key" className="mb-1 block text-xs font-semibold text-slate-300">
              Admin Security Key <span className="font-normal text-slate-500">(if enabled)</span>
            </label>
            <input
              id="admin-key"
              type="password"
              autoComplete="off"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-900 bg-red-950/60 p-3 text-xs text-red-300" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3 font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
            {loading ? 'Verifying credentials...' : 'Secure Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Not an administrator?{' '}
          <Link href="/login" className="font-semibold text-cyan-300 hover:underline">
            Return to customer sign-in
          </Link>
        </p>
      </div>
    </div>
  );
}

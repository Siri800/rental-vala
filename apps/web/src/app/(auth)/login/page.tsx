'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{
        data: { accessToken: string; user: { roles: string[] } };
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });

      localStorage.setItem('rv_access_token', res.data.accessToken);
      localStorage.setItem('rv_user', JSON.stringify(res.data.user));

      const roles = res.data.user.roles;
      if (roles.some((r) => r.includes('ADMIN'))) {
        router.push('/dashboard/admin');
      } else if (roles.includes('PROVIDER')) {
        router.push('/dashboard/provider');
      } else {
        router.push('/dashboard/customer');
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-slate-900">Welcome Back to Rental Vala</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to manage your bookings, listings, or marketplace</p>
        </div>

        {/* One-Click Demo Credential Fillers */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
          <p className="text-[11px] font-bold uppercase text-slate-500">Quick Demo Logins (Seeded):</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fillDemo('customer@rentalvala.in', 'Customer@1234')}
              className="text-xs bg-white border border-slate-300 hover:border-brand-500 px-2.5 py-1 rounded-md font-medium"
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => fillDemo('provider.tech@rentalvala.in', 'Provider@1234')}
              className="text-xs bg-white border border-slate-300 hover:border-brand-500 px-2.5 py-1 rounded-md font-medium"
            >
              Provider
            </button>
            <button
              type="button"
              onClick={() => fillDemo('admin@rentalvala.in', 'Admin@1234')}
              className="text-xs bg-white border border-slate-300 hover:border-brand-500 px-2.5 py-1 rounded-md font-medium"
            >
              Super Admin
            </button>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email or Mobile Number
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
            />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-brand-600 font-semibold hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
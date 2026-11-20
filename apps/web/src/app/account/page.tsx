'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface AccountProfile {
  fullName: string;
  email: string;
  phone: string;
  roles: string[];
  status: string;
}

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('rv_access_token')) {
      router.replace('/login');
      return;
    }

    apiFetch<{ data: AccountProfile }>('/auth/me')
      .then((response) => setProfile(response.data))
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Could not load your profile.');
      });
  }, [router]);

  const isAdmin = profile?.roles.some((role) => role.includes('ADMIN')) ?? false;
  const isProvider = profile?.roles.includes('PROVIDER') ?? false;
  const dashboardHref = isAdmin
    ? '/dashboard/admin'
    : isProvider
      ? '/dashboard/provider'
      : '/dashboard/customer';

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">My Account &amp; Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Your Rental Vala account details and shortcuts.</p>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      ) : !profile ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading your profile...
        </div>
      ) : (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 font-bold text-slate-900">Profile details</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Name</dt>
                <dd className="mt-1 text-sm font-medium text-slate-800">{profile.fullName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Email</dt>
                <dd className="mt-1 text-sm font-medium text-slate-800">{profile.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Mobile</dt>
                <dd className="mt-1 text-sm font-medium text-slate-800">{profile.phone}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Account type</dt>
                <dd className="mt-1 text-sm font-medium text-slate-800">{profile.roles.join(', ')}</dd>
              </div>
            </dl>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/customer"
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              My Bookings &amp; Invoices
            </Link>
            {(isProvider || isAdmin) && (
              <Link
                href={dashboardHref}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {isAdmin ? 'Admin Dashboard' : 'Provider Dashboard'}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

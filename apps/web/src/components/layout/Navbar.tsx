'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, ClipboardList, MapPin, Search } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface StoredUser {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
}

const cities = ['All India', 'Hyderabad', 'Bengaluru', 'Mumbai', 'Chennai', 'Delhi'];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [city, setCity] = useState('Hyderabad');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const syncUser = () => {
      const raw = localStorage.getItem('rv_user');
      if (!raw) {
        setUser(null);
        return;
      }

      try {
        const parsed = JSON.parse(raw) as StoredUser;
        if (typeof parsed.fullName !== 'string' || !Array.isArray(parsed.roles)) {
          throw new Error('Stored user data is invalid.');
        }
        setUser(parsed);
      } catch {
        localStorage.removeItem('rv_user');
        setUser(null);
      }
    };

    syncUser();
    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (city && city !== 'All India') params.set('city', city);
    router.push(`/search${params.size ? `?${params.toString()}` : ''}`);
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('[Logout failed]', error);
    } finally {
      localStorage.removeItem('rv_access_token');
      localStorage.removeItem('rv_user');
      setUser(null);
      router.push('/');
    }
  };

  const isAdmin = user?.roles.some((role) => role.includes('ADMIN')) ?? false;
  const isProvider = user?.roles.includes('PROVIDER') ?? false;
  const dashboardHref = isAdmin
    ? '/dashboard/admin'
    : isProvider
      ? '/dashboard/provider'
      : '/dashboard/customer';
  const dashboardLabel = isAdmin
    ? 'Admin Dashboard'
    : isProvider
      ? 'Provider Dashboard'
      : '';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="min-h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Rentala home">
            <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              R
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">
              Rent<span className="text-brand-600">ala</span>
            </span>
          </Link>

          <form
            onSubmit={handleSearch}
            className="hidden lg:flex flex-1 max-w-2xl items-center bg-slate-100 rounded-full border border-slate-200 focus-within:border-brand-500 focus-within:bg-white transition px-3 py-1.5"
          >
            <div className="flex items-center gap-1.5 pr-3 border-r border-slate-300 text-sm text-slate-700">
              <MapPin className="w-4 h-4 text-accent-500 shrink-0" />
              <select
                aria-label="Search city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="bg-transparent font-medium focus:outline-none cursor-pointer"
              >
                {cities.map((cityOption) => (
                  <option key={cityOption} value={cityOption}>
                    {cityOption}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cameras, vehicles, furniture, and more"
              aria-label="Search rentals"
              className="flex-1 min-w-0 bg-transparent px-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-1.5 rounded-full flex items-center gap-1.5 transition"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </form>

          <nav aria-label="Account and orders" className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/dashboard/customer"
              className="rounded-lg px-2 py-2 text-xs font-semibold leading-tight text-slate-700 hover:bg-slate-100"
            >
              <span className="inline-flex items-center gap-1.5 sm:hidden">
                <ClipboardList className="h-4 w-4" />
                Orders
              </span>
              <span className="hidden sm:block">My Bookings</span>
              <span className="hidden text-[11px] font-normal text-slate-500 sm:block">Orders &amp; rentals</span>
            </Link>
            {user ? (
              <details className="relative">
                <summary className="list-none cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 [&::-webkit-details-marker]:hidden">
                  <span>Hello, </span>
                  <span className="max-w-24 truncate">{user.fullName.split(' ')[0] || 'there'}</span>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </summary>
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <Link
                    href="/account"
                    className="block rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    My Account &amp; Profile
                  </Link>
                  <Link
                    href="/dashboard/customer"
                    className="block rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    My Bookings &amp; Invoices
                  </Link>
                  {(isProvider || isAdmin) && (
                    <Link
                      href={dashboardHref}
                      className="block rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {dashboardLabel}
                    </Link>
                  )}
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              </details>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-sm font-semibold text-slate-700 hover:text-brand-600 px-2 sm:px-3 py-2"
                >
                  <span className="hidden sm:inline">Hello, </span>Sign in
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white px-3 sm:px-4 py-2 rounded-lg shadow-sm transition"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </nav>
        </div>

        <form
          onSubmit={handleSearch}
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 pb-3 lg:hidden"
        >
          <label className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-700">
            <MapPin className="w-4 h-4 text-accent-500 shrink-0" />
            <select
              aria-label="Search city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="max-w-24 bg-transparent font-medium focus:outline-none"
            >
              {cities.map((cityOption) => (
                <option key={cityOption} value={cityOption}>
                  {cityOption}
                </option>
              ))}
            </select>
          </label>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rentals"
            aria-label="Search rentals"
            className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Search"
            className="rounded-lg bg-brand-600 p-2.5 text-white hover:bg-brand-700"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}

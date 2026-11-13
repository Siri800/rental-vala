'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Search, ShieldCheck, LogOut, LayoutDashboard, PlusCircle } from 'lucide-react';

interface StoredUser {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
}

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [city, setCity] = useState('Hyderabad');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('rv_user');
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        localStorage.removeItem('rv_user');
      }
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (city && city !== 'All India') params.set('city', city);
    router.push(`/search?${params.toString()}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('rv_access_token');
    localStorage.removeItem('rv_user');
    setUser(null);
    router.push('/');
  };

  const dashboardHref = user?.roles.some((r) => r.includes('ADMIN'))
    ? '/dashboard/admin'
    : user?.roles.includes('PROVIDER')
      ? '/dashboard/provider'
      : '/dashboard/customer';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            RV
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">
              Rental<span className="text-brand-600">Vala</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
              India
            </span>
          </div>
        </Link>

        {/* Location + Search Bar */}
        <form
          onSubmit={handleSearch}
          className="hidden md:flex flex-1 max-w-2xl items-center bg-slate-100 rounded-full border border-slate-200 focus-within:border-brand-500 focus-within:bg-white transition px-3 py-1.5"
        >
          <div className="flex items-center gap-1.5 pr-3 border-r border-slate-300 text-sm text-slate-700">
            <MapPin className="w-4 h-4 text-accent-500 shrink-0" />
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-transparent font-medium focus:outline-none cursor-pointer"
            >
              <option value="All India">All India</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Delhi NCR">Delhi NCR</option>
              <option value="Chennai">Chennai</option>
              <option value="Pune">Pune</option>
            </select>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Sony cameras, Thar SUV, sofas, projectors, wedding gear..."
            className="flex-1 bg-transparent px-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-1.5 rounded-full flex items-center gap-1.5 transition"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
        </form>

        {/* Right Actions */}
        <nav className="flex items-center gap-3">
          <Link
            href="/search"
            className="text-sm font-medium text-slate-600 hover:text-brand-600 hidden lg:inline"
          >
            Explore Catalog
          </Link>

          {user ? (
            <>
              {user.roles.includes('PROVIDER') && (
                <Link
                  href="/dashboard/provider"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-accent-500/10 text-accent-600 hover:bg-accent-500/20"
                >
                  <PlusCircle className="w-4 h-4" /> List Item
                </Link>
              )}
              <Link
                href={dashboardHref}
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-100 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-semibold text-slate-700 hover:text-brand-600 px-3 py-2"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg shadow-sm transition"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
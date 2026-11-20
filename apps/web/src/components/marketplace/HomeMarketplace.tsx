'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bike,
  Briefcase,
  Building2,
  Camera,
  Car,
  Dumbbell,
  Luggage,
  PartyPopper,
  Refrigerator,
  Shirt,
  Sofa,
  Sparkles,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { CategoryImage } from '@/components/marketplace/CategoryImage';
import { ListingCard, type ListingSummary } from '@/components/marketplace/ListingCard';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  bannerUrl?: string | null;
  _count: { listings: number };
}

interface HomeMarketplaceProps {
  categories: CategoryItem[];
  appointments: ListingSummary[];
  rentals: ListingSummary[];
}

const categoryIcons: Record<string, LucideIcon> = {
  vehicles: Car,
  electronics: Camera,
  furniture: Sofa,
  'home-appliances': Refrigerator,
  'tools-equipment': Wrench,
  'event-party': PartyPopper,
  fashion: Shirt,
  'sports-outdoor': Bike,
  travel: Luggage,
  'property-spaces': Building2,
  'business-professional-equipment': Briefcase,
};

const categoryImages: Record<string, string> = {
  vehicles: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=85',
  electronics: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=85',
  furniture: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=85',
  'home-appliances': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=85',
  'tools-equipment': 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=85',
  'event-party': 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=85',
  fashion: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1200&q=85',
  'sports-outdoor': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=85',
  travel: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=85',
  'property-spaces': 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85',
  'business-professional-equipment': 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1200&q=85',
};

const appointmentGroups = [
  {
    slug: 'gym',
    name: 'Gym',
    description: 'Day passes and personal training',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=85',
    icon: Dumbbell,
  },
  {
    slug: 'salon',
    name: 'Salon & Spa',
    description: 'Hair, spa, and grooming',
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=85',
    icon: Sparkles,
  },
  {
    slug: 'hotel',
    name: 'Hotel Stays',
    description: 'Hourly and daily stays',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=85',
    icon: Building2,
  },
];

const splashCategories = ['Cameras', 'Cars', 'Wedding Wear', 'Gym', 'Salon', 'Hotels'];

export function HomeMarketplace({ categories, appointments, rentals }: HomeMarketplaceProps) {
  const [mode, setMode] = useState<'RENTALS' | 'APPOINTMENTS'>('RENTALS');
  const [showSplash, setShowSplash] = useState(true);
  const [secondsRemaining, setSecondsRemaining] = useState(10);

  useEffect(() => {
    const transition = window.setTimeout(() => setShowSplash(false), 10000);
    const countdown = window.setInterval(
      () => setSecondsRemaining((remaining) => Math.max(remaining - 1, 0)),
      1000
    );
    return () => {
      window.clearTimeout(transition);
      window.clearInterval(countdown);
    };
  }, []);

  const popularPicks = rentals
    .filter((listing) => Number(listing.averageRating) >= 4.8)
    .sort((left, right) => Number(right.averageRating) - Number(left.averageRating))
    .slice(0, 4);
  const activeCategories = mode === 'RENTALS'
    ? categories.filter((category) => category.slug !== 'appointments')
    : [];
  const activeListings = mode === 'RENTALS' ? rentals : appointments;

  return (
    <>
      {showSplash && (
        <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-950 to-brand-900 px-6 text-white">
          <style>{`@keyframes rentala-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } } @keyframes rentala-progress { from { width: 0%; } to { width: 100%; } }`}</style>
          <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="relative w-full max-w-4xl text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-2xl font-black shadow-lg shadow-brand-500/30 backdrop-blur">
              R
            </div>
            <h1 className="bg-gradient-to-r from-brand-200 via-white to-fuchsia-200 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-7xl">
              Rentala
            </h1>
            <p className="mt-3 text-lg text-slate-200 sm:text-xl">Rent Anything. Book Anywhere.</p>

            <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2.5">
              {splashCategories.map((category, index) => (
                <span
                  key={category}
                  style={{ animation: `rentala-float 4s ease-in-out ${index * 0.18}s infinite` }}
                  className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 shadow-lg backdrop-blur"
                >
                  {category}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-medium text-slate-200">
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-2">✓ Secure payments</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-2">✓ Verified providers</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-2">✓ Easy booking</span>
            </div>

            <div className="mx-auto mt-9 h-1.5 max-w-sm overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-brand-300 to-fuchsia-300"
                style={{ animation: 'rentala-progress 10s linear forwards' }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400" aria-live="polite">
              {secondsRemaining}s... Your marketplace is getting ready
            </p>
            <button
              type="button"
              onClick={() => setShowSplash(false)}
              className="mt-5 rounded-full border border-white/30 px-6 py-2.5 text-sm font-bold transition hover:border-white hover:bg-white/10"
            >
              Explore Marketplace →
            </button>
          </div>
        </div>
      )}

      <div>
        <nav
          aria-label="Marketplace mode"
          className="border-b border-slate-200 bg-white shadow-sm"
        >
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMode('RENTALS')}
              aria-pressed={mode === 'RENTALS'}
              className={`rounded-xl border px-4 py-3 text-left transition sm:px-6 ${
                mode === 'RENTALS'
                  ? 'border-brand-600 bg-brand-50 text-brand-800 shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:border-brand-300'
              }`}
            >
              <span className="block text-base font-extrabold sm:text-lg">📦 Rental Items</span>
              <span className="mt-0.5 hidden text-xs sm:block">Explore items to rent by day or week</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('APPOINTMENTS')}
              aria-pressed={mode === 'APPOINTMENTS'}
              className={`rounded-xl border px-4 py-3 text-left transition sm:px-6 ${
                mode === 'APPOINTMENTS'
                  ? 'border-brand-600 bg-brand-50 text-brand-800 shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:border-brand-300'
              }`}
            >
              <span className="block text-base font-extrabold sm:text-lg">📅 Book Appointments</span>
              <span className="mt-0.5 hidden text-xs sm:block">Gym, salon, spa, and hotel stays</span>
            </button>
          </div>
        </nav>

        {mode === 'RENTALS' && (
          <section aria-labelledby="popular-picks-title" className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-600">
                  Top-rated rentals picked for you
                </p>
                <h2 id="popular-picks-title" className="mt-1 text-2xl font-extrabold text-slate-900">
                  🔥 Popular Picks
                </h2>
              </div>
              <Link href="/search?sort=rating" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                Explore popular
              </Link>
            </div>
            {popularPicks.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {popularPicks.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} popularPick />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
                Popular picks are being curated. Browse available rental items below.
              </p>
            )}
          </section>
        )}

        <section
          aria-labelledby="browse-categories-title"
          className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8"
        >
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-600">
                {mode === 'RENTALS' ? 'Find your next rental' : 'Choose an experience'}
              </p>
              <h1 id="browse-categories-title" className="mt-1 text-2xl font-extrabold text-slate-900">
                Browse {mode === 'RENTALS' ? 'Rental' : 'Appointment'} Categories
              </h1>
            </div>
            <Link href="/search" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              View all
            </Link>
          </div>

          {mode === 'RENTALS' ? (
            activeCategories.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {activeCategories.map((category) => {
                  const Icon = categoryIcons[category.slug] ?? Sparkles;
                  return (
                    <Link
                      key={category.id}
                      href={`/search?category=${encodeURIComponent(category.slug)}`}
                      className="group rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md"
                    >
                      <CategoryImage
                        src={category.bannerUrl || categoryImages[category.slug]}
                        alt={`${category.name} rentals`}
                      />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <h2 className="flex items-center gap-1.5 text-sm font-bold leading-snug text-slate-900 group-hover:text-brand-700">
                          <Icon className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                          {category.name}
                        </h2>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                          {category._count?.listings ?? 0}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                Categories are temporarily unavailable. Browse all rentals.
              </p>
            )
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {appointmentGroups.map((group) => {
                const Icon = group.icon;
                const count = appointments.filter((listing) => listing.subcategory?.slug === group.slug).length;
                return (
                  <Link
                    key={group.slug}
                    href={`/search?category=appointments&q=${encodeURIComponent(group.slug)}`}
                    className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md"
                  >
                    <CategoryImage src={group.image} alt={group.name} />
                    <div className="flex items-center justify-between p-3">
                      <div>
                        <h2 className="flex items-center gap-2 font-bold text-slate-900 group-hover:text-brand-700">
                          <Icon className="h-4 w-4 text-brand-600" aria-hidden="true" />
                          {group.name}
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500">{group.description}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                        {count}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section aria-labelledby="home-results-title" className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Browse without signing in
                </p>
                <h2 id="home-results-title" className="mt-1 text-2xl font-extrabold text-slate-900">
                  {mode === 'RENTALS' ? 'Available Rental Items' : 'Popular Appointments'}
                </h2>
              </div>
              <Link
                href={mode === 'RENTALS' ? '/search' : '/search?category=appointments'}
                className="text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                See all
              </Link>
            </div>

            {activeListings.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {activeListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Nothing is listed here just yet. Check back soon.
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

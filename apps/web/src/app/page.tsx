import Link from 'next/link';
import {
  ShieldCheck,
  CalendarCheck,
  Wallet,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { ListingCard, ListingSummary } from '@/components/marketplace/ListingCard';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085/api/v1';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  subcategories: { id: string; name: string; slug: string }[];
  _count: { listings: number };
}

async function getHomeData() {
  try {
    const [catRes, listRes] = await Promise.all([
      fetch(`${API_BASE}/categories`, { cache: 'no-store' }),
      fetch(`${API_BASE}/listings?limit=8`, { cache: 'no-store' }),
    ]);
    const catJson = catRes.ok ? await catRes.json() : { data: [] };
    const listJson = listRes.ok ? await listRes.json() : { data: [] };
    return {
      categories: (catJson.data || []) as CategoryItem[],
      listings: (listJson.data || []) as ListingSummary[],
    };
  } catch {
    return { categories: [], listings: [] };
  }
}

export default async function HomePage() {
  const { categories, listings } = await getHomeData();

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-brand-900 to-brand-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-100">
              <Sparkles className="w-4 h-4 text-accent-500" />
              12 Rental Categories • Real-Time Inventory • Escrow Deposit Protection
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Rent Anything You Need, <span className="text-accent-500">When You Need It.</span>
            </h1>

            <p className="text-lg text-slate-300 max-w-2xl leading-relaxed">
              From self-drive SUVs and Sony cinema cameras to home appliances, wedding production
              gear, and commercial studios—book directly from verified local providers across India.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/search"
                className="bg-accent-500 hover:bg-accent-600 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg transition inline-flex items-center gap-2"
              >
                Browse All Rentals <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/register?role=PROVIDER"
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 py-3.5 rounded-xl transition"
              >
                List Your Assets & Earn
              </Link>
            </div>
          </div>

          {/* Trust & Guarantee Card */}
          <div className="lg:col-span-5 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-lg text-white">Why 50,000+ Renters Trust Rental Vala</h3>
            <div className="space-y-3 text-sm text-slate-200">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Escrow Security Deposits</p>
                  <p className="text-slate-300 text-xs">
                    Deposits are held safely in escrow and released automatically after return
                    inspection.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Zero Double-Booking Guarantee</p>
                  <p className="text-slate-300 text-xs">
                    Live unit-level stock locking ensures your reserved equipment is ready on time.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Wallet className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Flexible Daily, Weekly & Monthly Tiers</p>
                  <p className="text-slate-300 text-xs">
                    Automatic multi-day discounts and transparent GST invoicing for businesses.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All 12 Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Explore All 12 Rental Categories
            </h2>
            <p className="text-slate-500 mt-1 text-sm">
              Category-specific specifications, verified inventory, and flexible pickup or doorstep delivery.
            </p>
          </div>
          <Link
            href="/search"
            className="text-sm font-semibold text-brand-600 hover:text-brand-700 hidden sm:inline-flex items-center gap-1"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/search?category=${cat.slug}`}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-brand-500 hover:shadow-md transition group"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-900 group-hover:text-brand-600 transition">
                  {cat.name}
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {cat._count?.listings ?? 0} items
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2 mb-3">{cat.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {cat.subcategories.slice(0, 3).map((sub) => (
                  <span
                    key={sub.id}
                    className="text-[11px] bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md"
                  >
                    {sub.name}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured & Popular Rentals */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Featured Rentals Ready to Book
            </h2>
            <p className="text-slate-500 mt-1 text-sm">
              Top-rated equipment, vehicles, and spaces from KYC-approved Rental Vala vendors.
            </p>
          </div>
        </div>

        {listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-slate-600 font-medium">
              No published listings found yet. Ensure your API server is running on port 8085 and run the database seed!
            </p>
          </div>
        )}
      </section>

      {/* How Rental Vala Works */}
      <section className="bg-white border-y border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-center mb-12">
            How Rental Vala Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Select Dates & Item', desc: 'Filter by city, category attributes, and real-time date availability.' },
              { step: '02', title: 'Pay Securely via Razorpay', desc: 'Rental fee and refundable security deposit are locked transparently.' },
              { step: '03', title: 'OTP Handover', desc: 'Inspect your item at pickup or delivery and verify with your 6-digit OTP.' },
              { step: '04', title: 'Return & Deposit Refund', desc: 'Complete post-rental inspection and get your security deposit released.' },
            ].map((item) => (
              <div key={item.step} className="space-y-2">
                <span className="text-xs font-extrabold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-md">
                  STEP {item.step}
                </span>
                <h3 className="font-bold text-lg text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Become a Provider Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-white flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold">
              Own Cameras, Vehicles, Tools, or Studio Space?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base">
              Turn idle inventory into recurring monthly revenue. Manage multi-unit calendars,
              handover checklists, and automated bank payouts from your Rental Vala Provider Hub.
            </p>
            <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-300">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Free Storefront</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Security Deposit Protection</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Fast Settlements</span>
            </div>
          </div>
          <Link
            href="/register?role=PROVIDER"
            className="bg-brand-600 hover:bg-brand-500 text-white font-bold px-7 py-4 rounded-xl shrink-0 shadow-lg transition"
          >
            Register as a Provider
          </Link>
        </div>
      </section>
    </div>
  );
}
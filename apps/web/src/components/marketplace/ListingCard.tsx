import Link from 'next/link';
import { Star, MapPin, ShieldCheck, Truck } from 'lucide-react';

export interface ListingSummary {
  id: string;
  title: string;
  slug: string;
  city: string;
  condition: string;
  averageRating: string | number;
  totalReviews: number;
  deliveryAvailable: boolean;
  instantBooking: boolean;
  category: { name: string; slug: string };
  provider: { businessName: string; averageRating: string | number };
  images: { url: string; altText?: string | null }[];
  pricing: {
    dailyRate: string | number;
    securityDeposit: string | number;
  } | null;
}

export function ListingCard({ listing }: { listing: ListingSummary }) {
  const imageUrl =
    listing.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80';

  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg hover:border-brand-500/40 transition flex flex-col"
    >
      <div className="relative h-52 bg-slate-100 overflow-hidden">
        <img
          src={imageUrl}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
        />
        <span className="absolute top-3 left-3 bg-white/95 backdrop-blur text-slate-800 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
          {listing.category.name}
        </span>
        {listing.instantBooking && (
          <span className="absolute top-3 right-3 bg-emerald-600 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
            Instant Book
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {listing.city}
            </span>
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {Number(listing.averageRating).toFixed(1)} ({listing.totalReviews})
            </span>
          </div>

          <h3 className="font-bold text-slate-900 text-base line-clamp-2 group-hover:text-brand-600 transition">
            {listing.title}
          </h3>

          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
            {listing.provider.businessName}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-end justify-between">
          <div>
            <span className="text-lg font-extrabold text-slate-900">
              ₹{Number(listing.pricing?.dailyRate ?? 0).toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500"> / day</span>
            <p className="text-[11px] text-slate-400">
              Deposit: ₹{Number(listing.pricing?.securityDeposit ?? 0).toLocaleString('en-IN')}
            </p>
          </div>

          {listing.deliveryAvailable && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-50 px-2 py-1 rounded-md">
              <Truck className="w-3.5 h-3.5" /> Delivery
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
import Link from 'next/link';
import { Star, MapPin, ShieldCheck, Truck } from 'lucide-react';

export interface ListingSummary {
  id: string;
  title: string;
  slug: string;
  city: string;
  condition: string;
  listingType?: 'RENTAL' | 'APPOINTMENT';
  appointmentDurationMinutes?: number | null;
  averageRating: string | number;
  totalReviews: number;
  deliveryAvailable: boolean;
  instantBooking: boolean;
  category: { name: string; slug: string };
  subcategory?: { name: string; slug: string };
  provider: { businessName: string; averageRating: string | number };
  images: { url: string; altText?: string | null }[];
  inventoryItem?: {
    totalQuantity: number;
    _count?: { units: number };
  } | null;
  pricing: {
    primaryUnit?: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
    hourlyRate?: string | number | null;
    dailyRate: string | number;
    securityDeposit: string | number;
  } | null;
}

export function ListingCard({
  listing,
  popularPick = false,
}: {
  listing: ListingSummary;
  popularPick?: boolean;
}) {
  const imageUrl =
    listing.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80';
  const unitLabel =
    listing.listingType === 'APPOINTMENT'
      ? listing.pricing?.primaryUnit === 'HOURLY'
        ? ' / hour'
        : ' / day'
      : ' / day';
  const price =
    listing.listingType === 'APPOINTMENT' && listing.pricing?.primaryUnit === 'HOURLY'
      ? listing.pricing.hourlyRate ?? listing.pricing.dailyRate
      : listing.pricing?.dailyRate;
  const durationMinutes = listing.appointmentDurationMinutes;
  const durationLabel = durationMinutes
    ? durationMinutes % 60 === 0
      ? `${durationMinutes / 60} hr${durationMinutes === 60 ? '' : 's'}`
      : `${durationMinutes} min`
    : null;

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
          {listing.subcategory?.name ?? listing.category.name}
        </span>
        {popularPick && (
          <span className="absolute left-3 top-11 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-extrabold text-amber-950 shadow-sm">
            Popular Pick
          </span>
        )}
        {listing.instantBooking && (
          <span className="absolute top-3 right-3 bg-emerald-600 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
            Instant Book
          </span>
        )}
        {listing.inventoryItem?._count && (
          <span
            className={`absolute bottom-3 left-3 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm ${
              listing.inventoryItem._count.units > 0
                ? 'bg-white/95 text-emerald-700'
                : 'bg-white/95 text-slate-600'
            }`}
          >
            {listing.inventoryItem._count.units > 0
              ? `Available Now · ${listing.inventoryItem._count.units} ${listing.listingType === 'APPOINTMENT' ? 'slots' : 'units'}`
              : 'Check future availability'}
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
          {listing.listingType === 'APPOINTMENT' && durationLabel && (
            <p className="mt-1 text-xs font-medium text-slate-600">Slot duration: {durationLabel}</p>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-end justify-between">
          <div>
            <span className="text-lg font-extrabold text-slate-900">
              ₹{Number(price ?? 0).toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500">{unitLabel}</span>
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
        <span className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white transition group-hover:bg-brand-700">
          {listing.listingType === 'APPOINTMENT' ? 'Book Appointment' : 'Rent Now'}
        </span>
      </div>
    </Link>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Star, MapPin, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface ListingDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  brand?: string;
  model?: string;
  condition: string;
  city: string;
  state: string;
  pickupAddress: string;
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
  instantBooking: boolean;
  averageRating: string;
  totalReviews: number;
  category: { name: string };
  subcategory: { name: string };
  provider: {
    id: string;
    businessName: string;
    city: string;
    averageRating: string;
    totalReviews: number;
  };
  images: { id: string; url: string; altText?: string }[];
  attributes: {
    id: string;
    valueText?: string;
    valueNumber?: string;
    valueBool?: boolean;
    attribute: { label: string; unit?: string };
  }[];
  pricing: {
    dailyRate: string;
    weeklyRate?: string;
    monthlyRate?: string;
    securityDeposit: string;
    deliveryFee: string;
    taxRatePct: string;
    minDuration: number;
    maxDuration: number;
  };
  policies: {
    cancellationPolicy: string;
    cancellationNotes?: string;
    damagePolicy: string;
    lateFeePerDay: string;
  };
  inventoryItem: { totalQuantity: number };
}

interface QuoteData {
  isAvailable: boolean;
  availableQuantity: number;
  quote: {
    durationDays: number;
    rentalSubtotal: number;
    deliveryCharge: number;
    taxAmount: number;
    securityDeposit: number;
    totalPayable: number;
  };
}

export default function ListingDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const fourDaysLater = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(tomorrow);
  const [endDate, setEndDate] = useState(fourDaysLater);
  const [quantity, setQuantity] = useState(1);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [quoteInfo, setQuoteInfo] = useState<QuoteData | null>(null);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    apiFetch<{ data: ListingDetail }>(`/listings/${params.slug}`)
      .then((res) => setListing(res.data))
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setLoading(false));
  }, [params.slug]);

  useEffect(() => {
    if (!listing) return;
    apiFetch<{ data: QuoteData }>('/bookings/quote', {
      method: 'POST',
      body: JSON.stringify({
        listingId: listing.id,
        startDate: new Date(`${startDate}T10:00:00Z`).toISOString(),
        endDate: new Date(`${endDate}T10:00:00Z`).toISOString(),
        quantity,
        fulfillmentMethod,
      }),
    })
      .then((res) => {
        setQuoteInfo(res.data);
        setErrorMsg('');
      })
      .catch((err) => setErrorMsg(err.message));
  }, [listing, startDate, endDate, quantity, fulfillmentMethod]);

  const handleBookAndPay = async () => {
    const token = localStorage.getItem('rv_access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    if (!listing) return;

    try {
      setBookingBusy(true);
      setErrorMsg('');

      const bookingRes = await apiFetch<{ data: { id: string; status: string } }>('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          listingId: listing.id,
          startDate: new Date(`${startDate}T10:00:00Z`).toISOString(),
          endDate: new Date(`${endDate}T10:00:00Z`).toISOString(),
          quantity,
          fulfillmentMethod,
        }),
      });

      if (bookingRes.data.status === 'PAYMENT_PENDING') {
        const orderRes = await apiFetch<{ data: { orderId: string; sandboxMode: boolean } }>(
          '/payments/create-order',
          {
            method: 'POST',
            body: JSON.stringify({ bookingId: bookingRes.data.id }),
          }
        );

        if (orderRes.data.sandboxMode) {
          await apiFetch('/payments/verify', {
            method: 'POST',
            body: JSON.stringify({
              orderId: orderRes.data.orderId,
              paymentId: `pay_demo_${Date.now()}`,
              signature: 'sandbox_verified',
            }),
          });
        }
      }

      router.push('/dashboard/customer');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setBookingBusy(false);
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto p-12 text-center">Loading listing details...</div>;
  if (!listing) return <div className="max-w-7xl mx-auto p-12 text-center text-red-600">{errorMsg || 'Listing not found'}</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Gallery, Specs, Policies */}
        <div className="lg:col-span-7 space-y-8">
          <div className="rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 aspect-video">
            <img
              src={listing.images[0]?.url}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-brand-600 mb-2">
              <span>{listing.category.name}</span>
              <span>•</span>
              <span>{listing.subcategory.name}</span>
              <span>•</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                Condition: {listing.condition.replace('_', ' ')}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{listing.title}</h1>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-600">
              <span className="flex items-center gap-1 font-semibold text-slate-900">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {Number(listing.averageRating).toFixed(1)} ({listing.totalReviews} verified reviews)
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-slate-400" />
                {listing.city}, {listing.state}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
            <h2 className="font-bold text-lg text-slate-900">Description</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{listing.description}</p>
          </div>

          {listing.attributes.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-lg text-slate-900 mb-4">Technical Specifications</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {listing.attributes.map((attr) => (
                  <div key={attr.id} className="border-b border-slate-100 pb-2">
                    <p className="text-xs text-slate-400">{attr.attribute.label}</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {attr.valueText ??
                        (attr.valueNumber !== null ? `${attr.valueNumber} ${attr.attribute.unit || ''}` : null) ??
                        (attr.valueBool !== null ? (attr.valueBool ? 'Yes' : 'No') : '')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Provider Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase font-semibold">Verified Rental Provider</p>
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-1.5 mt-0.5">
                {listing.provider.businessName}
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Pickup Location: {listing.pickupAddress}
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-slate-900">
                ★ {Number(listing.provider.averageRating).toFixed(1)}
              </span>
              <p className="text-xs text-slate-400">{listing.provider.totalReviews} reviews</p>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Dynamic Booking & Price Calculator */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-5">
            <div className="flex items-baseline justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-3xl font-extrabold text-slate-900">
                  ₹{Number(listing.pricing.dailyRate).toLocaleString('en-IN')}
                </span>
                <span className="text-sm text-slate-500"> / day</span>
              </div>
              {listing.pricing.weeklyRate && (
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                  Weekly: ₹{Number(listing.pricing.weeklyRate).toLocaleString('en-IN')}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  min={tomorrow}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={quoteInfo?.availableQuantity || listing.inventoryItem.totalQuantity}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fulfillment</label>
                <select
                  value={fulfillmentMethod}
                  onChange={(e) => setFulfillmentMethod(e.target.value as 'PICKUP' | 'DELIVERY')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  {listing.pickupAvailable && <option value="PICKUP">Store Pickup (Free)</option>}
                  {listing.deliveryAvailable && (
                    <option value="DELIVERY">
                      Doorstep Delivery (+₹{Number(listing.pricing.deliveryFee)})
                    </option>
                  )}
                </select>
              </div>
            </div>

            {quoteInfo && (
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className={quoteInfo.isAvailable ? 'text-emerald-600' : 'text-red-600'}>
                    {quoteInfo.isAvailable
                      ? `✓ ${quoteInfo.availableQuantity} unit(s) available for selected dates`
                      : '✗ Insufficient stock for these dates'}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600 pt-2">
                  <span>
                    Rental ({quoteInfo.quote.durationDays} days × {quantity} qty)
                  </span>
                  <span>₹{quoteInfo.quote.rentalSubtotal.toLocaleString('en-IN')}</span>
                </div>

                {quoteInfo.quote.deliveryCharge > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Fee</span>
                    <span>₹{quoteInfo.quote.deliveryCharge.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>GST ({Number(listing.pricing.taxRatePct)}%)</span>
                  <span>₹{quoteInfo.quote.taxAmount.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Refundable Security Deposit</span>
                  <span>₹{quoteInfo.quote.securityDeposit.toLocaleString('en-IN')}</span>
                </div>

                <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-base text-slate-900">
                  <span>Total Payable</span>
                  <span>₹{quoteInfo.quote.totalPayable.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleBookAndPay}
              disabled={bookingBusy || !quoteInfo?.isAvailable}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-xl shadow-md transition"
            >
              {bookingBusy
                ? 'Processing Reservation...'
                : listing.instantBooking
                  ? 'Reserve & Pay Now'
                  : 'Request Booking Approval'}
            </button>

            <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Security deposit is 100% refundable upon safe return inspection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
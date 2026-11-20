'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Script from 'next/script';
import { Star, MapPin, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface RazorpayCheckoutResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  method: { upi: boolean; card: boolean; netbanking: boolean; wallet: boolean };
  upi: { flow: 'qrcode' };
  config: {
    display: {
      blocks: {
        upi_qr: {
          name: string;
          instruments: { method: 'upi'; flows: string[] }[];
        };
        other_methods: {
          name: string;
          instruments: { method: 'card' | 'netbanking' | 'wallet' }[];
        };
      };
      sequence: string[];
      preferences: { show_default_blocks: boolean };
    };
  };
  handler: (response: RazorpayCheckoutResponse) => Promise<void>;
  modal: { ondismiss: () => void };
  theme: { color: string };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

interface ListingDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  listingType: 'RENTAL' | 'APPOINTMENT';
  appointmentDurationMinutes?: number | null;
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
    primaryUnit: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
    hourlyRate?: string | null;
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
    durationCount: number;
    pricingUnit: 'HOURLY' | 'DAILY';
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
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [quantity, setQuantity] = useState(1);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [quoteInfo, setQuoteInfo] = useState<QuoteData | null>(null);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [razorpayLoadError, setRazorpayLoadError] = useState(false);

  useEffect(() => {
    apiFetch<{ data: ListingDetail }>(`/listings/${params.slug}`)
      .then((res) => setListing(res.data))
      .catch((err) => setErrorMsg(err.message))
      .finally(() => setLoading(false));
  }, [params.slug]);

  const getBookingDates = () => {
    if (listing?.listingType === 'APPOINTMENT') {
      const start = new Date(`${startDate}T${appointmentTime}:00`);
      const durationMinutes = listing.appointmentDurationMinutes ?? 60;
      return {
        startDate: start.toISOString(),
        endDate: new Date(start.getTime() + durationMinutes * 60 * 1000).toISOString(),
      };
    }

    return {
      startDate: new Date(`${startDate}T10:00:00Z`).toISOString(),
      endDate: new Date(`${endDate}T10:00:00Z`).toISOString(),
    };
  };

  useEffect(() => {
    if (!listing) return;
    const dates = getBookingDates();
    apiFetch<{ data: QuoteData }>('/bookings/quote', {
      method: 'POST',
      body: JSON.stringify({
        listingId: listing.id,
        ...dates,
        quantity,
        fulfillmentMethod,
      }),
    })
      .then((res) => {
        setQuoteInfo(res.data);
        setErrorMsg('');
      })
      .catch((err) => setErrorMsg(err.message));
  }, [listing, startDate, endDate, appointmentTime, quantity, fulfillmentMethod]);

  const handleBookAndPay = async () => {
    const token = localStorage.getItem('rv_access_token');
    if (!token) {
      const intendedPath = window.location.pathname;
      sessionStorage.setItem('rv_intended_redirect', intendedPath);
      router.push(`/login?redirect=${encodeURIComponent(intendedPath)}`);
      return;
    }
    if (!listing) return;

    let checkoutOpened = false;
    try {
      setBookingBusy(true);
      setErrorMsg('');

      const bookingRes = await apiFetch<{
        data: {
          id: string;
          status: string;
          bookingNumber: string;
          checkout?: {
            orderId: string;
            amount: number;
            currency: string;
            keyId?: string;
            sandboxMode: boolean;
          };
        };
      }>('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          listingId: listing.id,
          ...getBookingDates(),
          quantity,
          fulfillmentMethod,
        }),
      });

      if (bookingRes.data.status === 'PAYMENT_PENDING') {
        const checkout = bookingRes.data.checkout;
        if (!checkout) throw new Error('Checkout order was not returned for this booking.');

        if (checkout.sandboxMode) {
          await apiFetch('/payments/verify', {
            method: 'POST',
            body: JSON.stringify({
              razorpay_order_id: checkout.orderId,
              razorpay_payment_id: `pay_demo_${Date.now()}`,
              razorpay_signature: 'sandbox_verified',
            }),
          });
          router.push('/dashboard/customer');
          return;
        }

        if (!checkout.keyId || !window.Razorpay) {
          throw new Error('Razorpay Checkout is not ready. Please reload and try again.');
        }

        const razorpay = new window.Razorpay({
          key: checkout.keyId,
          amount: Math.round(checkout.amount * 100),
          currency: checkout.currency,
          name: 'Rental Vala',
          description: `Booking ${bookingRes.data.bookingNumber}`,
          order_id: checkout.orderId,
          method: { upi: true, card: true, netbanking: true, wallet: true },
          upi: { flow: 'qrcode' },
          config: {
            display: {
              blocks: {
                upi_qr: {
                  name: 'Pay by UPI QR',
                  instruments: [{ method: 'upi', flows: ['qr'] }],
                },
                other_methods: {
                  name: 'Other payment methods',
                  instruments: [
                    { method: 'card' },
                    { method: 'netbanking' },
                    { method: 'wallet' },
                  ],
                },
              },
              sequence: ['block.upi_qr', 'block.other_methods'],
              preferences: { show_default_blocks: false },
            },
          },
          handler: async (response) => {
            try {
              await apiFetch('/payments/verify', {
                method: 'POST',
                body: JSON.stringify(response),
              });
              router.push('/dashboard/customer');
            } catch (err: unknown) {
              setErrorMsg(err instanceof Error ? err.message : 'Payment verification failed.');
              setBookingBusy(false);
            }
          },
          modal: {
            ondismiss: () => {
              setErrorMsg('Checkout was closed. Your booking is still awaiting payment.');
              setBookingBusy(false);
            },
          },
          theme: { color: '#2563eb' },
        });
        razorpay.open();
        checkoutOpened = true;
        return;
      }

      router.push('/dashboard/customer');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      if (!checkoutOpened) setBookingBusy(false);
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto p-12 text-center">Loading listing details...</div>;
  if (!listing) return <div className="max-w-7xl mx-auto p-12 text-center text-red-600">{errorMsg || 'Listing not found'}</div>;
  const listedRate =
    listing.listingType === 'APPOINTMENT' && listing.pricing.primaryUnit === 'HOURLY'
      ? listing.pricing.hourlyRate ?? listing.pricing.dailyRate
      : listing.pricing.dailyRate;
  const rateUnit =
    listing.listingType === 'APPOINTMENT' && listing.pricing.primaryUnit === 'HOURLY'
      ? ' / hour'
      : listing.listingType === 'APPOINTMENT'
        ? ' / day'
        : ' / day';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onReady={() => setRazorpayLoaded(true)}
        onError={() => setRazorpayLoadError(true)}
      />
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
                {listing.listingType === 'APPOINTMENT' ? 'Venue' : 'Pickup Location'}: {listing.pickupAddress}
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
                  ₹{Number(listedRate).toLocaleString('en-IN')}
                </span>
                <span className="text-sm text-slate-500">{rateUnit}</span>
              </div>
              {listing.listingType !== 'APPOINTMENT' &&
                listing.pricing.weeklyRate &&
                Number(listing.pricing.weeklyRate) > 0 && (
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                  Weekly: ₹{Number(listing.pricing.weeklyRate).toLocaleString('en-IN')}
                </span>
              )}
            </div>

            {listing.listingType === 'APPOINTMENT' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Appointment Date</label>
                  <input
                    type="date"
                    value={startDate}
                    min={tomorrow}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Available Time</label>
                  <select
                    value={appointmentTime}
                    onChange={(event) => setAppointmentTime(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(
                      (time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <p className="col-span-2 text-xs text-slate-500">
                  Slot length: {listing.appointmentDurationMinutes ?? 60} minutes. Availability is checked
                  for the selected date and time.
                </p>
              </div>
            ) : (
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
            )}

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
                {listing.listingType === 'APPOINTMENT' ? (
                  <div className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    Visit the venue
                  </div>
                ) : (
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
                )}
              </div>
            </div>

            {quoteInfo && (
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className={quoteInfo.isAvailable ? 'text-emerald-600' : 'text-red-600'}>
                    {quoteInfo.isAvailable
                      ? listing.listingType === 'APPOINTMENT'
                        ? `✓ ${quoteInfo.availableQuantity} slot(s) available for this time`
                        : `✓ ${quoteInfo.availableQuantity} unit(s) available for selected dates`
                      : listing.listingType === 'APPOINTMENT'
                        ? '✗ No slots available for this time'
                        : '✗ Insufficient stock for these dates'}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600 pt-2">
                  <span>
                    {listing.listingType === 'APPOINTMENT'
                      ? `Appointment (${quoteInfo.quote.durationCount} ${quoteInfo.quote.pricingUnit === 'HOURLY' ? 'hour(s)' : 'day(s)'} × ${quantity} qty)`
                      : `Rental (${quoteInfo.quote.durationDays} days × ${quantity} qty)`}
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
              disabled={
                bookingBusy ||
                !quoteInfo?.isAvailable ||
                (listing.instantBooking && !razorpayLoaded)
              }
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-xl shadow-md transition"
            >
              {bookingBusy
                ? 'Processing Reservation...'
                : listing.instantBooking && !razorpayLoaded
                  ? 'Loading Secure Checkout...'
                : listing.instantBooking
                  ? listing.listingType === 'APPOINTMENT'
                    ? 'Book Appointment & Pay'
                    : 'Reserve & Pay Now'
                  : listing.listingType === 'APPOINTMENT'
                    ? 'Request Appointment'
                    : 'Request Booking Approval'}
            </button>
            {razorpayLoadError && listing.instantBooking && (
              <p className="text-xs text-red-600 text-center">
                Secure checkout could not load. Please disable content blockers and reload.
              </p>
            )}

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
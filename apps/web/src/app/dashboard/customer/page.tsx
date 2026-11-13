'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, apiFetchBlob } from '@/lib/api';

interface CustomerBooking {
  id: string;
  bookingNumber: string;
  status: string;
  startDate: string;
  endDate: string;
  fulfillmentMethod: string;
  provider: { businessName: string; city: string };
  items: { quantity: number; listing: { title: string; slug: string } }[];
  priceBreakdown: { totalPayable: string; securityDeposit: string } | null;
}

export default function CustomerDashboardPage() {
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState('');

  useEffect(() => {
    apiFetch<{ data: CustomerBooking[] }>('/bookings/my')
      .then((res) => setBookings(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const downloadInvoice = async (booking: CustomerBooking) => {
    setDownloadingInvoiceId(booking.id);
    setInvoiceError('');
    try {
      const blob = await apiFetchBlob(`/bookings/${encodeURIComponent(booking.id)}/invoice`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `RentalVala-Invoice-${booking.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setInvoiceError(error instanceof Error ? error.message : 'Could not download the invoice.');
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Customer Dashboard</h1>
          <p className="text-sm text-slate-500">
            Track your active rentals, security deposit escrows, and booking history.
          </p>
        </div>
        <Link
          href="/search"
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl"
        >
          + Rent Another Item
        </Link>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase">Total Bookings</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{bookings.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase">Confirmed / Active</p>
          <p className="text-3xl font-extrabold text-emerald-600 mt-1">
            {bookings.filter((b) => ['CONFIRMED', 'ACTIVE', 'READY_FOR_PICKUP'].includes(b.status)).length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase">Refundable Deposits Held</p>
          <p className="text-3xl font-extrabold text-brand-600 mt-1">
            ₹
            {bookings
              .filter((b) => !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(b.status))
              .reduce((acc, b) => acc + Number(b.priceBreakdown?.securityDeposit ?? 0), 0)
              .toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Bookings List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900">
          My Rental Bookings
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading your bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            You haven&apos;t made any rental bookings yet.{' '}
            <Link href="/search" className="text-brand-600 font-semibold underline">
              Explore listings
            </Link>
          </div>
        ) : (
          <>
            {invoiceError && (
              <p role="alert" className="px-6 py-3 text-sm text-red-700 bg-red-50">
                {invoiceError}
              </p>
            )}
            <div className="divide-y divide-slate-100">
              {bookings.map((b) => (
              <div key={b.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-500">{b.bookingNumber}</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700">
                      {b.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mt-1">
                    {b.items[0]?.listing.title} (×{b.items[0]?.quantity})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Provider: {b.provider.businessName} • {new Date(b.startDate).toLocaleDateString()} to{' '}
                    {new Date(b.endDate).toLocaleDateString()} ({b.fulfillmentMethod})
                  </p>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-2">
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-extrabold text-slate-900">
                      ₹{Number(b.priceBreakdown?.totalPayable ?? 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-slate-400">
                      Incl. ₹{Number(b.priceBreakdown?.securityDeposit ?? 0).toLocaleString('en-IN')} deposit
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void downloadInvoice(b)}
                    disabled={downloadingInvoiceId === b.id}
                    className="rounded-lg border border-brand-200 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
                  >
                    {downloadingInvoiceId === b.id ? 'Preparing PDF…' : 'Download GST Invoice (PDF)'}
                  </button>
                </div>
              </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
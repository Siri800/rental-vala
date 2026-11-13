'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface AdminListing {
  id: string;
  title: string;
  status: string;
  city: string;
  category: { name: string };
  provider: { businessName: string };
  pricing: { dailyRate: string } | null;
}

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [listings, setListings] = useState<AdminListing[]>([]);

  const loadAdminData = () => {
    apiFetch<{ data: Record<string, unknown> }>('/admin/overview')
      .then((res) => setOverview(res.data))
      .catch(() => {});

    apiFetch<{ data: AdminListing[] }>('/admin/listings')
      .then((res) => setListings(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleListingStatus = async (id: string, status: 'PUBLISHED' | 'REJECTED') => {
    await apiFetch(`/admin/listings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    loadAdminData();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Super Admin Marketplace Console</h1>
        <p className="text-sm text-slate-500">
          Platform-wide KPIs, listing moderation, provider verification, and financial governance.
        </p>
      </div>

      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Customers', val: overview.totalCustomers },
            { label: 'Approved Providers', val: overview.totalProviders },
            { label: 'Active Listings', val: overview.activeListings },
            { label: 'Pending Approvals', val: overview.pendingListings },
            { label: 'Total Bookings', val: overview.totalBookings },
            { label: 'Active Rentals', val: overview.activeRentals },
            { label: 'Gross Booking Value', val: `₹${Number(overview.grossBookingValue || 0).toLocaleString('en-IN')}` },
            { label: 'Commission Revenue', val: `₹${Number(overview.commissionRevenue || 0).toLocaleString('en-IN')}` },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase">{kpi.label}</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{String(kpi.val ?? 0)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Listing Moderation Queue */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900">
          Marketplace Listings & Approval Queue
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Listing</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Provider</th>
                <th className="px-6 py-3">Daily Rate</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listings.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 font-semibold text-slate-900">{item.title}</td>
                  <td className="px-6 py-4 text-slate-600">{item.category.name}</td>
                  <td className="px-6 py-4 text-slate-600">{item.provider.businessName}</td>
                  <td className="px-6 py-4 font-semibold">
                    ₹{Number(item.pricing?.dailyRate ?? 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {item.status === 'PENDING_APPROVAL' && (
                      <button
                        onClick={() => handleListingStatus(item.id, 'PUBLISHED')}
                        className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg"
                      >
                        Approve & Publish
                      </button>
                    )}
                    {item.status === 'PENDING_APPROVAL' && (
                      <button
                        onClick={() => handleListingStatus(item.id, 'REJECTED')}
                        className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg"
                      >
                        Reject
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 text-white font-extrabold text-xl mb-3">
            <span className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-sm">
              RV
            </span>
            Rental Vala
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            India&apos;s trusted multi-vendor rental marketplace. Rent verified vehicles, cinema
            gear, appliances, furniture, and commercial spaces with escrow deposit protection.
          </p>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-3">
            Top Categories
          </h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><Link href="/search?category=vehicles" className="hover:text-white">Vehicles & Self-Drive</Link></li>
            <li><Link href="/search?category=electronics" className="hover:text-white">Cameras & Electronics</Link></li>
            <li><Link href="/search?category=furniture" className="hover:text-white">Home & Office Furniture</Link></li>
            <li><Link href="/search?category=event-party" className="hover:text-white">Event & Wedding Gear</Link></li>
            <li><Link href="/search?category=property-spaces" className="hover:text-white">Studios & Commercial Spaces</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-3">
            Marketplace Portals
          </h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><Link href="/dashboard/customer" className="hover:text-white">Customer Dashboard</Link></li>
            <li><Link href="/dashboard/provider" className="hover:text-white">Provider / Vendor Hub</Link></li>
            <li><Link href="/dashboard/admin" className="hover:text-white">Super Admin Console</Link></li>
            <li><Link href="/register?role=PROVIDER" className="hover:text-white">Become a Rental Provider</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-3">
            Trust & Safety
          </h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>100% KYC-Verified Providers</li>
            <li>Escrow-Protected Security Deposits</li>
            <li>OTP-Verified Handover & Return</li>
            <li>24/7 Dispute Resolution Desk</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800 py-5 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Rental Vala Technologies Pvt. Ltd. All rights reserved.
      </div>
    </footer>
  );
}
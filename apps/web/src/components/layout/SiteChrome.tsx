'use client';

import { usePathname } from 'next/navigation';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const standalonePage =
    pathname === '/login' || pathname === '/register' || pathname === '/admin/login';

  return (
    <>
      {!standalonePage && <Navbar />}
      <main className="flex-1">{children}</main>
      {!standalonePage && <Footer />}
    </>
  );
}

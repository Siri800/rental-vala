'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorizedPath, setAuthorizedPath] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('rv_access_token');
    if (!token) {
      const intendedPath = `${pathname}${window.location.search}`;
      router.replace(`/login?redirect=${encodeURIComponent(intendedPath)}`);
      setAuthorizedPath(null);
      return;
    }

    setAuthorizedPath(pathname);
  }, [pathname, router]);

  if (authorizedPath !== pathname) {
    return (
      <div className="mx-auto max-w-7xl p-12 text-center text-sm text-slate-500">
        Checking your session...
      </div>
    );
  }

  return children;
}

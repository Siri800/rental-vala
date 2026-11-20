import type { Metadata } from 'next';
import './globals.css';
import { SiteChrome } from '@/components/layout/SiteChrome';

export const metadata: Metadata = {
  title: 'Rental Vala | Rent Anything, Anywhere in India',
  description:
    'Multi-vendor online rental marketplace for vehicles, cameras, electronics, furniture, appliances, tools, event gear, fashion, and commercial spaces.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
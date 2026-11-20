import { HomeMarketplace } from '@/components/marketplace/HomeMarketplace';
import type { ListingSummary } from '@/components/marketplace/ListingCard';
import { API_BASE } from '@/lib/api';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  bannerUrl?: string | null;
  _count: { listings: number };
}

async function getHomeData() {
  try {
    const [categoryResponse, listingResponse] = await Promise.all([
      fetch(`${API_BASE}/categories`, { cache: 'no-store' }),
      fetch(`${API_BASE}/listings?limit=50`, { cache: 'no-store' }),
    ]);
    const categoryJson = categoryResponse.ok ? await categoryResponse.json() : { data: [] };
    const listingJson = listingResponse.ok ? await listingResponse.json() : { data: [] };
    const listings = (listingJson.data || []) as ListingSummary[];

    return {
      categories: (categoryJson.data || []) as CategoryItem[],
      appointments: listings.filter((listing) => listing.listingType === 'APPOINTMENT'),
      rentals: listings.filter(
        (listing) =>
          listing.listingType !== 'APPOINTMENT' &&
          (listing.inventoryItem?._count?.units ?? 0) > 0
      ),
    };
  } catch {
    return { categories: [], appointments: [], rentals: [] };
  }
}

export default async function HomePage() {
  const { categories, appointments, rentals } = await getHomeData();
  return <HomeMarketplace categories={categories} appointments={appointments} rentals={rentals} />;
}

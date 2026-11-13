import { Router } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '@rental-vala/database';
import { providerProfileSchema } from '@rental-vala/shared';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { ApiError } from '../../utils/ApiError';
import { getRouteParam } from '../../utils/routeParam';

export const providersRouter = Router();

providersRouter.get('/dashboard', authenticate, authorize('PROVIDER'), async (req, res, next) => {
  try {
    const provider = await prisma.providerProfile.findUnique({
      where: { userId: req.user!.userId },
      select: { id: true },
    });
    if (!provider) throw new ApiError(404, 'Provider profile not found.');

    const [listingCount, publishedListings, pendingListings, bookingCount, activeBookings, revenue, earnings] =
      await Promise.all([
        prisma.listing.count({ where: { providerId: provider.id, deletedAt: null } }),
        prisma.listing.count({ where: { providerId: provider.id, status: 'PUBLISHED' } }),
        prisma.listing.count({ where: { providerId: provider.id, status: 'PENDING_APPROVAL' } }),
        prisma.booking.count({ where: { providerId: provider.id } }),
        prisma.booking.count({
          where: {
            providerId: provider.id,
            status: { in: ['CONFIRMED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'ACTIVE'] },
          },
        }),
        prisma.bookingPriceBreakdown.aggregate({
          where: {
            booking: {
              providerId: provider.id,
              status: { notIn: ['CANCELLED', 'REFUNDED'] },
            },
          },
          _sum: { totalPayable: true },
        }),
        prisma.commission.aggregate({
          where: { booking: { providerId: provider.id } },
          _sum: { netProviderPayout: true },
        }),
      ]);

    res.json({
      success: true,
      data: {
        metrics: {
          totalListings: listingCount,
          activeListings: publishedListings,
          grossRevenue: Number(revenue._sum.totalPayable ?? 0),
          netEarnings: Number(earnings._sum.netProviderPayout ?? 0),
          listingCount,
          pendingListings,
          bookingCount,
          activeBookings,
          totalEarnings: Number(earnings._sum.netProviderPayout ?? 0),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

providersRouter.get('/me', authenticate, authorize('PROVIDER'), async (req, res, next) => {
  try {
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: req.user!.userId },
      select: {
        id: true,
        businessName: true,
        slug: true,
        ownerName: true,
        businessType: true,
        description: true,
        logoUrl: true,
        businessAddress: true,
        city: true,
        state: true,
        pinCode: true,
        verificationStatus: true,
        rejectionReason: true,
        averageRating: true,
        totalReviews: true,
        createdAt: true,
      },
    });
    if (!profile) throw new ApiError(404, 'Provider profile not found.');
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

providersRouter.post('/profile', authenticate, authorize('PROVIDER'), async (req, res, next) => {
  try {
    const data = providerProfileSchema.parse(req.body);
    const existing = await prisma.providerProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (existing) throw new ApiError(409, 'A provider profile already exists for this account.');

    const slug = `${data.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${randomUUID().slice(0, 8)}`;
    const profile = await prisma.providerProfile.create({
      data: { ...data, slug, userId: req.user!.userId },
      select: {
        id: true,
        businessName: true,
        slug: true,
        verificationStatus: true,
        createdAt: true,
      },
    });
    res.status(201).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

providersRouter.get('/:slug', async (req, res, next) => {
  try {
    const provider = await prisma.providerProfile.findFirst({
      where: { slug: getRouteParam(req.params.slug), verificationStatus: 'APPROVED' },
      select: {
        id: true,
        businessName: true,
        slug: true,
        description: true,
        logoUrl: true,
        city: true,
        state: true,
        averageRating: true,
        totalReviews: true,
        listings: {
          where: { status: 'PUBLISHED', deletedAt: null },
          select: {
            id: true,
            title: true,
            slug: true,
            city: true,
            averageRating: true,
            images: { orderBy: { displayOrder: 'asc' }, take: 1 },
            pricing: { select: { dailyRate: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!provider) throw new ApiError(404, 'Provider not found.');
    res.json({ success: true, data: provider });
  } catch (err) {
    next(err);
  }
});
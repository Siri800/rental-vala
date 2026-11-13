import { Router } from 'express';
import { BookingStatus, prisma } from '@rental-vala/database';
import { reviewCreateSchema } from '@rental-vala/shared';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { ApiError } from '../../utils/ApiError';
import { getRouteParam } from '../../utils/routeParam';

export const engagementRouter = Router();

engagementRouter.get('/wishlist', authenticate, authorize('CUSTOMER'), async (req, res, next) => {
  try {
    const wishlist = await prisma.wishlist.findUnique({
      where: { userId: req.user!.userId },
      include: {
        items: {
          include: {
            listing: {
              include: {
                category: { select: { name: true } },
                images: { orderBy: { displayOrder: 'asc' }, take: 1 },
                pricing: { select: { dailyRate: true } },
              },
            },
          },
          orderBy: { addedAt: 'desc' },
        },
      },
    });
    res.json({ success: true, data: wishlist?.items ?? [] });
  } catch (err) {
    next(err);
  }
});

engagementRouter.post('/wishlist/:listingId', authenticate, authorize('CUSTOMER'), async (req, res, next) => {
  try {
    const listing = await prisma.listing.findFirst({
      where: { id: getRouteParam(req.params.listingId), status: 'PUBLISHED', deletedAt: null },
      select: { id: true },
    });
    if (!listing) throw new ApiError(404, 'Listing not found.');

    const wishlist = await prisma.wishlist.upsert({
      where: { userId: req.user!.userId },
      create: { userId: req.user!.userId },
      update: {},
    });
    const item = await prisma.wishlistItem.upsert({
      where: { wishlistId_listingId: { wishlistId: wishlist.id, listingId: listing.id } },
      create: { wishlistId: wishlist.id, listingId: listing.id },
      update: {},
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

engagementRouter.delete('/wishlist/:listingId', authenticate, authorize('CUSTOMER'), async (req, res, next) => {
  try {
    const wishlist = await prisma.wishlist.findUnique({
      where: { userId: req.user!.userId },
      select: { id: true },
    });
    if (wishlist) {
      await prisma.wishlistItem.deleteMany({
        where: { wishlistId: wishlist.id, listingId: getRouteParam(req.params.listingId) },
      });
    }
    res.json({ success: true, message: 'Listing removed from wishlist.' });
  } catch (err) {
    next(err);
  }
});

engagementRouter.get('/notifications', authenticate, async (req, res, next) => {
  try {
    const requestedPage = Number(req.query.page);
    const requestedPageSize = Number(req.query.limit);
    const page =
      Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const pageSize =
      Number.isSafeInteger(requestedPageSize) && requestedPageSize > 0
        ? Math.min(50, requestedPageSize)
        : 20;
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where: { userId: req.user!.userId, isRead: false } }),
    ]);
    res.json({ success: true, data: notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

engagementRouter.patch('/notifications/:id/read', authenticate, async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { id: getRouteParam(req.params.id), userId: req.user!.userId },
      data: { isRead: true },
    });
    if (!result.count) throw new ApiError(404, 'Notification not found.');
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
});

engagementRouter.post('/reviews', authenticate, authorize('CUSTOMER'), async (req, res, next) => {
  try {
    const data = reviewCreateSchema.parse(req.body);
    const booking = await prisma.booking.findFirst({
      where: {
        id: data.bookingId,
        customerId: req.user!.userId,
        status: BookingStatus.COMPLETED,
      },
      include: { provider: { select: { id: true } }, items: { select: { listingId: true } } },
    });
    if (!booking || !booking.items[0]) {
      throw new ApiError(400, 'Only completed bookings can be reviewed.');
    }

    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          bookingId: booking.id,
          listingId: booking.items[0].listingId,
          customerId: req.user!.userId,
          overallRating: data.overallRating,
          productRating: data.productRating,
          providerRating: data.providerRating,
          comment: data.comment,
          photoUrls: data.photoUrls,
        },
      });

      const [listingRating, providerRating] = await Promise.all([
        tx.review.aggregate({
          where: { listingId: booking.items[0].listingId, isVisible: true },
          _avg: { overallRating: true },
          _count: { _all: true },
        }),
        tx.review.aggregate({
          where: {
            isVisible: true,
            booking: { providerId: booking.provider.id },
          },
          _avg: { providerRating: true },
          _count: { _all: true },
        }),
      ]);
      await Promise.all([
        tx.listing.update({
          where: { id: booking.items[0].listingId },
          data: {
            averageRating: listingRating._avg.overallRating ?? 0,
            totalReviews: listingRating._count._all,
          },
        }),
        tx.providerProfile.update({
          where: { id: booking.provider.id },
          data: {
            averageRating: providerRating._avg.providerRating ?? 0,
            totalReviews: providerRating._count._all,
          },
        }),
      ]);
      return created;
    });
    res.status(201).json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
});

engagementRouter.get('/listings/:listingId/reviews', async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { listingId: getRouteParam(req.params.listingId), isVisible: true },
      select: {
        id: true,
        overallRating: true,
        productRating: true,
        providerRating: true,
        comment: true,
        photoUrls: true,
        providerResponse: true,
        createdAt: true,
        customer: { select: { fullName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: reviews });
  } catch (err) {
    next(err);
  }
});
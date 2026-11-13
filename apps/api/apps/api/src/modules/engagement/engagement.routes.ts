import { Router } from 'express';
import { prisma, BookingStatus } from '@rental-vala/database';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { ApiError } from '../../utils/ApiError';

export const engagementRouter = Router();

// POST /api/v1/engagement/reviews - Submit Verified Review (Only for COMPLETED bookings)
engagementRouter.post('/reviews', authenticate, async (req, res, next) => {
  try {
    const { bookingId, overallRating, productRating, providerRating, comment, photoUrls } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { items: true },
    });

    if (!booking || booking.customerId !== req.user!.userId) {
      throw new ApiError(404, 'Booking not found.');
    }
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new ApiError(400, 'You can only review completed rentals.');
    }

    const listingId = booking.items[0].listingId;

    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          bookingId: booking.id,
          listingId,
          customerId: req.user!.userId,
          overallRating: Number(overallRating),
          productRating: Number(productRating),
          providerRating: Number(providerRating),
          comment,
          photoUrls: photoUrls ?? [],
        },
      });

      // Recalculate Listing & Provider aggregate ratings
      const listingAgg = await tx.review.aggregate({
        where: { listingId, isVisible: true },
        _avg: { productRating: true },
        _count: { _all: true },
      });

      await tx.listing.update({
        where: { id: listingId },
        data: {
          averageRating: listingAgg._avg.productRating ?? 0,
          totalReviews: listingAgg._count._all,
        },
      });

      return created;
    });

    res.status(201).json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/engagement/wishlist - Customer's Saved Wishlist
engagementRouter.get('/wishlist', authenticate, async (req, res, next) => {
  try {
    const wishlist = await prisma.wishlist.upsert({
      where: { userId: req.user!.userId },
      update: {},
      create: { userId: req.user!.userId },
      include: {
        items: {
          include: {
            listing: {
              include: { pricing: true, images: { take: 1 }, provider: { select: { businessName: true } } },
            },
          },
        },
      },
    });
    res.json({ success: true, data: wishlist.items });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/engagement/wishlist/toggle - Toggle Listing in Wishlist
engagementRouter.post('/wishlist/toggle', authenticate, async (req, res, next) => {
  try {
    const { listingId } = req.body as { listingId: string };
    const wishlist = await prisma.wishlist.upsert({
      where: { userId: req.user!.userId },
      update: {},
      create: { userId: req.user!.userId },
    });

    const existing = await prisma.wishlistItem.findUnique({
      where: { wishlistId_listingId: { wishlistId: wishlist.id, listingId } },
    });

    if (existing) {
      await prisma.wishlistItem.delete({ where: { id: existing.id } });
      return res.json({ success: true, saved: false });
    }

    await prisma.wishlistItem.create({
      data: { wishlistId: wishlist.id, listingId },
    });
    res.json({ success: true, saved: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/engagement/notifications - User Notifications
engagementRouter.get('/notifications', authenticate, async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/engagement/conversations - Start or get conversation with Provider
engagementRouter.post('/conversations', authenticate, async (req, res, next) => {
  try {
    const { recipientUserId, listingId, bookingId, initialMessage } = req.body as {
      recipientUserId: string;
      listingId?: string;
      bookingId?: string;
      initialMessage: string;
    };

    const conversation = await prisma.conversation.create({
      data: {
        listingId,
        bookingId,
        participants: {
          create: [{ userId: req.user!.userId }, { userId: recipientUserId }],
        },
        messages: {
          create: [{ senderId: req.user!.userId, body: initialMessage }],
        },
      },
      include: { messages: true },
    });

    res.status(201).json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/engagement/conversations - List User Conversations
engagementRouter.get('/conversations', authenticate, async (req, res, next) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { participants: { some: { userId: req.user!.userId } } },
      orderBy: { updatedAt: 'desc' },
      include: {
        participants: { include: { user: { select: { id: true, fullName: true, avatarUrl: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    res.json({ success: true, data: conversations });
  } catch (err) {
    next(err);
  }
});
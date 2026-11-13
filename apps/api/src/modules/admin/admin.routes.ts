import { Router } from 'express';
import {
  BookingStatus,
  DisputeStatus,
  ListingStatus,
  ProviderVerificationStatus,
  prisma,
} from '@rental-vala/database';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { ApiError } from '../../utils/ApiError';
import { getRouteParam } from '../../utils/routeParam';

export const adminRouter = Router();

adminRouter.use(
  authenticate,
  authorize('SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN', 'CONTENT_ADMIN', 'SUPPORT_ADMIN')
);

adminRouter.get(
  '/overview',
  authorize('OPERATIONS_ADMIN', 'FINANCE_ADMIN', 'CONTENT_ADMIN'),
  async (_req, res, next) => {
  try {
    const [
      totalCustomers,
      totalProviders,
      activeListings,
      pendingListings,
      totalBookings,
      activeRentals,
      bookingValue,
      commissionRevenue,
    ] = await Promise.all([
      prisma.user.count({ where: { roles: { some: { role: { name: 'CUSTOMER' } } }, deletedAt: null } }),
      prisma.providerProfile.count({ where: { verificationStatus: 'APPROVED' } }),
      prisma.listing.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
      prisma.listing.count({ where: { status: 'PENDING_APPROVAL', deletedAt: null } }),
      prisma.booking.count(),
      prisma.booking.count({
        where: {
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.READY_FOR_PICKUP, BookingStatus.OUT_FOR_DELIVERY, BookingStatus.ACTIVE] },
        },
      }),
      prisma.bookingPriceBreakdown.aggregate({
        where: { booking: { status: { notIn: [BookingStatus.CANCELLED, BookingStatus.REFUNDED] } } },
        _sum: { totalPayable: true },
      }),
      prisma.commission.aggregate({ _sum: { commissionAmount: true } }),
    ]);

    res.json({
      success: true,
      data: {
        totalCustomers,
        totalProviders,
        activeListings,
        pendingListings,
        totalBookings,
        activeRentals,
        grossBookingValue: Number(bookingValue._sum.totalPayable ?? 0),
        commissionRevenue: Number(commissionRevenue._sum.commissionAmount ?? 0),
      },
    });
  } catch (err) {
    next(err);
  }
  }
);

adminRouter.get('/listings', authorize('OPERATIONS_ADMIN', 'CONTENT_ADMIN'), async (req, res, next) => {
  try {
    const status =
      typeof req.query.status === 'string' &&
      Object.values(ListingStatus).includes(req.query.status as ListingStatus)
        ? (req.query.status as ListingStatus)
        : undefined;
    const listings = await prisma.listing.findMany({
      where: { ...(status ? { status } : {}), deletedAt: null },
      include: {
        category: { select: { name: true } },
        provider: { select: { businessName: true } },
        pricing: { select: { dailyRate: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      take: 100,
    });
    res.json({ success: true, data: listings });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/listings/:id/status', authorize('CONTENT_ADMIN'), async (req, res, next) => {
  try {
    const status = req.body?.status;
    if (status !== ListingStatus.PUBLISHED && status !== ListingStatus.REJECTED) {
      throw new ApiError(400, 'Listing status must be PUBLISHED or REJECTED.');
    }
    const listingId = getRouteParam(req.params.id);
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || listing.deletedAt) throw new ApiError(404, 'Listing not found.');
    if (listing.status !== ListingStatus.PENDING_APPROVAL) {
      throw new ApiError(400, 'Only listings awaiting moderation can be reviewed.');
    }
    const rejectionReason =
      status === ListingStatus.REJECTED && typeof req.body?.reason === 'string'
        ? req.body.reason.trim().slice(0, 1000) || 'Rejected during moderation.'
        : status === ListingStatus.REJECTED
          ? 'Rejected during moderation.'
          : null;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.listing.update({
        where: { id: listing.id },
        data: { status, rejectionReason },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user!.userId,
          action: status === ListingStatus.PUBLISHED ? 'LISTING_APPROVED' : 'LISTING_REJECTED',
          entityType: 'Listing',
          entityId: listing.id,
          beforeJson: { status: listing.status },
          afterJson: { status, rejectionReason },
        },
      });
      return result;
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/providers', authorize('OPERATIONS_ADMIN'), async (req, res, next) => {
  try {
    const providers = await prisma.providerProfile.findMany({
      where: {
        ...(typeof req.query.status === 'string' &&
        Object.values(ProviderVerificationStatus).includes(req.query.status as ProviderVerificationStatus)
          ? { verificationStatus: req.query.status as ProviderVerificationStatus }
          : {}),
      },
      select: {
        id: true,
        businessName: true,
        ownerName: true,
        city: true,
        state: true,
        verificationStatus: true,
        rejectionReason: true,
        createdAt: true,
        user: { select: { id: true, email: true, phone: true } },
        documents: { select: { id: true, documentType: true, fileName: true, status: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.json({ success: true, data: providers });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch(
  '/providers/:id/verification',
  authorize('OPERATIONS_ADMIN'),
  async (req, res, next) => {
    try {
      const status = req.body?.status;
      if (
        status !== ProviderVerificationStatus.APPROVED &&
        status !== ProviderVerificationStatus.REJECTED &&
        status !== ProviderVerificationStatus.UNDER_REVIEW &&
        status !== ProviderVerificationStatus.SUSPENDED
      ) {
        throw new ApiError(400, 'A valid provider verification status is required.');
      }
      const providerId = getRouteParam(req.params.id);
      const provider = await prisma.providerProfile.findUnique({ where: { id: providerId } });
      if (!provider) throw new ApiError(404, 'Provider not found.');
      const rejectionReason =
        status === ProviderVerificationStatus.REJECTED && typeof req.body?.reason === 'string'
          ? req.body.reason.trim().slice(0, 1000)
          : null;
      if (status === ProviderVerificationStatus.REJECTED && !rejectionReason) {
        throw new ApiError(400, 'A reason is required when rejecting a provider.');
      }

      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.providerProfile.update({
          where: { id: provider.id },
          data: {
            verificationStatus: status,
            rejectionReason,
            verifiedAt: status === ProviderVerificationStatus.APPROVED ? new Date() : null,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: req.user!.userId,
            action: `PROVIDER_${status}`,
            entityType: 'ProviderProfile',
            entityId: provider.id,
            beforeJson: { verificationStatus: provider.verificationStatus },
            afterJson: { verificationStatus: status, rejectionReason },
          },
        });
        return result;
      });
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get('/disputes', authorize('OPERATIONS_ADMIN', 'SUPPORT_ADMIN'), async (_req, res, next) => {
  try {
    const disputes = await prisma.dispute.findMany({
      include: {
        booking: { select: { id: true, bookingNumber: true, status: true } },
        raisedBy: { select: { id: true, fullName: true, email: true } },
        evidence: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    res.json({ success: true, data: disputes });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/disputes/:id/resolve', authorize('OPERATIONS_ADMIN'), async (req, res, next) => {
  try {
    const statuses = [
      DisputeStatus.RESOLVED_CUSTOMER_FAVOR,
      DisputeStatus.RESOLVED_PROVIDER_FAVOR,
      DisputeStatus.RESOLVED_SPLIT,
      DisputeStatus.CLOSED,
    ];
    const status = req.body?.status;
    if (!statuses.includes(status)) throw new ApiError(400, 'A final dispute status is required.');
    if (typeof req.body?.resolutionNotes !== 'string' || !req.body.resolutionNotes.trim()) {
      throw new ApiError(400, 'Resolution notes are required.');
    }
    const disputeId = getRouteParam(req.params.id);
    const result = await prisma.dispute.updateMany({
      where: { id: disputeId, status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] } },
      data: {
        status,
        resolutionNotes: req.body.resolutionNotes.trim().slice(0, 3000),
        settledAmount:
          typeof req.body.settledAmount === 'number' && req.body.settledAmount >= 0
            ? req.body.settledAmount
            : undefined,
        resolvedById: req.user!.userId,
        resolvedAt: new Date(),
      },
    });
    if (!result.count) throw new ApiError(404, 'Open dispute not found.');
    const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
    res.json({ success: true, data: dispute });
  } catch (err) {
    next(err);
  }
});
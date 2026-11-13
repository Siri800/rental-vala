import { Router } from 'express';
import crypto from 'crypto';
import { prisma, ListingStatus, PayoutStatus, LedgerEntryType } from '@rental-vala/database';
import { authenticate, authorize } from '../../middleware/auth.middleware';

export const adminRouter = Router();

adminRouter.use(authenticate);

// GET /api/v1/admin/overview - Executive Marketplace KPIs
adminRouter.get(
  '/overview',
  authorize('SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN'),
  async (_req, res, next) => {
    try {
      const [
        totalCustomers,
        totalProviders,
        pendingProviders,
        totalListings,
        pendingListings,
        activeListings,
        totalBookings,
        activeRentals,
        completedRentals,
        openDisputes,
        openTickets,
        revenueAgg,
      ] = await Promise.all([
        prisma.customerProfile.count(),
        prisma.providerProfile.count(),
        prisma.providerProfile.count({ where: { verificationStatus: { in: ['PENDING', 'UNDER_REVIEW'] } } }),
        prisma.listing.count({ where: { deletedAt: null } }),
        prisma.listing.count({ where: { status: 'PENDING_APPROVAL', deletedAt: null } }),
        prisma.listing.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
        prisma.booking.count(),
        prisma.booking.count({ where: { status: 'ACTIVE' } }),
        prisma.booking.count({ where: { status: 'COMPLETED' } }),
        prisma.dispute.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
        prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
        prisma.commission.aggregate({
          _sum: {
            grossRentalAmount: true,
            commissionAmount: true,
            netProviderPayout: true,
          },
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalCustomers,
          totalProviders,
          pendingProviders,
          totalListings,
          pendingListings,
          activeListings,
          totalBookings,
          activeRentals,
          completedRentals,
          openDisputes,
          openTickets,
          grossBookingValue: revenueAgg._sum.grossRentalAmount ?? 0,
          commissionRevenue: revenueAgg._sum.commissionAmount ?? 0,
          totalProviderEarnings: revenueAgg._sum.netProviderPayout ?? 0,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/admin/providers - Manage & Verify Providers
adminRouter.get('/providers', authorize('SUPER_ADMIN', 'OPERATIONS_ADMIN'), async (_req, res, next) => {
  try {
    const providers = await prisma.providerProfile.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true, phone: true, fullName: true } },
        _count: { select: { listings: true, bookings: true } },
      },
    });
    res.json({ success: true, data: providers });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/listings - Manage & Approve Listings
adminRouter.get('/listings', authorize('SUPER_ADMIN', 'OPERATIONS_ADMIN', 'CONTENT_ADMIN'), async (_req, res, next) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { name: true } },
        provider: { select: { businessName: true, city: true } },
        pricing: true,
        images: { take: 1 },
      },
    });
    res.json({ success: true, data: listings });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/admin/listings/:id/status - Approve or Reject Listing
adminRouter.patch(
  '/listings/:id/status',
  authorize('SUPER_ADMIN', 'OPERATIONS_ADMIN', 'CONTENT_ADMIN'),
  async (req, res, next) => {
    try {
      const { status, rejectionReason } = req.body as {
        status: ListingStatus;
        rejectionReason?: string;
      };

      const listing = await prisma.$transaction(async (tx) => {
        const updated = await tx.listing.update({
          where: { id: req.params.id },
          data: {
            status,
            rejectionReason: status === 'REJECTED' ? rejectionReason : null,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: req.user!.userId,
            action: `LISTING_${status}`,
            entityType: 'Listing',
            entityId: updated.id,
            afterJson: { status, rejectionReason },
          },
        });

        return updated;
      });

      res.json({ success: true, data: listing });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/admin/payouts/settle/:providerId - Settle Unpaid Provider Commissions
adminRouter.post(
  '/payouts/settle/:providerId',
  authorize('SUPER_ADMIN', 'FINANCE_ADMIN'),
  async (req, res, next) => {
    try {
      const unpaidCommissions = await prisma.commission.findMany({
        where: {
          isSettled: false,
          booking: { providerId: req.params.providerId },
        },
      });

      if (unpaidCommissions.length === 0) {
        return res.json({ success: true, message: 'No unsettled commissions for this provider.' });
      }

      const totalPayout = unpaidCommissions.reduce(
        (sum, item) => sum + Number(item.netProviderPayout),
        0
      );

      const payout = await prisma.$transaction(async (tx) => {
        const created = await tx.providerPayout.create({
          data: {
            providerId: req.params.providerId,
            payoutReference: `PO-${Date.now()}-${crypto.randomInt(100, 999)}`,
            amount: totalPayout,
            status: PayoutStatus.PAID,
            processedAt: new Date(),
          },
        });

        await tx.commission.updateMany({
          where: { id: { in: unpaidCommissions.map((c) => c.id) } },
          data: { isSettled: true, payoutId: created.id },
        });

        await tx.financialLedger.create({
          data: {
            providerId: req.params.providerId,
            entryType: LedgerEntryType.PAYOUT_DISBURSEMENT,
            amount: totalPayout,
            direction: 'DEBIT',
            referenceId: created.payoutReference,
            description: `Bank settlement disbursed (${created.payoutReference})`,
          },
        });

        return created;
      });

      res.json({ success: true, data: payout });
    } catch (err) {
      next(err);
    }
  }
);
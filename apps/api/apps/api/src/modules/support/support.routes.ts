import { Router } from 'express';
import crypto from 'crypto';
import { prisma, DisputeStatus, TicketStatus } from '@rental-vala/database';
import { authenticate, authorize } from '../../middleware/auth.middleware';

export const supportRouter = Router();

// POST /api/v1/support/tickets - Create Support Ticket
supportRouter.post('/tickets', authenticate, async (req, res, next) => {
  try {
    const { bookingId, issueCategory, subject, description, priority = 'MEDIUM' } = req.body;
    const ticketNumber = `TKT-${crypto.randomInt(100000, 999999)}`;

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId: req.user!.userId,
        bookingId,
        issueCategory,
        subject,
        description,
        priority,
        messages: {
          create: [{ senderId: req.user!.userId, message: description }],
        },
      },
    });

    res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/support/tickets - List User's Tickets (or All Tickets for Support/Super Admin)
supportRouter.get('/tickets', authenticate, async (req, res, next) => {
  try {
    const isAdmin = req.user!.roles.some((r) => ['SUPER_ADMIN', 'SUPPORT_ADMIN'].includes(r));
    const tickets = await prisma.supportTicket.findMany({
      where: isAdmin ? {} : { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true, email: true } }, messages: true },
    });
    res.json({ success: true, data: tickets });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/support/disputes - Raise Rental Dispute
supportRouter.post('/disputes', authenticate, async (req, res, next) => {
  try {
    const { bookingId, disputeType, description, claimedAmount = 0, evidenceUrls = [] } = req.body;
    const disputeNumber = `DSP-${crypto.randomInt(100000, 999999)}`;

    const dispute = await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'DISPUTED' },
      });

      return tx.dispute.create({
        data: {
          disputeNumber,
          bookingId,
          raisedById: req.user!.userId,
          disputeType,
          description,
          claimedAmount,
          evidence: {
            create: (evidenceUrls as string[]).map((url) => ({
              uploadedById: req.user!.userId,
              fileUrl: url,
            })),
          },
        },
      });
    });

    res.status(201).json({ success: true, data: dispute });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/support/disputes/:id/resolve - Admin Dispute Resolution
supportRouter.patch(
  '/disputes/:id/resolve',
  authenticate,
  authorize('SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN'),
  async (req, res, next) => {
    try {
      const { status, settledAmount, resolutionNotes } = req.body as {
        status: DisputeStatus;
        settledAmount: number;
        resolutionNotes: string;
      };

      const resolved = await prisma.dispute.update({
        where: { id: req.params.id },
        data: {
          status,
          settledAmount,
          resolutionNotes,
          resolvedById: req.user!.userId,
          resolvedAt: new Date(),
        },
      });

      res.json({ success: true, data: resolved });
    } catch (err) {
      next(err);
    }
  }
);
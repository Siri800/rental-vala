import { Router } from 'express';
import { randomUUID } from 'crypto';
import { TicketStatus, prisma } from '@rental-vala/database';
import { supportMessageSchema, supportTicketCreateSchema } from '@rental-vala/shared';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { ApiError } from '../../utils/ApiError';
import { getRouteParam } from '../../utils/routeParam';

export const supportRouter = Router();

supportRouter.post('/tickets', authenticate, async (req, res, next) => {
  try {
    const data = supportTicketCreateSchema.parse(req.body);
    if (data.bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: data.bookingId },
        include: { provider: { select: { userId: true } } },
      });
      if (
        !booking ||
        (booking.customerId !== req.user!.userId && booking.provider.userId !== req.user!.userId)
      ) {
        throw new ApiError(404, 'Booking not found.');
      }
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber: `RV-SUP-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
        userId: req.user!.userId,
        bookingId: data.bookingId,
        issueCategory: data.issueCategory,
        subject: data.subject,
        description: data.description,
        priority: data.priority,
        messages: {
          create: {
            senderId: req.user!.userId,
            message: data.description,
          },
        },
      },
      include: { messages: true },
    });
    res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
});

supportRouter.get('/tickets/my', authenticate, async (req, res, next) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.user!.userId },
      include: {
        messages: {
          where: { isInternalNote: false },
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, fullName: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: tickets });
  } catch (err) {
    next(err);
  }
});

supportRouter.post('/tickets/:id/messages', authenticate, async (req, res, next) => {
  try {
    const data = supportMessageSchema.parse(req.body);
    const isSupportStaff = req.user!.roles.some((role) =>
      ['SUPPORT_ADMIN', 'SUPER_ADMIN'].includes(role)
    );
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: getRouteParam(req.params.id) },
    });
    if (!ticket || (ticket.userId !== req.user!.userId && !isSupportStaff)) {
      throw new ApiError(404, 'Support ticket not found.');
    }
    if (ticket.status === TicketStatus.CLOSED) {
      throw new ApiError(400, 'This ticket is closed.');
    }

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: req.user!.userId,
          message: data.message,
          attachmentUrls: data.attachmentUrls,
          isInternalNote: isSupportStaff && req.body?.isInternalNote === true,
        },
      });
      await tx.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: isSupportStaff ? TicketStatus.IN_PROGRESS : TicketStatus.OPEN,
        },
      });
      return created;
    });
    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
});

supportRouter.get(
  '/tickets',
  authenticate,
  authorize('SUPPORT_ADMIN'),
  async (req, res, next) => {
    try {
      const status =
        typeof req.query.status === 'string' &&
        Object.values(TicketStatus).includes(req.query.status as TicketStatus)
          ? (req.query.status as TicketStatus)
          : undefined;
      const tickets = await prisma.supportTicket.findMany({
        where: status ? { status } : undefined,
        include: {
          user: { select: { id: true, fullName: true, email: true, phone: true } },
          messages: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        take: 100,
      });
      res.json({ success: true, data: tickets });
    } catch (err) {
      next(err);
    }
  }
);

supportRouter.patch(
  '/tickets/:id/status',
  authenticate,
  authorize('SUPPORT_ADMIN'),
  async (req, res, next) => {
    try {
      const statuses = Object.values(TicketStatus);
      if (!statuses.includes(req.body?.status)) {
        throw new ApiError(400, 'A valid ticket status is required.');
      }
      const result = await prisma.supportTicket.updateMany({
        where: { id: getRouteParam(req.params.id) },
        data: { status: req.body.status as TicketStatus },
      });
      if (!result.count) throw new ApiError(404, 'Support ticket not found.');
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: getRouteParam(req.params.id) },
      });
      res.json({ success: true, data: ticket });
    } catch (err) {
      next(err);
    }
  }
);
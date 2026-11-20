import { Router } from 'express';
import crypto from 'crypto';
import {
  BookingStatus,
  DepositStatus,
  LedgerEntryType,
  Prisma,
  PaymentStatus,
  prisma,
} from '@rental-vala/database';
import { authenticate } from '../../middleware/auth.middleware';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { createPaymentOrder } from './payment-order.service';

export const paymentsRouter = Router();

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

interface CapturedPaymentInput {
  paymentId: string;
  gatewayPaymentId: string;
  gatewaySignature?: string;
  gatewayEventId: string;
  eventType: string;
  rawPayload: Prisma.InputJsonValue;
  changedById?: string;
}

async function recordCapturedPayment(
  tx: Prisma.TransactionClient,
  input: CapturedPaymentInput
): Promise<void> {
  const duplicateEvent = await tx.paymentTransaction.findUnique({
    where: { gatewayEventId: input.gatewayEventId },
    select: { id: true },
  });
  if (duplicateEvent) return;

  const payment = await tx.payment.findUniqueOrThrow({
    where: { id: input.paymentId },
    include: { booking: { include: { priceBreakdown: true } } },
  });
  if (
    payment.status !== PaymentStatus.CREATED &&
    payment.status !== PaymentStatus.AUTHORIZED &&
    payment.status !== PaymentStatus.FAILED &&
    payment.status !== PaymentStatus.CAPTURED
  ) {
    throw new ApiError(409, 'Payment order is no longer payable.');
  }

  if (payment.status !== PaymentStatus.CAPTURED) {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        gatewayPaymentId: input.gatewayPaymentId,
        gatewaySignature: input.gatewaySignature,
        status: PaymentStatus.CAPTURED,
        paidAt: new Date(),
      },
    });
  }
  await tx.paymentTransaction.create({
    data: {
      paymentId: payment.id,
      eventType: input.eventType,
      gatewayEventId: input.gatewayEventId,
      rawPayload: input.rawPayload,
    },
  });

  const booking = payment.booking;
  const wasAwaitingPayment = booking.status === BookingStatus.PAYMENT_PENDING;
  if (!wasAwaitingPayment && booking.status !== BookingStatus.CONFIRMED) {
    throw new ApiError(409, 'Booking is no longer awaiting payment.');
  }
  if (wasAwaitingPayment) {
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CONFIRMED,
        confirmedAt: new Date(),
        statusHistory: {
          create: {
            fromStatus: booking.status,
            toStatus: BookingStatus.CONFIRMED,
            changedById: input.changedById,
            reason: 'Payment verified',
          },
        },
      },
    });
  }

  const heldAmount = Number(booking.priceBreakdown?.securityDeposit ?? 0);
  if (heldAmount > 0) {
    const deposit = await tx.securityDeposit.findUnique({
      where: { bookingId: booking.id },
      select: { id: true },
    });
    if (!deposit) {
      await tx.securityDeposit.create({
        data: { bookingId: booking.id, heldAmount, status: DepositStatus.HELD },
      });
    }

    const depositLedger = await tx.financialLedger.findFirst({
      where: { bookingId: booking.id, entryType: LedgerEntryType.SECURITY_DEPOSIT_HOLD },
      select: { id: true },
    });
    if (!depositLedger) {
      await tx.financialLedger.create({
        data: {
          bookingId: booking.id,
          providerId: booking.providerId,
          entryType: LedgerEntryType.SECURITY_DEPOSIT_HOLD,
          amount: heldAmount,
          direction: 'CREDIT',
          description: `Security deposit held for ${booking.bookingNumber}`,
        },
      });
    }
  }

  const escrowAmount = Math.max(
    0,
    Number(booking.priceBreakdown?.totalPayable ?? payment.amount) - heldAmount
  );
  const escrowEntry = await tx.financialLedger.findFirst({
    where: { bookingId: booking.id, entryType: LedgerEntryType.BOOKING_PAYMENT_CREDIT },
    select: { id: true },
  });
  if (!escrowEntry && escrowAmount > 0) {
    await tx.financialLedger.create({
      data: {
        bookingId: booking.id,
        providerId: booking.providerId,
        entryType: LedgerEntryType.BOOKING_PAYMENT_CREDIT,
        amount: escrowAmount,
        direction: 'CREDIT',
        description: `Payment held in platform escrow for ${booking.bookingNumber}`,
        referenceId: input.gatewayPaymentId,
      },
    });
  }

  if (wasAwaitingPayment) {
    await tx.notification.create({
      data: {
        userId: booking.customerId,
        type: 'BOOKING_CONFIRMED',
        title: 'Booking confirmed',
        message: `Payment received for booking ${booking.bookingNumber}.`,
        actionUrl: '/dashboard/customer',
      },
    });
  }
}

paymentsRouter.post('/create-order', authenticate, async (req, res, next) => {
  try {
    const bookingId = typeof req.body?.bookingId === 'string' ? req.body.bookingId : '';
    if (!bookingId) throw new ApiError(400, 'Booking ID is required.');

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: {
          id: bookingId,
          customerId: req.user!.userId,
          status: BookingStatus.PAYMENT_PENDING,
        },
        include: { priceBreakdown: true },
      });
      if (!booking || !booking.priceBreakdown) {
        throw new ApiError(404, 'Payable booking not found.');
      }
      if (booking.paymentExpiresAt && booking.paymentExpiresAt < new Date()) {
        throw new ApiError(400, 'The payment window has expired. Please create a new booking.');
      }

      const existing = await tx.payment.findFirst({
        where: {
          bookingId: booking.id,
          status: { in: [PaymentStatus.CREATED, PaymentStatus.AUTHORIZED] },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        return {
          statusCode: 200,
          order: {
            orderId: existing.gatewayOrderId,
            amount: Number(existing.amount),
            currency: existing.currency,
            keyId: existing.gateway === 'RAZORPAY' ? env.RAZORPAY_KEY_ID || undefined : undefined,
            sandboxMode: existing.gateway === 'SANDBOX',
          },
        };
      }

      return {
        statusCode: 201,
        order: await createPaymentOrder(tx, {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          amount: Number(booking.priceBreakdown.totalPayable),
          currency: booking.priceBreakdown.currency,
        }),
      };
    });

    res.status(result.statusCode).json({ success: true, data: result.order });
  } catch (err) {
    next(err);
  }
});

paymentsRouter.post('/verify', authenticate, async (req, res, next) => {
  try {
    const body =
      typeof req.body === 'object' && req.body !== null && !Array.isArray(req.body)
        ? (req.body as Record<string, unknown>)
        : {};
    const orderId = body.razorpay_order_id ?? body.orderId;
    const paymentId = body.razorpay_payment_id ?? body.paymentId;
    const signature = body.razorpay_signature ?? body.signature;
    if (
      typeof orderId !== 'string' ||
      typeof paymentId !== 'string' ||
      typeof signature !== 'string' ||
      !orderId ||
      !paymentId ||
      !signature
    ) {
      throw new ApiError(400, 'Order ID, payment ID, and signature are required.');
    }

    const payment = await prisma.payment.findUnique({
      where: { gatewayOrderId: orderId },
      include: { booking: { include: { priceBreakdown: true } } },
    });
    if (!payment || payment.booking.customerId !== req.user!.userId) {
      throw new ApiError(404, 'Payment order not found.');
    }
    if (payment.gateway === 'SANDBOX') {
      if (env.NODE_ENV === 'production') {
        throw new ApiError(503, 'Sandbox payments are disabled in production.');
      }
      if (signature !== 'sandbox_verified') throw new ApiError(400, 'Invalid sandbox payment signature.');
    } else {
      if (
        !env.RAZORPAY_KEY_SECRET ||
        /placeholder|your[_ -]?secret|replace[_ -]?me/i.test(env.RAZORPAY_KEY_SECRET)
      ) {
        throw new ApiError(503, 'Payment gateway is not configured.');
      }
      const expected = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
      if (!safeEqual(expected, signature)) throw new ApiError(400, 'Payment signature verification failed.');
    }

    await prisma.$transaction(async (tx) => {
      await recordCapturedPayment(tx, {
        paymentId: payment.id,
        gatewayPaymentId: paymentId,
        gatewaySignature: signature,
        gatewayEventId: `checkout:${paymentId}`,
        eventType: 'payment.captured',
        rawPayload: { orderId, paymentId },
        changedById: req.user!.userId,
      });
    });

    res.json({ success: true, message: 'Payment verified successfully.' });
  } catch (err) {
    next(err);
  }
});

paymentsRouter.post('/webhook', async (req, res, next) => {
  try {
    const rawBody = req.body;
    if (!Buffer.isBuffer(rawBody)) {
      throw new ApiError(400, 'Expected a raw JSON webhook body.');
    }
    if (
      !env.RAZORPAY_WEBHOOK_SECRET ||
      /placeholder|your[_ -]?secret|replace[_ -]?me/i.test(env.RAZORPAY_WEBHOOK_SECRET)
    ) {
      throw new ApiError(503, 'Razorpay webhook verification is not configured.');
    }

    const signature = req.get('x-razorpay-signature') || '';
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');
    if (!safeEqual(expected, signature)) {
      throw new ApiError(400, 'Razorpay webhook signature verification failed.');
    }

    interface RazorpayWebhookPayload {
      event?: string;
      created_at?: number;
      payload?: {
        payment?: {
          entity?: { id?: string; order_id?: string; amount?: number; currency?: string };
        };
      };
    }
    let rawPayload: Prisma.InputJsonValue;
    try {
      rawPayload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new ApiError(400, 'Razorpay webhook body is not valid JSON.');
    }
    if (rawPayload === null || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
      throw new ApiError(400, 'Razorpay webhook body must be a JSON object.');
    }
    const payload = rawPayload as RazorpayWebhookPayload;
    const eventType = payload.event;
    if (eventType !== 'payment.captured' && eventType !== 'order.paid') {
      res.json({ success: true, ignored: true });
      return;
    }

    const paymentEntity = payload.payload?.payment?.entity;
    if (
      !paymentEntity?.id ||
      !paymentEntity.order_id ||
      typeof paymentEntity.amount !== 'number'
    ) {
      throw new ApiError(400, 'Razorpay webhook is missing payment details.');
    }

    const gatewayEventId =
      req.get('x-razorpay-event-id') ||
      `${eventType}:${paymentEntity.id}:${payload.created_at ?? 'unknown'}`;
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { gateway: 'RAZORPAY', gatewayOrderId: paymentEntity.order_id },
        select: { id: true, amount: true, currency: true },
      });
      if (!payment) {
        console.warn(`[Razorpay webhook] Unknown order ${paymentEntity.order_id}`);
        return;
      }

      if (
        paymentEntity.amount !== Math.round(Number(payment.amount) * 100) ||
        (paymentEntity.currency && paymentEntity.currency !== payment.currency)
      ) {
        throw new ApiError(400, 'Razorpay webhook amount does not match the payment order.');
      }

      await recordCapturedPayment(tx, {
        paymentId: payment.id,
        gatewayPaymentId: paymentEntity.id!,
        gatewayEventId,
        eventType,
        rawPayload,
      });
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

paymentsRouter.get('/my', authenticate, async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { booking: { customerId: req.user!.userId } },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethod: true,
        paidAt: true,
        createdAt: true,
        booking: { select: { id: true, bookingNumber: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: payments });
  } catch (err) {
    next(err);
  }
});
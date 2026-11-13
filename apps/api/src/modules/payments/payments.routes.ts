import { Router } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import {
  BookingStatus,
  DepositStatus,
  LedgerEntryType,
  PaymentStatus,
  prisma,
} from '@rental-vala/database';
import { authenticate } from '../../middleware/auth.middleware';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';

export const paymentsRouter = Router();

function razorpayClient(): Razorpay | null {
  if (!env.RAZORPAY_KEY_ID && !env.RAZORPAY_KEY_SECRET) {
    if (env.NODE_ENV === 'production') {
      throw new ApiError(503, 'Payment gateway is not configured.');
    }
    return null;
  }
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new ApiError(503, 'Payment gateway configuration is incomplete.');
  }
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

paymentsRouter.post('/create-order', authenticate, async (req, res, next) => {
  try {
    const bookingId = typeof req.body?.bookingId === 'string' ? req.body.bookingId : '';
    if (!bookingId) throw new ApiError(400, 'Booking ID is required.');

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        customerId: req.user!.userId,
        status: BookingStatus.PAYMENT_PENDING,
      },
      include: { priceBreakdown: true },
    });
    if (!booking || !booking.priceBreakdown) throw new ApiError(404, 'Payable booking not found.');
    if (booking.paymentExpiresAt && booking.paymentExpiresAt < new Date()) {
      throw new ApiError(400, 'The payment window has expired. Please create a new booking.');
    }

    const existing = await prisma.payment.findFirst({
      where: { bookingId: booking.id, status: { in: [PaymentStatus.CREATED, PaymentStatus.AUTHORIZED] } },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      res.json({
        success: true,
        data: {
          orderId: existing.gatewayOrderId,
          amount: Number(existing.amount),
          currency: existing.currency,
          keyId: env.RAZORPAY_KEY_ID || undefined,
          sandboxMode: existing.gateway === 'SANDBOX',
        },
      });
      return;
    }

    const gateway = razorpayClient();
    const amountInPaise = Math.round(Number(booking.priceBreakdown.totalPayable) * 100);
    if (!Number.isSafeInteger(amountInPaise) || amountInPaise <= 0) {
      throw new ApiError(400, 'Booking has an invalid payment amount.');
    }

    const order = gateway
      ? await gateway.orders.create({
          amount: amountInPaise,
          currency: booking.priceBreakdown.currency,
          receipt: booking.bookingNumber,
          notes: { bookingId: booking.id },
        })
      : { id: `order_demo_${crypto.randomUUID()}`, amount: amountInPaise, currency: 'INR' };

    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        gateway: gateway ? 'RAZORPAY' : 'SANDBOX',
        gatewayOrderId: order.id,
        amount: Number(booking.priceBreakdown.totalPayable),
        currency: booking.priceBreakdown.currency,
        transactions: {
          create: {
            eventType: 'order.created',
            rawPayload: { orderId: order.id, amount: order.amount, currency: order.currency },
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: {
        orderId: payment.gatewayOrderId,
        amount: Number(payment.amount),
        currency: payment.currency,
        keyId: gateway ? env.RAZORPAY_KEY_ID : undefined,
        sandboxMode: !gateway,
      },
    });
  } catch (err) {
    next(err);
  }
});

paymentsRouter.post('/verify', authenticate, async (req, res, next) => {
  try {
    const { orderId, paymentId, signature } = req.body as {
      orderId?: string;
      paymentId?: string;
      signature?: string;
    };
    if (!orderId || !paymentId || !signature) {
      throw new ApiError(400, 'Order ID, payment ID, and signature are required.');
    }

    const payment = await prisma.payment.findUnique({
      where: { gatewayOrderId: orderId },
      include: { booking: { include: { priceBreakdown: true } } },
    });
    if (!payment || payment.booking.customerId !== req.user!.userId) {
      throw new ApiError(404, 'Payment order not found.');
    }
    if (payment.status === PaymentStatus.CAPTURED) {
      res.json({ success: true, message: 'Payment already verified.' });
      return;
    }

    if (payment.gateway === 'SANDBOX') {
      if (env.NODE_ENV === 'production') {
        throw new ApiError(503, 'Sandbox payments are disabled in production.');
      }
      if (signature !== 'sandbox_verified') throw new ApiError(400, 'Invalid sandbox payment signature.');
    } else {
      if (!env.RAZORPAY_KEY_SECRET) throw new ApiError(503, 'Payment gateway is not configured.');
      const expected = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
      if (!safeEqual(expected, signature)) throw new ApiError(400, 'Payment signature verification failed.');

      const gateway = razorpayClient();
      if (!gateway) throw new ApiError(503, 'Payment gateway is not configured.');
      const gatewayPayment = await gateway.payments.fetch(paymentId);
      if (
        gatewayPayment.order_id !== orderId ||
        gatewayPayment.status !== 'captured' ||
        gatewayPayment.amount !== Math.round(Number(payment.amount) * 100)
      ) {
        throw new ApiError(400, 'The payment has not been captured for this booking amount.');
      }
    }

    await prisma.$transaction(async (tx) => {
      const current = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
      if (current.status !== PaymentStatus.CREATED && current.status !== PaymentStatus.AUTHORIZED) {
        throw new ApiError(409, 'Payment order is no longer payable.');
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          gatewayPaymentId: paymentId,
          gatewaySignature: signature,
          status: PaymentStatus.CAPTURED,
          paidAt: new Date(),
          transactions: {
            create: {
              eventType: 'payment.captured',
              gatewayEventId: paymentId,
              rawPayload: { orderId, paymentId },
            },
          },
        },
      });

      const booking = payment.booking;
      if (booking.status !== BookingStatus.PAYMENT_PENDING) {
        throw new ApiError(409, 'Booking is no longer awaiting payment.');
      }
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CONFIRMED,
          confirmedAt: new Date(),
          statusHistory: {
            create: {
              fromStatus: booking.status,
              toStatus: BookingStatus.CONFIRMED,
              changedById: req.user!.userId,
              reason: 'Payment verified',
            },
          },
        },
      });

      const heldAmount = Number(booking.priceBreakdown?.securityDeposit ?? 0);
      if (heldAmount > 0) {
        await tx.securityDeposit.create({
          data: { bookingId: booking.id, heldAmount, status: DepositStatus.HELD },
        });
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
      await tx.notification.create({
        data: {
          userId: booking.customerId,
          type: 'BOOKING_CONFIRMED',
          title: 'Booking confirmed',
          message: `Payment received for booking ${booking.bookingNumber}.`,
          actionUrl: '/dashboard/customer',
        },
      });
    });

    res.json({ success: true, message: 'Payment verified successfully.' });
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
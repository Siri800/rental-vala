import crypto from 'crypto';
import Razorpay from 'razorpay';
import { Prisma } from '@rental-vala/database';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';

interface PaymentOrderInput {
  bookingId: string;
  bookingNumber: string;
  amount: number;
  currency: string;
}

export interface PaymentOrderDetails {
  orderId: string;
  amount: number;
  currency: string;
  keyId?: string;
  sandboxMode: boolean;
}

function isPlaceholderCredential(value: string): boolean {
  return /placeholder|replace[_ -]?me|your[_ -]?(key|secret)|example|changeme/i.test(value.trim());
}

export function createRazorpayClient(): Razorpay | null {
  const keyId = env.RAZORPAY_KEY_ID.trim();
  const keySecret = env.RAZORPAY_KEY_SECRET.trim();
  const usableKeyId = keyId.startsWith('rzp_') && !isPlaceholderCredential(keyId);
  const usableSecret = !!keySecret && !isPlaceholderCredential(keySecret);
  const credentialsConfigured = usableKeyId && usableSecret;

  if (!credentialsConfigured) {
    if (usableKeyId) {
      throw new ApiError(503, 'Payment gateway credentials are incomplete.');
    }
    if (env.NODE_ENV === 'production') {
      throw new ApiError(503, 'Payment gateway is not configured.');
    }
    return null;
  }

  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
}

export async function createPaymentOrder(
  tx: Prisma.TransactionClient,
  input: PaymentOrderInput
): Promise<PaymentOrderDetails> {
  const amountInPaise = Math.round(input.amount * 100);
  if (!Number.isSafeInteger(amountInPaise) || amountInPaise <= 0) {
    throw new ApiError(400, 'Booking has an invalid payment amount.');
  }

  const gateway = createRazorpayClient();
  let order: { id: string; amount: number | string; currency: string } | undefined;

  if (gateway) {
    order = await gateway.orders.create({
      amount: amountInPaise,
      currency: input.currency,
      receipt: input.bookingNumber,
      notes: { bookingId: input.bookingId },
    });
  }

  if (!order) {
    order = {
      id: `order_sandbox_${crypto.randomUUID()}`,
      amount: amountInPaise,
      currency: input.currency,
    };
  }

  const payment = await tx.payment.create({
    data: {
      bookingId: input.bookingId,
      gateway: gateway ? 'RAZORPAY' : 'SANDBOX',
      gatewayOrderId: order.id,
      amount: input.amount,
      currency: input.currency,
      transactions: {
        create: {
          eventType: 'order.created',
          rawPayload: { orderId: order.id, amount: order.amount, currency: order.currency },
        },
      },
    },
  });

  return {
    orderId: payment.gatewayOrderId,
    amount: Number(payment.amount),
    currency: payment.currency,
    keyId: gateway ? env.RAZORPAY_KEY_ID : undefined,
    sandboxMode: !gateway,
  };
}

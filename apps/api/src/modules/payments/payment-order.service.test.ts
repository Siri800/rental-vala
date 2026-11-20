import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@rental-vala/database';
import { env } from '../../config/env';

const { createOrder } = vi.hoisted(() => ({ createOrder: vi.fn() }));

vi.mock('razorpay', () => ({
  default: class {
    orders = { create: createOrder };
  },
}));

import { createPaymentOrder } from './payment-order.service';

describe('createPaymentOrder', () => {
  const originalEnv = {
    NODE_ENV: env.NODE_ENV,
    RAZORPAY_KEY_ID: env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: env.RAZORPAY_KEY_SECRET,
  };
  const paymentCreate = vi.fn(
    async (args: {
      data: { gatewayOrderId: string; amount: number; currency: string };
    }) => ({
      gatewayOrderId: args.data.gatewayOrderId,
      amount: args.data.amount,
      currency: args.data.currency,
    })
  );
  const tx = {
    payment: { create: paymentCreate },
  } as unknown as Prisma.TransactionClient;

  beforeEach(() => {
    env.NODE_ENV = 'development';
    env.RAZORPAY_KEY_ID = 'rzp_test_placeholder';
    env.RAZORPAY_KEY_SECRET = 'rzp_secret_placeholder';
    createOrder.mockReset();
    paymentCreate.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    env.NODE_ENV = originalEnv.NODE_ENV;
    env.RAZORPAY_KEY_ID = originalEnv.RAZORPAY_KEY_ID;
    env.RAZORPAY_KEY_SECRET = originalEnv.RAZORPAY_KEY_SECRET;
  });

  it('creates a sandbox order for placeholder credentials', async () => {
    const result = await createPaymentOrder(tx, {
      bookingId: 'booking-1',
      bookingNumber: 'RV-2026-TEST',
      amount: 125,
      currency: 'INR',
    });

    expect(result).toMatchObject({
      amount: 125,
      currency: 'INR',
      sandboxMode: true,
    });
    expect(result.orderId).toMatch(/^order_sandbox_/);
    expect(paymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ gateway: 'SANDBOX' }),
      })
    );
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('creates a real Razorpay order when valid credentials are configured', async () => {
    env.RAZORPAY_KEY_ID = 'rzp_test_valid';
    env.RAZORPAY_KEY_SECRET = 'valid_secret';
    createOrder.mockResolvedValue({
      id: 'order_real_123',
      amount: 12500,
      currency: 'INR',
    });

    const result = await createPaymentOrder(tx, {
      bookingId: 'booking-1',
      bookingNumber: 'RV-2026-TEST',
      amount: 125,
      currency: 'INR',
    });

    expect(createOrder).toHaveBeenCalledWith({
      amount: 12500,
      currency: 'INR',
      receipt: 'RV-2026-TEST',
      notes: { bookingId: 'booking-1' },
    });
    expect(result).toMatchObject({
      orderId: 'order_real_123',
      amount: 125,
      currency: 'INR',
      keyId: 'rzp_test_valid',
      sandboxMode: false,
    });
    expect(paymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          gateway: 'RAZORPAY',
          gatewayOrderId: 'order_real_123',
        }),
      })
    );
  });

  it('does not replace a real Razorpay order with a sandbox after authentication failure', async () => {
    env.RAZORPAY_KEY_ID = 'rzp_test_valid';
    env.RAZORPAY_KEY_SECRET = 'valid_secret';
    createOrder.mockRejectedValue(
      Object.assign(new Error('Authentication failed'), { statusCode: 401 })
    );

    await expect(
      createPaymentOrder(tx, {
        bookingId: 'booking-1',
        bookingNumber: 'RV-2026-TEST',
        amount: 125,
        currency: 'INR',
      })
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(paymentCreate).not.toHaveBeenCalled();
  });

  it('creates a sandbox order when credentials are missing in development', async () => {
    env.RAZORPAY_KEY_ID = '';
    env.RAZORPAY_KEY_SECRET = '';

    const result = await createPaymentOrder(tx, {
      bookingId: 'booking-1',
      bookingNumber: 'RV-2026-TEST',
      amount: 125,
      currency: 'INR',
    });

    expect(result.orderId).toMatch(/^order_sandbox_/);
    expect(result.sandboxMode).toBe(true);
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('does not use sandbox orders in production', async () => {
    env.NODE_ENV = 'production';

    await expect(
      createPaymentOrder(tx, {
        bookingId: 'booking-1',
        bookingNumber: 'RV-2026-TEST',
        amount: 125,
        currency: 'INR',
      })
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(paymentCreate).not.toHaveBeenCalled();
  });
});

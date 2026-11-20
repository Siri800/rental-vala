import { Router } from 'express';
import { randomUUID } from 'crypto';
import PDFDocument from 'pdfkit';
import {
  BookingStatus,
  FulfillmentMethod,
  prisma,
} from '@rental-vala/database';
import { bookingCreateSchema, bookingQuoteSchema } from '@rental-vala/shared';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { InventoryService } from '../inventory/inventory.service';
import { PricingService } from '../pricing/pricing.service';
import { ApiError } from '../../utils/ApiError';
import { getRouteParam } from '../../utils/routeParam';
import { generateInvoicePdf } from './invoice.service';
import { createPaymentOrder } from '../payments/payment-order.service';

export const bookingsRouter = Router();

async function getQuote(input: {
  listingId: string;
  startDate: Date;
  endDate: Date;
  quantity: number;
  fulfillmentMethod: 'PICKUP' | 'DELIVERY';
}) {
  const listing = await prisma.listing.findFirst({
    where: { id: input.listingId, status: 'PUBLISHED', deletedAt: null },
    include: { pricing: true, inventoryItem: true },
  });
  if (!listing?.pricing || !listing.inventoryItem) {
    throw new ApiError(404, 'Available listing and pricing were not found.');
  }
  if (
    (input.fulfillmentMethod === 'DELIVERY' && !listing.deliveryAvailable) ||
    (input.fulfillmentMethod === 'PICKUP' && !listing.pickupAvailable)
  ) {
    throw new ApiError(400, 'The selected fulfillment method is not available for this listing.');
  }
  if (listing.listingType === 'APPOINTMENT') {
    const expectedDurationMs = (listing.appointmentDurationMinutes ?? 0) * 60 * 1000;
    if (
      expectedDurationMs <= 0 ||
      input.endDate.getTime() - input.startDate.getTime() !== expectedDurationMs
    ) {
      throw new ApiError(400, 'Select an appointment time slot with the listed duration.');
    }
  }

  const availability = await InventoryService.getAvailableQuantity(
    listing.id,
    input.startDate,
    input.endDate
  );
  const quote = PricingService.quote({
    pricing: listing.pricing,
    startDate: input.startDate,
    endDate: input.endDate,
    quantity: input.quantity,
    fulfillmentMethod: input.fulfillmentMethod,
    listingType: listing.listingType,
    appointmentDurationMinutes: listing.appointmentDurationMinutes,
  });
  return {
    listing,
    availability,
    quote,
    isAvailable: availability.availableQuantity >= input.quantity,
  };
}

bookingsRouter.post('/quote', async (req, res, next) => {
  try {
    const input = bookingQuoteSchema.parse(req.body);
    const result = await getQuote(input);
    res.json({
      success: true,
      data: {
        isAvailable: result.isAvailable,
        availableQuantity: result.availability.availableQuantity,
        quote: result.quote,
      },
    });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.post('/', authenticate, authorize('CUSTOMER'), async (req, res, next) => {
  try {
    const input = bookingCreateSchema.parse(req.body);
    const result = await getQuote(input);
    if (!result.isAvailable) {
      throw new ApiError(409, `Only ${result.availability.availableQuantity} unit(s) are available.`);
    }

    if (input.fulfillmentMethod === 'DELIVERY') {
      if (!input.deliveryAddressId) {
        throw new ApiError(400, 'A delivery address is required for delivery bookings.');
      }
      const address = await prisma.address.findFirst({
        where: { id: input.deliveryAddressId, userId: req.user!.userId },
        select: { id: true },
      });
      if (!address) throw new ApiError(400, 'Select one of your saved delivery addresses.');
    }

    const status = result.listing.instantBooking
      ? BookingStatus.PAYMENT_PENDING
      : BookingStatus.PENDING_PROVIDER_APPROVAL;
    const bookingResult = await prisma.$transaction(async (tx) => {
      await InventoryService.lockAndVerifyAvailability(
        tx,
        result.listing.id,
        input.startDate,
        input.endDate,
        input.quantity
      );

      const created = await tx.booking.create({
        data: {
          bookingNumber: `RV-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
          customerId: req.user!.userId,
          providerId: result.listing.providerId,
          deliveryAddressId: input.deliveryAddressId,
          startDate: input.startDate,
          endDate: input.endDate,
          fulfillmentMethod: input.fulfillmentMethod as FulfillmentMethod,
          status,
          customerNotes: input.customerNotes,
          items: {
            create: {
              listingId: result.listing.id,
              quantity: input.quantity,
              pricingUnit:
                result.listing.listingType === 'APPOINTMENT'
                  ? result.listing.pricing!.primaryUnit
                  : 'DAILY',
              durationCount:
                result.listing.listingType === 'APPOINTMENT'
                  ? result.quote.durationCount
                  : result.quote.durationDays,
              unitRate:
                result.listing.listingType === 'APPOINTMENT' &&
                result.listing.pricing!.primaryUnit === 'HOURLY'
                  ? result.listing.pricing!.hourlyRate ?? result.listing.pricing!.dailyRate
                  : result.listing.pricing!.dailyRate,
              subtotal: result.quote.rentalSubtotal,
              depositPerUnit: result.listing.pricing!.securityDeposit,
            },
          },
          priceBreakdown: {
            create: {
              rentalSubtotal: result.quote.rentalSubtotal,
              discountAmount: result.quote.discountAmount,
              deliveryCharge: result.quote.deliveryCharge,
              pickupCharge: result.quote.pickupCharge,
              setupOrServiceFee: result.quote.setupOrServiceFee,
              taxableAmount: result.quote.taxableAmount,
              taxAmount: result.quote.taxAmount,
              securityDeposit: result.quote.securityDeposit,
              totalPayable: result.quote.totalPayable,
            },
          },
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: status,
              changedById: req.user!.userId,
              reason: 'Booking created',
            },
          },
        },
        include: { priceBreakdown: true, items: { include: { listing: true } } },
      });
      const checkout =
        status === BookingStatus.PAYMENT_PENDING
          ? await createPaymentOrder(tx, {
              bookingId: created.id,
              bookingNumber: created.bookingNumber,
              amount: Number(created.priceBreakdown!.totalPayable),
              currency: created.priceBreakdown!.currency,
            })
          : undefined;
      return { booking: created, checkout };
    });

    res.status(201).json({
      success: true,
      data: {
        ...bookingResult.booking,
        ...(bookingResult.checkout ? { checkout: bookingResult.checkout } : {}),
      },
    });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.get('/my', authenticate, authorize('CUSTOMER'), async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { customerId: req.user!.userId },
      include: {
        provider: { select: { businessName: true, city: true } },
        items: { include: { listing: { select: { title: true, slug: true } } } },
        priceBreakdown: { select: { totalPayable: true, securityDeposit: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.get('/provider', authenticate, authorize('PROVIDER'), async (req, res, next) => {
  try {
    const provider = await prisma.providerProfile.findUnique({
      where: { userId: req.user!.userId },
      select: { id: true },
    });
    if (!provider) throw new ApiError(404, 'Provider profile not found.');
    const bookings = await prisma.booking.findMany({
      where: { providerId: provider.id },
      include: {
        customer: { select: { id: true, fullName: true, phone: true } },
        items: { include: { listing: { select: { id: true, title: true } } } },
        priceBreakdown: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
});

bookingsRouter.get('/:id/invoice', authenticate, async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: getRouteParam(req.params.id) },
      include: {
        customer: { select: { id: true, fullName: true, email: true } },
        provider: {
          select: {
            id: true,
            userId: true,
            businessName: true,
            gstNumber: true,
            businessAddress: true,
            city: true,
            state: true,
          },
        },
        items: {
          select: {
            quantity: true,
            unitRate: true,
            durationCount: true,
            subtotal: true,
            listing: { select: { title: true } },
          },
        },
        priceBreakdown: true,
        payments: {
          select: { status: true, paidAt: true },
          orderBy: { createdAt: 'desc' },
        },
        securityDeposit: { select: { status: true } },
      },
    });
    if (!booking) throw new ApiError(404, 'Booking not found.');

    const adminRoles = [
      'SUPER_ADMIN',
      'OPERATIONS_ADMIN',
      'FINANCE_ADMIN',
      'SUPPORT_ADMIN',
      'CONTENT_ADMIN',
    ];
    const isCustomer = booking.customerId === req.user!.userId;
    const isProvider = booking.provider.userId === req.user!.userId;
    const isAdmin = req.user!.roles.some((role) => adminRoles.includes(role));
    if (!isCustomer && !isProvider && !isAdmin) {
      throw new ApiError(403, 'You are not allowed to download this booking invoice.');
    }
    if (!booking.priceBreakdown) {
      throw new ApiError(409, 'The booking does not have an invoice price breakdown.');
    }

    res.status(200);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="RentalVala-Invoice-${booking.id}.pdf"`
    );
    res.setHeader('Cache-Control', 'private, no-store');

    const document = new PDFDocument({ size: 'A4', margin: 48 });
    document.on('error', (error: Error) => {
      if (res.headersSent) {
        res.destroy(error);
      } else {
        next(error);
      }
    });
    document.pipe(res);
    generateInvoicePdf(document, booking);
  } catch (err) {
    next(err);
  }
});

bookingsRouter.post(
  '/:id/approve',
  authenticate,
  authorize('PROVIDER'),
  async (req, res, next) => {
    try {
      const provider = await prisma.providerProfile.findUnique({
        where: { userId: req.user!.userId },
        select: { id: true },
      });
      const booking = await prisma.booking.findFirst({
        where: { id: getRouteParam(req.params.id), providerId: provider?.id },
      });
      if (!booking) throw new ApiError(404, 'Booking not found.');
      if (booking.status !== BookingStatus.PENDING_PROVIDER_APPROVAL) {
        throw new ApiError(400, 'Only bookings awaiting provider approval can be approved.');
      }

      const updated = await prisma.$transaction(async (tx) => {
        const next = await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.PAYMENT_PENDING,
            paymentExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
            statusHistory: {
              create: {
                fromStatus: booking.status,
                toStatus: BookingStatus.PAYMENT_PENDING,
                changedById: req.user!.userId,
                reason: 'Provider approved booking; awaiting payment',
              },
            },
          },
        });
        await tx.notification.create({
          data: {
            userId: booking.customerId,
            type: 'BOOKING_APPROVED',
            title: 'Your booking was approved',
            message: `Booking ${booking.bookingNumber} is approved and ready for payment.`,
            actionUrl: `/dashboard/customer`,
          },
        });
        return next;
      });
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

bookingsRouter.post('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const reason =
      typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 1000) : '';
    if (!reason) throw new ApiError(400, 'Cancellation reason is required.');

    const booking = await prisma.booking.findUnique({ where: { id: getRouteParam(req.params.id) } });
    if (!booking) throw new ApiError(404, 'Booking not found.');
    const isCustomer = booking.customerId === req.user!.userId;
    const provider = isCustomer
      ? null
      : await prisma.providerProfile.findUnique({
          where: { userId: req.user!.userId },
          select: { id: true },
        });
    if (!isCustomer && provider?.id !== booking.providerId && !req.user!.roles.includes('SUPER_ADMIN')) {
      throw new ApiError(403, 'You cannot cancel this booking.');
    }
    const cancellableStatuses: BookingStatus[] = [
      BookingStatus.DRAFT,
      BookingStatus.PENDING_PROVIDER_APPROVAL,
      BookingStatus.APPROVED,
      BookingStatus.PAYMENT_PENDING,
    ];
    if (!cancellableStatuses.includes(booking.status)) {
      throw new ApiError(400, 'This booking can no longer be cancelled through this endpoint.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const cancelled = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CANCELLED,
          statusHistory: {
            create: {
              fromStatus: booking.status,
              toStatus: BookingStatus.CANCELLED,
              changedById: req.user!.userId,
              reason,
            },
          },
          cancellation: {
            create: {
              cancelledByRole: isCustomer ? 'CUSTOMER' : 'PROVIDER',
              cancelledById: req.user!.userId,
              reason,
              refundableAmount: 0,
            },
          },
        },
      });
      return cancelled;
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});
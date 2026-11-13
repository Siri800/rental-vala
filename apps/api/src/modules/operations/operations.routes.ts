import { Router } from 'express';
import crypto from 'crypto';
import { prisma, BookingStatus, DepositStatus, LedgerEntryType } from '@rental-vala/database';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { ApiError } from '../../utils/ApiError';
import { env } from '../../config/env';
import { getRouteParam } from '../../utils/routeParam';

export const operationsRouter = Router();

function hashOtp(otp: string): string {
  return crypto.createHmac('sha256', env.OTP_SECRET_SALT).update(otp).digest('hex');
}

// POST /api/v1/operations/:bookingId/dispatch - Schedule Pickup or Dispatch Delivery + Generate Handover OTP
operationsRouter.post(
  '/:bookingId/dispatch',
  authenticate,
  authorize('PROVIDER'),
  async (req, res, next) => {
    try {
      const { deliveryPartnerName, trackingCode } = req.body as {
        deliveryPartnerName?: string;
        trackingCode?: string;
      };

      const booking = await prisma.booking.findUnique({
        where: { id: getRouteParam(req.params.bookingId) },
        include: { provider: true },
      });
      if (!booking || booking.provider.userId !== req.user!.userId) {
        throw new ApiError(404, 'Booking not found.');
      }
      if (booking.status !== BookingStatus.CONFIRMED) {
        throw new ApiError(400, 'Booking must be CONFIRMED before dispatch or pickup scheduling.');
      }

      const handoverOtp = crypto.randomInt(100000, 999999).toString();
      const otpHash = hashOtp(handoverOtp);
      const nextStatus =
        booking.fulfillmentMethod === 'DELIVERY'
          ? BookingStatus.OUT_FOR_DELIVERY
          : BookingStatus.READY_FOR_PICKUP;

      const updated = await prisma.$transaction(async (tx) => {
        if (booking.fulfillmentMethod === 'DELIVERY') {
          await tx.deliveryRecord.upsert({
            where: { bookingId: booking.id },
            update: { deliveryPartnerName, trackingCode, dispatchedAt: new Date(), handoverOtpHash: otpHash },
            create: {
              bookingId: booking.id,
              deliveryPartnerName,
              trackingCode,
              dispatchedAt: new Date(),
              handoverOtpHash: otpHash,
            },
          });
        } else {
          await tx.pickupRecord.upsert({
            where: { bookingId: booking.id },
            update: { scheduledAt: new Date(), handoverOtpHash: otpHash },
            create: {
              bookingId: booking.id,
              scheduledAt: new Date(),
              handoverOtpHash: otpHash,
            },
          });
        }

        await tx.notification.create({
          data: {
            userId: booking.customerId,
            type: 'HANDOVER_OTP',
            title: `Handover OTP for Booking ${booking.bookingNumber}`,
            message: `Share OTP ${handoverOtp} with the provider ONLY after inspecting and receiving your rental item.`,
            actionUrl: `/dashboard/bookings/${booking.id}`,
          },
        });

        return tx.booking.update({
          where: { id: booking.id },
          data: {
            status: nextStatus,
            statusHistory: {
              create: {
                fromStatus: booking.status,
                toStatus: nextStatus,
                changedById: req.user!.userId,
                reason: 'Handover scheduled and OTP generated',
              },
            },
          },
        });
      });

      console.log(`\n[DEV HANDOVER OTP] Booking ${booking.bookingNumber}: ${handoverOtp}\n`);
      res.json({ success: true, data: updated, devHandoverOtp: handoverOtp });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/operations/:bookingId/verify-handover - Verify Customer OTP & Activate Rental
operationsRouter.post(
  '/:bookingId/verify-handover',
  authenticate,
  authorize('PROVIDER'),
  async (req, res, next) => {
    try {
      const { otp, photoUrls } = req.body as { otp: string; photoUrls?: string[] };
      const booking = await prisma.booking.findUnique({
        where: { id: getRouteParam(req.params.bookingId) },
        include: { provider: true, pickupRecord: true, deliveryRecord: true },
      });

      if (!booking || booking.provider.userId !== req.user!.userId) {
        throw new ApiError(404, 'Booking not found.');
      }

      const storedHash =
        booking.fulfillmentMethod === 'DELIVERY'
          ? booking.deliveryRecord?.handoverOtpHash
          : booking.pickupRecord?.handoverOtpHash;

      if (!storedHash || storedHash !== hashOtp(otp)) {
        throw new ApiError(400, 'Invalid handover OTP.');
      }

      const activeBooking = await prisma.$transaction(async (tx) => {
        if (booking.fulfillmentMethod === 'DELIVERY') {
          await tx.deliveryRecord.update({
            where: { bookingId: booking.id },
            data: { otpVerified: true, deliveredAt: new Date(), proofPhotoUrls: photoUrls ?? [] },
          });
        } else {
          await tx.pickupRecord.update({
            where: { bookingId: booking.id },
            data: { otpVerified: true, providerConfirmedAt: new Date(), photoUrls: photoUrls ?? [] },
          });
        }

        return tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.ACTIVE,
            statusHistory: {
              create: {
                fromStatus: booking.status,
                toStatus: BookingStatus.ACTIVE,
                changedById: req.user!.userId,
                reason: 'Handover OTP verified; rental period started',
              },
            },
          },
        });
      });

      res.json({ success: true, data: activeBooking });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/operations/:bookingId/inspect-return - Complete Return Inspection & Settle Security Deposit
operationsRouter.post(
  '/:bookingId/inspect-return',
  authenticate,
  authorize('PROVIDER'),
  async (req, res, next) => {
    try {
      const {
        conditionPassed,
        accessoriesPresent = true,
        deductionAmount = 0,
        notes,
        photoUrls = [],
      } = req.body as {
        conditionPassed: boolean;
        accessoriesPresent?: boolean;
        deductionAmount?: number;
        notes?: string;
        photoUrls?: string[];
      };

      const booking = await prisma.booking.findUnique({
        where: { id: getRouteParam(req.params.bookingId) },
        include: {
          provider: true,
          securityDeposit: true,
          priceBreakdown: true,
          items: { include: { listing: { include: { category: true } } } },
        },
      });

      if (!booking || booking.provider.userId !== req.user!.userId) {
        throw new ApiError(404, 'Booking not found.');
      }

      const result = await prisma.$transaction(async (tx) => {
        await tx.inspectionRecord.create({
          data: {
            bookingId: booking.id,
            inspectorId: req.user!.userId,
            inspectionType: 'POST_RETURN',
            conditionPassed,
            accessoriesPresent,
            notes,
            photoUrls,
          },
        });

        await tx.returnRecord.upsert({
          where: { bookingId: booking.id },
          update: { actualReturnedAt: new Date(), providerConfirmed: true },
          create: {
            bookingId: booking.id,
            expectedReturnAt: booking.endDate,
            actualReturnedAt: new Date(),
            returnMethod: booking.fulfillmentMethod,
            providerConfirmed: true,
          },
        });

        // Settle Security Deposit Escrow
        if (booking.securityDeposit) {
          const held = Number(booking.securityDeposit.heldAmount);
          const deducted = Math.min(held, Math.max(0, Number(deductionAmount)));
          const released = Number((held - deducted).toFixed(2));

          await tx.securityDeposit.update({
            where: { id: booking.securityDeposit.id },
            data: {
              deductedAmount: deducted,
              releasedAmount: released,
              status: deducted > 0 ? DepositStatus.PARTIALLY_DEDUCTED : DepositStatus.RELEASED,
              deductionNotes: notes,
              settledAt: new Date(),
            },
          });

          if (released > 0) {
            await tx.financialLedger.create({
              data: {
                bookingId: booking.id,
                providerId: booking.providerId,
                entryType: LedgerEntryType.DEPOSIT_RELEASE_DEBIT,
                amount: released,
                direction: 'DEBIT',
                description: `Security deposit released to customer for ${booking.bookingNumber}`,
              },
            });
          }
        }

        const finalStatus = conditionPassed ? BookingStatus.COMPLETED : BookingStatus.DISPUTED;

        if (finalStatus === BookingStatus.COMPLETED && booking.priceBreakdown) {
          const grossRental = Number(booking.priceBreakdown.rentalSubtotal);
          const ratePct = Number(
            booking.provider.customCommissionRate ??
              booking.items[0]?.listing.category.defaultCommissionPct ??
              10
          );
          const commissionAmount = Number(((grossRental * ratePct) / 100).toFixed(2));
          const deliveryCredit = Number(booking.priceBreakdown.deliveryCharge);
          const damageCredit = Number(deductionAmount || 0);
          const netProviderPayout = Number(
            (grossRental - commissionAmount + deliveryCredit + damageCredit).toFixed(2)
          );

          await tx.commission.upsert({
            where: { bookingId: booking.id },
            update: { damageCredit, netProviderPayout },
            create: {
              bookingId: booking.id,
              grossRentalAmount: grossRental,
              commissionRatePct: ratePct,
              commissionAmount,
              deliveryCredit,
              damageCredit,
              netProviderPayout,
            },
          });
        }

        return tx.booking.update({
          where: { id: booking.id },
          data: {
            status: finalStatus,
            completedAt: finalStatus === BookingStatus.COMPLETED ? new Date() : null,
            statusHistory: {
              create: {
                fromStatus: booking.status,
                toStatus: finalStatus,
                changedById: req.user!.userId,
                reason: notes || 'Return inspection completed',
              },
            },
          },
        });
      });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
);
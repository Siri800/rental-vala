import { describe, it, expect } from 'vitest';
import { canTransitionBooking } from '@rental-vala/shared';
import { PricingService } from '../modules/pricing/pricing.service';

describe('Rental Vala Core Business Logic', () => {
  describe('Booking State Machine', () => {
    it('allows valid forward lifecycle transitions', () => {
      expect(canTransitionBooking('PAYMENT_PENDING', 'CONFIRMED')).toBe(true);
      expect(canTransitionBooking('CONFIRMED', 'READY_FOR_PICKUP')).toBe(true);
      expect(canTransitionBooking('READY_FOR_PICKUP', 'ACTIVE')).toBe(true);
      expect(canTransitionBooking('ACTIVE', 'RETURNED')).toBe(true);
      expect(canTransitionBooking('INSPECTION_PENDING', 'COMPLETED')).toBe(true);
    });

    it('blocks illegal or skipped state transitions', () => {
      expect(canTransitionBooking('DRAFT', 'COMPLETED')).toBe(false);
      expect(canTransitionBooking('REFUNDED', 'ACTIVE')).toBe(false);
      expect(canTransitionBooking('CANCELLED', 'CONFIRMED')).toBe(false);
    });
  });

  describe('Tiered Pricing & Escrow Deposit Engine', () => {
    const basePricing = {
      dailyRate: 1000,
      weeklyRate: 6000,
      monthlyRate: 22000,
      securityDeposit: 5000,
      deliveryFee: 300,
      pickupFee: 0,
      cleaningOrSetupFee: 100,
      taxRatePct: 18,
      minDuration: 1,
      maxDuration: 90,
      weeklyDiscountPct: 10,
      monthlyDiscountPct: 15,
    };

    it('calculates daily rate accurately for short rentals (< 7 days)', () => {
      const start = new Date('2026-12-01T10:00:00Z');
      const end = new Date('2026-12-04T10:00:00Z');
      const quote = PricingService.quote({
        startDate: start,
        endDate: end,
        quantity: 2,
        fulfillmentMethod: 'DELIVERY',
        pricing: basePricing,
      });

      expect(quote.durationDays).toBe(3);
      expect(quote.rentalSubtotal).toBe(6000);
      expect(quote.discountAmount).toBe(0);
      expect(quote.deliveryCharge).toBe(300);
      expect(quote.pickupCharge).toBe(0);
      expect(quote.setupOrServiceFee).toBe(200);
      expect(quote.taxableAmount).toBe(6500);
      expect(quote.taxAmount).toBe(1170);
      expect(quote.securityDeposit).toBe(10000);
      expect(quote.totalPayable).toBe(17670);
    });

    it('applies discounted weekly tier automatically for >= 7 days', () => {
      const start = new Date('2026-12-01T10:00:00Z');
      const end = new Date('2026-12-09T10:00:00Z');
      const quote = PricingService.quote({
        startDate: start,
        endDate: end,
        quantity: 1,
        fulfillmentMethod: 'PICKUP',
        pricing: basePricing,
      });

      expect(quote.durationDays).toBe(8);
      expect(quote.rentalSubtotal).toBe(6300);
      expect(quote.discountAmount).toBe(700);
      expect(quote.deliveryCharge).toBe(0);
      expect(quote.pickupCharge).toBe(0);
      expect(quote.setupOrServiceFee).toBe(100);
      expect(quote.taxableAmount).toBe(6400);
      expect(quote.taxAmount).toBe(1152);
      expect(quote.securityDeposit).toBe(5000);
      expect(quote.totalPayable).toBe(12552);
    });
  });
});

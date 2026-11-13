import { ApiError } from '../../utils/ApiError';

type NumericInput = number | string | { toString(): string };

export interface ListingPricingInput {
  dailyRate: NumericInput;
  weeklyRate?: NumericInput | null;
  monthlyRate?: NumericInput | null;
  securityDeposit: NumericInput;
  deliveryFee: NumericInput;
  pickupFee?: NumericInput;
  cleaningOrSetupFee?: NumericInput;
  taxRatePct: NumericInput;
  minDuration: number;
  maxDuration: number;
  weeklyDiscountPct?: NumericInput;
  monthlyDiscountPct?: NumericInput;
}

export interface QuoteInput {
  pricing: ListingPricingInput;
  startDate: Date;
  endDate: Date;
  quantity: number;
  fulfillmentMethod: 'PICKUP' | 'DELIVERY';
}

export interface BookingQuote {
  durationDays: number;
  rentalSubtotal: number;
  discountAmount: number;
  deliveryCharge: number;
  pickupCharge: number;
  setupOrServiceFee: number;
  taxableAmount: number;
  taxAmount: number;
  securityDeposit: number;
  totalPayable: number;
}

const amount = (value: NumericInput | null | undefined): number => Number(value ?? 0);
const roundCurrency = (value: number): number => Number(value.toFixed(2));

export class PricingService {
  static quote(input: QuoteInput): BookingQuote {
    const { pricing, startDate, endDate, quantity, fulfillmentMethod } = input;
    const durationMs = endDate.getTime() - startDate.getTime();
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      throw new ApiError(400, 'End date must be later than start date.');
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new ApiError(400, 'Quantity must be a positive whole number.');
    }

    const durationDays = Math.ceil(durationMs / (24 * 60 * 60 * 1000));
    if (durationDays < pricing.minDuration || durationDays > pricing.maxDuration) {
      throw new ApiError(
        400,
        `Rental duration must be between ${pricing.minDuration} and ${pricing.maxDuration} day(s).`
      );
    }

    const dailyRate = amount(pricing.dailyRate);
    const weeklyRate = amount(pricing.weeklyRate);
    const monthlyRate = amount(pricing.monthlyRate);
    const weeks = Math.floor(durationDays / 7);
    const daysAfterWeeks = durationDays % 7;
    let rentalPerUnit = 0;

    if (monthlyRate > 0 && durationDays >= 30) {
      const months = Math.floor(durationDays / 30);
      const remainingDays = durationDays % 30;
      rentalPerUnit = months * monthlyRate + remainingDays * dailyRate;
    } else if (weeklyRate > 0 && weeks > 0) {
      rentalPerUnit = weeks * weeklyRate + daysAfterWeeks * dailyRate;
    } else {
      rentalPerUnit = durationDays * dailyRate;
    }

    const discountPct =
      monthlyRate > 0 && durationDays >= 30
        ? amount(pricing.monthlyDiscountPct)
        : weeklyRate > 0 && durationDays >= 7
          ? amount(pricing.weeklyDiscountPct)
          : 0;
    const undiscountedSubtotal = rentalPerUnit * quantity;
    const discountAmount = roundCurrency(undiscountedSubtotal * discountPct / 100);
    const rentalSubtotal = roundCurrency(undiscountedSubtotal - discountAmount);
    const deliveryCharge =
      fulfillmentMethod === 'DELIVERY' ? roundCurrency(amount(pricing.deliveryFee)) : 0;
    const pickupCharge =
      fulfillmentMethod === 'PICKUP' ? roundCurrency(amount(pricing.pickupFee)) : 0;
    const setupOrServiceFee = roundCurrency(amount(pricing.cleaningOrSetupFee) * quantity);
    const taxableAmount = roundCurrency(
      rentalSubtotal + deliveryCharge + pickupCharge + setupOrServiceFee
    );
    const taxAmount = roundCurrency(taxableAmount * amount(pricing.taxRatePct) / 100);
    const securityDeposit = roundCurrency(amount(pricing.securityDeposit) * quantity);

    return {
      durationDays,
      rentalSubtotal,
      discountAmount,
      deliveryCharge,
      pickupCharge,
      setupOrServiceFee,
      taxableAmount,
      taxAmount,
      securityDeposit,
      totalPayable: roundCurrency(taxableAmount + taxAmount + securityDeposit),
    };
  }
}
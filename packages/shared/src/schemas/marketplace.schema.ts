import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);
const nonNegativeAmount = z.number().finite().min(0);

export const providerProfileSchema = z.object({
  businessName: nonEmptyString.max(150),
  ownerName: nonEmptyString.max(100),
  businessType: z.enum(['INDIVIDUAL', 'PROPRIETORSHIP', 'PARTNERSHIP', 'LLP', 'PRIVATE_LIMITED']),
  description: z.string().trim().max(2000).optional(),
  businessAddress: nonEmptyString.max(300),
  city: nonEmptyString.max(100),
  state: nonEmptyString.max(100),
  pinCode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'),
});

export const listingCreateSchema = z.object({
  categoryId: nonEmptyString,
  subcategoryId: nonEmptyString,
  title: nonEmptyString.max(180),
  description: nonEmptyString.max(10000),
  brand: z.string().trim().max(100).optional(),
  model: z.string().trim().max(100).optional(),
  condition: z.enum(['BRAND_NEW', 'LIKE_NEW', 'GOOD', 'FAIR']).default('GOOD'),
  city: nonEmptyString.max(100),
  state: nonEmptyString.max(100),
  pinCode: z.string().regex(/^\d{6}$/),
  pickupAddress: nonEmptyString.max(300),
  pickupAvailable: z.boolean().default(true),
  deliveryAvailable: z.boolean().default(false),
  deliveryRadiusKm: z.number().int().positive().optional(),
  instantBooking: z.boolean().default(false),
  pricing: z.object({
    dailyRate: nonNegativeAmount,
    hourlyRate: nonNegativeAmount.optional(),
    weeklyRate: nonNegativeAmount.optional(),
    monthlyRate: nonNegativeAmount.optional(),
    securityDeposit: nonNegativeAmount.default(0),
    deliveryFee: nonNegativeAmount.default(0),
    pickupFee: nonNegativeAmount.default(0),
    cleaningOrSetupFee: nonNegativeAmount.default(0),
    taxRatePct: z.number().finite().min(0).max(100).default(18),
    minDuration: z.number().int().positive().default(1),
    maxDuration: z.number().int().positive().default(90),
    weeklyDiscountPct: z.number().finite().min(0).max(100).default(0),
    monthlyDiscountPct: z.number().finite().min(0).max(100).default(0),
  }).refine((value) => value.maxDuration >= value.minDuration, {
    message: 'Maximum duration must be at least the minimum duration',
  }),
  inventory: z.object({
    sku: nonEmptyString.max(100).optional(),
    totalQuantity: z.number().int().positive().default(1),
    trackIndividualUnits: z.boolean().default(false),
    bufferHours: z.number().int().min(0).max(168).default(2),
  }).default({ totalQuantity: 1, trackIndividualUnits: false, bufferHours: 2 }),
  images: z.array(z.object({
    url: z.string().url(),
    fileKey: nonEmptyString.max(500),
    altText: z.string().trim().max(250).optional(),
    isPrimary: z.boolean().default(false),
  })).max(20).default([]),
  imageUrls: z.array(z.string().url()).max(20).optional(),
  policies: z.object({
    cancellationPolicy: nonEmptyString.max(80).default('MODERATE'),
    cancellationNotes: z.string().trim().max(1000).optional(),
    damagePolicy: nonEmptyString.max(2000).default('Customer is responsible for damage beyond normal wear.'),
    usageGuidelines: z.string().trim().max(2000).optional(),
    lateFeePerDay: nonNegativeAmount.default(0),
    idProofRequired: z.boolean().default(true),
  }).optional(),
  attributes: z.record(z.union([z.string().trim(), z.number().finite(), z.boolean()])).optional(),
});

export const bookingQuoteSchema = z.object({
  listingId: nonEmptyString,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  quantity: z.number().int().positive().max(100),
  fulfillmentMethod: z.enum(['PICKUP', 'DELIVERY']),
});

export const bookingCreateSchema = bookingQuoteSchema.extend({
  deliveryAddressId: nonEmptyString.optional(),
  customerNotes: z.string().trim().max(2000).optional(),
});

export const reviewCreateSchema = z.object({
  bookingId: nonEmptyString,
  overallRating: z.number().int().min(1).max(5),
  productRating: z.number().int().min(1).max(5),
  providerRating: z.number().int().min(1).max(5),
  comment: nonEmptyString.max(3000),
  photoUrls: z.array(z.string().url()).max(10).optional(),
});

export const supportTicketCreateSchema = z.object({
  bookingId: nonEmptyString.optional(),
  issueCategory: nonEmptyString.max(80),
  subject: nonEmptyString.max(180),
  description: nonEmptyString.max(5000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
});

export const supportMessageSchema = z.object({
  message: nonEmptyString.max(5000),
  attachmentUrls: z.array(z.string().url()).max(10).optional(),
});
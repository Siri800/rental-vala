import { Router } from 'express';
import { randomUUID } from 'crypto';
import { Prisma, prisma } from '@rental-vala/database';
import { listingCreateSchema } from '@rental-vala/shared';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { ApiError } from '../../utils/ApiError';
import { getRouteParam } from '../../utils/routeParam';

export const listingsRouter = Router();

listingsRouter.get('/', async (req, res, next) => {
  try {
    const requestedPage = Number(req.query.page);
    const requestedPageSize = Number(req.query.limit);
    const page =
      Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const pageSize =
      Number.isSafeInteger(requestedPageSize) && requestedPageSize > 0
        ? Math.min(50, requestedPageSize)
        : 20;
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : undefined;
    const categoryFilter =
      typeof req.query.category === 'string'
        ? req.query.category
        : typeof req.query.categoryId === 'string'
          ? req.query.categoryId
          : undefined;
    const category = categoryFilter
      ? await prisma.category.findFirst({
          where: { OR: [{ id: categoryFilter }, { slug: categoryFilter }] },
          select: { id: true },
        })
      : null;
    const minPrice = req.query.minPrice === undefined ? undefined : Number(req.query.minPrice);
    const maxPrice = req.query.maxPrice === undefined ? undefined : Number(req.query.maxPrice);
    if (
      (minPrice !== undefined && (!Number.isFinite(minPrice) || minPrice < 0)) ||
      (maxPrice !== undefined && (!Number.isFinite(maxPrice) || maxPrice < 0)) ||
      (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice)
    ) {
      throw new ApiError(400, 'Price filters must be non-negative and the minimum cannot exceed the maximum.');
    }
    const deliveryOnly = req.query.delivery === 'true';

    const where = {
      status: 'PUBLISHED' as const,
      deletedAt: null,
      ...(city ? { city: { equals: city, mode: 'insensitive' as const } } : {}),
      ...(categoryFilter ? { categoryId: category?.id ?? '__no_matching_category__' } : {}),
      ...(deliveryOnly ? { deliveryAvailable: true } : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            pricing: {
              is: {
                ...(minPrice !== undefined ? { dailyRate: { gte: minPrice } } : {}),
                ...(maxPrice !== undefined ? { dailyRate: { lte: maxPrice } } : {}),
              },
            },
          }
        : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: 'insensitive' as const } },
              { description: { contains: query, mode: 'insensitive' as const } },
              { brand: { contains: query, mode: 'insensitive' as const } },
              { model: { contains: query, mode: 'insensitive' as const } },
              { category: { name: { contains: query, mode: 'insensitive' as const } } },
              { subcategory: { name: { contains: query, mode: 'insensitive' as const } } },
              { provider: { businessName: { contains: query, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'recommended';
    const orderBy =
      sort === 'price_asc'
        ? [{ pricing: { dailyRate: 'asc' as const } }]
        : sort === 'price_desc'
          ? [{ pricing: { dailyRate: 'desc' as const } }]
          : sort === 'rating'
            ? [{ averageRating: 'desc' as const }, { totalReviews: 'desc' as const }]
            : sort === 'newest'
              ? [{ createdAt: 'desc' as const }]
              : [{ isFeatured: 'desc' as const }, { averageRating: 'desc' as const }, { createdAt: 'desc' as const }];

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
        include: {
          category: { select: { name: true, slug: true } },
          subcategory: { select: { name: true, slug: true } },
          provider: { select: { businessName: true, city: true, averageRating: true } },
          images: { orderBy: { displayOrder: 'asc' }, take: 1 },
          pricing: {
            select: {
              primaryUnit: true,
              hourlyRate: true,
              dailyRate: true,
              weeklyRate: true,
              monthlyRate: true,
              securityDeposit: true,
            },
          },
          inventoryItem: {
            select: {
              totalQuantity: true,
              _count: { select: { units: { where: { status: 'AVAILABLE' } } } },
            },
          },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      success: true,
      data: listings,
      pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    next(err);
  }
});

listingsRouter.get('/:slug', async (req, res, next) => {
  try {
    const listing = await prisma.listing.findFirst({
      where: { slug: getRouteParam(req.params.slug), status: 'PUBLISHED', deletedAt: null },
      include: {
        category: { select: { name: true, slug: true } },
        subcategory: { select: { name: true, slug: true } },
        provider: {
          select: {
            id: true,
            businessName: true,
            city: true,
            averageRating: true,
            totalReviews: true,
          },
        },
        images: { orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }] },
        attributes: {
          include: { attribute: { select: { label: true, unit: true } } },
        },
        pricing: true,
        policies: true,
        inventoryItem: { select: { totalQuantity: true } },
      },
    });
    if (!listing) throw new ApiError(404, 'Listing not found.');

    await prisma.listing.update({
      where: { id: listing.id },
      data: { viewCount: { increment: 1 } },
    });
    res.json({ success: true, data: listing });
  } catch (err) {
    next(err);
  }
});

listingsRouter.post('/', authenticate, authorize('PROVIDER'), async (req, res, next) => {
  try {
    const data = listingCreateSchema.parse(req.body);
    if (data.listingType === 'APPOINTMENT') {
      if (!data.appointmentDurationMinutes) {
        throw new ApiError(400, 'Appointment listings must specify a slot duration in minutes.');
      }
      if (!['HOURLY', 'DAILY'].includes(data.pricing.primaryUnit)) {
        throw new ApiError(400, 'Appointment pricing must use an hourly or daily rate.');
      }
      if (
        data.pricing.primaryUnit === 'HOURLY' &&
        data.appointmentDurationMinutes % 60 !== 0
      ) {
        throw new ApiError(400, 'Hourly appointment slots must use a whole-hour duration.');
      }
    }
    const provider = await prisma.providerProfile.findUnique({
      where: { userId: req.user!.userId },
      select: { id: true },
    });
    if (!provider) throw new ApiError(400, 'Create a provider profile before adding listings.');

    const [category, subcategory] = await Promise.all([
      prisma.category.findUnique({
        where: { id: data.categoryId },
        select: { id: true, attributes: { select: { id: true, key: true, dataType: true } } },
      }),
      prisma.subcategory.findFirst({
        where: { id: data.subcategoryId, categoryId: data.categoryId, isActive: true },
        select: { id: true },
      }),
    ]);
    if (!category || !subcategory) throw new ApiError(400, 'Select a valid category and subcategory.');

    const slugBase = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const images = [
      ...data.images,
      ...(data.imageUrls ?? []).map((url) => ({
        url,
        fileKey: `external/${randomUUID()}`,
        isPrimary: false,
      })),
    ];
    const hasPrimaryImage = images.some((image) => image.isPrimary);
    const listingAttributes: Prisma.ListingAttributeUncheckedCreateWithoutListingInput[] = [];
    for (const [key, value] of Object.entries(data.attributes ?? {})) {
      const attribute = category.attributes.find((candidate) => candidate.key === key);
      if (!attribute) continue;
      switch (attribute.dataType) {
        case 'NUMBER':
          if (typeof value !== 'number') {
            throw new ApiError(400, `Attribute "${key}" must be a number.`);
          }
          listingAttributes.push({ attributeId: attribute.id, valueNumber: value });
          break;
        case 'BOOLEAN':
          if (typeof value !== 'boolean') {
            throw new ApiError(400, `Attribute "${key}" must be true or false.`);
          }
          listingAttributes.push({ attributeId: attribute.id, valueBool: value });
          break;
        case 'MULTI_SELECT':
          listingAttributes.push({ attributeId: attribute.id, valueJson: value });
          break;
        default:
          if (typeof value !== 'string') {
            throw new ApiError(400, `Attribute "${key}" must be text.`);
          }
          listingAttributes.push({ attributeId: attribute.id, valueText: value });
      }
    }

    const listing = await prisma.listing.create({
      data: {
        providerId: provider.id,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        title: data.title,
        slug: `${slugBase}-${randomUUID().slice(0, 8)}`,
        description: data.description,
        listingType: data.listingType,
        appointmentDurationMinutes:
          data.listingType === 'APPOINTMENT' ? data.appointmentDurationMinutes : null,
        brand: data.brand,
        model: data.model,
        condition: data.condition,
        city: data.city,
        state: data.state,
        pinCode: data.pinCode,
        pickupAddress: data.pickupAddress,
        pickupAvailable: data.pickupAvailable,
        deliveryAvailable: data.deliveryAvailable,
        deliveryRadiusKm: data.deliveryRadiusKm,
        instantBooking: data.instantBooking,
        status: 'PENDING_APPROVAL',
        pricing: { create: data.pricing },
        ...(data.policies ? { policies: { create: data.policies } } : {}),
        inventoryItem: {
          create: {
            sku: data.inventory.sku ?? `RV-${randomUUID().slice(0, 12).toUpperCase()}`,
            totalQuantity: data.inventory.totalQuantity,
            trackIndividualUnits: data.inventory.trackIndividualUnits,
            bufferHours: data.inventory.bufferHours,
          },
        },
        ...(images.length
          ? {
              images: {
                create: images.map((image, index) => ({
                  ...image,
                  isPrimary: image.isPrimary || (index === 0 && !hasPrimaryImage),
                  displayOrder: index,
                })),
              },
            }
          : {}),
        ...(listingAttributes.length ? { attributes: { create: listingAttributes } } : {}),
      },
      include: { pricing: true, inventoryItem: true, images: true },
    });

    res.status(201).json({ success: true, data: listing });
  } catch (err) {
    next(err);
  }
});
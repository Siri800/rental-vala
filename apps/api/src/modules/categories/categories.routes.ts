import { Router } from 'express';
import { prisma } from '@rental-vala/database';
import { ApiError } from '../../utils/ApiError';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { getRouteParam } from '../../utils/routeParam';

export const categoriesRouter = Router();

// GET /api/v1/categories - All active categories with subcategories & dynamic attributes
categoriesRouter.get('/', async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        subcategories: { where: { isActive: true }, orderBy: { name: 'asc' } },
        attributes: { orderBy: { displayOrder: 'asc' } },
        _count: { select: { listings: { where: { status: 'PUBLISHED' } } } },
      },
    });
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/categories/:slug - Single category detail + attributes for dynamic form rendering
categoriesRouter.get('/:slug', async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({
      where: { slug: getRouteParam(req.params.slug) },
      include: {
        subcategories: { where: { isActive: true }, orderBy: { name: 'asc' } },
        attributes: { orderBy: { displayOrder: 'asc' } },
      },
    });
    if (!category) {
      throw new ApiError(404, 'Category not found.');
    }
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/categories/:id/attributes - Admin dynamic attribute creation
categoriesRouter.post(
  '/:id/attributes',
  authenticate,
  authorize('SUPER_ADMIN', 'CONTENT_ADMIN'),
  async (req, res, next) => {
    try {
      const { key, label, dataType, isRequired, isFilterable, optionsJson, unit, placeholder } = req.body;
      const attr = await prisma.categoryAttribute.create({
        data: {
          categoryId: getRouteParam(req.params.id),
          key,
          label,
          dataType,
          isRequired: Boolean(isRequired),
          isFilterable: Boolean(isFilterable),
          optionsJson,
          unit,
          placeholder,
        },
      });
      res.status(201).json({ success: true, data: attr });
    } catch (err) {
      next(err);
    }
  }
);
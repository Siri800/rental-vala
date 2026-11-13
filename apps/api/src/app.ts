import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import { env } from './config/env';
import { ApiError } from './utils/ApiError';
import { authRouter } from './modules/auth/auth.routes';
import { categoriesRouter } from './modules/categories/categories.routes';
import { providersRouter } from './modules/providers/providers.routes';
import { listingsRouter } from './modules/listings/listings.routes';
import { bookingsRouter } from './modules/bookings/bookings.routes';
import { paymentsRouter } from './modules/payments/payments.routes';
import { operationsRouter } from './modules/operations/operations.routes';
import { engagementRouter } from './modules/engagement/engagement.routes';
import { supportRouter } from './modules/support/support.routes';
import { adminRouter } from './modules/admin/admin.routes';
import { uploadsRouter } from './modules/uploads/uploads.routes';
import { openApiSpec } from './openapi';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: [env.APP_URL, 'http://localhost:3000'],
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

app.use(
  '/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'rental-vala-api', timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
  res.json({
    service: 'Rental Vala API',
    status: 'running',
    frontend: env.APP_URL,
    docs: '/api/v1/docs',
  });
});

app.get('/api/v1/docs', (_req, res) => {
  res.json(openApiSpec);
});

// All API v1 Modules
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/providers', providersRouter);
app.use('/api/v1/listings', listingsRouter);
app.use('/api/v1/bookings', bookingsRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/operations', operationsRouter);
app.use('/api/v1/engagement', engagementRouter);
app.use('/api/v1/support', supportRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/uploads', uploadsRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.flatten().fieldErrors,
    });
  }
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
  }
  console.error('[Unhandled API Error]', err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});
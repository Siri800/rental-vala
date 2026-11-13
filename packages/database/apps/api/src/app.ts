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

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.APP_URL,
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
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Health Check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'rental-vala-api', timestamp: new Date().toISOString() });
});

// Mount API v1 Modules
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/categories', categoriesRouter);

// Centralized Error Handler
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
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.API_PORT || 4000),
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  DATABASE_URL: process.env.DATABASE_URL!,
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev_access_secret_key_change_me',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_key_change_me',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  OTP_SECRET_SALT: process.env.OTP_SECRET_SALT || 'dev_otp_salt',
  S3_ENDPOINT: process.env.S3_ENDPOINT || 'http://localhost:9000',
  S3_REGION: process.env.S3_REGION || 'us-east-1',
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || '',
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || '',
  S3_BUCKET_MEDIA: process.env.S3_BUCKET_MEDIA || 'rental-vala-media',
  S3_MEDIA_PUBLIC_URL: process.env.S3_MEDIA_PUBLIC_URL || '',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
};
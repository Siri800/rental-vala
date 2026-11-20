import { z } from 'zod';

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*]/, 'Password must contain at least one special character'),
  role: z.enum(['CUSTOMER', 'PROVIDER']).default('CUSTOMER'),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Rental Vala Terms & Conditions' }),
  }),
});

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Email or mobile number is required').trim(),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['CUSTOMER', 'PROVIDER']),
});

export const sendLoginOtpSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  role: z.enum(['CUSTOMER', 'PROVIDER']),
});

export const verifyLoginOtpSchema = sendLoginOtpSchema.extend({
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/),
});

export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
  adminKey: z.string().trim().optional(),
});

export const verifyOtpSchema = z.object({
  identifier: z.string().min(3),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/),
  purpose: z.enum(['REGISTRATION', 'LOGIN', 'PASSWORD_RESET']),
});

export const verifyEmailSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/),
});

export const resendEmailOtpSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(3),
});

export const resetPasswordSchema = z.object({
  identifier: z.string().min(3),
  otp: z.string().length(6),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
});
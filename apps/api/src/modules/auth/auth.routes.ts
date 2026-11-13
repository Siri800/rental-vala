import { Router } from 'express';
import argon2 from 'argon2';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma, RoleType, UserStatus } from '@rental-vala/database';
import { registerSchema, loginSchema, verifyOtpSchema } from '@rental-vala/shared';
import { env } from '../../config/env';
import { redis } from '../../config/redis';
import { ApiError } from '../../utils/ApiError';
import { authenticate } from '../../middleware/auth.middleware';

export const authRouter = Router();

function verifySeedOrArgonPassword(storedHash: string, plain: string): Promise<boolean> {
  if (storedHash.startsWith('scrypt:')) {
    const [, salt, key] = storedHash.split(':');
    const derived = crypto.scryptSync(plain, salt, 64).toString('hex');
    return Promise.resolve(crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derived, 'hex')));
  }
  return argon2.verify(storedHash, plain);
}

function generateTokens(userId: string, email: string, roles: string[]) {
  const accessToken = jwt.sign({ userId, email, roles }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign({ userId, email, roles }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
  return { accessToken, refreshToken };
}

// POST /api/v1/auth/register
authRouter.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { phone: data.phone }] },
    });
    if (existing) {
      throw new ApiError(409, 'An account with this email or mobile number already exists.');
    }

    const passwordHash = await argon2.hash(data.password);
    const roleRecord = await prisma.role.findUniqueOrThrow({
      where: { name: data.role as RoleType },
    });

    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        passwordHash,
        status: UserStatus.PENDING_VERIFICATION,
        roles: { create: [{ roleId: roleRecord.id }] },
        ...(data.role === 'CUSTOMER'
          ? { customerProfile: { create: {} }, wishlists: { create: {} } }
          : {}),
      },
    });

    // Generate 6-digit OTP stored in Redis for 5 minutes
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHmac('sha256', env.OTP_SECRET_SALT).update(otp).digest('hex');
    await redis.set(`otp:REGISTRATION:${data.phone}`, otpHash, 'EX', 300);

    console.log(`\n[DEV OTP] Registration OTP for ${data.phone} (${data.email}): ${otp}\n`);

    res.status(201).json({
      success: true,
      message: 'Account created. Please verify the 6-digit OTP sent to your mobile/email.',
      data: { userId: user.id, phone: user.phone, email: user.email },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/verify-otp
authRouter.post('/verify-otp', async (req, res, next) => {
  try {
    const { identifier, otp, purpose } = verifyOtpSchema.parse(req.body);
    const storedHash = await redis.get(`otp:${purpose}:${identifier}`);
    if (!storedHash) {
      throw new ApiError(400, 'OTP expired or invalid. Please request a new OTP.');
    }

    const candidateHash = crypto.createHmac('sha256', env.OTP_SECRET_SALT).update(otp).digest('hex');
    if (storedHash !== candidateHash) {
      throw new ApiError(400, 'Incorrect OTP entered.');
    }

    await redis.del(`otp:${purpose}:${identifier}`);

    const user = await prisma.user.update({
      where: identifier.includes('@') ? { email: identifier } : { phone: identifier },
      data: { phoneVerified: true, emailVerified: true, status: UserStatus.ACTIVE },
      include: { roles: { include: { role: true } } },
    });

    const roles = user.roles.map((r) => r.role.name);
    const tokens = generateTokens(user.id, user.email, roles);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Account verified successfully.',
      data: {
        accessToken: tokens.accessToken,
        user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, roles },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/login
authRouter.post('/login', async (req, res, next) => {
  try {
    const { identifier, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier.toLowerCase() }, { phone: identifier }],
        deletedAt: null,
      },
      include: {
        roles: { include: { role: true } },
        providerProfile: { select: { id: true, businessName: true, verificationStatus: true } },
      },
    });

    if (!user || !(await verifySeedOrArgonPassword(user.passwordHash, password))) {
      throw new ApiError(401, 'Invalid email/mobile or password.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ApiError(403, 'Your account has been suspended. Contact support.');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const roles = user.roles.map((r) => r.role.name);
    const tokens = generateTokens(user.id, user.email, roles);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          roles,
          providerProfile: user.providerProfile,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auth/me
authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        status: true,
        roles: { select: { role: { select: { name: true } } } },
        providerProfile: true,
        customerProfile: true,
      },
    });

    res.json({
      success: true,
      data: {
        ...user,
        roles: user.roles.map((r) => r.role.name),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/logout
authRouter.post('/logout', (_req, res) => {
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out successfully.' });
});
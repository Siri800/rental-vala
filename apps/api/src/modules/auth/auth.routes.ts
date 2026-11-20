import { Router } from 'express';
import argon2 from 'argon2';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma, RoleType, UserStatus } from '@rental-vala/database';
import {
  registerSchema,
  loginSchema,
  sendLoginOtpSchema,
  verifyLoginOtpSchema,
  adminLoginSchema,
  verifyOtpSchema,
  verifyEmailSchema,
  resendEmailOtpSchema,
} from '@rental-vala/shared';
import { env } from '../../config/env';
import { redis } from '../../config/redis';
import { ApiError } from '../../utils/ApiError';
import { authenticate } from '../../middleware/auth.middleware';
import { sendVerificationEmail } from './email.service';

export const authRouter = Router();
const emailOtpTtlSeconds = 15 * 60;
const maxEmailOtpAttempts = 5;
const loginOtpTtlSeconds = 10 * 60;

function hashEmailOtp(email: string, otp: string): string {
  return crypto
    .createHmac('sha256', env.OTP_SECRET_SALT)
    .update(`${email}:${otp}`)
    .digest('hex');
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  const visiblePrefix = localPart.slice(0, Math.min(2, localPart.length));
  return `${visiblePrefix}***@${domain}`;
}

function enforceSelectedRole(roles: string[], selectedRole: 'CUSTOMER' | 'PROVIDER'): void {
  if (roles.some((role) => role.includes('ADMIN'))) {
    throw new ApiError(403, 'Administrator accounts must sign in through the Admin portal.');
  }
  if (roles.includes(selectedRole)) return;

  const accountRole = roles.find((role) => role === 'CUSTOMER' || role === 'PROVIDER');
  if (accountRole) {
    const displayRole = accountRole === 'CUSTOMER' ? 'Customer' : 'Provider';
    throw new ApiError(
      403,
      `This account is registered as a ${displayRole}. Please switch to the ${displayRole} tab.`
    );
  }
  throw new ApiError(403, 'This account does not have access to the selected sign-in role.');
}

async function issueEmailOtp(email: string): Promise<void> {
  const otp = crypto.randomInt(100000, 1000000).toString();
  await redis.set(`verify:email:${email}`, hashEmailOtp(email, otp), 'EX', emailOtpTtlSeconds);
  await redis.set(`verify:email:resend:${email}`, '1', 'EX', 60);
  await redis.del(`verify:email:attempts:${email}`);
  await sendVerificationEmail(email, otp);
}

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

    await issueEmailOtp(user.email);

    res.status(201).json({
      success: true,
      message: 'Account created. Please verify the 6-digit OTP sent to your email.',
      data: { userId: user.id, phone: user.phone, email: user.email },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/verify-email
authRouter.post('/verify-email', async (req, res, next) => {
  try {
    const { email, otp } = verifyEmailSchema.parse(req.body);
    const otpKey = `verify:email:${email}`;
    const attemptsKey = `verify:email:attempts:${email}`;
    const storedHash = await redis.get(otpKey);
    if (!storedHash) {
      throw new ApiError(400, 'Verification code expired or invalid. Request a new code.');
    }

    const attempts = Number((await redis.get(attemptsKey)) || 0);
    if (attempts >= maxEmailOtpAttempts) {
      throw new ApiError(429, 'Too many incorrect codes. Request a new verification email.');
    }

    if (!constantTimeEqual(storedHash, hashEmailOtp(email, otp))) {
      const count = await redis.incr(attemptsKey);
      if (count === 1) await redis.expire(attemptsKey, emailOtpTtlSeconds);
      throw new ApiError(400, 'Incorrect verification code.');
    }

    const currentUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerified: true, deletedAt: true },
    });
    if (!currentUser || currentUser.deletedAt) {
      throw new ApiError(404, 'Account not found.');
    }

    const user = await prisma.user.update({
      where: { id: currentUser.id },
      data: { emailVerified: true, status: UserStatus.ACTIVE },
      include: { roles: { include: { role: true } } },
    });
    await redis.del(otpKey, attemptsKey, `verify:email:resend:${email}`);

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
      message: 'Email verified successfully.',
      data: {
        accessToken: tokens.accessToken,
        user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, roles },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/resend-otp
authRouter.post('/resend-otp', async (req, res, next) => {
  try {
    const { email } = resendEmailOtpSchema.parse(req.body);
    const responseMessage =
      'If the account needs email verification, a new code will be sent shortly.';
    const user = await prisma.user.findUnique({
      where: { email },
      select: { emailVerified: true, deletedAt: true },
    });

    if (!user || user.deletedAt || user.emailVerified) {
      res.json({ success: true, message: responseMessage });
      return;
    }

    const resendKey = `verify:email:resend:${email}`;
    const allowed = await redis.set(resendKey, '1', 'EX', 60, 'NX');
    if (allowed) await issueEmailOtp(email);

    res.json({ success: true, message: responseMessage });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/login/send-otp
authRouter.post('/login/send-otp', async (req, res, next) => {
  try {
    const { phone, role } = sendLoginOtpSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { phone },
      include: { roles: { include: { role: true } } },
    });

    if (!user || user.deletedAt) {
      res.json({
        success: true,
        message: 'If an active account uses this mobile number, a code will be sent to its email.',
        data: { emailHint: null },
      });
      return;
    }

    const roles = user.roles.map((userRole) => userRole.role.name);
    enforceSelectedRole(roles, role);
    if (user.status === UserStatus.SUSPENDED) {
      throw new ApiError(403, 'Your account has been suspended. Contact support.');
    }
    if (user.status !== UserStatus.ACTIVE || !user.emailVerified) {
      throw new ApiError(403, 'Please verify your email before signing in.');
    }

    const resendKey = `login:email:resend:${phone}`;
    const canSend = await redis.set(resendKey, '1', 'EX', 60, 'NX');
    if (!canSend) throw new ApiError(429, 'Please wait before requesting another sign-in code.');

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpKey = `login:email:${phone}`;
    await redis.set(otpKey, hashEmailOtp(user.email, otp), 'EX', loginOtpTtlSeconds);
    await redis.del(`${otpKey}:attempts`);
    await sendVerificationEmail(user.email, otp);

    res.json({
      success: true,
      message: 'A sign-in code was sent to your registered email address.',
      data: { emailHint: maskEmail(user.email) },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/login/verify-otp
authRouter.post('/login/verify-otp', async (req, res, next) => {
  try {
    const { phone, otp, role } = verifyLoginOtpSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { phone },
      include: {
        roles: { include: { role: true } },
        providerProfile: { select: { id: true, businessName: true, verificationStatus: true } },
      },
    });
    if (!user || user.deletedAt) throw new ApiError(400, 'Sign-in code expired or invalid.');

    const roles = user.roles.map((userRole) => userRole.role.name);
    enforceSelectedRole(roles, role);
    if (user.status === UserStatus.SUSPENDED) {
      throw new ApiError(403, 'Your account has been suspended. Contact support.');
    }
    if (user.status !== UserStatus.ACTIVE || !user.emailVerified) {
      throw new ApiError(403, 'Please verify your email before signing in.');
    }

    const otpKey = `login:email:${phone}`;
    const attemptsKey = `${otpKey}:attempts`;
    const storedHash = await redis.get(otpKey);
    if (!storedHash) throw new ApiError(400, 'Sign-in code expired or invalid. Request a new code.');

    const attempts = Number((await redis.get(attemptsKey)) || 0);
    if (attempts >= maxEmailOtpAttempts) {
      throw new ApiError(429, 'Too many incorrect codes. Request a new sign-in code.');
    }
    if (!constantTimeEqual(storedHash, hashEmailOtp(user.email, otp))) {
      const count = await redis.incr(attemptsKey);
      if (count === 1) await redis.expire(attemptsKey, loginOtpTtlSeconds);
      throw new ApiError(400, 'Incorrect sign-in code.');
    }

    await redis.del(otpKey, attemptsKey, `login:email:resend:${phone}`);
    const loggedInUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const tokens = generateTokens(loggedInUser.id, loggedInUser.email, roles);
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

    const currentUser = await prisma.user.findUnique({
      where: identifier.includes('@') ? { email: identifier } : { phone: identifier },
    });
    if (!currentUser) throw new ApiError(404, 'Account not found.');

    const user = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        phoneVerified: true,
        status: currentUser.emailVerified ? UserStatus.ACTIVE : UserStatus.PENDING_VERIFICATION,
      },
      include: { roles: { include: { role: true } } },
    });

    if (!user.emailVerified) {
      res.json({
        success: true,
        message: 'Phone verified. Verify your email before signing in.',
      });
      return;
    }

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
    const { identifier, password, role } = loginSchema.parse(req.body);
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

    const roles = user.roles.map((r) => r.role.name);
    enforceSelectedRole(roles, role);
    if (user.status === UserStatus.SUSPENDED) {
      throw new ApiError(403, 'Your account has been suspended. Contact support.');
    }
    if (user.status === UserStatus.PENDING_VERIFICATION || !user.emailVerified) {
      throw new ApiError(403, 'Please verify your email before signing in.');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

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

// POST /api/v1/auth/admin/login
authRouter.post('/admin/login', async (req, res, next) => {
  try {
    const { email, password, adminKey } = adminLoginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });

    if (
      !user ||
      user.deletedAt ||
      !(await verifySeedOrArgonPassword(user.passwordHash, password))
    ) {
      throw new ApiError(401, 'Invalid administrator email or password.');
    }
    const roles = user.roles.map((userRole) => userRole.role.name);
    if (!roles.some((role) => role.includes('ADMIN'))) {
      throw new ApiError(403, 'This account does not have administrator access.');
    }
    if (env.ADMIN_LOGIN_KEY && !constantTimeEqual(env.ADMIN_LOGIN_KEY, adminKey || '')) {
      throw new ApiError(401, 'Invalid administrator security key.');
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new ApiError(403, 'This administrator account has been suspended.');
    }
    if (user.status !== UserStatus.ACTIVE || !user.emailVerified) {
      throw new ApiError(403, 'This administrator account is not active.');
    }

    const loggedInUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const tokens = generateTokens(loggedInUser.id, loggedInUser.email, roles);
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
        user: { id: user.id, fullName: user.fullName, email: user.email, roles },
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
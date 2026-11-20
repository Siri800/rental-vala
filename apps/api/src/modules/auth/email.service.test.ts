import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../../config/env';

const { resendSend, smtpSendMail, createTransport } = vi.hoisted(() => {
  const resendSend = vi.fn();
  const smtpSendMail = vi.fn();
  const createTransport = vi.fn(() => ({ sendMail: smtpSendMail }));
  return { resendSend, smtpSendMail, createTransport };
});

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: resendSend };
  },
}));

vi.mock('nodemailer', () => ({
  default: { createTransport },
}));

import { sendVerificationEmail } from './email.service';

describe('sendVerificationEmail', () => {
  const originalEnv = {
    NODE_ENV: env.NODE_ENV,
    RESEND_API_KEY: env.RESEND_API_KEY,
    SMTP_HOST: env.SMTP_HOST,
    SMTP_PORT: env.SMTP_PORT,
    SMTP_USER: env.SMTP_USER,
    SMTP_PASS: env.SMTP_PASS,
    EMAIL_FROM: env.EMAIL_FROM,
  };

  beforeEach(() => {
    env.NODE_ENV = 'development';
    env.RESEND_API_KEY = '';
    env.SMTP_HOST = '';
    env.SMTP_PORT = 465;
    env.SMTP_USER = '';
    env.SMTP_PASS = '';
    env.EMAIL_FROM = 'Rental Vala <noreply@example.com>';
    resendSend.mockReset().mockResolvedValue({ data: { id: 'email-1' }, error: null });
    smtpSendMail.mockReset().mockResolvedValue({});
    createTransport.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    env.NODE_ENV = originalEnv.NODE_ENV;
    env.RESEND_API_KEY = originalEnv.RESEND_API_KEY;
    env.SMTP_HOST = originalEnv.SMTP_HOST;
    env.SMTP_PORT = originalEnv.SMTP_PORT;
    env.SMTP_USER = originalEnv.SMTP_USER;
    env.SMTP_PASS = originalEnv.SMTP_PASS;
    env.EMAIL_FROM = originalEnv.EMAIL_FROM;
  });

  it('sends an HTML verification email with Resend when configured', async () => {
    env.RESEND_API_KEY = 're_live_abc123';

    await sendVerificationEmail('customer@example.com', '123456');

    expect(resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'customer@example.com',
        html: expect.stringContaining('123456'),
      })
    );
    expect(createTransport).not.toHaveBeenCalled();
  });

  it('prefers configured SMTP and sends secure HTML email on port 465', async () => {
    env.SMTP_HOST = ' ';
    env.SMTP_USER = ' mailer ';
    env.SMTP_PASS = ' replace_me_smtp_password ';
    env.RESEND_API_KEY = 're_live_abc123';

    await sendVerificationEmail('customer@example.com', '123456');

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: 'mailer', pass: 'replace_me_smtp_password' },
      })
    );
    expect(smtpSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'customer@example.com', html: expect.stringContaining('123456') })
    );
    expect(resendSend).not.toHaveBeenCalled();
  });

  it('uses insecure SMTP transport for ports other than 465', async () => {
    env.SMTP_HOST = 'smtp.example.com';
    env.SMTP_USER = 'mailer';
    env.SMTP_PASS = 'smtp-password';
    env.SMTP_PORT = 587;

    await sendVerificationEmail('customer@example.com', '123456');

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'mailer', pass: 'smtp-password' },
      })
    );
  });

  it('logs the error and OTP when email credentials are missing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    await expect(sendVerificationEmail('customer@example.com', '123456')).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(
      '[Email delivery failed]',
      expect.objectContaining({ message: 'SMTP credentials are missing.' })
    );
    expect(info).toHaveBeenCalledWith(
      '[DEV EMAIL OTP] Verification code for customer@example.com: 123456'
    );
  });

  it('logs SMTP errors and the OTP instead of rejecting when delivery fails', async () => {
    env.SMTP_USER = 'mailer';
    env.SMTP_PASS = 'smtp-password';
    const smtpError = new Error('Invalid login');
    smtpSendMail.mockRejectedValue(smtpError);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    await expect(sendVerificationEmail('customer@example.com', '123456')).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith('[Email delivery failed]', smtpError);
    expect(info).toHaveBeenCalledWith(
      '[DEV EMAIL OTP] Verification code for customer@example.com: 123456'
    );
  });

  it('uses the OTP console fallback in production when no email provider is configured', async () => {
    env.NODE_ENV = 'production';
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    await expect(
      sendVerificationEmail('customer@example.com', '123456')
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(
      '[Email delivery failed]',
      expect.objectContaining({ message: 'SMTP credentials are missing.' })
    );
    expect(info).toHaveBeenCalledWith(
      '[DEV EMAIL OTP] Verification code for customer@example.com: 123456'
    );
  });
});

import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { env } from '../../config/env';

function isPlaceholder(value: string): boolean {
  return /placeholder|replace[_ -]?me|your[_ -]?(key|secret)|example|changeme/i.test(value.trim());
}

function logOtpFallback(to: string, otp: string, error: unknown): void {
  console.error('[Email delivery failed]', error);
  console.info(`[DEV EMAIL OTP] Verification code for ${to}: ${otp}`);
}

function verificationEmailHtml(otp: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <h1 style="font-size:24px">Verify your Rental Vala email</h1>
      <p>Enter this six-digit code to finish creating your account:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:8px">${otp}</p>
      <p>This code expires in 15 minutes. If you did not request it, you can ignore this email.</p>
    </div>
  `;
}

export async function sendVerificationEmail(to: string, otp: string): Promise<void> {
  const smtpUser = env.SMTP_USER.trim();
  const smtpPassword = env.SMTP_PASS.trim();

  if (smtpUser && smtpPassword) {
    try {
      const smtpPort = Number(env.SMTP_PORT || 465);
      const transporter = nodemailer.createTransport({
        host: env.SMTP_HOST.trim() || 'smtp.gmail.com',
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPassword },
      });
      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to,
        subject: 'Verify your Rental Vala email',
        html: verificationEmailHtml(otp),
        text: `Your Rental Vala verification code is ${otp}. It expires in 15 minutes.`,
      });
      return;
    } catch (error) {
      logOtpFallback(to, otp, error);
      return;
    }
  }

  const resendKey = env.RESEND_API_KEY.trim();
  if (resendKey && !isPlaceholder(resendKey)) {
    try {
      const resend = new Resend(resendKey);
      const { error } = await resend.emails.send({
        from: env.EMAIL_FROM,
        to,
        subject: 'Verify your Rental Vala email',
        html: verificationEmailHtml(otp),
        text: `Your Rental Vala verification code is ${otp}. It expires in 15 minutes.`,
      });
      if (error) throw error;
      return;
    } catch (error) {
      logOtpFallback(to, otp, error);
      return;
    }
  }

  logOtpFallback(
    to,
    otp,
    new Error(
      smtpUser || smtpPassword
        ? 'SMTP credentials are incomplete.'
        : 'SMTP credentials are missing.'
    )
  );
}

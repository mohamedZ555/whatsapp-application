import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? 'smtp-relay.brevo.com',
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: MailOptions) {
  return transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME ?? 'FadaaWhats'}" <${process.env.SMTP_FROM_ADDRESS ?? 'noreply@fadaawhats.com'}>`,
    to,
    subject,
    html,
  });
}

export function verificationEmailTemplate(name: string, link: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verify Your Email</h2>
      <p>Hi ${name},</p>
      <p>Click the button below to verify your email address:</p>
      <a href="${link}" style="background: #25D366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    </div>
  `;
}

export function passwordResetEmailTemplate(name: string, link: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset Your Password</h2>
      <p>Hi ${name},</p>
      <p>Click the button below to reset your password:</p>
      <a href="${link}" style="background: #25D366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    </div>
  `;
}

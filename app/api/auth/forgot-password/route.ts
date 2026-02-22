import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { sendMail, passwordResetEmailTemplate } from '@/lib/mail';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // Always return success to prevent email enumeration
    if (!user) return NextResponse.json({ success: true });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600 * 1000); // 1 hour

    await prisma.verificationToken.upsert({
      where: { token },
      update: { expires },
      create: { identifier: user.email, token, expires },
    });

    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${token}`;
    await sendMail({
      to: user.email,
      subject: 'Reset your password',
      html: passwordResetEmailTemplate(`${user.firstName}`, resetLink),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: true }); // Still return success
  }
}

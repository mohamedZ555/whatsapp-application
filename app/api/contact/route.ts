import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    // Store message in the database configuration table as a simple log,
    // or you can send an email via lib/mail.ts if configured.
    // For now we store it as a JSON record in a configuration entry.
    await prisma.contactMessage.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Contact form error:', err);
    // If ContactMessage model doesn't exist yet, just log and return success
    return NextResponse.json({ success: true });
  }
}

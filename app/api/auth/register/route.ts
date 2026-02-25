import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { USER_STATUS, VENDOR_STATUS } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, username, email, mobileNumber, password } = await req.json();

    if (!firstName || !lastName || !username || !email || !password) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] },
    });
    if (existing) {
      return NextResponse.json({ error: 'Email or username already in use.' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);

    // Vendor starts as PENDING (status=2) — not active until super admin approves
    const vendor = await prisma.vendor.create({
      data: {
        title: `${firstName} ${lastName}'s Workspace`,
        status: VENDOR_STATUS.PENDING,
      },
    });

    const role = await prisma.userRole.findFirst({ where: { title: 'Vendor' } });

    // User starts as PENDING (status=4) — can't login until approved
    await prisma.user.create({
      data: {
        firstName,
        lastName,
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        mobileNumber: mobileNumber ?? null,
        password: hashed,
        roleId: role?.id ?? 2,
        vendorId: vendor.id,
        status: USER_STATUS.PENDING,
      },
    });

    await prisma.subscription.create({
      data: { vendorId: vendor.id, planId: 'free', status: 'active' },
    });

    return NextResponse.json({ success: true, message: 'Account created. Please wait for admin approval before logging in.' });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

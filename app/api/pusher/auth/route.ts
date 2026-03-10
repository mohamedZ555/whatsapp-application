import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPusherServer } from '@/lib/pusher';
import prisma from '@/lib/prisma';
import { getActorFromSession, isSuperAdmin } from '@/lib/rbac';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get('socket_id') ?? '';
  const channelName = params.get('channel_name') ?? '';

  console.log('PusherAuth: Attempting auth', { userId: session.user.id, channelName });

  const actor = getActorFromSession(session);
  if (!actor) {
    console.warn('PusherAuth: No actor found for session');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isSuperAdmin(actor)) {
    const vendorUid = channelName.replace('private-vendor-', '');
    const vendor = await prisma.vendor.findUnique({ where: { uid: vendorUid }, select: { uid: true } });
    if (!vendor) {
      console.warn('PusherAuth: SuperAdmin requested invalid vendor channel', { vendorUid });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else {
    const vendorId = actor.vendorId;
    if (!vendorId) {
      console.warn('PusherAuth: User has no vendorId', { userId: actor.userId });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { uid: true } });
    if (!vendor || !channelName.includes(vendor.uid)) {
      console.warn('PusherAuth: User forbidden from channel', { vendorUid: vendor?.uid, channelName });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  if (!process.env.PUSHER_APP_ID) {
    console.warn('PusherAuth: PUSHER_APP_ID not configured');
    return NextResponse.json({ auth: '' });
  }

  const auth = getPusherServer().authorizeChannel(socketId, channelName);
  console.log('PusherAuth: Success for', channelName);
  return NextResponse.json(auth);
}

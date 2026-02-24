import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getActorFromSession, resolveRequiredVendorId } from '@/lib/rbac';
import { getPhoneNumbers } from '@/lib/whatsapp/api';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const actor = getActorFromSession(session);
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const vendorId = resolveRequiredVendorId(actor, null);
  if (!vendorId) return NextResponse.json({ error: 'No vendor assigned.' }, { status: 403 });

  try {
    const settings = await prisma.vendorSetting.findMany({
      where: {
        vendorId,
        settingKey: { in: ['whatsapp_access_token', 'whatsapp_business_account_id', 'current_phone_number_id'] },
      },
    });

    const map: Record<string, string | null> = {};
    for (const s of settings) map[s.settingKey] = s.settingValue;

    const accessToken = map['whatsapp_access_token'];
    const wabaId = map['whatsapp_business_account_id'];

    if (!accessToken || !wabaId) {
      return NextResponse.json({ status: 'not_configured' });
    }

    const result = await getPhoneNumbers(wabaId, accessToken);

    if (result?.error) {
      return NextResponse.json({
        status: 'failed',
        message: result.error.message ?? 'WhatsApp API returned an error.',
      });
    }

    return NextResponse.json({ status: 'connected', phones: result.data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ status: 'failed', message: 'Connection test failed.' });
  }
}

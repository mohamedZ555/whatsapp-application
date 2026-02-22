import { getServerSession } from 'next-auth';
import { getTranslations } from 'next-intl/server';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';

export default async function CampaignDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations('campaigns');
  const tc = await getTranslations('common');

  const { id } = await params;
  const vendorId = (session?.user as any)?.vendorId as string | undefined;

  const campaign = vendorId
    ? await prisma.campaign.findFirst({
        where: { id, vendorId },
        include: {
          template: true,
          messageLogs: { take: 10, orderBy: { createdAt: 'desc' } },
          _count: { select: { messageLogs: true, messageQueues: true } },
        },
      })
    : null;

  if (!campaign) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('title')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-emerald-100 p-5">
          <p className="text-xs text-gray-500">{t('selectTemplate')}</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">{campaign.template?.templateName ?? tc('na')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-100 p-5">
          <p className="text-xs text-gray-500">{t('scheduledFor')}</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">{campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleString() : tc('na')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-emerald-100 p-5">
          <p className="text-xs text-gray-500">{t('processed')}</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">{campaign._count.messageLogs} / {campaign._count.messageQueues}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-emerald-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-emerald-100 font-semibold text-gray-900">Recent Activity</div>
        <table className="w-full text-sm">
          <thead className="bg-emerald-50/60 border-b border-emerald-100">
            <tr>
              <th className="text-start px-4 py-3 font-medium text-gray-600">{tc('status')}</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">Message</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">{tc('createdAt')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {campaign.messageLogs.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-8 text-gray-400">{tc('noData')}</td>
              </tr>
            )}
            {campaign.messageLogs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3 text-gray-700">{log.status}</td>
                <td className="px-4 py-3 text-gray-600">{log.messageContent ?? `[${log.messageType}]`}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import prisma from '@/lib/prisma';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { VendorActionsWrapper } from './actions-wrapper';
import { CreateVendorButton } from './create-vendor-button';

const PAGE_LIMITS = [10, 25, 50, 100] as const;

type VendorsPageSearchParams = {
  page?: string;
  limit?: string;
  search?: string;
};

export default async function AdminVendorsPage({
  searchParams,
}: {
  searchParams: Promise<VendorsPageSearchParams>;
}) {
  const tAdmin = await getTranslations('admin');
  const tCommon = await getTranslations('common');
  const params = await searchParams;
  const search = (params.search ?? '').trim();
  const requestedLimit = Number(params.limit ?? 25);
  const limit = PAGE_LIMITS.includes(requestedLimit as (typeof PAGE_LIMITS)[number]) ? requestedLimit : 25;
  const page = Math.max(1, Number(params.page ?? 1));

  const where = search
    ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { slug: { contains: search, mode: 'insensitive' as const } },
          { uid: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          where: { roleId: 2 },
          take: 1,
          select: {
            firstName: true,
            lastName: true,
            username: true,
            email: true,
            mobileNumber: true,
            status: true,
          },
        },
        subscriptions: { where: { status: 'active' }, take: 1, orderBy: { createdAt: 'desc' } },
      },
    }),
    prisma.vendor.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(page, totalPages);
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;
  const start = total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const end = Math.min(total, currentPage * limit);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-[40px] font-normal leading-none tracking-tight text-emerald-950">{tAdmin('vendors')}</h1>
        <CreateVendorButton />
      </div>

      <section className="rounded-md border border-emerald-100 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 px-4 py-4">
          <form className="flex items-center gap-2 text-sm text-slate-600" method="GET">
            <span>{tCommon('show')}</span>
            <select
              name="limit"
              defaultValue={String(limit)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700"
            >
              {PAGE_LIMITS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input type="hidden" name="search" value={search} />
            <span>{tCommon('results')}</span>
            <button
              type="submit"
              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              {tCommon('filter')}
            </button>
          </form>

          <form className="flex items-center gap-2" method="GET">
            <label htmlFor="search" className="text-sm text-slate-600">
              {tCommon('search')}:
            </label>
            <input type="hidden" name="limit" value={limit} />
            <input
              id="search"
              name="search"
              defaultValue={search}
              className="w-[220px] rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700"
            />
          </form>
        </div>

        <div className="overflow-x-auto px-4 py-3">
          <table className="min-w-[1020px] w-full border-collapse text-[13px] text-slate-600">
            <thead>
              <tr className="border-b border-emerald-100 bg-emerald-50/50 text-[11px] uppercase tracking-[0.12em] text-slate-600">
                <th className="px-3 py-2 text-start font-semibold">{tAdmin('vendorTitle')}</th>
                <th className="px-3 py-2 text-start font-semibold">{tAdmin('adminUserName')}</th>
                <th className="px-3 py-2 text-start font-semibold">{tAdmin('username')}</th>
                <th className="px-3 py-2 text-start font-semibold">{tAdmin('email')}</th>
                <th className="px-3 py-2 text-start font-semibold">{tCommon('status')}</th>
                <th className="px-3 py-2 text-start font-semibold">{tAdmin('mobileNumber')}</th>
                <th className="px-3 py-2 text-start font-semibold">{tAdmin('adminUserStatus')}</th>
                <th className="px-3 py-2 text-start font-semibold">{tCommon('createdAt')}</th>
                <th className="px-3 py-2 text-start font-semibold">{tAdmin('quickActions')}</th>
                <th className="px-3 py-2 text-start font-semibold">{tCommon('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-sm text-slate-500" >
                    {tCommon('noData')}
                  </td>
                </tr>
              )}
              {vendors.map((vendor) => {
                const adminUser = vendor.users[0];
                const adminName = adminUser
                  ? [adminUser.firstName, adminUser.lastName].filter(Boolean).join(' ')
                  : tCommon('na');
                const adminStatus = adminUser?.status === 1 ? tCommon('active') : tCommon('inactive');
                const vendorStatus = vendor.status === 1 ? tCommon('active') : tCommon('inactive');
                const createdOn = new Date(vendor.createdAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                return (
                  <tr key={vendor.id} className="border-b border-emerald-50 bg-white hover:bg-emerald-50/30">
                    <td className="px-3 py-2 text-emerald-800">{vendor.title ?? vendor.slug ?? vendor.uid}</td>
                    <td className="px-3 py-2">{adminName || tCommon('na')}</td>
                    <td className="px-3 py-2">{adminUser?.username ?? tCommon('na')}</td>
                    <td className="px-3 py-2">{adminUser?.email ?? tCommon('na')}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${vendor.status === 1 ? 'bg-[#e8f4ef] text-[#2f8059]' : 'bg-[#efefef] text-[#7e8ca3]'}`}>
                        {vendorStatus}
                      </span>
                    </td>
                    <td className="px-3 py-2">{adminUser?.mobileNumber ?? tCommon('na')}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${adminUser?.status === 1 ? 'bg-[#e8f4ef] text-[#2f8059]' : 'bg-[#efefef] text-[#7e8ca3]'}`}>
                        {adminStatus}
                      </span>
                    </td>
                    <td className="px-3 py-2">{createdOn}</td>
                    <VendorActionsWrapper
                      vendor={{
                        id: vendor.id,
                        title: vendor.title,
                        slug: vendor.slug,
                        uid: vendor.uid,
                        status: vendor.status,
                      }}
                      subscriptionPlanId={vendor.subscriptions[0]?.planId ?? null}
                    />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-100 px-4 py-3 text-sm text-slate-500">
          <div>
            {tAdmin('showingEntries', { start, end, total })}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/vendors?page=${Math.max(1, currentPage - 1)}&limit=${limit}&search=${encodeURIComponent(search)}`}
              className={`rounded border px-3 py-1.5 text-xs font-semibold ${hasPrevious ? 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50' : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'}`}
              aria-disabled={!hasPrevious}
            >
              {tCommon('previous')}
            </Link>
            <span className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">{currentPage}</span>
            <Link
              href={`/admin/vendors?page=${Math.min(totalPages, currentPage + 1)}&limit=${limit}&search=${encodeURIComponent(search)}`}
              className={`rounded border px-3 py-1.5 text-xs font-semibold ${hasNext ? 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50' : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'}`}
              aria-disabled={!hasNext}
            >
              {tCommon('next')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

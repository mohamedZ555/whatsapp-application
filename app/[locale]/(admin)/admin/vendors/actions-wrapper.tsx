'use client';

import { useRouter } from 'next/navigation';
import { VendorActionsCell } from './actions';

type Props = {
  vendor: {
    id: string;
    title: string | null;
    slug: string | null;
    uid: string;
    status: number;
  };
  adminUserStatus: number | null;
  subscriptionPlanId?: string | null;
  subscriptionPlanTitle?: string;
  planDisabledPerms?: string[];
  vendorStats?: {
    totalUsers: number;
    totalEmployees: number;
    totalContacts: number;
  };
};

export function VendorActionsWrapper({
  vendor,
  adminUserStatus,
  subscriptionPlanId,
  subscriptionPlanTitle,
  planDisabledPerms = [],
  vendorStats,
}: Props) {
  const router = useRouter();
  return (
    <VendorActionsCell
      vendor={vendor}
      adminUserStatus={adminUserStatus}
      subscriptionPlanId={subscriptionPlanId}
      subscriptionPlanTitle={subscriptionPlanTitle}
      planDisabledPerms={planDisabledPerms}
      vendorStats={vendorStats}
      onRefresh={() => router.refresh()}
    />
  );
}

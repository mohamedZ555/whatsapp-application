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
};

export function VendorActionsWrapper({ vendor, adminUserStatus, subscriptionPlanId }: Props) {
  const router = useRouter();
  return (
    <VendorActionsCell
      vendor={vendor}
      adminUserStatus={adminUserStatus}
      subscriptionPlanId={subscriptionPlanId}
      onRefresh={() => router.refresh()}
    />
  );
}

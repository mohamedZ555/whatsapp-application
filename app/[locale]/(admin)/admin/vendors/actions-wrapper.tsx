'use client';

import { useRouter } from '@/i18n/navigation';
import { VendorActionsCell } from './actions';

type Props = {
  vendor: {
    id: string;
    title: string | null;
    slug: string | null;
    uid: string;
    status: number;
  };
  subscriptionPlanId?: string | null;
};

export function VendorActionsWrapper({ vendor, subscriptionPlanId }: Props) {
  const router = useRouter();

  function handleRefresh() {
    router.refresh();
  }

  return (
    <VendorActionsCell
      vendor={vendor}
      subscriptionPlanId={subscriptionPlanId}
      onRefresh={handleRefresh}
    />
  );
}

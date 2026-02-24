'use client';

import { ShieldAlert } from 'lucide-react';

export default function ImpersonationBanner() {
  return (
    <div className="flex items-center justify-between bg-amber-500 px-6 py-2.5 text-sm font-medium text-white shadow-sm">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span>You are currently viewing as a vendor account (impersonation mode).</span>
      </div>
      <a
        href="/api/admin/impersonate/return"
        className="ml-4 shrink-0 rounded border border-white/60 bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30 transition-colors"
      >
        Return to Admin Panel
      </a>
    </div>
  );
}

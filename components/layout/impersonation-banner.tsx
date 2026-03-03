"use client";

import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";

interface ImpersonationBannerProps {
  mode: "sa" | "vendor";
}

export default function ImpersonationBanner({
  mode,
}: ImpersonationBannerProps) {
  const t = useTranslations("impersonation");

  const returnHref =
    mode === "sa"
      ? "/api/admin/impersonate/return"
      : "/api/vendor/impersonate/return";

  const label = mode === "sa" ? t("viewingAsVendor") : t("viewingAsEmployee");
  const returnLabel =
    mode === "sa" ? t("returnToAdmin") : t("returnToMyAccount");

  return (
    <div className="flex items-center justify-between bg-amber-500 px-6 py-2.5 text-sm font-medium text-white shadow-sm">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span>{label}</span>
      </div>
      <a
        href={returnHref}
        className="ml-4 shrink-0 rounded border border-white/60 bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30 transition-colors"
      >
        {returnLabel}
      </a>
    </div>
  );
}

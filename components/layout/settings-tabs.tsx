"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { canAccessVendorPath } from "@/lib/access";
import { cn } from "@/lib/utils";
type SettingsTabKey = "general" | "whatsapp" | "jobCategories";
type SettingsTabsProps = {
  activeTab: SettingsTabKey;
  className?: string;
};

export default function SettingsTabs({
  activeTab,
  className,
}: SettingsTabsProps) {
  const t = useTranslations("settings");
  const { data: session } = useSession();

  const roleId = (session?.user as { roleId?: number } | undefined)?.roleId;
  const permissions = (session?.user as { permissions?: string[] } | undefined)
    ?.permissions;
  const permissionsRestricted =
    (session?.user as { permissionsRestricted?: boolean } | undefined)
      ?.permissionsRestricted ?? false;
  const planDisabledPerms =
    (session?.user as { planDisabledPerms?: string[] } | undefined)
      ?.planDisabledPerms ?? [];

  const canAccessJobCategories = canAccessVendorPath(
    "/settings/job-categories",
    roleId,
    permissions,
    planDisabledPerms,
    permissionsRestricted,
  );

  const tabs: Array<{ key: SettingsTabKey; href: string; label: string }> = [
    { key: "general", href: "/settings", label: t("general") },
    { key: "whatsapp", href: "/settings/whatsapp", label: t("whatsapp") },
  ];

  if (canAccessJobCategories) {
    tabs.push({
      key: "jobCategories",
      href: "/settings/job-categories",
      label: t("jobCategories"),
    });
  }

  return (
    <div className={cn("flex gap-1 border-b border-gray-200", className)}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;

        if (isActive) {
          return (
            <span
              key={tab.key}
              className="px-4 py-2.5 text-sm font-medium text-emerald-600 border-b-2 border-emerald-600"
            >
              {tab.label}
            </span>
          );
        }

        return (
          <Link
            key={tab.key}
            href={tab.href}
            className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300 transition-colors"
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

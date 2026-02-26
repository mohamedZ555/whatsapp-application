"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  FileText,
  Gauge,
  Inbox,
  LayoutList,
  MessagesSquare,
  Receipt,
  Settings2,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import { useTranslations } from "next-intl";

type AdminNavItem = {
  key: string;
  href: string;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
};

const navItems: AdminNavItem[] = [
  { key: "dashboard", href: "/admin", labelKey: "dashboard", icon: Gauge, exact: true },
  { key: "vendors", href: "/admin/vendors", labelKey: "vendors", icon: Users },
  { key: "subscriptions", href: "/admin/subscriptions", labelKey: "subscriptions", icon: CreditCard },
  { key: "transactions", href: "/admin/transactions", labelKey: "transactions", icon: Receipt },
  { key: "plans", href: "/admin/plans", labelKey: "plans", icon: LayoutList },
  { key: "pages", href: "/admin/pages", labelKey: "pages", icon: FileText },
  { key: "contact-inbox", href: "/admin/contact-inbox", labelKey: "contactInbox", icon: Inbox },
  { key: "support", href: "/admin/support", labelKey: "supportTickets", icon: MessagesSquare },
  { key: "configuration", href: "/admin/configuration/general", labelKey: "configuration", icon: Settings2 },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const tAdmin = useTranslations("admin");

  return (
    <aside className="w-[268px] border-e border-emerald-800/70 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 text-emerald-50">
      <div className="h-16 border-b border-emerald-800/70 px-5">
        <div className="flex h-full items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400 font-black text-emerald-950">
            F
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-200/80">
              {tAdmin("title")}
            </p>
            <p className="text-sm font-semibold">FadaaWhats</p>
          </div>
        </div>
      </div>
      <nav className="h-[calc(100vh-64px)] overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-emerald-100 text-emerald-900 shadow-sm"
                      : "text-emerald-100/90 hover:bg-emerald-800/80 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tAdmin(item.labelKey as Parameters<typeof tAdmin>[0])}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

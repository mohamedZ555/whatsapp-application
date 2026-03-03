'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  Bot,
  FileText,
  Gem,
  Headphones,
  History,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Receipt,
  Settings,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react';
import { canAccessDashboardItem, DASHBOARD_NAV_ITEMS } from '@/lib/access';

const iconMap = {
  layout: LayoutDashboard,
  users: Users,
  'message-circle': MessageCircle,
  megaphone: Megaphone,
  'file-text': FileText,
  bot: Bot,
  history: History,
  shield: ShieldCheck,
  gem: Gem,
  receipt: Receipt,
  settings: Settings,
  smartphone: Smartphone,
  headphones: Headphones,
} as const;

type SidebarProps = {
  roleId?: number;
  permissions?: string[];
  planDisabledPerms?: string[];
  permissionsRestricted?: boolean;
};

export default function Sidebar({
  roleId,
  permissions = [],
  planDisabledPerms = [],
  permissionsRestricted = false,
}: SidebarProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const navItems = DASHBOARD_NAV_ITEMS.filter((item) =>
    canAccessDashboardItem(roleId, permissions, item, planDisabledPerms, permissionsRestricted)
  );

  return (
    <aside className="w-64 border-e border-emerald-800/70 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 text-emerald-50 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-emerald-800/70">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-400 rounded-lg flex items-center justify-center text-emerald-950 font-black">
            F
          </div>
          <span className="font-bold">FadaaWhats</span>
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-0.5 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = iconMap[item.icon as keyof typeof iconMap] ?? LayoutDashboard;

            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-emerald-100 text-emerald-900 shadow-sm'
                      : 'text-emerald-100/90 hover:bg-emerald-800/80 hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t(item.key as Parameters<typeof t>[0])}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

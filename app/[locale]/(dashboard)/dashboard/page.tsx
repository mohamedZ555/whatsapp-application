import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { USER_ROLES } from "@/lib/constants";
import DashboardClient from "./client";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const name = session?.user?.name ?? "";
  const user = session?.user as any;
  const roleId: number = user?.roleId ?? USER_ROLES.VENDOR_USER;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {t("welcome")}, {name}!
        </p>
      </div>
      <DashboardClient locale={locale} roleId={roleId} />
    </div>
  );
}

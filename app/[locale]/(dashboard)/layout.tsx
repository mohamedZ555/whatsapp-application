import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import ImpersonationBanner from "@/components/layout/impersonation-banner";
import { USER_ROLES } from "@/lib/constants";
import { getLocale } from "next-intl/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const sessionUser = session.user as typeof session.user & {
    roleId?: number;
    permissions?: string[];
    planDisabledPerms?: string[];
    permissionsRestricted?: boolean;
  };

  const locale = await getLocale();
  const isRtl = locale === "ar";

  const roleId = sessionUser.roleId;
  if (
    roleId !== USER_ROLES.SUPER_ADMIN &&
    roleId !== USER_ROLES.VENDOR &&
    roleId !== USER_ROLES.VENDOR_USER
  ) {
    redirect("/login");
  }

  const permissions = sessionUser.permissions ?? [];
  const planDisabledPerms = sessionUser.planDisabledPerms ?? [];
  const permissionsRestricted = sessionUser.permissionsRestricted ?? false;

  const cookieStore = await cookies();
  const impersonatingValue = cookieStore.get("fadaa-impersonating")?.value;
  const isImpersonating =
    impersonatingValue === "1" || impersonatingValue === "vendor";
  const impersonationMode: "sa" | "vendor" | null =
    impersonatingValue === "1"
      ? "sa"
      : impersonatingValue === "vendor"
        ? "vendor"
        : null;

  return (
    <div
      className={`flex h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50/70 ${isRtl ? "" : ""}`}
    >
      <Sidebar
        roleId={roleId}
        permissions={permissions}
        planDisabledPerms={planDisabledPerms}
        permissionsRestricted={permissionsRestricted}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {isImpersonating && <ImpersonationBanner mode={impersonationMode!} />}
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

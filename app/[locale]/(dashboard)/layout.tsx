import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import ImpersonationBanner from "@/components/layout/impersonation-banner";
import { USER_ROLES } from "@/lib/constants";
import { getLocale } from "next-intl/server";
import { getVendorSubscription } from "@/lib/permissions";
import { getServerPlans } from "@/lib/plans";
import { computePlanDisabledPerms } from "@/lib/access";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const locale = await getLocale();
  const isRtl = locale === "ar";

  const roleId = (session.user as any).roleId as number;
  if (
    roleId !== USER_ROLES.SUPER_ADMIN &&
    roleId !== USER_ROLES.VENDOR &&
    roleId !== USER_ROLES.VENDOR_USER
  )
    redirect("/login");

  // Compute plan-based disabled permissions from the current subscription.
  // This runs server-side so the sidebar receives fresh data on every page load.
  const vendorId = (session.user as any).vendorId as string | null | undefined;
  let planDisabledPerms: string[] = [];

  if (vendorId) {
    try {
      const [subscription, plans] = await Promise.all([
        getVendorSubscription(vendorId),
        getServerPlans(),
      ]);
      const planId = subscription?.planId ?? "free";
      const plan = plans[planId] ?? plans["free"];
      planDisabledPerms = computePlanDisabledPerms(plan.features);
    } catch {
      // Non-fatal — fall back to no plan restrictions
    }
  }

  const permissionsRestricted =
    (session.user as any).permissionsRestricted as boolean | undefined ?? false;

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
      className={`flex h-screen bg-gradient-to-b from-emerald-50 via-white to-emerald-50/70 ${isRtl ? "flex-row-reverse" : ""}`}
    >
      <Sidebar
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

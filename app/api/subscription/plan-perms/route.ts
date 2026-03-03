import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActorFromSession, isSuperAdmin, isVendorAdmin } from "@/lib/rbac";
import { getPlanDisabledPermsForVendor } from "@/lib/permissions";

/**
 * GET /api/subscription/plan-perms?vendorId=xxx
 *
 * Returns the plan-disabled permissions for a given vendor.
 * Super admins can query any vendor.
 * Vendor admins can only query their own vendor.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const actor = getActorFromSession(session);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const vendorId = searchParams.get("vendorId")?.trim();

  if (!vendorId) {
    return NextResponse.json(
      { error: "vendorId is required." },
      { status: 400 },
    );
  }

  // Super admin can query any vendor
  if (!isSuperAdmin(actor)) {
    // Vendor admin can only query their own vendor
    if (!isVendorAdmin(actor) || actor.vendorId !== vendorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const planDisabledPerms = await getPlanDisabledPermsForVendor(vendorId);

  return NextResponse.json({ vendorId, planDisabledPerms });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { encode } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getActorFromSession, isVendorAdmin } from "@/lib/rbac";
import { USER_ROLES } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const actor = getActorFromSession(session);

    // Only vendor admins can impersonate their employees
    if (!actor || !isVendorAdmin(actor) || !actor.vendorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const userId =
      body && typeof (body as any).userId === "string"
        ? (body as any).userId
        : null;
    if (!userId) {
      return NextResponse.json(
        { error: "userId is required." },
        { status: 400 },
      );
    }

    // Find the employee — must belong to this vendor and be an active employee
    const employee = await prisma.user.findFirst({
      where: {
        id: userId,
        vendorId: actor.vendorId,
        roleId: USER_ROLES.VENDOR_USER,
        status: 1,
      },
      include: { vendorUserDetail: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Active employee not found in your workspace." },
        { status: 404 },
      );
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: actor.vendorId },
      select: { uid: true },
    });

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "Server misconfiguration: missing NEXTAUTH_SECRET." },
        { status: 500 },
      );
    }

    // Build a JWT token for the employee
    const tokenPayload = {
      id: employee.id,
      uid: employee.uid,
      email: employee.email,
      name: `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim(),
      roleId: employee.roleId,
      vendorId: employee.vendorId,
      vendorUid: vendor?.uid ?? null,
      permissions: (employee.vendorUserDetail?.permissions as string[]) ?? [],
      sub: employee.id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60, // 8 hour session
      jti: crypto.randomUUID(),
    };

    const encodedToken = await encode({
      token: tokenPayload,
      secret,
      maxAge: 8 * 60 * 60,
    });

    const isSecure = process.env.NODE_ENV === "production";
    const sessionCookieName = isSecure
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    // Save the original vendor-admin token
    const originalToken = req.cookies.get(sessionCookieName)?.value;

    const response = NextResponse.json({ success: true });

    if (originalToken) {
      // Use a different cookie name than super-admin to avoid collision
      response.cookies.set("fadaa-vendor-token", originalToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: 8 * 60 * 60,
      });
    }

    // Mark as vendor impersonation (different flag from SA impersonation)
    response.cookies.set("fadaa-impersonating", "vendor", {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60,
    });

    // Replace session with employee token
    response.cookies.set(sessionCookieName, encodedToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60,
    });

    return response;
  } catch (err) {
    console.error("[vendor/impersonate] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

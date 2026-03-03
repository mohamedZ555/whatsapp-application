import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const isSecure = process.env.NODE_ENV === "production";
  const sessionCookieName = isSecure
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  const originalToken = req.cookies.get("fadaa-vendor-token")?.value;

  const redirectUrl = new URL("/users", req.url);

  if (!originalToken) {
    // No saved token — redirect to users page
    const resp = NextResponse.redirect(redirectUrl);
    resp.cookies.set("fadaa-impersonating", "", { path: "/", maxAge: 0 });
    return resp;
  }

  const response = NextResponse.redirect(redirectUrl);

  // Restore the original vendor-admin session
  response.cookies.set(sessionCookieName, originalToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  // Clear vendor impersonation cookies
  response.cookies.set("fadaa-vendor-token", "", { path: "/", maxAge: 0 });
  response.cookies.set("fadaa-impersonating", "", { path: "/", maxAge: 0 });

  return response;
}

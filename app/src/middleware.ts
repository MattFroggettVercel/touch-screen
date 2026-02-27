import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

const PROTECTED_PATHS = ["/app", "/checkout", "/order", "/register", "/demo"];

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  // Check if the path requires authentication
  const isProtected = PROTECTED_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtected && !session) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.searchParams.set(
      "redirect",
      request.nextUrl.pathname + request.nextUrl.search
    );
    return NextResponse.redirect(redirectUrl);
  }

  // If user is logged in and visiting /auth, redirect them away
  if (request.nextUrl.pathname.startsWith("/auth") && session) {
    const redirect = request.nextUrl.searchParams.get("redirect");
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = redirect || "/app";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets
     * - API auth routes (Better Auth handles these)
     * - API webhook routes (Stripe needs raw body, no auth middleware)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/auth|api/webhooks).*)",
  ],
};

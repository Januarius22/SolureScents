import { NextResponse, type NextRequest } from "next/server";

import { refreshAuthSession } from "@/lib/supabase/proxy";
import { isPublicEnvironmentConfigured } from "@/validation/env";

const protectedRoots = ["/account", "/admin", "/publisher", "/update-password"] as const;

function isProtectedPath(pathname: string) {
  return protectedRoots.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  );
}

/** Refreshes auth sessions and rejects anonymous requests before protected layouts render. */
export async function proxy(request: NextRequest) {
  const isProtected = isProtectedPath(request.nextUrl.pathname);

  if (!isPublicEnvironmentConfigured()) {
    if (!isProtected) {
      return NextResponse.next();
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    loginUrl.searchParams.set("reason", "configuration_unavailable");
    return NextResponse.redirect(loginUrl);
  }

  const { response, userId } = await refreshAuthSession(request);

  if (isProtected && !userId) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};

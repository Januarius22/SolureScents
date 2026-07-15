import { NextResponse, type NextRequest } from "next/server";

import { refreshAuthSession } from "@/lib/supabase/proxy";

const protectedRoots = ["/account", "/admin", "/publisher", "/update-password"] as const;

/** Refreshes auth sessions and rejects anonymous requests before protected layouts render. */
export async function proxy(request: NextRequest) {
  const { response, userId } = await refreshAuthSession(request);
  const isProtected = protectedRoots.some((root) => request.nextUrl.pathname.startsWith(root));

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

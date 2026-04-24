import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PREFIXES = ["/login", "/api/auth"];

function withCartSession(response: NextResponse, request: NextRequest): NextResponse {
  if (!request.cookies.get("argus_cart_session")) {
    response.cookies.set("argus_cart_session", crypto.randomUUID(), {
      httpOnly: false,
      sameSite: "lax",
      maxAge: 31536000,
      path: "/",
    });
  }
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return withCartSession(NextResponse.next(), request);
  }

  const session = request.cookies.get("argus_session");
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return withCartSession(NextResponse.redirect(url), request);
  }

  return withCartSession(NextResponse.next(), request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

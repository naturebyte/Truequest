import { NextRequest, NextResponse } from "next/server";

const ROOT_DOMAINS = new Set(["truequestlearning.com", "www.truequestlearning.com"]);
const FORMS_SUBDOMAIN = "forms.truequestlearning.com";

export function proxy(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();
  const pathname = request.nextUrl.pathname;
  const isAssetOrApiPath =
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/icon.png") ||
    pathname.includes(".");

  // forms.truequestlearning.com/* should serve from /forms/*
  if (hostname === FORMS_SUBDOMAIN) {
    if (isAssetOrApiPath) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/forms")) {
      return NextResponse.next();
    }

    const rewriteUrl = new URL(request.url);
    rewriteUrl.pathname = pathname === "/" ? "/forms" : `/forms${pathname}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  // truequestlearning.com/forms/* should redirect to forms.truequestlearning.com/*
  if (ROOT_DOMAINS.has(hostname) && pathname.startsWith("/forms")) {
    const mappedPath = pathname.replace(/^\/forms/, "") || "/";
    const redirectUrl = new URL(request.url);
    redirectUrl.hostname = FORMS_SUBDOMAIN;
    redirectUrl.pathname = mappedPath;
    return NextResponse.redirect(redirectUrl, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import { NextRequest, NextResponse } from "next/server";

const ROOT_DOMAINS = new Set(["truequestlearning.com", "www.truequestlearning.com"]);
const FORMS_SUBDOMAIN = "form.truequestlearning.com";

export function proxy(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();
  const pathname = request.nextUrl.pathname;

  if (!ROOT_DOMAINS.has(hostname)) {
    return NextResponse.next();
  }

  if (!pathname.startsWith("/forms")) {
    return NextResponse.next();
  }

  const mappedPath = pathname.replace(/^\/forms/, "") || "/";
  const redirectUrl = new URL(request.url);
  redirectUrl.hostname = FORMS_SUBDOMAIN;
  redirectUrl.pathname = mappedPath;

  return NextResponse.redirect(redirectUrl, 308);
}

export const config = {
  matcher: ["/forms", "/forms/:path*"],
};

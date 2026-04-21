/** URL-safe slug from title (lowercase, hyphens). */
export function slugifyTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const slug = base || "webinar";
  if (slug.length >= 3) {
    return slug;
  }
  return `${slug}-webinar`.slice(0, 120);
}

export function parseWebinarSlug(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/**
 * Accepts /path/to/file.jpg, path/to/file.jpg, or a full https URL to this site
 * → a single path starting with `/` under `public/` (safe for next/image `src`).
 */
export function normalizePublicAssetPath(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return null;
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      const path = u.pathname;
      if (!path.startsWith("/") || path.includes("..") || path.includes("//")) {
        return null;
      }
      return path;
    } catch {
      return null;
    }
  }

  const path = raw.startsWith("/") ? raw : `/${raw}`;
  if (path.includes("..") || path.slice(1).includes("//")) {
    return null;
  }
  return path;
}

export function isValidWebinarSlug(slug: string): boolean {
  return (
    slug.length >= 3 &&
    slug.length <= 120 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  );
}

export function getPublicSiteBaseUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "");
  if (fromEnv) {
    return fromEnv;
  }
  return "https://truequestlearning.com";
}

/**
 * Uses the incoming request host so Open Graph / WhatsApp preview images match the URL users share
 * (e.g. forms.truequestlearning.com vs apex). Falls back to env or default when headers are missing.
 */
export function getPublicSiteBaseUrlFromHeaders(headerList: { get(name: string): string | null }): string {
  const rawHost = (headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "").trim();
  const host = rawHost.split(",")[0]?.trim() ?? "";
  if (!host) {
    return getPublicSiteBaseUrl();
  }
  const rawProto = (headerList.get("x-forwarded-proto") ?? "https").trim().split(",")[0]?.trim().toLowerCase() ?? "";
  const proto = rawProto === "http" ? "http" : "https";
  return `${proto}://${host}`;
}

export function absoluteUrlForPublicPath(
  publicPath: string | null,
  siteBaseUrl: string = getPublicSiteBaseUrl(),
): string | null {
  if (!publicPath) {
    return null;
  }
  const base = siteBaseUrl.replace(/\/+$/, "");
  if (publicPath.startsWith("http://") || publicPath.startsWith("https://")) {
    return publicPath;
  }
  return `${base}${publicPath.startsWith("/") ? publicPath : `/${publicPath}`}`;
}

/** Public registration URL for crawlers and share sheets (uses NEXT_PUBLIC_SITE_URL when set). */
export function absoluteWebinarRegistrationUrl(slug: string, siteBaseUrl: string = getPublicSiteBaseUrl()): string {
  const base = siteBaseUrl.replace(/\/+$/, "");
  const segment = encodeURIComponent(slug.trim().toLowerCase());
  return `${base}/forms/webinar/${segment}`;
}

/** Plain-text body for WhatsApp / system share (URL must be absolute HTTPS in production). */
export function buildWebinarShareBody(webinarTitle: string, registrationAbsoluteUrl: string): string {
  const titleLine = webinarTitle.trim()
    ? `Register for this TrueQuest offline workshop: ${webinarTitle.trim()}`
    : "Register for this TrueQuest offline workshop";
  return `${titleLine}\n\n🎓 Chance to win scholarships up to ₹100000\n\nRegister Now 👉 ${registrationAbsoluteUrl}`;
}

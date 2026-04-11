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

/** Accepts /path/to/file.jpg or path/to/file.jpg → always /... */
export function normalizePublicAssetPath(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return null;
  }
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  if (path.includes("..") || path.includes("//")) {
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

export function absoluteUrlForPublicPath(publicPath: string | null): string | null {
  if (!publicPath) {
    return null;
  }
  const base = getPublicSiteBaseUrl();
  if (publicPath.startsWith("http://") || publicPath.startsWith("https://")) {
    return publicPath;
  }
  return `${base}${publicPath.startsWith("/") ? publicPath : `/${publicPath}`}`;
}

import type { NextConfig } from "next";

function imageRemoteHosts(): string[] {
  const hosts = new Set<string>(["truequestlearning.com", "www.truequestlearning.com"]);
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    try {
      const u = new URL(fromEnv.startsWith("http") ? fromEnv : `https://${fromEnv}`);
      if (u.hostname) {
        hosts.add(u.hostname);
      }
    } catch {
      /* ignore invalid env */
    }
  }
  return [...hosts];
}

/** When TEST=true, expose super-admin login to the client bundle for local / e2e prefills only. */
const adminLoginPrefillEnv: Record<string, string> =
  process.env.TEST === "true"
    ? {
        NEXT_PUBLIC_ADMIN_LOGIN_PREFILL_USER: process.env.ADMIN_USERNAME ?? "",
        NEXT_PUBLIC_ADMIN_LOGIN_PREFILL_PASS: process.env.ADMIN_PASSWORD ?? "",
      }
    : {};

const nextConfig: NextConfig = {
  env: adminLoginPrefillEnv,
  images: {
    remotePatterns: [
      ...imageRemoteHosts().map((hostname) => ({
        protocol: "https" as const,
        hostname,
        pathname: "/**",
      })),
      { protocol: "http" as const, hostname: "localhost", pathname: "/**" },
      { protocol: "http" as const, hostname: "127.0.0.1", pathname: "/**" },
    ],
  },
};

export default nextConfig;

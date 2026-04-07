import { neon } from "@neondatabase/serverless";

// WARNING: This disables TLS certificate verification in development so that
// corporate/self-signed proxies do not break Neon connections. Do NOT enable
// this in production.
if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL env var is not set for Neon/Postgres connection.");
}

export const sql = neon(process.env.DATABASE_URL);


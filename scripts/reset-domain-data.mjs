import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { neon } from "@neondatabase/serverless";

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const eqIndex = trimmed.indexOf("=");
  if (eqIndex === -1) return null;
  const key = trimmed.slice(0, eqIndex).trim();
  let value = trimmed.slice(eqIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(rawLine);
    if (!parsed) continue;
    if (process.env[parsed.key] == null || process.env[parsed.key] === "") {
      process.env[parsed.key] = parsed.value;
    }
  }
}

function requireConfirm() {
  const argv = new Set(process.argv.slice(2));
  const confirmEnv = (process.env.CONFIRM || "").trim();
  const ok =
    argv.has("--yes") ||
    argv.has("-y") ||
    confirmEnv === "RESET_TRUEQUEST";

  if (!ok) {
    console.error(
      [
        "",
        "Refusing to reset data without confirmation.",
        "",
        "Run one of:",
        '  CONFIRM=RESET_TRUEQUEST node "scripts/reset-domain-data.mjs"',
        '  node "scripts/reset-domain-data.mjs" --yes',
        "",
      ].join("\n"),
    );
    process.exit(1);
  }
}

async function main() {
  const repoRoot = process.cwd();
  loadEnvFile(path.join(repoRoot, ".env.local"));
  loadEnvFile(path.join(repoRoot, ".env"));

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is missing. Set it in the environment or in .env.local.",
    );
  }

  requireConfirm();

  const sql = neon(process.env.DATABASE_URL);

  const tablesToReset = [
    // registrations (keep allowlist intact)
    "student_registrations",
    // fee management
    "student_fee_payments",
    // brochure requests
    "offer_enquiries",
    // notification requests
    "notify_emails",
  ];

  for (const table of tablesToReset) {
    // Use tagged-template style so Neon can parameterize safely.
    await sql`TRUNCATE TABLE ${sql.unsafe(table)} RESTART IDENTITY CASCADE`;
  }

  console.log(
    `Done. Reset data for: ${tablesToReset.join(", ")}`,
  );
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});


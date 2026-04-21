import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { sql } from "@/lib/db";

const ADMIN_COOKIE_NAME = "tq_admin_session";
const ADMIN_SESSION_VERSION = "v1";

export const ADMIN_PERMISSION_KEYS = [
  "overview:view",
  "overview:manage",
  "registrations:view",
  "registrations:manage",
  "webinar_management:view",
  "webinar_management:manage",
  "allowed_students:view",
  "allowed_students:manage",
  "brochure_requests:view",
  "brochure_requests:manage",
  "fees:view",
  "fees:manage",
  "admin_management:view",
  "admin_management:manage",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSION_KEYS)[number];
type AdminSessionPayload = {
  v: string;
  adminId: number;
  username: string;
  isSuperAdmin: boolean;
  permissions: AdminPermission[];
  iat: number;
};

export type AdminSession = {
  adminId: number;
  username: string;
  isSuperAdmin: boolean;
  permissions: AdminPermission[];
};

export type AuthenticatedAdmin = {
  adminId: number;
  username: string;
  isSuperAdmin: boolean;
  permissions: AdminPermission[];
};

function getEnvValue(key: string): string {
  const value = process.env[key];
  if (!value || !value.trim()) {
    throw new Error(`${key} is not configured in environment variables.`);
  }
  return value.trim();
}

function normalizeUsername(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizePermissions(value: unknown): AdminPermission[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const allowed = new Set<string>(ADMIN_PERMISSION_KEYS);
  return value.filter(
    (entry): entry is AdminPermission => typeof entry === "string" && allowed.has(entry),
  );
}

function hashAdminPassword(password: string, salt?: string): string {
  const resolvedSalt = salt || randomBytes(16).toString("base64url");
  const hash = scryptSync(password, `tq-admin:${resolvedSalt}`, 64).toString("base64url");
  return `${resolvedSalt}:${hash}`;
}

function verifyAdminPassword(password: string, storedHash: string): boolean {
  const [salt, existingHash] = storedHash.split(":");
  if (!salt || !existingHash) {
    return false;
  }
  const computed = hashAdminPassword(password, salt);
  const [, computedHash] = computed.split(":");
  const existingBuffer = Buffer.from(existingHash);
  const computedBuffer = Buffer.from(computedHash || "");
  if (existingBuffer.length !== computedBuffer.length) {
    return false;
  }
  return timingSafeEqual(existingBuffer, computedBuffer);
}

function signPayload(payloadBase64: string): string {
  return createHmac("sha256", getAdminSessionSecret()).update(payloadBase64).digest("base64url");
}

export async function ensureAdminUsersTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id serial PRIMARY KEY,
      username text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      permissions_json jsonb NOT NULL DEFAULT '[]'::jsonb,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )
  `;
}

export async function authenticateAdmin(
  usernameInput: string,
  passwordInput: string,
): Promise<AuthenticatedAdmin | null> {
  const username = normalizeUsername(usernameInput);
  const password = typeof passwordInput === "string" ? passwordInput.trim() : "";
  if (!username || !password) {
    return null;
  }

  const superAdminUsername = normalizeUsername(getEnvValue("ADMIN_USERNAME"));
  if (username === superAdminUsername && password === getEnvValue("ADMIN_PASSWORD")) {
    return {
      adminId: 0,
      username,
      isSuperAdmin: true,
      permissions: [...ADMIN_PERMISSION_KEYS],
    };
  }

  await ensureAdminUsersTable();
  const rows = (await sql`
    SELECT id, username, password_hash, permissions_json, is_active
    FROM admin_users
    WHERE username = ${username}
    LIMIT 1
  `) as Array<{
    id: number;
    username: string;
    password_hash: string;
    permissions_json: unknown;
    is_active: boolean;
  }>;

  const admin = rows[0];
  if (!admin || !admin.is_active || !verifyAdminPassword(password, admin.password_hash)) {
    return null;
  }

  return {
    adminId: admin.id,
    username: admin.username,
    isSuperAdmin: false,
    permissions: normalizePermissions(admin.permissions_json),
  };
}

export function createAdminSessionToken(session: AuthenticatedAdmin): string {
  const payload: AdminSessionPayload = {
    v: ADMIN_SESSION_VERSION,
    adminId: session.adminId,
    username: session.username,
    isSuperAdmin: session.isSuperAdmin,
    permissions: session.permissions,
    iat: Date.now(),
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signPayload(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

export function parseAdminSessionFromRequest(req: NextRequest): AdminSession | null {
  const token = req.cookies.get(getAdminCookieName())?.value;
  if (!token) {
    return null;
  }
  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature || signPayload(payloadBase64) !== signature) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf8")) as AdminSessionPayload;
    if (payload.v !== ADMIN_SESSION_VERSION || !payload.username) {
      return null;
    }
    return {
      adminId: Number(payload.adminId) || 0,
      username: normalizeUsername(payload.username),
      isSuperAdmin: Boolean(payload.isSuperAdmin),
      permissions: normalizePermissions(payload.permissions),
    };
  } catch {
    return null;
  }
}

export async function resolveAdminSessionFromRequest(
  req: NextRequest,
): Promise<AdminSession | null> {
  const session = parseAdminSessionFromRequest(req);
  if (!session) {
    return null;
  }
  if (session.isSuperAdmin) {
    return session;
  }

  await ensureAdminUsersTable();
  const rows = (await sql`
    SELECT username, permissions_json, is_active
    FROM admin_users
    WHERE id = ${session.adminId}
    LIMIT 1
  `) as Array<{
    username: string;
    permissions_json: unknown;
    is_active: boolean;
  }>;

  const admin = rows[0];
  if (!admin || !admin.is_active) {
    return null;
  }

  return {
    adminId: session.adminId,
    username: normalizeUsername(admin.username),
    isSuperAdmin: false,
    permissions: normalizePermissions(admin.permissions_json),
  };
}

export function adminCan(
  session: AdminSession | null,
  permission: AdminPermission,
): boolean {
  if (!session) {
    return false;
  }
  if (session.isSuperAdmin) {
    return true;
  }
  return session.permissions.includes(permission);
}

export async function createManagedAdmin(input: {
  username: string;
  password: string;
  permissions: AdminPermission[];
}): Promise<void> {
  await ensureAdminUsersTable();
  const username = normalizeUsername(input.username);
  const password = input.password.trim();
  if (!username || password.length < 6) {
    throw new Error("Username and a minimum 6-character password are required.");
  }
  const passwordHash = hashAdminPassword(password);
  const permissions = normalizePermissions(input.permissions);
  await sql`
    INSERT INTO admin_users (username, password_hash, permissions_json, is_active, updated_at)
    VALUES (${username}, ${passwordHash}, ${JSON.stringify(permissions)}::jsonb, true, now())
    ON CONFLICT (username) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        permissions_json = EXCLUDED.permissions_json,
        is_active = true,
        updated_at = now()
  `;
}

export async function listManagedAdmins(): Promise<
  Array<{ id: number; username: string; permissions: AdminPermission[]; is_active: boolean; created_at: string }>
> {
  await ensureAdminUsersTable();
  const rows = (await sql`
    SELECT id, username, permissions_json, is_active, created_at
    FROM admin_users
    ORDER BY created_at DESC
  `) as Array<{
    id: number;
    username: string;
    permissions_json: unknown;
    is_active: boolean;
    created_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    permissions: normalizePermissions(row.permissions_json),
    is_active: row.is_active,
    created_at: row.created_at,
  }));
}

export async function updateManagedAdmin(input: {
  id: number;
  permissions: AdminPermission[];
  isActive: boolean;
  password?: string;
}): Promise<void> {
  await ensureAdminUsersTable();
  const permissions = normalizePermissions(input.permissions);
  const password = input.password?.trim() || "";
  if (password) {
    const passwordHash = hashAdminPassword(password);
    await sql`
      UPDATE admin_users
      SET permissions_json = ${JSON.stringify(permissions)}::jsonb,
          is_active = ${input.isActive},
          password_hash = ${passwordHash},
          updated_at = now()
      WHERE id = ${input.id}
    `;
    return;
  }
  await sql`
    UPDATE admin_users
    SET permissions_json = ${JSON.stringify(permissions)}::jsonb,
        is_active = ${input.isActive},
        updated_at = now()
    WHERE id = ${input.id}
  `;
}

export function getAdminCookieName(): string {
  return ADMIN_COOKIE_NAME;
}

export function getAdminSessionSecret(): string {
  return getEnvValue("ADMIN_SESSION_SECRET");
}

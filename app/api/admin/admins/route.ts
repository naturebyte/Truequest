import { NextRequest, NextResponse } from "next/server";
import {
  type AdminPermission,
  ADMIN_PERMISSION_KEYS,
  adminCan,
  createManagedAdmin,
  listManagedAdmins,
  resolveAdminSessionFromRequest,
  updateManagedAdmin,
} from "@/lib/admin-auth";

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parsePermissions(value: unknown): AdminPermission[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const allowed = new Set<string>(ADMIN_PERMISSION_KEYS);
  return value.filter(
    (entry): entry is AdminPermission => typeof entry === "string" && allowed.has(entry),
  );
}

async function requireSuperAdmin(req: NextRequest) {
  const session = await resolveAdminSessionFromRequest(req);
  if (!adminCan(session, "admin_management:manage")) {
    return null;
  }
  return session;
}

export async function GET(req: NextRequest) {
  try {
    if (!(await requireSuperAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const admins = await listManagedAdmins();
    return NextResponse.json({ admins, permissionKeys: ADMIN_PERMISSION_KEYS }, { status: 200 });
  } catch (error) {
    console.error("Error listing admin users:", error);
    return NextResponse.json({ error: "Unable to fetch admin users." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await requireSuperAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const username = normalizeString(body.username);
    const password = normalizeString(body.password);
    const permissions = parsePermissions(body.permissions);
    if (!username || !password || permissions.length === 0) {
      return NextResponse.json(
        { error: "Username, password and at least one permission are required." },
        { status: 400 },
      );
    }
    await createManagedAdmin({ username, password, permissions });
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Error creating admin user:", error);
    return NextResponse.json({ error: "Unable to create admin user." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!(await requireSuperAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const id = Number(body.id);
    const permissions = parsePermissions(body.permissions);
    const isActive = Boolean(body.isActive);
    const password = normalizeString(body.password);
    if (!id || permissions.length === 0) {
      return NextResponse.json({ error: "Valid id and permissions are required." }, { status: 400 });
    }
    await updateManagedAdmin({
      id,
      permissions,
      isActive,
      password: password || undefined,
    });
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Error updating admin user:", error);
    return NextResponse.json({ error: "Unable to update admin user." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  getAdminCookieName,
  getAdminPassword,
  getAdminSessionSecret,
  getAdminUsername,
} from "@/lib/admin-auth";

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = normalizeString(body.username);
    const password = normalizeString(body.password);

    if (username !== getAdminUsername() || password !== getAdminPassword()) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ status: "authenticated" }, { status: 200 });
    response.cookies.set({
      name: getAdminCookieName(),
      value: getAdminSessionSecret(),
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (error) {
    console.error("Error in admin login:", error);
    return NextResponse.json(
      { error: "Unable to process login right now." },
      { status: 500 },
    );
  }
}

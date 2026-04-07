import { NextResponse } from "next/server";
import { getAdminCookieName } from "@/lib/admin-auth";

export async function POST() {
  const response = NextResponse.json({ status: "logged_out" }, { status: 200 });
  response.cookies.set({
    name: getAdminCookieName(),
    value: "",
    path: "/",
    maxAge: 0,
  });

  return response;
}

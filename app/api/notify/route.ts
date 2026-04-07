import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail = typeof body.email === "string" ? body.email : "";
    const email = rawEmail.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 },
      );
    }

    await sql`
      CREATE TABLE IF NOT EXISTS notify_emails (
        id serial PRIMARY KEY,
        email text UNIQUE NOT NULL,
        created_at timestamptz DEFAULT now()
      )
    `;

    const existing =
      (await sql`SELECT id FROM notify_emails WHERE email = ${email} LIMIT 1`) as {
        id: number;
      }[];

    if (existing.length > 0) {
      return NextResponse.json({ status: "exists" }, { status: 200 });
    }

    try {
      await sql`INSERT INTO notify_emails (email) VALUES (${email})`;
    } catch (error: unknown) {
      const postgresError = error as { code?: string };
      if (postgresError.code === "23505") {
        return NextResponse.json({ status: "exists" }, { status: 200 });
      }
      throw error;
    }

    return NextResponse.json({ status: "subscribed" }, { status: 200 });
  } catch (error) {
    console.error("Error handling notify POST:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 },
    );
  }
}


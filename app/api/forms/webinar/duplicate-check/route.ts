import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureWebinarTablesOnce } from "@/lib/webinar-db";
import { WEBINAR_DUPLICATE_PHONE_MESSAGE } from "@/lib/webinar-registration-messages";
import { parseWebinarSlug } from "@/lib/webinar-utils";

export async function GET(req: NextRequest) {
  const slug = parseWebinarSlug(req.nextUrl.searchParams.get("slug"));
  const phoneDigits = (req.nextUrl.searchParams.get("phone") ?? "").replace(/\D/g, "");

  if (!slug || phoneDigits.length !== 10) {
    return NextResponse.json({ duplicate: false }, { status: 200 });
  }

  try {
    await ensureWebinarTablesOnce();

    const webinarRows = (await sql`
      SELECT id
      FROM webinars
      WHERE slug = ${slug} AND is_active = true
      LIMIT 1
    `) as { id: number }[];

    const webinarId = webinarRows[0]?.id;
    if (!webinarId) {
      return NextResponse.json({ duplicate: false }, { status: 200 });
    }

    const dup = (await sql`
      SELECT id
      FROM webinar_registrations
      WHERE webinar_id = ${webinarId}
        AND regexp_replace(phone_number, '[^0-9]', '', 'g') = ${phoneDigits}
      LIMIT 1
    `) as { id: number }[];

    if (dup.length > 0) {
      return NextResponse.json({
        duplicate: true,
        message: WEBINAR_DUPLICATE_PHONE_MESSAGE,
      });
    }

    return NextResponse.json({ duplicate: false }, { status: 200 });
  } catch (error) {
    console.error("Webinar duplicate-check error:", error);
    return NextResponse.json({ duplicate: false }, { status: 200 });
  }
}

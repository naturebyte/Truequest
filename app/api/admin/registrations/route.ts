import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  getAdminCookieName,
  getAdminSessionSecret,
} from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  try {
    const authCookie = req.cookies.get(getAdminCookieName())?.value;

    if (authCookie !== getAdminSessionSecret()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await sql`
      CREATE TABLE IF NOT EXISTS student_registrations (
        id serial PRIMARY KEY,
        reg_no text UNIQUE NOT NULL,
        name text NOT NULL,
        whatsapp_number text NOT NULL,
        email_id text NOT NULL,
        course_selected text,
        qualification text NOT NULL,
        current_status text,
        last_institution_attended text,
        place text NOT NULL,
        date_of_birth date NOT NULL,
        created_at timestamptz DEFAULT now()
      )
    `;

    const registrations = (await sql`
      SELECT
        id,
        reg_no,
        name,
        whatsapp_number,
        email_id,
        course_selected,
        qualification,
        current_status,
        last_institution_attended,
        place,
        date_of_birth,
        created_at
      FROM student_registrations
      ORDER BY created_at DESC
    `) as Array<{
      id: number;
      reg_no: string;
      name: string;
      whatsapp_number: string;
      email_id: string;
      course_selected: string | null;
      qualification: string;
      current_status: string | null;
      last_institution_attended: string | null;
      place: string;
      date_of_birth: string;
      created_at: string;
    }>;

    return NextResponse.json({ registrations }, { status: 200 });
  } catch (error) {
    console.error("Error fetching registrations:", error);
    return NextResponse.json(
      { error: "Unable to fetch registrations." },
      { status: 500 },
    );
  }
}

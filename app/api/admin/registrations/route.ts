import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  getAdminCookieName,
  getAdminSessionSecret,
} from "@/lib/admin-auth";

type CourseSelection = "DM" | "HR" | null;
const REGISTRATION_NUMBER_BASE = 500;

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseCourse(value: unknown): CourseSelection {
  const course = normalizeString(value).toUpperCase();

  if (course === "DM" || course === "HR") {
    return course;
  }

  return null;
}

function getRegistrationNumber(course: CourseSelection, sequenceNumber: number): string {
  if (course === "DM") {
    return `TQLDM${sequenceNumber}`;
  }

  if (course === "HR") {
    return `TQLHR${sequenceNumber}`;
  }

  return `TQLGEN${sequenceNumber}`;
}

async function getNextRegistrationSequence(): Promise<number> {
  const maxSequenceResult = (await sql`
    SELECT COALESCE(MAX((substring(reg_no FROM '([0-9]+)$'))::int), ${REGISTRATION_NUMBER_BASE - 1}) AS max_sequence
    FROM student_registrations
    WHERE reg_no IS NOT NULL
  `) as Array<{ max_sequence: number }>;

  return (maxSequenceResult[0]?.max_sequence ?? REGISTRATION_NUMBER_BASE - 1) + 1;
}

async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS student_allowlist (
      id serial PRIMARY KEY,
      name text NOT NULL,
      whatsapp_number text UNIQUE NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS student_registrations (
      id serial PRIMARY KEY,
      reg_no text UNIQUE,
      name text NOT NULL,
      whatsapp_number text UNIQUE NOT NULL,
      email_id text NOT NULL,
      course_selected text,
      qualification text NOT NULL,
      current_status text,
      last_institution_attended text,
      place text NOT NULL,
      date_of_birth date NOT NULL,
      review_status text NOT NULL DEFAULT 'under_review',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )
  `;

  await sql`
    ALTER TABLE student_registrations
    ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'under_review'
  `;

  await sql`
    ALTER TABLE student_registrations
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()
  `;

  await sql`
    ALTER TABLE student_registrations
    ALTER COLUMN reg_no DROP NOT NULL
  `;
}

function isAuthorized(req: NextRequest): boolean {
  const authCookie = req.cookies.get(getAdminCookieName())?.value;
  return authCookie === getAdminSessionSecret();
}

export async function GET(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureTables();

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
        review_status,
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
      review_status: string;
      created_at: string;
    }>;

    const allowlist = (await sql`
      SELECT id, name, whatsapp_number, created_at
      FROM student_allowlist
      ORDER BY created_at DESC
    `) as Array<{
      id: number;
      name: string;
      whatsapp_number: string;
      created_at: string;
    }>;

    return NextResponse.json({ registrations, allowlist }, { status: 200 });
  } catch (error) {
    console.error("Error fetching registrations:", error);
    return NextResponse.json(
      { error: "Unable to fetch registrations." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureTables();
    const body = await req.json().catch(() => ({}));
    const action = normalizeString(body.action);

    if (action === "allowlist_add") {
      const name = normalizeString(body.name);
      const whatsappNumber = normalizeString(body.whatsappNumber);

      if (!name || !whatsappNumber) {
        return NextResponse.json(
          { error: "Name and WhatsApp number are required." },
          { status: 400 },
        );
      }

      await sql`
        INSERT INTO student_allowlist (name, whatsapp_number, updated_at)
        VALUES (${name}, ${whatsappNumber}, now())
        ON CONFLICT (whatsapp_number) DO UPDATE
        SET name = EXCLUDED.name, updated_at = now()
      `;

      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("Error creating admin registration data:", error);
    return NextResponse.json({ error: "Unable to process request." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureTables();
    const body = await req.json().catch(() => ({}));
    const action = normalizeString(body.action);

    if (action === "allowlist_edit") {
      const id = Number(body.id);
      const name = normalizeString(body.name);
      const whatsappNumber = normalizeString(body.whatsappNumber);

      if (!id || !name || !whatsappNumber) {
        return NextResponse.json({ error: "Invalid allowlist update data." }, { status: 400 });
      }

      await sql`
        UPDATE student_allowlist
        SET name = ${name}, whatsapp_number = ${whatsappNumber}, updated_at = now()
        WHERE id = ${id}
      `;

      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    if (action === "registration_edit") {
      const id = Number(body.id);
      const name = normalizeString(body.name);
      const emailId = normalizeString(body.emailId).toLowerCase();
      const courseSelected = parseCourse(body.courseSelected);
      const qualification = normalizeString(body.qualification);
      const currentStatus = normalizeString(body.currentStatus);
      const lastInstitutionAttended = normalizeString(body.lastInstitutionAttended);
      const place = normalizeString(body.place);
      const dateOfBirth = normalizeString(body.dateOfBirth);

      if (!id || !name || !emailId || !qualification || !place || !dateOfBirth) {
        return NextResponse.json({ error: "Please fill all required fields." }, { status: 400 });
      }

      await sql`
        UPDATE student_registrations
        SET
          name = ${name},
          email_id = ${emailId},
          course_selected = ${courseSelected},
          qualification = ${qualification},
          current_status = ${currentStatus || null},
          last_institution_attended = ${lastInstitutionAttended || null},
          place = ${place},
          date_of_birth = ${dateOfBirth},
          updated_at = now()
        WHERE id = ${id}
      `;

      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    if (action === "registration_approve") {
      const id = Number(body.id);
      if (!id) {
        return NextResponse.json({ error: "Registration id is required." }, { status: 400 });
      }

      const targetRow = (await sql`
        SELECT course_selected, reg_no
        FROM student_registrations
        WHERE id = ${id}
        LIMIT 1
      `) as Array<{ course_selected: string | null; reg_no: string | null }>;

      if (!targetRow[0]) {
        return NextResponse.json({ error: "Registration not found." }, { status: 404 });
      }

      if (targetRow[0].reg_no) {
        await sql`
          UPDATE student_registrations
          SET review_status = 'approved', updated_at = now()
          WHERE id = ${id}
        `;

        return NextResponse.json({ status: "ok", regNo: targetRow[0].reg_no }, { status: 200 });
      }

      const courseSelected = parseCourse(targetRow[0].course_selected);
      const nextSequence = await getNextRegistrationSequence();
      const regNo = getRegistrationNumber(courseSelected, nextSequence);

      await sql`
        UPDATE student_registrations
        SET reg_no = ${regNo}, review_status = 'approved', updated_at = now()
        WHERE id = ${id}
      `;

      return NextResponse.json({ status: "ok", regNo }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("Error updating admin registration data:", error);
    return NextResponse.json({ error: "Unable to process update." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureTables();
    const body = await req.json().catch(() => ({}));
    const action = normalizeString(body.action);
    const id = Number(body.id);

    if (!id) {
      return NextResponse.json({ error: "ID is required." }, { status: 400 });
    }

    if (action === "allowlist_delete") {
      await sql`DELETE FROM student_allowlist WHERE id = ${id}`;
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    if (action === "registration_delete") {
      await sql`DELETE FROM student_registrations WHERE id = ${id}`;
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("Error deleting admin registration data:", error);
    return NextResponse.json({ error: "Unable to process delete." }, { status: 500 });
  }
}

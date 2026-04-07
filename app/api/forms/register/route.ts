import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

type CourseSelection = "DM" | "HR" | null;
type ReviewStatus = "approved" | "under_review";
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

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS student_registrations_whatsapp_number_idx
    ON student_registrations (whatsapp_number)
  `;
}

async function getNextRegistrationSequence(): Promise<number> {
  const maxSequenceResult = (await sql`
    SELECT COALESCE(MAX((substring(reg_no FROM '([0-9]+)$'))::int), ${REGISTRATION_NUMBER_BASE - 1}) AS max_sequence
    FROM student_registrations
    WHERE reg_no IS NOT NULL
  `) as Array<{ max_sequence: number }>;

  return (maxSequenceResult[0]?.max_sequence ?? REGISTRATION_NUMBER_BASE - 1) + 1;
}

export async function GET(req: NextRequest) {
  try {
    await ensureTables();
    const phone = normalizeString(req.nextUrl.searchParams.get("phone"));

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }

    const existingRegistration = (await sql`
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
        review_status
      FROM student_registrations
      WHERE whatsapp_number = ${phone}
      LIMIT 1
    `) as Array<{
      id: number;
      reg_no: string | null;
      name: string;
      whatsapp_number: string;
      email_id: string;
      course_selected: string | null;
      qualification: string;
      current_status: string | null;
      last_institution_attended: string | null;
      place: string;
      date_of_birth: string;
      review_status: ReviewStatus;
    }>;

    if (existingRegistration[0]?.reg_no) {
      return NextResponse.json(
        {
          status: "already_registered",
          registration: existingRegistration[0],
        },
        { status: 200 },
      );
    }

    if (existingRegistration[0]?.review_status === "under_review") {
      return NextResponse.json(
        {
          status: "under_review",
          registration: existingRegistration[0],
        },
        { status: 200 },
      );
    }

    const allowlistRow = (await sql`
      SELECT id, name, whatsapp_number
      FROM student_allowlist
      WHERE whatsapp_number = ${phone}
      LIMIT 1
    `) as Array<{ id: number; name: string; whatsapp_number: string }>;

    if (allowlistRow[0]) {
      return NextResponse.json(
        {
          status: "allowlisted",
          student: allowlistRow[0],
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ status: "not_found" }, { status: 200 });
  } catch (error) {
    console.error("Error fetching registration details:", error);
    return NextResponse.json(
      { error: "Unable to verify this phone number right now." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTables();
    const body = await req.json().catch(() => ({}));

    const name = normalizeString(body.name);
    const whatsappNumber = normalizeString(body.whatsappNumber);
    const emailId = normalizeString(body.emailId).toLowerCase();
    const courseSelected = parseCourse(body.courseSelected);
    const qualification = normalizeString(body.qualification);
    const currentStatus = normalizeString(body.currentStatus);
    const lastInstitutionAttended = normalizeString(body.lastInstitutionAttended);
    const place = normalizeString(body.place);
    const dateOfBirth = normalizeString(body.dateOfBirth);

    if (!name || !whatsappNumber || !emailId || !qualification || !place || !dateOfBirth) {
      return NextResponse.json(
        { error: "Please fill all required fields." },
        { status: 400 },
      );
    }

    if (!emailId.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }

    const existingRegistration = (await sql`
      SELECT id, reg_no, review_status
      FROM student_registrations
      WHERE whatsapp_number = ${whatsappNumber}
      LIMIT 1
    `) as Array<{
      id: number;
      reg_no: string | null;
      review_status: ReviewStatus;
    }>;

    if (existingRegistration[0]?.reg_no) {
      return NextResponse.json(
        {
          status: "already_registered",
          regNo: existingRegistration[0].reg_no,
          studentName: name,
        },
        { status: 200 },
      );
    }

    const allowlistRow = (await sql`
      SELECT id
      FROM student_allowlist
      WHERE whatsapp_number = ${whatsappNumber}
      LIMIT 1
    `) as Array<{ id: number }>;

    const isAllowlisted = Boolean(allowlistRow[0]);
    let regNo: string | null = null;
    const reviewStatus: ReviewStatus = isAllowlisted ? "approved" : "under_review";

    if (isAllowlisted) {
      const nextSequence = await getNextRegistrationSequence();
      regNo = getRegistrationNumber(courseSelected, nextSequence);
    }

    await sql`
      INSERT INTO student_registrations (
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
        updated_at
      ) VALUES (
        ${regNo},
        ${name},
        ${whatsappNumber},
        ${emailId},
        ${courseSelected},
        ${qualification},
        ${currentStatus || null},
        ${lastInstitutionAttended || null},
        ${place},
        ${dateOfBirth},
        ${reviewStatus},
        now()
      )
      ON CONFLICT (whatsapp_number) DO UPDATE
      SET
        name = EXCLUDED.name,
        email_id = EXCLUDED.email_id,
        course_selected = EXCLUDED.course_selected,
        qualification = EXCLUDED.qualification,
        current_status = EXCLUDED.current_status,
        last_institution_attended = EXCLUDED.last_institution_attended,
        place = EXCLUDED.place,
        date_of_birth = EXCLUDED.date_of_birth,
        review_status = EXCLUDED.review_status,
        reg_no = EXCLUDED.reg_no,
        updated_at = now()
    `;

    if (isAllowlisted && regNo) {
      return NextResponse.json(
        { status: "registered", regNo, studentName: name },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { status: "under_review", studentName: name },
      { status: 200 },
    );
  } catch (error: unknown) {
    const postgresError = error as { code?: string };
    if (postgresError.code === "23505") {
      return NextResponse.json(
        { error: "Registration already exists. Please contact admin." },
        { status: 409 },
      );
    }

    console.error("Error while creating registration:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

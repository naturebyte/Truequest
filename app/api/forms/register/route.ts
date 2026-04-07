import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

type CourseSelection = "DM" | "HR" | null;

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

function getRegistrationNumber(course: CourseSelection, existingCount: number): string {
  if (course === "DM") {
    return `TQLDM${786 + existingCount}`;
  }

  if (course === "HR") {
    return `TQLHR${787 + existingCount}`;
  }

  return `TQLGEN${900 + existingCount}`;
}

export async function POST(req: NextRequest) {
  try {
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

    const existingCountResult =
      courseSelected === null
        ? ((await sql`
      SELECT COUNT(*)::int AS count
      FROM student_registrations
      WHERE course_selected IS NULL
    `) as { count: number }[])
        : ((await sql`
      SELECT COUNT(*)::int AS count
      FROM student_registrations
      WHERE course_selected = ${courseSelected}
    `) as { count: number }[]);

    const existingCount = existingCountResult[0]?.count ?? 0;
    const regNo = getRegistrationNumber(courseSelected, existingCount);

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
        date_of_birth
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
        ${dateOfBirth}
      )
    `;

    return NextResponse.json(
      { status: "registered", regNo, studentName: name },
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

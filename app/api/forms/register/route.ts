import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import nodemailer from "nodemailer";
import { createDecipheriv, scryptSync } from "crypto";

type CourseSelection = "DM" | "HR" | null;
type ReviewStatus = "approved" | "under_review";
const REGISTRATION_NUMBER_BASE = 786;

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

function isEncryptedSmtpPassword(value: string): boolean {
  return value.startsWith("enc:v1:");
}

function decryptSmtpPassword(value: string): string {
  if (!isEncryptedSmtpPassword(value)) {
    return value;
  }

  const parts = value.split(":");
  if (parts.length !== 5) {
    throw new Error("Invalid encrypted SMTP password format.");
  }

  const secret = (process.env.SMTP_SETTINGS_SECRET || process.env.ADMIN_SESSION_SECRET || "").trim();
  if (!secret) {
    throw new Error("SMTP secret is not configured.");
  }

  const [, , ivPart, tagPart, encryptedPart] = parts;
  const iv = Buffer.from(ivPart, "base64url");
  const authTag = Buffer.from(tagPart, "base64url");
  const encrypted = Buffer.from(encryptedPart, "base64url");
  const key = scryptSync(secret, "tq-smtp-password-salt", 32);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

function buildRegistrationCongratsHtml({
  studentName,
  regNo,
  courseSelected,
  nextBatchStartDate,
}: {
  studentName: string;
  regNo: string;
  courseSelected: CourseSelection;
  nextBatchStartDate: string | null;
}): string {
  const courseLabel =
    courseSelected === "HR" ? "Human Resource (HR)" : courseSelected === "DM" ? "Digital Marketing" : "General";
  const nextBatchLabel = nextBatchStartDate
    ? new Date(nextBatchStartDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "To be announced";

  return `<!doctype html>
<html>
  <head>
    <meta name="color-scheme" content="light only" />
    <meta name="supported-color-schemes" content="light" />
    <style>
      .tq-header-title,
      .tq-header-subtitle {
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
      }
      @media (prefers-color-scheme: dark) {
        .tq-header-title,
        .tq-header-subtitle {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
        }
      }
      [data-ogsc] .tq-header-title,
      [data-ogsc] .tq-header-subtitle {
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#eef2ff;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2ff;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #c7d2fe;">
            <tr>
              <td style="background:linear-gradient(135deg,#221bff,#2b24ff,#3f37ff);padding:28px;color:#ffffff;">
                <div style="text-align:right;margin-bottom:8px;">
                  <img
                    src="https://truequestlearning.com/logo-emailer.png"
                    alt="TrueQuest Learning Logo"
                    width="56"
                    height="56"
                    style="display:inline-block;"
                  />
                </div>
                <h1 class="tq-header-title" style="margin:0;font-size:26px;line-height:1.3;color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;">Congratulations! Registration Confirmed</h1>
                <p class="tq-header-subtitle" style="margin:10px 0 0 0;font-size:14px;line-height:1.6;opacity:.94;color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;">
                  Welcome to TrueQuest Learning. Your admission is successfully registered.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px;">
                <div style="margin:0 0 14px 0;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                  <img
                    src="https://truequestlearning.com/banner-emailer.jpg"
                    alt="TrueQuest Learning Banner"
                    width="584"
                    style="display:block;width:100%;height:auto;"
                  />
                </div>
                <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;">Hi ${studentName},</p>
                <p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;">
                  Your registration has been completed successfully.
                </p>
                <div style="margin:0 0 16px 0;">
                  <p style="margin:0 0 6px 0;font-size:13px;color:#334155;font-weight:700;">Registration Code:</p>
                  <div
                    style="text-align:center;font-size:48px;line-height:1.1;font-weight:800;letter-spacing:3px;color:#2ea85f;"
                  >
                    ${regNo}
                  </div>
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                  <tr>
                    <td style="padding:14px;">
                      <div style="font-size:13px;color:#334155;line-height:1.8;">
                        <strong>Course:</strong> ${courseLabel}<br/>
                        <strong>Next Batch Start:</strong> ${nextBatchLabel}
                      </div>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 12px 0;font-size:13px;line-height:1.8;color:#334155;">
                  For more details, visit:
                  <a href="https://truequestlearning.com" style="color:#2b24ff;text-decoration:underline;">truequestlearning.com</a>
                </p>
                <p style="margin:0 0 12px 0;font-size:13px;line-height:1.8;color:#334155;">
                  Contact: +91 97470 03913 / +91 97470 03918 | Sulthan Bathery, Wayanad
                </p>
                <p style="margin:0 0 14px 0;font-size:13px;line-height:1.8;color:#334155;">
                  📸 <a href="https://www.instagram.com/truequestlearning" style="color:#2b24ff;text-decoration:underline;">Instagram</a> |
                  👍 <a href="https://www.facebook.com/truequestlearning" style="color:#2b24ff;text-decoration:underline;">Facebook</a> |
                  💼 <a href="https://www.linkedin.com/company/truequestlearning/" style="color:#2b24ff;text-decoration:underline;">LinkedIn</a> |
                  ▶️ <a href="https://youtube.com/@truequestlearning?si=v8rq-EW8KFl4JGY2" style="color:#2b24ff;text-decoration:underline;">YouTube</a>
                </p>
                <p style="margin:16px 0 0 0;font-size:14px;line-height:1.7;">
                  Regards,<br/><strong>Team TrueQuest Learning</strong>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendRegistrationCongratsEmail(params: {
  studentName: string;
  emailId: string;
  regNo: string;
  courseSelected: CourseSelection;
}): Promise<void> {
  const smtpRows = (await sql`
    SELECT host, port, username, password
    FROM smtp_settings
    WHERE id = 1
    LIMIT 1
  `) as Array<{
    host: string | null;
    port: string | null;
    username: string | null;
    password: string | null;
  }>;

  const customSmtp = smtpRows[0];
  const customPassword = customSmtp?.password?.trim()
    ? decryptSmtpPassword(customSmtp.password.trim())
    : "";
  const hasCustom =
    Boolean(customSmtp?.host?.trim()) &&
    Boolean(customSmtp?.port?.trim()) &&
    Boolean(customSmtp?.username?.trim()) &&
    Boolean(customPassword);

  const smtpHost = hasCustom ? customSmtp?.host?.trim() || "" : process.env.SMTP_HOST?.trim() || "";
  const smtpPortRaw = hasCustom ? customSmtp?.port?.trim() || "" : process.env.SMTP_PORT?.trim() || "";
  const smtpUser = hasCustom ? customSmtp?.username?.trim() || "" : process.env.SMTP_USER?.trim() || "";
  const smtpPassword = hasCustom ? customPassword : process.env.SMTP_PASSWORD?.trim() || "";
  const smtpPort = Number(smtpPortRaw);

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
    throw new Error("SMTP is not configured.");
  }

  const adminSettingsRows = (await sql`
    SELECT next_batch_start_date
    FROM admin_settings
    WHERE id = 1
    LIMIT 1
  `) as Array<{ next_batch_start_date: string | null }>;
  const nextBatchStartDate = adminSettingsRows[0]?.next_batch_start_date || null;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPassword },
  });

  await transporter.sendMail({
    from: smtpUser,
    to: params.emailId,
    subject: `TrueQuest Learning | Registration Confirmed (${params.regNo})`,
    text: `Hi ${params.studentName}, your registration is confirmed. Registration Code: ${params.regNo}.`,
    html: buildRegistrationCongratsHtml({
      studentName: params.studentName,
      regNo: params.regNo,
      courseSelected: params.courseSelected,
      nextBatchStartDate,
    }),
  });
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

  await sql`
    CREATE TABLE IF NOT EXISTS smtp_settings (
      id integer PRIMARY KEY,
      host text,
      port text,
      username text,
      password text,
      updated_at timestamptz DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS admin_settings (
      id integer PRIMARY KEY,
      next_batch_start_date date,
      updated_at timestamptz DEFAULT now()
    )
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

    if (isAllowlisted) {
      await sql`
        UPDATE student_allowlist
        SET name = ${name}, updated_at = now()
        WHERE whatsapp_number = ${whatsappNumber}
      `;
    }

    if (isAllowlisted && regNo) {
      try {
        await sendRegistrationCongratsEmail({
          studentName: name,
          emailId,
          regNo,
          courseSelected,
        });
      } catch (mailError) {
        console.error("Registration email send failed:", mailError);
      }

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

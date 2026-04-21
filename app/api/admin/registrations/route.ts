import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import nodemailer from "nodemailer";
import {
  getAdminCookieName,
  getAdminSessionSecret,
} from "@/lib/admin-auth";
import {
  isValidWebinarSlug,
  normalizePublicAssetPath,
  parseWebinarSlug,
  slugifyTitle,
} from "@/lib/webinar-utils";

type CourseSelection = "DM" | "HR" | null;
type AttendanceMode = "online" | "offline" | null;
type FeePlan = "monthly_3x" | "one_time";
const REGISTRATION_NUMBER_BASE = 786;

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function ensureUniqueWebinarSlug(baseSlug: string): Promise<string> {
  const trimmedBase = baseSlug.slice(0, 100);
  let candidate = trimmedBase;
  for (let suffix = 0; suffix < 50; suffix++) {
    const rows = (await sql`
      SELECT id FROM webinars WHERE slug = ${candidate} LIMIT 1
    `) as Array<{ id: number }>;
    if (!rows[0]) {
      return candidate;
    }
    candidate = `${trimmedBase}-${suffix + 2}`.slice(0, 120);
  }
  return `${trimmedBase}-${Date.now()}`.slice(0, 120);
}

function parseCourse(value: unknown): CourseSelection {
  const course = normalizeString(value).toUpperCase();

  if (course === "DM" || course === "HR") {
    return course;
  }

  return null;
}

function parseFeePlan(value: unknown): FeePlan {
  const feePlan = normalizeString(value);
  return feePlan === "one_time" ? "one_time" : "monthly_3x";
}

function getSmtpEncryptionSecret(): string {
  return (process.env.SMTP_SETTINGS_SECRET || getAdminSessionSecret()).trim();
}

function isEncryptedSmtpPassword(value: string): boolean {
  return value.startsWith("enc:v1:");
}

function encryptSmtpPassword(password: string): string {
  const secret = getSmtpEncryptionSecret();
  const iv = randomBytes(12);
  const key = scryptSync(secret, "tq-smtp-password-salt", 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `enc:v1:${iv.toString("base64url")}:${authTag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

function decryptSmtpPassword(value: string): string {
  if (!isEncryptedSmtpPassword(value)) {
    return value;
  }

  const parts = value.split(":");
  if (parts.length !== 5) {
    throw new Error("Invalid encrypted SMTP password format.");
  }

  const [, , ivPart, tagPart, encryptedPart] = parts;
  const iv = Buffer.from(ivPart, "base64url");
  const authTag = Buffer.from(tagPart, "base64url");
  const encrypted = Buffer.from(encryptedPart, "base64url");
  const key = scryptSync(getSmtpEncryptionSecret(), "tq-smtp-password-salt", 32);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

function buildNotificationEmailHtml(nextBatchStartDate: string | null): string {
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
              <td style="background:linear-gradient(135deg,#221bff,#2b24ff,#3f37ff);padding:28px 28px 20px 28px;color:#ffffff;">
                <div style="text-align:right;margin-bottom:8px;">
                  <img src="https://truequestlearning.com/logo-emailer.png" alt="TrueQuest Learning Logo" width="56" height="56" style="display:inline-block;" />
                </div>
                <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.9;">TrueQuest Learning</div>
                <h1 class="tq-header-title" style="margin:8px 0 0 0;font-size:26px;line-height:1.25;color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;">Thanks for your notification request</h1>
                <p class="tq-header-subtitle" style="margin:10px 0 0 0;font-size:14px;line-height:1.6;opacity:.92;color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;">
                  We are excited to keep you updated on upcoming batches, admission announcements, and course launches.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px;">
                <div style="margin:0 0 14px 0;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                  <img src="https://truequestlearning.com/banner-emailer.jpg" alt="TrueQuest Learning Banner" width="584" style="display:block;width:100%;height:auto;" />
                </div>
                <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;">Hi there,</p>
                <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;">
                  You are now on the TrueQuest notification list. We will notify you about:
                </p>
                <ul style="margin:0 0 16px 18px;padding:0;font-size:14px;line-height:1.8;">
                  <li>Admission opening updates</li>
                  <li>Batch schedules and start dates</li>
                  <li>Course information and enrollment support</li>
                </ul>
                <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;">
                  <strong>Next batch start:</strong> ${nextBatchLabel}
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:6px 0 18px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                  <tr>
                    <td style="padding:14px;">
                      <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:8px;">Need help right away?</div>
                      <div style="font-size:13px;line-height:1.8;color:#334155;">
                        Phone: +91 97470 03913 / +91 97470 03918<br/>
                        Location: Sulthan Bathery, Wayanad
                      </div>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 14px 0;font-size:13px;line-height:1.8;color:#334155;">
                  For more details, visit our website:
                  <a href="https://truequestlearning.com" style="color:#2b24ff;text-decoration:underline;">truequestlearning.com</a>
                </p>
                <p style="margin:0 0 14px 0;font-size:13px;line-height:1.8;color:#334155;">
                  Follow us for regular updates:<br/>
                  📸 <a href="https://www.instagram.com/truequestlearning" style="color:#2b24ff;text-decoration:underline;">Instagram</a> |
                  👍 <a href="https://www.facebook.com/truequestlearning" style="color:#2b24ff;text-decoration:underline;">Facebook</a> |
                  💼 <a href="https://www.linkedin.com/company/truequestlearning/" style="color:#2b24ff;text-decoration:underline;">LinkedIn</a> |
                  ▶️ <a href="https://youtube.com/@truequestlearning?si=v8rq-EW8KFl4JGY2" style="color:#2b24ff;text-decoration:underline;">YouTube</a><br/>
                  📍 <a href="https://maps.app.goo.gl/n1m6JRndY7f8q4hP6?g_st=ic" style="color:#2b24ff;text-decoration:underline;">Sulthan Bathery, Wayanad</a>
                </p>
                <p style="margin:18px 0 0 0;font-size:14px;line-height:1.7;">
                  Regards,<br/>
                  <strong>Team TrueQuest Learning</strong>
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

function buildRegistrationApprovedHtml(params: {
  studentName: string;
  regNo: string;
  courseSelected: CourseSelection;
  nextBatchStartDate: string | null;
}): string {
  const courseLabel =
    params.courseSelected === "HR"
      ? "Human Resource (HR)"
      : params.courseSelected === "DM"
        ? "Digital Marketing"
        : "General";
  const nextBatchLabel = params.nextBatchStartDate
    ? new Date(params.nextBatchStartDate).toLocaleDateString("en-IN", {
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
                <h1 class="tq-header-title" style="margin:0;font-size:26px;line-height:1.3;color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;">Your registration has been approved</h1>
                <p class="tq-header-subtitle" style="margin:10px 0 0 0;font-size:14px;line-height:1.6;opacity:.94;color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;">
                  Welcome to TrueQuest Learning. Your admission is successfully approved.
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
                <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;">Hi ${params.studentName},</p>
                <p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;">
                  Your registration has been approved and your Registration Code is now active.
                </p>
                <div style="margin:0 0 16px 0;">
                  <p style="margin:0 0 6px 0;font-size:13px;color:#334155;font-weight:700;">Registration Code:</p>
                  <div
                    style="text-align:center;font-size:48px;line-height:1.1;font-weight:800;letter-spacing:3px;color:#2ea85f;"
                  >
                    ${params.regNo}
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

function parseAttendanceMode(value: unknown): AttendanceMode {
  const mode = normalizeString(value).toLowerCase();

  if (mode === "online" || mode === "offline") {
    return mode;
  }

  return null;
}

function getRegistrationNumber(
  course: CourseSelection,
  attendanceMode: AttendanceMode,
  sequenceNumber: number,
): string {
  const prefixBase = attendanceMode === "online" ? "TQLO" : "TQL";

  if (course === "DM") {
    return `${prefixBase}DM${sequenceNumber}`;
  }

  if (course === "HR") {
    return `${prefixBase}HR${sequenceNumber}`;
  }

  return `${prefixBase}GEN${sequenceNumber}`;
}

function getTotalFee(attendanceMode: AttendanceMode): number {
  return attendanceMode === "offline" ? 30000 : 25000;
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

  await sql`
    ALTER TABLE student_registrations
    ADD COLUMN IF NOT EXISTS fee_plan text NOT NULL DEFAULT 'monthly_3x'
  `;

  await sql`
    ALTER TABLE student_registrations
    ADD COLUMN IF NOT EXISTS total_fee integer NOT NULL DEFAULT 30000
  `;

  await sql`
    ALTER TABLE student_registrations
    ADD COLUMN IF NOT EXISTS learning_mode text
  `;

  await sql`
    ALTER TABLE student_registrations
    ADD COLUMN IF NOT EXISTS academic_qualification text
  `;

  await sql`
    UPDATE student_registrations
    SET academic_qualification = qualification
    WHERE academic_qualification IS NULL
      AND lower(qualification) NOT IN ('online', 'offline')
  `;

  await sql`
    UPDATE student_registrations
    SET learning_mode = qualification
    WHERE learning_mode IS NULL
      AND lower(qualification) IN ('online', 'offline')
  `;

  await sql`
    UPDATE student_registrations
    SET learning_mode = CASE
      WHEN lower(qualification) IN ('online', 'offline') THEN lower(qualification)
      WHEN reg_no LIKE 'TQLO%' THEN 'online'
      WHEN reg_no LIKE 'TQL%' THEN 'offline'
      ELSE NULL
    END
    WHERE learning_mode IS NULL
       OR lower(learning_mode) NOT IN ('online', 'offline')
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS student_fee_payments (
      id serial PRIMARY KEY,
      registration_id integer NOT NULL REFERENCES student_registrations(id) ON DELETE CASCADE,
      amount integer NOT NULL CHECK (amount > 0),
      payment_date date NOT NULL,
      payment_method text,
      notes text,
      created_at timestamptz DEFAULT now()
    )
  `;

  await sql`
    ALTER TABLE student_fee_payments
    ADD COLUMN IF NOT EXISTS payment_method text
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

  await sql`
    CREATE TABLE IF NOT EXISTS webinars (
      id serial PRIMARY KEY,
      title text NOT NULL,
      event_date date NOT NULL,
      event_time time NOT NULL,
      location text NOT NULL DEFAULT 'Sultan Bathery, Wayanad',
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )
  `;

  await sql`
    ALTER TABLE webinars
    ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true
  `;

  await sql`
    ALTER TABLE webinars
    ADD COLUMN IF NOT EXISTS slug text
  `;

  await sql`
    ALTER TABLE webinars
    ADD COLUMN IF NOT EXISTS banner_image_path text
  `;

  await sql`
    UPDATE webinars
    SET slug = 'webinar-' || id::text
    WHERE slug IS NULL OR trim(slug) = ''
  `;

  await sql`
    ALTER TABLE webinars
    ALTER COLUMN slug SET NOT NULL
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS webinars_slug_unique_idx ON webinars (slug)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS webinar_registrations (
      id serial PRIMARY KEY,
      name text NOT NULL,
      phone_number text NOT NULL,
      email_id text NOT NULL,
      qualification text NOT NULL,
      webinar_id integer REFERENCES webinars(id) ON DELETE CASCADE,
      created_at timestamptz DEFAULT now()
    )
  `;

  await sql`
    ALTER TABLE webinar_registrations
    ADD COLUMN IF NOT EXISTS webinar_id integer
  `;

  await sql`
    ALTER TABLE webinar_registrations
    DROP CONSTRAINT IF EXISTS webinar_registrations_webinar_id_fkey
  `;

  await sql`
    ALTER TABLE webinar_registrations
    ADD CONSTRAINT webinar_registrations_webinar_id_fkey
    FOREIGN KEY (webinar_id) REFERENCES webinars(id) ON DELETE CASCADE
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
      WITH fee_stats AS (
        SELECT
          registration_id,
          COALESCE(SUM(amount), 0)::int AS total_paid,
          MAX(payment_date) AS last_payment_date,
          COUNT(*)::int AS payment_count
        FROM student_fee_payments
        GROUP BY registration_id
      ),
      fee_history AS (
        SELECT
          registration_id,
          COALESCE(
            json_agg(
              json_build_object(
                'id', id,
                'payment_method', payment_method,
                'amount', amount,
                'payment_date', payment_date,
                'notes', notes,
                'created_at', created_at
              )
              ORDER BY payment_date DESC, created_at DESC
            ),
            '[]'::json
          ) AS payment_history
        FROM student_fee_payments
        GROUP BY registration_id
      )
      SELECT
        id,
        reg_no,
        name,
        whatsapp_number,
        email_id,
        course_selected,
        COALESCE(academic_qualification, qualification) AS qualification,
        learning_mode,
        current_status,
        last_institution_attended,
        place,
        date_of_birth,
        review_status,
        created_at,
        fee_plan,
        total_fee,
        COALESCE(fee_stats.total_paid, 0) AS total_paid,
        GREATEST(total_fee - COALESCE(fee_stats.total_paid, 0), 0) AS pending_fee,
        fee_stats.last_payment_date,
        COALESCE(fee_stats.payment_count, 0) AS payment_count,
        COALESCE(fee_history.payment_history, '[]'::json) AS payment_history
      FROM student_registrations
      LEFT JOIN fee_stats ON fee_stats.registration_id = student_registrations.id
      LEFT JOIN fee_history ON fee_history.registration_id = student_registrations.id
      ORDER BY created_at DESC
    `) as Array<{
      id: number;
      reg_no: string;
      name: string;
      whatsapp_number: string;
      email_id: string;
      course_selected: string | null;
      qualification: string;
      learning_mode: string | null;
      current_status: string | null;
      last_institution_attended: string | null;
      place: string;
      date_of_birth: string;
      review_status: string;
      created_at: string;
      fee_plan: FeePlan;
      total_fee: number;
      total_paid: number;
      pending_fee: number;
      last_payment_date: string | null;
      payment_count: number;
      payment_history: Array<{
        id: number;
        payment_method: string | null;
        amount: number;
        payment_date: string;
        notes: string | null;
        created_at: string;
      }>;
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

    const transactions = (await sql`
      SELECT
        student_fee_payments.id,
        student_fee_payments.registration_id,
        student_fee_payments.amount,
        student_fee_payments.payment_date,
        student_fee_payments.payment_method,
        student_fee_payments.notes,
        student_fee_payments.created_at,
        student_registrations.reg_no,
        student_registrations.name,
        student_registrations.whatsapp_number
      FROM student_fee_payments
      INNER JOIN student_registrations
        ON student_registrations.id = student_fee_payments.registration_id
      ORDER BY student_fee_payments.payment_date DESC, student_fee_payments.created_at DESC
    `) as Array<{
      id: number;
      registration_id: number;
      amount: number;
      payment_date: string;
      payment_method: string | null;
      notes: string | null;
      created_at: string;
      reg_no: string | null;
      name: string;
      whatsapp_number: string;
    }>;

    await sql`
      CREATE TABLE IF NOT EXISTS offer_enquiries (
        id serial PRIMARY KEY,
        name text NOT NULL,
        phone_number text NOT NULL,
        offer_type text NOT NULL,
        created_at timestamptz DEFAULT now()
      )
    `;

    const brochureRequests = (await sql`
      SELECT id, name, phone_number, offer_type, created_at
      FROM offer_enquiries
      ORDER BY created_at DESC
    `) as Array<{
      id: number;
      name: string;
      phone_number: string;
      offer_type: "HR" | "DIGITAL_MARKETING";
      created_at: string;
    }>;

    const webinars = (await sql`
      SELECT id, slug, title, event_date, event_time, location, banner_image_path, is_active, created_at, updated_at
      FROM webinars
      ORDER BY event_date DESC, event_time DESC
    `) as Array<{
      id: number;
      slug: string;
      title: string;
      event_date: string;
      event_time: string;
      location: string;
      banner_image_path: string | null;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }>;

    const webinarRegistrations = (await sql`
      SELECT
        webinar_registrations.id,
        webinar_registrations.name,
        webinar_registrations.phone_number,
        webinar_registrations.email_id,
        webinar_registrations.qualification,
        webinar_registrations.webinar_id,
        webinars.title AS webinar_title,
        webinars.event_date AS webinar_date,
        webinars.event_time AS webinar_time,
        webinar_registrations.created_at
      FROM webinar_registrations
      LEFT JOIN webinars ON webinars.id = webinar_registrations.webinar_id
      ORDER BY webinar_registrations.created_at DESC
    `) as Array<{
      id: number;
      name: string;
      phone_number: string;
      email_id: string;
      qualification: "12" | "Degree" | "PG" | "Other";
      webinar_id: number | null;
      webinar_title: string | null;
      webinar_date: string | null;
      webinar_time: string | null;
      created_at: string;
    }>;

    await sql`
      CREATE TABLE IF NOT EXISTS notify_emails (
        id serial PRIMARY KEY,
        email text UNIQUE NOT NULL,
        created_at timestamptz DEFAULT now(),
        sent_count integer NOT NULL DEFAULT 0,
        last_sent_at timestamptz
      )
    `;

    await sql`
      ALTER TABLE notify_emails
      ADD COLUMN IF NOT EXISTS sent_count integer NOT NULL DEFAULT 0
    `;

    await sql`
      ALTER TABLE notify_emails
      ADD COLUMN IF NOT EXISTS last_sent_at timestamptz
    `;

    const notificationRequestedUsers = (await sql`
      SELECT id, email, created_at, sent_count, last_sent_at
      FROM notify_emails
      ORDER BY created_at DESC
    `) as Array<{
      id: number;
      email: string;
      created_at: string;
      sent_count: number;
      last_sent_at: string | null;
    }>;

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
    const customPasswordValue = customSmtp?.password?.trim() || "";
    const customPasswordResolved = customPasswordValue
      ? decryptSmtpPassword(customPasswordValue)
      : "";
    const envHost = process.env.SMTP_HOST?.trim() || "";
    const envPort = process.env.SMTP_PORT?.trim() || "";
    const envUser = process.env.SMTP_USER?.trim() || "";
    const envPassword = process.env.SMTP_PASSWORD?.trim() || "";
    const hasCustom =
      Boolean(customSmtp?.host?.trim()) ||
      Boolean(customSmtp?.port?.trim()) ||
      Boolean(customSmtp?.username?.trim()) ||
      Boolean(customPasswordResolved);
    const hasEnv = Boolean(envHost || envPort || envUser || envPassword);
    const source: "custom" | "env" | "unset" = hasCustom ? "custom" : hasEnv ? "env" : "unset";

    const smtpSettings = {
      host: hasCustom ? customSmtp?.host?.trim() || "" : envHost,
      port: hasCustom ? customSmtp?.port?.trim() || "" : envPort,
      user: hasCustom ? customSmtp?.username?.trim() || "" : envUser,
      source,
      password_set: hasCustom
        ? Boolean(customPasswordResolved)
        : Boolean(envPassword),
    };

    const adminSettingsRows = (await sql`
      SELECT next_batch_start_date
      FROM admin_settings
      WHERE id = 1
      LIMIT 1
    `) as Array<{ next_batch_start_date: string | null }>;
    const nextBatchStartDate = adminSettingsRows[0]?.next_batch_start_date || null;

    return NextResponse.json(
      {
        registrations,
        allowlist,
        transactions,
        brochureRequests,
        webinars,
        webinarRegistrations,
        notificationRequestedUsers,
        smtpSettings,
        nextBatchStartDate,
      },
      { status: 200 },
    );
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

    if (action === "webinar_create") {
      const title = normalizeString(body.title);
      const eventDate = normalizeString(body.eventDate);
      const eventTime = normalizeString(body.eventTime);
      const location = normalizeString(body.location) || "Sultan Bathery, Wayanad";

      if (!title || !eventDate || !eventTime) {
        return NextResponse.json(
          { error: "Webinar title, date and time are required." },
          { status: 400 },
        );
      }

      let slugInput = parseWebinarSlug(body.slug);
      if (!slugInput) {
        slugInput = slugifyTitle(title);
      }
      if (!isValidWebinarSlug(slugInput)) {
        slugInput = `${slugInput}-session`.slice(0, 120);
      }
      if (!isValidWebinarSlug(slugInput)) {
        slugInput = `webinar-${Date.now()}`.slice(0, 120);
      }
      if (!isValidWebinarSlug(slugInput)) {
        return NextResponse.json(
          {
            error:
              "Invalid URL slug. Use 3–120 characters: lowercase letters, numbers, and single hyphens between words.",
          },
          { status: 400 },
        );
      }

      const slug = await ensureUniqueWebinarSlug(slugInput);
      const bannerPath = normalizePublicAssetPath(body.bannerImagePath);

      await sql`
        INSERT INTO webinars (title, event_date, event_time, location, slug, banner_image_path, updated_at)
        VALUES (${title}, ${eventDate}, ${eventTime}, ${location}, ${slug}, ${bannerPath}, now())
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

    if (action === "webinar_update") {
      const id = Number(body.id);
      const title = normalizeString(body.title);
      const eventDate = normalizeString(body.eventDate);
      const eventTime = normalizeString(body.eventTime);
      const location = normalizeString(body.location) || "Sultan Bathery, Wayanad";
      const slugInput = parseWebinarSlug(body.slug);

      if (!id || !title || !eventDate || !eventTime || !slugInput) {
        return NextResponse.json({ error: "Invalid webinar update data." }, { status: 400 });
      }

      if (!isValidWebinarSlug(slugInput)) {
        return NextResponse.json(
          {
            error:
              "Invalid URL slug. Use 3–120 characters: lowercase letters, numbers, and single hyphens between words.",
          },
          { status: 400 },
        );
      }

      const slugTaken = (await sql`
        SELECT id FROM webinars WHERE slug = ${slugInput} AND id <> ${id} LIMIT 1
      `) as Array<{ id: number }>;
      if (slugTaken[0]) {
        return NextResponse.json({ error: "This URL slug is already used by another webinar." }, { status: 409 });
      }

      const bannerPath = normalizePublicAssetPath(body.bannerImagePath);

      await sql`
        UPDATE webinars
        SET
          title = ${title},
          event_date = ${eventDate},
          event_time = ${eventTime},
          location = ${location},
          slug = ${slugInput},
          banner_image_path = ${bannerPath},
          updated_at = now()
        WHERE id = ${id}
      `;
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    if (action === "webinar_toggle_active") {
      const id = Number(body.id);
      const isActive = Boolean(body.isActive);

      if (!id) {
        return NextResponse.json({ error: "Webinar id is required." }, { status: 400 });
      }

      await sql`
        UPDATE webinars
        SET is_active = ${isActive}, updated_at = now()
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
      const attendanceMode = parseAttendanceMode(body.learningMode);
      const currentStatus = normalizeString(body.currentStatus);
      const lastInstitutionAttended = normalizeString(body.lastInstitutionAttended);
      const place = normalizeString(body.place);
      const dateOfBirth = normalizeString(body.dateOfBirth);
      const feePlan = parseFeePlan(body.feePlan);
      const totalFee = getTotalFee(attendanceMode);

      if (!id || !name || !emailId || !qualification || !attendanceMode || !place || !dateOfBirth) {
        return NextResponse.json({ error: "Please fill all required fields." }, { status: 400 });
      }

      await sql`
        UPDATE student_registrations
        SET
          name = ${name},
          email_id = ${emailId},
          course_selected = ${courseSelected},
          qualification = ${qualification},
          academic_qualification = ${qualification},
          learning_mode = ${attendanceMode},
          current_status = ${currentStatus || null},
          last_institution_attended = ${lastInstitutionAttended || null},
          place = ${place},
          date_of_birth = ${dateOfBirth},
          fee_plan = ${feePlan},
          total_fee = ${totalFee},
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
        SELECT course_selected, qualification, learning_mode, reg_no, name, whatsapp_number, email_id
        FROM student_registrations
        WHERE id = ${id}
        LIMIT 1
      `) as Array<{
        course_selected: string | null;
        qualification: string;
        learning_mode: string | null;
        reg_no: string | null;
        name: string;
        whatsapp_number: string;
        email_id: string;
      }>;

      if (!targetRow[0]) {
        return NextResponse.json({ error: "Registration not found." }, { status: 404 });
      }

      if (targetRow[0].reg_no) {
        await sql`
          UPDATE student_registrations
          SET review_status = 'approved', updated_at = now()
          WHERE id = ${id}
        `;
        await sql`
          INSERT INTO student_allowlist (name, whatsapp_number, updated_at)
          VALUES (${targetRow[0].name}, ${targetRow[0].whatsapp_number}, now())
          ON CONFLICT (whatsapp_number) DO UPDATE
          SET name = EXCLUDED.name, updated_at = now()
        `;

        try {
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

          const smtpHost = hasCustom
            ? customSmtp?.host?.trim() || ""
            : process.env.SMTP_HOST?.trim() || "";
          const smtpPortRaw = hasCustom
            ? customSmtp?.port?.trim() || ""
            : process.env.SMTP_PORT?.trim() || "";
          const smtpUser = hasCustom
            ? customSmtp?.username?.trim() || ""
            : process.env.SMTP_USER?.trim() || "";
          const smtpPassword = hasCustom
            ? customPassword
            : process.env.SMTP_PASSWORD?.trim() || "";
          const smtpPort = Number(smtpPortRaw);

          const adminSettingsRows = (await sql`
            SELECT next_batch_start_date
            FROM admin_settings
            WHERE id = 1
            LIMIT 1
          `) as Array<{ next_batch_start_date: string | null }>;
          const nextBatchStartDate = adminSettingsRows[0]?.next_batch_start_date || null;

          if (smtpHost && smtpPort && smtpUser && smtpPassword) {
            const fromName = (process.env.SMTP_FROM_NAME || "TrueQuest Learning").trim();
            const fromAddress = `${fromName} <${smtpUser}>`;
            const transporter = nodemailer.createTransport({
              host: smtpHost,
              port: smtpPort,
              secure: smtpPort === 465,
              auth: {
                user: smtpUser,
                pass: smtpPassword,
              },
            });

            await transporter.sendMail({
              from: fromAddress,
              to: targetRow[0].email_id,
              subject: `TrueQuest Learning | Registration Approved (${targetRow[0].reg_no})`,
              text: [
                `Hi ${targetRow[0].name},`,
                "",
                "Your registration has been approved.",
                `Registration Code: ${targetRow[0].reg_no}`,
                "",
                "Regards,",
                "Team TrueQuest Learning",
              ].join("\n"),
              html: buildRegistrationApprovedHtml({
                studentName: targetRow[0].name,
                regNo: targetRow[0].reg_no,
                courseSelected: parseCourse(targetRow[0].course_selected),
                nextBatchStartDate,
              }),
            });
          }
        } catch (mailError) {
          console.error("Admin approval email send failed:", mailError);
        }

        return NextResponse.json({ status: "ok", regNo: targetRow[0].reg_no }, { status: 200 });
      }

      const courseSelected = parseCourse(targetRow[0].course_selected);
      const attendanceMode = parseAttendanceMode(targetRow[0].learning_mode);
      const nextSequence = await getNextRegistrationSequence();
      const regNo = getRegistrationNumber(courseSelected, attendanceMode, nextSequence);

      await sql`
        UPDATE student_registrations
        SET reg_no = ${regNo}, review_status = 'approved', updated_at = now()
        WHERE id = ${id}
      `;
      await sql`
        INSERT INTO student_allowlist (name, whatsapp_number, updated_at)
        VALUES (${targetRow[0].name}, ${targetRow[0].whatsapp_number}, now())
        ON CONFLICT (whatsapp_number) DO UPDATE
        SET name = EXCLUDED.name, updated_at = now()
      `;

      try {
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

        const smtpHost = hasCustom
          ? customSmtp?.host?.trim() || ""
          : process.env.SMTP_HOST?.trim() || "";
        const smtpPortRaw = hasCustom
          ? customSmtp?.port?.trim() || ""
          : process.env.SMTP_PORT?.trim() || "";
        const smtpUser = hasCustom
          ? customSmtp?.username?.trim() || ""
          : process.env.SMTP_USER?.trim() || "";
        const smtpPassword = hasCustom
          ? customPassword
          : process.env.SMTP_PASSWORD?.trim() || "";
        const smtpPort = Number(smtpPortRaw);

        const adminSettingsRows = (await sql`
          SELECT next_batch_start_date
          FROM admin_settings
          WHERE id = 1
          LIMIT 1
        `) as Array<{ next_batch_start_date: string | null }>;
        const nextBatchStartDate = adminSettingsRows[0]?.next_batch_start_date || null;

        if (smtpHost && smtpPort && smtpUser && smtpPassword) {
          const fromName = (process.env.SMTP_FROM_NAME || "TrueQuest Learning").trim();
          const fromAddress = `${fromName} <${smtpUser}>`;
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
              user: smtpUser,
              pass: smtpPassword,
            },
          });

          await transporter.sendMail({
            from: fromAddress,
            to: targetRow[0].email_id,
            subject: `TrueQuest Learning | Registration Approved (${regNo})`,
            text: [
              `Hi ${targetRow[0].name},`,
              "",
              "Your registration has been approved.",
              `Registration Code: ${regNo}`,
              "",
              "Regards,",
              "Team TrueQuest Learning",
            ].join("\n"),
            html: buildRegistrationApprovedHtml({
              studentName: targetRow[0].name,
              regNo,
              courseSelected: courseSelected,
              nextBatchStartDate,
            }),
          });
        }
      } catch (mailError) {
        console.error("Admin approval email send failed:", mailError);
      }

      return NextResponse.json({ status: "ok", regNo }, { status: 200 });
    }

    if (action === "registration_fee_update") {
      const id = Number(body.id);
      const feePlan = parseFeePlan(body.feePlan);
      const totalFee = Number(body.totalFee) || 30000;

      if (!id) {
        return NextResponse.json({ error: "Registration id is required." }, { status: 400 });
      }

      if (totalFee <= 0) {
        return NextResponse.json({ error: "Total fee must be greater than 0." }, { status: 400 });
      }

      await sql`
        UPDATE student_registrations
        SET fee_plan = ${feePlan}, total_fee = ${totalFee}, updated_at = now()
        WHERE id = ${id}
      `;

      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    if (action === "registration_payment_add") {
      const registrationId = Number(body.registrationId);
      const amount = Number(body.amount);
      const paymentDate = normalizeString(body.paymentDate);
      const notes = normalizeString(body.notes);
      const paymentMethodRaw = normalizeString(body.paymentMethod).toLowerCase();
      const allowedMethods = new Set(["bank_transfer", "upi", "cash", "card_payment"]);
      const paymentMethod = allowedMethods.has(paymentMethodRaw) ? paymentMethodRaw : "cash";

      if (!registrationId || !amount || !paymentDate) {
        return NextResponse.json(
          { error: "Registration, amount and payment date are required." },
          { status: 400 },
        );
      }

      if (amount <= 0) {
        return NextResponse.json({ error: "Amount must be greater than 0." }, { status: 400 });
      }

      await sql`
        INSERT INTO student_fee_payments (registration_id, amount, payment_date, payment_method, notes)
        VALUES (${registrationId}, ${amount}, ${paymentDate}, ${paymentMethod}, ${notes || null})
      `;

      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    if (action === "smtp_update") {
      const host = normalizeString(body.host);
      const port = normalizeString(body.port);
      const username = normalizeString(body.user);
      const password = normalizeString(body.password);

      if (!host || !port || !username) {
        return NextResponse.json(
          { error: "SMTP host, port and user are required for custom settings." },
          { status: 400 },
        );
      }

      const existingSmtpRows = (await sql`
        SELECT password
        FROM smtp_settings
        WHERE id = 1
        LIMIT 1
      `) as Array<{ password: string | null }>;

      const existingPassword = existingSmtpRows[0]?.password?.trim() || "";
      const nextPassword = password
        ? encryptSmtpPassword(password)
        : existingPassword
          ? isEncryptedSmtpPassword(existingPassword)
            ? existingPassword
            : encryptSmtpPassword(existingPassword)
          : "";

      await sql`
        INSERT INTO smtp_settings (id, host, port, username, password, updated_at)
        VALUES (1, ${host}, ${port}, ${username}, ${nextPassword || null}, now())
        ON CONFLICT (id) DO UPDATE SET
          host = EXCLUDED.host,
          port = EXCLUDED.port,
          username = EXCLUDED.username,
          password = EXCLUDED.password,
          updated_at = now()
      `;

      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    if (action === "smtp_reset") {
      await sql`DELETE FROM smtp_settings WHERE id = 1`;
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    if (action === "next_batch_update") {
      const nextBatchStartDateRaw = normalizeString(body.nextBatchStartDate);
      if (!nextBatchStartDateRaw) {
        await sql`
          INSERT INTO admin_settings (id, next_batch_start_date, updated_at)
          VALUES (1, NULL, now())
          ON CONFLICT (id) DO UPDATE SET
            next_batch_start_date = NULL,
            updated_at = now()
        `;
        return NextResponse.json({ status: "ok" }, { status: 200 });
      }

      const validDate = /^\d{4}-\d{2}-\d{2}$/.test(nextBatchStartDateRaw);
      if (!validDate) {
        return NextResponse.json({ error: "Invalid date format." }, { status: 400 });
      }

      await sql`
        INSERT INTO admin_settings (id, next_batch_start_date, updated_at)
        VALUES (1, ${nextBatchStartDateRaw}, now())
        ON CONFLICT (id) DO UPDATE SET
          next_batch_start_date = EXCLUDED.next_batch_start_date,
          updated_at = now()
      `;

      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    if (action === "notification_send_email") {
      const targetEmail = normalizeString(body.email).toLowerCase();
      if (!targetEmail || !targetEmail.includes("@")) {
        return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
      }

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

      const smtpHost = hasCustom
        ? customSmtp?.host?.trim() || ""
        : process.env.SMTP_HOST?.trim() || "";
      const smtpPortRaw = hasCustom
        ? customSmtp?.port?.trim() || ""
        : process.env.SMTP_PORT?.trim() || "";
      const smtpUser = hasCustom
        ? customSmtp?.username?.trim() || ""
        : process.env.SMTP_USER?.trim() || "";
      const smtpPassword = hasCustom ? customPassword : process.env.SMTP_PASSWORD?.trim() || "";
      const smtpPort = Number(smtpPortRaw);
      const adminSettingsRows = (await sql`
        SELECT next_batch_start_date
        FROM admin_settings
        WHERE id = 1
        LIMIT 1
      `) as Array<{ next_batch_start_date: string | null }>;
      const nextBatchStartDate = adminSettingsRows[0]?.next_batch_start_date || null;

      if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
        return NextResponse.json(
          { error: "SMTP is not configured. Set custom SMTP or .env defaults first." },
          { status: 400 },
        );
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      const fromName = (process.env.SMTP_FROM_NAME || "TrueQuest Learning").trim();
      const fromAddress = `${fromName} <${smtpUser}>`;

      const subject = "TrueQuest Learning | Launch updates and next steps";
      const text = [
        "Hi,",
        "",
        "Thank you for requesting notifications from TrueQuest Learning.",
        "",
        "We will keep you updated on admission openings, batch schedules, and course launches.",
        "",
        "Contact:",
        "Location: Sulthan Bathery, Wayanad",
        "Phone: +91 97470 03913 / +91 97470 03918",
        "",
        "Regards,",
        "Team TrueQuest Learning",
      ].join("\n");

      await transporter.sendMail({
        from: fromAddress,
        to: targetEmail,
        subject,
        text,
        html: buildNotificationEmailHtml(nextBatchStartDate),
      });

      await sql`
        UPDATE notify_emails
        SET sent_count = COALESCE(sent_count, 0) + 1, last_sent_at = now()
        WHERE email = ${targetEmail}
      `;

      return NextResponse.json({ status: "ok" }, { status: 200 });
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

    if (action === "webinar_delete") {
      await sql`DELETE FROM webinars WHERE id = ${id}`;
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    if (action === "registration_delete") {
      await sql`DELETE FROM student_registrations WHERE id = ${id}`;
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    if (action === "registration_payment_delete") {
      await sql`DELETE FROM student_fee_payments WHERE id = ${id}`;
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("Error deleting admin registration data:", error);
    return NextResponse.json({ error: "Unable to process delete." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import nodemailer from "nodemailer";
import { createDecipheriv, scryptSync } from "crypto";

type QualificationOption = "12" | "Degree" | "Pg" | "Other";
type WebinarRow = {
  id: number;
  title: string;
  event_date: string;
  event_time: string;
  location: string;
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseQualification(value: unknown): QualificationOption | null {
  const parsed = normalizeString(value);
  if (parsed === "12" || parsed === "Degree" || parsed === "Pg" || parsed === "Other") {
    return parsed;
  }
  return null;
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

async function ensureWebinarTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS webinars (
      id serial PRIMARY KEY,
      title text NOT NULL,
      event_date date NOT NULL,
      event_time time NOT NULL,
      location text NOT NULL DEFAULT 'Sultan Bathery, Wayanad',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS webinar_registrations (
      id serial PRIMARY KEY,
      name text NOT NULL,
      phone_number text NOT NULL,
      email_id text NOT NULL,
      qualification text NOT NULL,
      webinar_id integer REFERENCES webinars(id) ON DELETE SET NULL,
      created_at timestamptz DEFAULT now()
    )
  `;

  await sql`
    ALTER TABLE webinar_registrations
    ADD COLUMN IF NOT EXISTS webinar_id integer REFERENCES webinars(id) ON DELETE SET NULL
  `;
}

function buildWebinarConfirmationHtml(studentName: string, webinar: WebinarRow): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#eef2ff;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2ff;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #c7d2fe;">
            <tr>
              <td style="background:linear-gradient(135deg,#221bff,#2b24ff,#3f37ff);padding:28px;color:#ffffff;">
                <h1 style="margin:0;font-size:26px;line-height:1.3;">Registration Confirmed ✅</h1>
                <p style="margin:10px 0 0 0;font-size:14px;line-height:1.6;opacity:.94;">
                  You’ve chosen the right step towards your future.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px;">
                <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;">Hi ${studentName},</p>
                <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;">
                  We’re excited to have you join our FREE Offline Webinar on
                  <strong> ${new Date(webinar.event_date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}</strong> at
                  <strong> ${webinar.event_time.slice(0, 5)}</strong> in
                  <strong> ${webinar.location}</strong>.
                </p>
                <p style="margin:0 0 12px 0;font-size:14px;line-height:1.7;">
                  <strong>Webinar:</strong> ${webinar.title}
                </p>
                <p style="margin:0 0 12px 0;font-size:13px;line-height:1.8;color:#334155;">
                  Get ready for expert career guidance and a chance to win scholarships up to ₹1,00,000 💰
                </p>
                <p style="margin:0 0 12px 0;font-size:13px;line-height:1.8;color:#334155;">
                  Feel free to invite your friends and family who might be looking for the right career direction.
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

async function sendWebinarConfirmationEmail(params: {
  studentName: string;
  emailId: string;
  webinar: WebinarRow;
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

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPassword },
  });

  const fromName = (process.env.SMTP_FROM_NAME || "TrueQuest Learning").trim();
  const fromAddress = `${fromName} <${smtpUser}>`;

  await transporter.sendMail({
    from: fromAddress,
    to: params.emailId,
    subject: "TrueQuest Learning | Webinar Registration Confirmation",
    text: [
      "Registration Confirmed",
      "",
      "You’ve chosen the right step towards your future.",
      `Webinar: ${params.webinar.title}`,
      `Date: ${params.webinar.event_date}`,
      `Time: ${params.webinar.event_time.slice(0, 5)}`,
      `Location: ${params.webinar.location}`,
      "",
      "Get ready for expert career guidance and scholarship opportunities.",
    ].join("\n"),
    html: buildWebinarConfirmationHtml(params.studentName, params.webinar),
  });
}

export async function GET() {
  try {
    await ensureWebinarTables();
    const webinars = (await sql`
      SELECT id, title, event_date, event_time, location
      FROM webinars
      ORDER BY event_date ASC, event_time ASC
    `) as WebinarRow[];

    return NextResponse.json({ webinars }, { status: 200 });
  } catch (error) {
    console.error("Error fetching webinars:", error);
    return NextResponse.json({ error: "Unable to fetch webinars." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureWebinarTables();
    const body = await req.json().catch(() => ({}));

    const name = normalizeString(body.name);
    const phoneNumber = normalizeString(body.phoneNumber);
    const emailId = normalizeString(body.emailId).toLowerCase();
    const qualification = parseQualification(body.qualification);
    const webinarId = Number(body.webinarId);

    if (!name || !phoneNumber || !emailId || !qualification || !webinarId) {
      return NextResponse.json({ error: "Please fill all required fields." }, { status: 400 });
    }

    if (!emailId.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }

    const webinarRows = (await sql`
      SELECT id, title, event_date, event_time, location
      FROM webinars
      WHERE id = ${webinarId}
      LIMIT 1
    `) as WebinarRow[];
    const webinar = webinarRows[0];
    if (!webinar) {
      return NextResponse.json({ error: "Selected webinar not found." }, { status: 404 });
    }

    await sql`
      INSERT INTO webinar_registrations (name, phone_number, email_id, qualification, webinar_id)
      VALUES (${name}, ${phoneNumber}, ${emailId}, ${qualification}, ${webinarId})
    `;

    try {
      await sendWebinarConfirmationEmail({
        studentName: name,
        emailId,
        webinar,
      });
    } catch (mailError) {
      console.error("Webinar confirmation email send failed:", mailError);
    }

    return NextResponse.json(
      {
        status: "registered",
        webinarTitle: webinar.title,
        webinarDate: webinar.event_date,
        webinarTime: webinar.event_time,
        webinarLocation: webinar.location,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error while creating webinar registration:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

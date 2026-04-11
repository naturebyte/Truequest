import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureWebinarTables } from "@/lib/webinar-db";
import nodemailer from "nodemailer";
import { createDecipheriv, scryptSync } from "crypto";
import { absoluteUrlForPublicPath, parseWebinarSlug } from "@/lib/webinar-utils";

function escapeHtmlAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

type QualificationOption = "12" | "Degree" | "PG" | "Other";
type WebinarRow = {
  id: number;
  slug: string;
  title: string;
  event_date: string;
  event_time: string;
  location: string;
  is_active: boolean;
  banner_image_path: string | null;
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseQualification(value: unknown): QualificationOption | null {
  const parsed = normalizeString(value);
  if (parsed === "12" || parsed === "Degree" || parsed === "PG" || parsed === "Other") {
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

function buildWebinarConfirmationHtml(studentName: string, webinar: WebinarRow): string {
  const bannerSrc = absoluteUrlForPublicPath(webinar.banner_image_path);
  const bannerBlock = bannerSrc
    ? `<div style="margin:0 0 14px 0;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                  <img
                    src="${bannerSrc}"
                    alt="${escapeHtmlAttribute(webinar.title)}"
                    width="584"
                    style="display:block;width:100%;height:auto;"
                  />
                </div>`
    : "";

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
                ${bannerBlock}
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

  const bannerAbs = absoluteUrlForPublicPath(params.webinar.banner_image_path);
  const textLines = [
    "Registration Confirmed",
    "",
    "You’ve chosen the right step towards your future.",
    `Webinar: ${params.webinar.title}`,
    `Date: ${params.webinar.event_date}`,
    `Time: ${params.webinar.event_time.slice(0, 5)}`,
    `Location: ${params.webinar.location}`,
  ];
  if (bannerAbs) {
    textLines.push(`Banner: ${bannerAbs}`);
  }
  textLines.push("", "Get ready for expert career guidance and scholarship opportunities.");

  await transporter.sendMail({
    from: fromAddress,
    to: params.emailId,
    subject: "TrueQuest Learning | Webinar Registration Confirmation",
    text: textLines.join("\n"),
    html: buildWebinarConfirmationHtml(params.studentName, params.webinar),
  });
}

export async function GET() {
  try {
    await ensureWebinarTables();
    const webinars = (await sql`
      SELECT id, slug, title, event_date, event_time, location, is_active, banner_image_path
      FROM webinars
      WHERE is_active = true
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
    const webinarSlug = parseWebinarSlug(body.webinarSlug);

    if (!name || !phoneNumber || !emailId || !qualification || !webinarSlug) {
      return NextResponse.json({ error: "Please fill all required fields." }, { status: 400 });
    }

    if (!emailId.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }

    const webinarRows = (await sql`
      SELECT id, slug, title, event_date, event_time, location, is_active, banner_image_path
      FROM webinars
      WHERE slug = ${webinarSlug}
      LIMIT 1
    `) as WebinarRow[];
    const webinar = webinarRows[0];
    if (!webinar || !webinar.is_active) {
      return NextResponse.json({ error: "Selected webinar not found." }, { status: 404 });
    }

    await sql`
      INSERT INTO webinar_registrations (name, phone_number, email_id, qualification, webinar_id)
      VALUES (${name}, ${phoneNumber}, ${emailId}, ${qualification}, ${webinar.id})
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
        webinarSlug: webinar.slug,
        webinarTitle: webinar.title,
        webinarDate: webinar.event_date,
        webinarTime: webinar.event_time,
        webinarLocation: webinar.location,
        webinarBannerImage: webinar.banner_image_path || "",
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

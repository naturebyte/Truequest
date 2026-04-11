import { sql } from "@/lib/db";
import { normalizePublicAssetPath } from "@/lib/webinar-utils";

export type PublicWebinarRow = {
  id: number;
  slug: string;
  title: string;
  event_date: string;
  event_time: string;
  location: string;
  banner_image_path: string | null;
};

export async function ensureWebinarTables() {
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

export async function getActiveWebinarBySlug(rawSlug: string): Promise<PublicWebinarRow | null> {
  await ensureWebinarTables();
  const normalized = rawSlug.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const rows = (await sql`
    SELECT id, slug, title, event_date, event_time, location, banner_image_path
    FROM webinars
    WHERE slug = ${normalized} AND is_active = true
    LIMIT 1
  `) as PublicWebinarRow[];

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    ...row,
    banner_image_path: normalizePublicAssetPath(row.banner_image_path),
  };
}

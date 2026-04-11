import { getActiveWebinarBySlug } from "@/lib/webinar-db";
import WebinarRegistrationClient from "../WebinarRegistrationClient";

type WebinarBySlugPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function WebinarBySlugPage({ params }: WebinarBySlugPageProps) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const row = await getActiveWebinarBySlug(decoded);
  const initialWebinar = row
    ? {
        id: row.id,
        slug: row.slug,
        title: row.title,
        event_date: String(row.event_date),
        event_time: String(row.event_time),
        location: row.location,
        banner_image_path: row.banner_image_path,
      }
    : null;

  return (
    <WebinarRegistrationClient
      webinarSlug={decoded.trim().toLowerCase()}
      initialWebinar={initialWebinar}
    />
  );
}

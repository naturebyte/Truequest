import type { Metadata } from "next";
import { getActiveWebinarBySlug } from "@/lib/webinar-db";
import {
  absoluteUrlForPublicPath,
  absoluteWebinarRegistrationUrl,
  getPublicSiteBaseUrl,
} from "@/lib/webinar-utils";
import WebinarRegistrationClient from "../WebinarRegistrationClient";

type WebinarBySlugPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: WebinarBySlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const normalizedSlug = decoded.trim().toLowerCase();
  const row = await getActiveWebinarBySlug(decoded);

  const base = getPublicSiteBaseUrl();
  const canonical = absoluteWebinarRegistrationUrl(normalizedSlug);

  const description = row?.title
    ? `Register for this TrueQuest webinar: ${row.title}. Free offline webinar with expert career guidance and scholarship opportunities.`
    : "Register for a TrueQuest Learning webinar.";

  const pageTitle = row?.title ? `${row.title} | TrueQuest Learning` : "Webinar registration | TrueQuest Learning";
  const ogHeading = row?.title ? `Register — ${row.title}` : "TrueQuest webinar registration";

  const fallbackImage = absoluteUrlForPublicPath("/banner.jpg") ?? `${base}/banner.jpg`;
  const bannerImage =
    row?.banner_image_path != null ? absoluteUrlForPublicPath(row.banner_image_path) : null;
  const ogImage = bannerImage || fallbackImage;

  return {
    title: pageTitle,
    description,
    metadataBase: new URL(base),
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: ogHeading,
      description,
      siteName: "TrueQuest Learning",
      locale: "en_IN",
      images: [
        {
          url: ogImage,
          alt: row?.title ? `${row.title} — TrueQuest Learning` : "TrueQuest Learning webinar",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogHeading,
      description,
      images: [ogImage],
    },
  };
}

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

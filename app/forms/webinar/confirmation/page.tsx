import { normalizePublicAssetPath } from "@/lib/webinar-utils";
import ConfirmationClient from "./ConfirmationClient";

type WebinarConfirmationPageProps = {
  searchParams: Promise<{
    title?: string;
    date?: string;
    time?: string;
    location?: string;
    bannerImage?: string;
    slug?: string;
  }>;
};

export default async function WebinarConfirmationPage({ searchParams }: WebinarConfirmationPageProps) {
  const params = await searchParams;

  return (
    <ConfirmationClient
      webinarTitle={params.title || ""}
      webinarDate={params.date || ""}
      webinarTime={params.time || ""}
      webinarLocation={params.location || "Sultan Bathery, Wayanad"}
      webinarBannerImage={
        normalizePublicAssetPath(params.bannerImage ? decodeURIComponent(params.bannerImage) : null) || ""
      }
      webinarSlug={(params.slug || "").trim().toLowerCase()}
    />
  );
}

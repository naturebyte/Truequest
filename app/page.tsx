import { cache } from "react";
import { listActiveWebinarsForPublic } from "@/lib/webinar-db";
import HomePageClient from "./HomePageClient";

/** Refresh webinar list periodically so the home section stays current without redeploying. */
export const revalidate = 60;

const getHomeWebinars = cache(listActiveWebinarsForPublic);

export default async function HomePage() {
  let initialWebinars: Awaited<ReturnType<typeof listActiveWebinarsForPublic>> = [];
  try {
    initialWebinars = await getHomeWebinars();
  } catch {
    initialWebinars = [];
  }

  return <HomePageClient initialWebinars={initialWebinars} />;
}

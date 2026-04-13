"use client";

import type { PublicWebinarRow } from "@/lib/webinar-db";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

function formatWebinarDate(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }
  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatWebinarTime(value: string): string {
  const [hoursText = "0", minutesText = "00"] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }
  const sampleDate = new Date(2000, 0, 1, hours, minutes, 0, 0);
  return sampleDate.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function todayYmdLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function filterUpcoming(webinars: PublicWebinarRow[]): PublicWebinarRow[] {
  const today = todayYmdLocal();
  return webinars.filter((w) => {
    const dateStr = String(w.event_date).slice(0, 10);
    return dateStr >= today;
  });
}

export default function UpcomingWebinarsHomeSection({
  initialWebinars,
}: {
  initialWebinars: PublicWebinarRow[];
}) {
  const upcoming = useMemo(() => filterUpcoming(initialWebinars), [initialWebinars]);

  if (upcoming.length === 0) {
    return null;
  }

  return (
    <section
      className="w-full rounded-3xl border border-white/15 bg-white/10 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-8"
      aria-labelledby="upcoming-webinars-heading"
    >
      <div className="text-center md:text-left">
        <h2
          id="upcoming-webinars-heading"
          className="text-xl font-bold text-white sm:text-2xl"
        >
          Upcoming Events
        </h2>
        <p className="mt-2 text-sm text-white/80 sm:text-base">
          Reserve your seat — register online in a minute.
        </p>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {upcoming.map((webinar) => (
          <li
            key={webinar.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/5"
          >
            <div className="relative aspect-[21/9] w-full bg-white/10">
              {webinar.banner_image_path ? (
                <Image
                  src={webinar.banner_image_path}
                  alt={webinar.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              ) : (
                <Image
                  src="/banner.jpg"
                  alt="TrueQuest Learning"
                  fill
                  className="object-cover opacity-90"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <p className="line-clamp-2 font-semibold leading-snug text-white">{webinar.title}</p>
              <p className="text-xs text-white/80 sm:text-sm">
                {formatWebinarDate(webinar.event_date)} · {formatWebinarTime(webinar.event_time)}
              </p>
              <p className="line-clamp-2 text-xs text-white/70">{webinar.location}</p>
              <Link
                href={`/forms/webinar/${encodeURIComponent(webinar.slug)}`}
                className="mt-auto inline-flex w-full items-center justify-center rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300"
              >
                Register now
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {upcoming.length > 1 && (
        <p className="mt-5 text-center text-sm text-white/75 md:text-left">
          <Link
            href="/forms/webinar/select"
            className="font-medium underline underline-offset-2 hover:text-lime-300"
          >
            See all workshops &rarr;
          </Link>
        </p>
      )}
    </section>
  );
}

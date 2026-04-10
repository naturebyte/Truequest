"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function WebinarSelectPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [webinars, setWebinars] = useState<
    Array<{ id: number; title: string; event_date: string; event_time: string; location: string }>
  >([]);

  useEffect(() => {
    async function fetchWebinars() {
      try {
        const response = await fetch("/api/forms/webinar");
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || "Unable to load webinars.");
        }
        setWebinars(data.webinars || []);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to load webinars.");
      } finally {
        setIsLoading(false);
      }
    }

    void fetchWebinars();
  }, []);

  return (
    <main className="min-h-screen bg-linear-to-br from-[#221bff] via-[#2b24ff] to-[#3f37ff] py-10 text-white sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <Image
            src="/banner.png"
            alt="TrueQuest Learning"
            width={900}
            height={360}
            className="mx-auto w-full max-w-xl rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            priority
          />
          <h1 className="mt-6 text-3xl font-bold sm:text-4xl">Select a Webinar</h1>
          <p className="mt-2 text-white/80">Choose your preferred webinar and continue registration.</p>
        </div>

        {errorMessage && (
          <p className="mx-auto mt-8 max-w-2xl rounded-xl border border-red-300/60 bg-red-500/70 px-4 py-3 text-sm">
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <p className="mt-8 text-center text-white/85">Loading webinars...</p>
        ) : webinars.length === 0 ? (
          <p className="mt-8 text-center text-white/85">No webinars available right now.</p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {webinars.map((webinar) => (
              <article
                key={webinar.id}
                className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md"
              >
                <h2 className="text-xl font-semibold">{webinar.title}</h2>
                <p className="mt-2 text-sm text-white/85">
                  {formatWebinarDate(webinar.event_date)} at {formatWebinarTime(webinar.event_time)}
                </p>
                <p className="mt-1 text-sm text-white/80">{webinar.location}</p>
                <Link
                  href={`/forms/webinar?webinarId=${webinar.id}`}
                  className="mt-4 inline-block rounded-xl bg-lime-400 px-4 py-2 font-semibold text-black transition hover:bg-lime-300"
                >
                  Register for this Webinar
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

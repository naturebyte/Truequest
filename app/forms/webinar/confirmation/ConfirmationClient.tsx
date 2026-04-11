"use client";

import Image from "next/image";
import { useCallback, useState } from "react";

type WebinarConfirmationClientProps = {
  webinarTitle: string;
  webinarDate: string;
  webinarTime: string;
  webinarLocation: string;
  webinarBannerImage: string;
  webinarSlug: string;
};

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

function buildRegistrationPageUrl(origin: string, slug: string): string {
  const encoded = encodeURIComponent(slug);
  return `${origin}/forms/webinar/${encoded}`;
}

export default function WebinarConfirmationClient({
  webinarTitle,
  webinarDate,
  webinarTime,
  webinarLocation,
  webinarBannerImage,
  webinarSlug,
}: WebinarConfirmationClientProps) {
  const [shareHint, setShareHint] = useState<"idle" | "copied" | "error">("idle");

  const registrationUrl = useCallback(() => {
    if (typeof window === "undefined" || !webinarSlug) {
      return "";
    }
    return buildRegistrationPageUrl(window.location.origin, webinarSlug);
  }, [webinarSlug]);

  const copyRegistrationLink = useCallback(async () => {
    const url = registrationUrl();
    if (!url) {
      setShareHint("error");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareHint("copied");
      window.setTimeout(() => setShareHint("idle"), 2500);
    } catch {
      setShareHint("error");
    }
  }, [registrationUrl]);

  const handleShare = useCallback(async () => {
    const url = registrationUrl();
    if (!url) {
      return;
    }
    const shareText = webinarTitle.trim()
      ? `Register for this TrueQuest webinar: ${webinarTitle}`
      : "Register for this TrueQuest webinar";

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: webinarTitle.trim() || "TrueQuest webinar",
          text: shareText,
          url,
        });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
      }
    }

    await copyRegistrationLink();
  }, [copyRegistrationLink, registrationUrl, webinarTitle]);

  const heroSrc = webinarBannerImage?.trim() || "/banner.png";
  const heroAlt = webinarTitle.trim() ? webinarTitle : "TrueQuest Learning";
  const canShare = Boolean(webinarSlug);

  return (
    <main className="min-h-screen bg-linear-to-br from-[#221bff] via-[#2b24ff] to-[#3f37ff] py-10 text-white sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
        <div className="mx-auto w-full max-w-xl overflow-hidden rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <Image
            src={heroSrc}
            alt={heroAlt}
            width={900}
            height={360}
            className="h-auto w-full object-cover"
            priority
          />
        </div>

        <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-8">
          <h1 className="text-3xl font-bold sm:text-4xl">Registration Successful ✅</h1>
          <p className="mt-4 text-white/90">You&apos;re all set for the FREE Offline Webinar.</p>
          <p className="mt-2 text-white/85">
            This session will help you explore the right career path with expert guidance.
          </p>

          {(webinarTitle || webinarDate || webinarTime || webinarLocation) && (
            <div className="mx-auto mt-6 max-w-xl rounded-xl border border-white/30 bg-white/10 p-4 text-left text-sm">
              <p>
                <strong>Webinar:</strong> {webinarTitle || "-"}
              </p>
              <p>
                <strong>Date:</strong> {webinarDate ? formatWebinarDate(webinarDate) : "-"}
              </p>
              <p>
                <strong>Time:</strong> {webinarTime ? formatWebinarTime(webinarTime) : "-"}
              </p>
              <p>
                <strong>Location:</strong> {webinarLocation || "-"}
              </p>
            </div>
          )}

          <p className="mt-6 text-white/90">
            If you know someone who needs career clarity, invite them to join along with you!
          </p>

          {canShare && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => void handleShare()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/15 px-6 py-3 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
              >
                <span aria-hidden>↗</span>
                Share webinar link
              </button>
              <button
                type="button"
                onClick={() => void copyRegistrationLink()}
                className="text-sm text-white/75 underline underline-offset-2 hover:text-white"
              >
                Copy link instead
              </button>
              {shareHint === "copied" && (
                <p className="text-sm text-lime-300" role="status">
                  Link copied to clipboard
                </p>
              )}
              {shareHint === "error" && (
                <p className="text-sm text-red-200" role="alert">
                  Could not copy the link. Please copy it from your browser&apos;s address bar after opening the webinar page.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

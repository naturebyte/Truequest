"use client";

import Image from "next/image";
import { absoluteWebinarRegistrationUrl, buildWebinarShareBody } from "@/lib/webinar-utils";
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

export default function WebinarConfirmationClient({
  webinarTitle,
  webinarDate,
  webinarTime,
  webinarLocation,
  webinarBannerImage,
  webinarSlug,
}: WebinarConfirmationClientProps) {
  const [shareHint, setShareHint] = useState<"idle" | "copied" | "error">("idle");

  const registrationAbsoluteUrl = useCallback(() => {
    if (!webinarSlug) {
      return "";
    }
    if (typeof window !== "undefined") {
      const envBase = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
      if (envBase) {
        const segment = encodeURIComponent(webinarSlug.trim().toLowerCase());
        return `${envBase}/forms/webinar/${segment}`;
      }
      const segment = encodeURIComponent(webinarSlug.trim().toLowerCase());
      return `${window.location.origin}/forms/webinar/${segment}`;
    }
    return absoluteWebinarRegistrationUrl(webinarSlug);
  }, [webinarSlug]);

  const shareBody = useCallback(() => {
    const url = registrationAbsoluteUrl();
    if (!url) {
      return "";
    }
    return buildWebinarShareBody(webinarTitle, url);
  }, [registrationAbsoluteUrl, webinarTitle]);

  const copyShareMessage = useCallback(async () => {
    const body = shareBody();
    if (!body) {
      setShareHint("error");
      return;
    }
    try {
      await navigator.clipboard.writeText(body);
      setShareHint("copied");
      window.setTimeout(() => setShareHint("idle"), 2500);
    } catch {
      setShareHint("error");
    }
  }, [shareBody]);

  const handleShare = useCallback(async () => {
    const url = registrationAbsoluteUrl();
    const text = shareBody();
    if (!url || !text) {
      return;
    }

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: webinarTitle.trim() || "TrueQuest webinar",
          text,
        });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
      }
    }

    await copyShareMessage();
  }, [copyShareMessage, registrationAbsoluteUrl, shareBody, webinarTitle]);

  const heroSrc = webinarBannerImage?.trim() || "/banner.jpg";
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
          <p className="mt-4 text-white/90">
            We&apos;ll connect with you shortly for further updates, so stay tuned!
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
                className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-lime-400 px-6 py-3 text-sm font-semibold text-black shadow-sm transition hover:bg-lime-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto sm:max-w-none"
              >
                <span aria-hidden>↗</span>
                Share webinar link
              </button>
              <button
                type="button"
                onClick={() => void copyShareMessage()}
                className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/15 px-6 py-3 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 sm:w-auto sm:max-w-none"
              >
                Copy message
              </button>
              {shareHint === "copied" && (
                <p className="text-sm text-lime-300" role="status">
                  Copied — paste into WhatsApp or any chat
                </p>
              )}
              {shareHint === "error" && (
                <p className="text-sm text-red-200" role="alert">
                  Could not copy. Try sharing from the button above, or copy the registration link from your browser.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type QualificationOption = "12" | "Degree" | "PG" | "Other" | "";

type WebinarFormState = {
  name: string;
  phoneNumber: string;
  emailId: string;
  qualification: QualificationOption;
};

type WebinarListItem = {
  id: number;
  slug: string;
  title: string;
  event_date: string;
  event_time: string;
  location: string;
  banner_image_path: string | null;
};

const defaultFormState: WebinarFormState = {
  name: "",
  phoneNumber: "",
  emailId: "",
  qualification: "",
};

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

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

export default function WebinarRegistrationClient({
  webinarSlug,
  initialWebinar,
}: {
  webinarSlug: string;
  initialWebinar: WebinarListItem | null;
}) {
  const router = useRouter();
  const [formData, setFormData] = useState<WebinarFormState>(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/forms/webinar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          webinarSlug: initialWebinar?.slug,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to submit webinar registration.");
      }

      router.push(
        `/forms/webinar/confirmation?title=${encodeURIComponent(data.webinarTitle || "")}&date=${encodeURIComponent(data.webinarDate || "")}&time=${encodeURIComponent(data.webinarTime || "")}&location=${encodeURIComponent(data.webinarLocation || "")}&bannerImage=${encodeURIComponent(data.webinarBannerImage || "")}&slug=${encodeURIComponent(data.webinarSlug || "")}`,
      );
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Something went wrong."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-[#221bff] via-[#2b24ff] to-[#3f37ff] py-10 text-white sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          {initialWebinar?.banner_image_path ? (
            <div className="mx-auto w-full max-w-xl overflow-hidden rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
              <Image
                src={initialWebinar.banner_image_path}
                alt={initialWebinar.title}
                width={900}
                height={360}
                className="h-auto w-full object-cover"
                priority
              />
            </div>
          ) : (
            <Image
              src="/banner.png"
              alt="TrueQuest Learning"
              width={900}
              height={360}
              className="mx-auto w-full max-w-xl rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
              priority
            />
          )}
          <h1 className="mt-6 text-3xl sm:text-4xl font-bold">Webinar Registration Form</h1>
          <p className="mt-2 text-white/80">Register now to reserve your webinar seat.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-7"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm">
              {/* <p className="font-semibold text-white/95">Selected Webinar</p> */}
              {initialWebinar ? (
                <p className="mt-1 text-white/90">
                  {initialWebinar.title} - {formatWebinarDate(initialWebinar.event_date)}{" "}
                  {formatWebinarTime(initialWebinar.event_time)} ({initialWebinar.location})
                </p>
              ) : webinarSlug.trim() ? (
                <p className="mt-1 text-white/80">
                  This webinar link is invalid or no longer available.{" "}
                  <Link href="/forms/webinar/select" className="underline underline-offset-2">
                    Browse webinars
                  </Link>
                  .
                </p>
              ) : (
                <p className="mt-1 text-white/80">Please select a webinar first.</p>
              )}
            </div>

            <label className="block">
              <span className="mb-1 block text-sm text-white/90">Name *</span>
              <input
                required
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-lime-400/80"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-white/90">Phone Number *</span>
              <input
                required
                value={formData.phoneNumber}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    phoneNumber: event.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
                className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-lime-400/80"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-white/90">Email *</span>
              <input
                type="email"
                required
                value={formData.emailId}
                onChange={(event) => setFormData({ ...formData, emailId: event.target.value })}
                className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-lime-400/80"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-white/90">Qualification *</span>
              <select
                required
                value={formData.qualification}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    qualification: event.target.value as WebinarFormState["qualification"],
                  })
                }
                className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-lime-400/80"
              >
                <option value="">Select qualification</option>
                <option value="12">12</option>
                <option value="Degree">Degree</option>
                <option value="PG">PG</option>
                <option value="Other">Other</option>
              </select>
            </label>
          </div>

          {errorMessage && (
            <p className="mt-4 rounded-xl border border-red-300/60 bg-red-500/70 px-4 py-3 text-sm">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !initialWebinar}
            className="mt-5 w-full rounded-xl bg-lime-400 px-4 py-3 font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-80"
          >
            {isSubmitting ? "Submitting..." : "Submit Webinar Form"}
          </button>
        </form>
      </div>
    </main>
  );
}

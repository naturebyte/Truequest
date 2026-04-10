"use client";

import Image from "next/image";

type WebinarConfirmationClientProps = {
  webinarTitle: string;
  webinarDate: string;
  webinarTime: string;
  webinarLocation: string;
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
}: WebinarConfirmationClientProps) {
  return (
    <main className="min-h-screen bg-linear-to-br from-[#221bff] via-[#2b24ff] to-[#3f37ff] py-10 text-white sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
        <Image
          src="/banner.png"
          alt="TrueQuest Learning"
          width={900}
          height={360}
          className="mx-auto w-full max-w-xl rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
          priority
        />

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
        </div>
      </div>
    </main>
  );
}

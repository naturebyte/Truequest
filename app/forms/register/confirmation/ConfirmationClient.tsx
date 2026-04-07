"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type ConfirmationClientProps = {
  regNo: string;
  studentName: string;
};

export default function ConfirmationClient({
  regNo,
  studentName,
}: ConfirmationClientProps) {
  const [copied, setCopied] = useState(false);

  const invitationMessage = `I've joined TrueQuest Learning Hub and it's been great experience so far.

If you're looking for the right career path or better opportunities, you should check this out 👍

Website: https://www.truequestlearning.com/
WhatsApp: https://api.whatsapp.com/send/?phone=919778303913`;
  const forwardOnWhatsAppUrl = `https://wa.me/?text=${encodeURIComponent(invitationMessage)}`;

  async function handleCopyInvite() {
    try {
      await navigator.clipboard.writeText(invitationMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#221bff] via-[#2b24ff] to-[#3f37ff] text-white py-10 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
        <Image
          src="/banner.png"
          alt="TrueQuest Learning"
          width={900}
          height={360}
          className="mx-auto w-full max-w-xl rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
          priority
        />

        <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-6 sm:p-8 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <h1 className="text-3xl sm:text-4xl font-bold">Admission completed! 🎉</h1>
          <p className="mt-4 text-white/90">Hi {studentName}, your admission is successful.</p>
          <p className="mt-5 text-xl font-semibold">
            Reg No: <span className="text-lime-300">{regNo}</span>
          </p>

          <div className="mt-6 space-y-3 text-white/85">
            <p>You&apos;ve made the right choice.</p>
            <p>
              Welcome to TrueQuest Learning Hub. Let&apos;s grow, learn, and build your
              future together.
            </p>
            <p>
              If your friends or family are struggling with their career path, feel free
              to guide them in the right direction.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleCopyInvite}
              className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 font-semibold text-white hover:bg-white/20"
            >
              {copied ? "Copied!" : "Copy Invite Text"}
            </button>
            <Link
              href={forwardOnWhatsAppUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-lime-400 px-4 py-2 font-semibold text-black hover:bg-lime-300"
            >
              Forward on WhatsApp
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

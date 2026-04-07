"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type FormState = {
  name: string;
  whatsappNumber: string;
  emailId: string;
  courseSelected: "" | "DM" | "HR";
  qualification: string;
  currentStatus: string;
  lastInstitutionAttended: string;
  place: string;
  dateOfBirth: string;
};

const defaultFormState: FormState = {
  name: "",
  whatsappNumber: "",
  emailId: "",
  courseSelected: "",
  qualification: "",
  currentStatus: "",
  lastInstitutionAttended: "",
  place: "",
  dateOfBirth: "",
};

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

export default function StudentRegistrationPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormState>(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/forms/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Unable to submit the form.");
      }

      router.push(
        `/forms/register/confirmation?regNo=${encodeURIComponent(data.regNo)}&name=${encodeURIComponent(data.studentName)}`,
      );
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Something went wrong."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#221bff] via-[#2b24ff] to-[#3f37ff] text-white py-10 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <Image
            src="/banner.png"
            alt="TrueQuest Learning"
            width={900}
            height={360}
            className="mx-auto w-full max-w-xl rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            priority
          />
          <h1 className="mt-6 text-3xl sm:text-4xl font-bold">Student Admission Form</h1>
          <p className="mt-2 text-white/80">May Batch Registration</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-5 sm:p-7 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md space-y-4"
        >
          <label className="block">
            <span className="mb-1 block text-sm text-white/90">1. Name *</span>
            <input
              required
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-lime-400/80"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-white/90">2. WhatsApp Number *</span>
            <input
              required
              value={formData.whatsappNumber}
              onChange={(event) =>
                setFormData({ ...formData, whatsappNumber: event.target.value })
              }
              className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-lime-400/80"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-white/90">3. Email ID *</span>
            <input
              type="email"
              required
              value={formData.emailId}
              onChange={(event) =>
                setFormData({ ...formData, emailId: event.target.value })
              }
              className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-lime-400/80"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-white/90">
              4. Course Selected (DM / HR)
            </span>
            <select
              value={formData.courseSelected}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  courseSelected: event.target.value as FormState["courseSelected"],
                })
              }
              className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-lime-400/80"
            >
              <option value="">Select course</option>
              <option value="DM">Digital Marketing (DM)</option>
              <option value="HR">Human Resource (HR)</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-white/90">5. Qualification *</span>
            <input
              required
              value={formData.qualification}
              onChange={(event) =>
                setFormData({ ...formData, qualification: event.target.value })
              }
              className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-lime-400/80"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-white/90">
              6. Current Status (Student / Working / Other)
            </span>
            <select
              value={formData.currentStatus}
              onChange={(event) =>
                setFormData({ ...formData, currentStatus: event.target.value })
              }
              className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-lime-400/80"
            >
              <option value="">Select current status</option>
              <option value="Student">Student</option>
              <option value="Working">Working</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-white/90">
              7. Last Institution Attended
            </span>
            <input
              value={formData.lastInstitutionAttended}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  lastInstitutionAttended: event.target.value,
                })
              }
              className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-lime-400/80"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-white/90">8. Place *</span>
            <input
              required
              value={formData.place}
              onChange={(event) => setFormData({ ...formData, place: event.target.value })}
              className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-lime-400/80"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-white/90">9. Date of Birth *</span>
            <input
              type="date"
              required
              value={formData.dateOfBirth}
              onChange={(event) =>
                setFormData({ ...formData, dateOfBirth: event.target.value })
              }
              className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-lime-400/80"
            />
          </label>

          {errorMessage && (
            <p className="rounded-xl border border-red-300/60 bg-red-500/70 px-4 py-3 text-sm">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-lime-400 px-4 py-3 font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-80"
          >
            {isSubmitting ? "Submitting..." : "Submit Admission Form"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm">
          <Link href="/forms" className="text-lime-300 underline underline-offset-4">
            Back to Forms Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

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
  qualification: "" | "online" | "offline";
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
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [phoneWarning, setPhoneWarning] = useState("");
  const [phoneInfoMessage, setPhoneInfoMessage] = useState("");
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [lastVerifiedPhone, setLastVerifiedPhone] = useState("");
  const adminContactHref = `https://wa.me/919747003913?text=${encodeURIComponent(
    "Hi admin, I already registered on TrueQuest and need help with my registration details.",
  )}`;

  async function verifyPhone(phoneInput: string) {
    const phone = phoneInput.replace(/\D/g, "").trim();

    if (!phone) {
      return;
    }

    setIsVerifyingPhone(true);
    setErrorMessage("");
    setPhoneWarning("");
    setPhoneInfoMessage("");

    try {
      const response = await fetch(`/api/forms/register?phone=${encodeURIComponent(phone)}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Unable to verify this phone number.");
      }

      if (data.status === "allowlisted") {
        setIsAlreadyRegistered(false);
        setPhoneInfoMessage("Verified number found.");
        setLastVerifiedPhone(phone);
        return;
      }

      if (data.status === "already_registered") {
        const registration = data.registration;
        setIsAlreadyRegistered(true);
        setPhoneInfoMessage(
          `Already registered. Code: ${registration.reg_no}. Contact admin for any updates.`,
        );
        setLastVerifiedPhone(phone);
        return;
      }

      if (data.status === "under_review") {
        setIsAlreadyRegistered(false);
        setPhoneInfoMessage(
          "This number has a pending submission under review. You can submit updated details.",
        );
        setLastVerifiedPhone(phone);
        return;
      }

      setIsAlreadyRegistered(false);
      setPhoneWarning(
        "This number is not in admin's approved list. Submission is allowed, but it will be under review.",
      );
      setLastVerifiedPhone(phone);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to verify number."));
    } finally {
      setIsVerifyingPhone(false);
    }
  }

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

      if (data.status === "registered" || data.status === "already_registered") {
        const mode = data.status === "already_registered" ? "already-registered" : "approved";
        router.push(
          `/forms/register/confirmation?mode=${mode}&regNo=${encodeURIComponent(data.regNo)}&name=${encodeURIComponent(data.studentName)}&phone=${encodeURIComponent(formData.whatsappNumber)}`,
        );
        return;
      }

      router.push(
        `/forms/register/confirmation?mode=under-review&name=${encodeURIComponent(data.studentName)}&phone=${encodeURIComponent(formData.whatsappNumber)}`,
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
          <Image
            src="/banner.jpg"
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
              disabled={isAlreadyRegistered}
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
              onChange={(event) => {
                const inputValue = event.target.value;
                const digitOnlyPhone = inputValue.replace(/\D/g, "");
                setFormData((prev) => ({
                  ...defaultFormState,
                  name: prev.name,
                  whatsappNumber: inputValue,
                }));
                setIsAlreadyRegistered(false);
                setPhoneWarning("");
                setPhoneInfoMessage("");
                setLastVerifiedPhone("");

                if (digitOnlyPhone.length > 10) {
                  setPhoneWarning("Phone number cannot exceed 10 digits.");
                  return;
                }

                if (digitOnlyPhone.length === 10 && lastVerifiedPhone !== digitOnlyPhone) {
                  void verifyPhone(digitOnlyPhone);
                }
              }}
              className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-lime-400/80"
            />
            <p className="mt-1 text-xs text-white/70">
              Auto-verification runs when exactly 10 digits are entered.
            </p>
          </label>

          {isVerifyingPhone && (
            <p className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm">
              Verifying phone number...
            </p>
          )}

          {phoneInfoMessage && (
            <p className="rounded-xl border border-lime-300/60 bg-lime-500/20 px-4 py-3 text-sm">
              {phoneInfoMessage}
            </p>
          )}

          {phoneWarning && (
            <p className="rounded-xl border border-amber-300/60 bg-amber-500/20 px-4 py-3 text-sm text-amber-100">
              {phoneWarning}
            </p>
          )}

          <label className="block">
            <span className="mb-1 block text-sm text-white/90">3. Email ID *</span>
            <input
              type="email"
              required
              disabled={isAlreadyRegistered}
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
              disabled={isAlreadyRegistered}
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
            <span className="mb-1 block text-sm text-white/90">5. Learning Mode *</span>
            <select
              required
              disabled={isAlreadyRegistered}
              value={formData.qualification}
              onChange={(event) =>
                setFormData({
                  ...formData,
                  qualification: event.target.value as FormState["qualification"],
                })
              }
              className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-lime-400/80"
            >
              <option value="">Select learning mode</option>
              <option value="online">Online - Rs 25,000</option>
              <option value="offline">Offline - Rs 30,000</option>
            </select>
            <p className="mt-1 text-xs text-white/70">
              Offline registrations get a Rs 30,000 total fee. Online registrations get a Rs 25,000 total fee.
            </p>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-white/90">
              6. Current Status (Student / Working / Other)
            </span>
            <select
              disabled={isAlreadyRegistered}
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
              disabled={isAlreadyRegistered}
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
              disabled={isAlreadyRegistered}
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
              disabled={isAlreadyRegistered}
              value={formData.dateOfBirth}
              onChange={(event) =>
                setFormData({ ...formData, dateOfBirth: event.target.value })
              }
              className="w-full h-12 appearance-none rounded-xl bg-white px-4 text-slate-900 outline-none focus:ring-2 focus:ring-lime-400/80"
            />
          </label>

          {errorMessage && (
            <p className="rounded-xl border border-red-300/60 bg-red-500/70 px-4 py-3 text-sm">
              {errorMessage}
            </p>
          )}

          {isAlreadyRegistered ? (
            <Link
              href={adminContactHref}
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-xl bg-lime-400 px-4 py-3 text-center font-semibold text-black transition hover:bg-lime-300"
            >
              Already Registered - Contact Admin
            </Link>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-lime-400 px-4 py-3 font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-80"
            >
              {isSubmitting ? "Submitting..." : "Submit Admission Form"}
            </button>
          )}
        </form>

        <div className="mt-5 text-center text-sm hidden">
          <Link href="/forms" className="text-lime-300 underline underline-offset-4">
            Back to Forms Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

 "use client";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";

function InstagramIcon() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af] text-[10px] font-bold text-white">
      in
    </span>
  );
}

function FacebookIcon() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#1877f2] text-[12px] font-bold text-white">
      f
    </span>
  );
}

function LinkedInIcon() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#0a66c2] text-[11px] font-bold text-white">
      in
    </span>
  );
}

function YouTubeIcon() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#ff0000] text-[11px] font-bold text-white">
      ▶
    </span>
  );
}

function LocationIcon() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs">
      📍
    </span>
  );
}

function PhoneIcon() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs">
      ☎
    </span>
  );
}

export default function ComingSoon() {
  const [email, setEmail] = useState("");
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerModalStep, setOfferModalStep] = useState<"details" | "brochure_form">("details");
  const [selectedOffer, setSelectedOffer] = useState<"HR" | "DIGITAL_MARKETING" | null>(null);
  const [offerLeadName, setOfferLeadName] = useState("");
  const [offerPhoneNumber, setOfferPhoneNumber] = useState("");
  const [isOfferSubmitting, setIsOfferSubmitting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "info" | "error";
    message: string;
  } | null>(null);

  const whatsappHref = `https://wa.me/919747003913?text=${encodeURIComponent(
    "Hi, I'm interested in TrueQuest Learning. Please share more details."
  )}`;

  useEffect(() => {
    if (!toast) return;
    const timeoutId = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timeoutId);
  }, [toast]);

  function openOfferModal(offerType: "HR" | "DIGITAL_MARKETING") {
    setSelectedOffer(offerType);
    setOfferModalStep("details");
    setOfferLeadName("");
    setOfferPhoneNumber("");
    setIsOfferModalOpen(true);
  }

  function closeOfferModal() {
    setIsOfferModalOpen(false);
    setOfferModalStep("details");
    setSelectedOffer(null);
    setOfferLeadName("");
    setOfferPhoneNumber("");
  }

  function getBrochureDownloadUrl(offerType: "HR" | "DIGITAL_MARKETING"): string {
    return `/api/brochure?offer=${encodeURIComponent(offerType)}`;
  }

  function getOfferLabel(offerType: "HR" | "DIGITAL_MARKETING"): string {
    return offerType === "HR" ? "HR" : "Digital Marketing";
  }

  function openBrochure(
    brochureUrl: string,
    brochureWindow: Window | null
  ) {
    // In-app browsers (like Instagram) frequently block async popups.
    // Reuse a tab opened from the original user click if available.
    if (brochureWindow && !brochureWindow.closed) {
      brochureWindow.location.href = brochureUrl;
      return;
    }

    window.location.href = brochureUrl;
  }

  async function handleOfferSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedOffer) {
      setToast({
        type: "error",
        message: "Please select an offer first.",
      });
      return;
    }

    const trimmedName = offerLeadName.trim();
    const trimmedPhone = offerPhoneNumber.trim();
    const normalizedPhone = trimmedPhone.replace(/\D/g, "");

    if (!trimmedName || !trimmedPhone) {
      setToast({
        type: "error",
        message: "Please enter your name and phone number.",
      });
      return;
    }

    if (normalizedPhone.length !== 10) {
      setToast({
        type: "error",
        message: "Please enter a valid 10-digit phone number.",
      });
      return;
    }

    const brochureWindow = window.open("", "_blank", "noopener,noreferrer");

    setIsOfferSubmitting(true);
    try {
      const response = await fetch("/api/offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          phoneNumber: normalizedPhone,
          offerType: selectedOffer,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to save your details.");
      }

      const brochureUrl = getBrochureDownloadUrl(selectedOffer);
      openBrochure(brochureUrl, brochureWindow);

      setToast({
        type: "success",
        message: `${getOfferLabel(selectedOffer)} details received. Opening brochure.`,
      });
      closeOfferModal();
    } catch {
      if (brochureWindow && !brochureWindow.closed) {
        brochureWindow.close();
      }
      setToast({
        type: "error",
        message: "Unable to submit right now. Please try again.",
      });
    } finally {
      setIsOfferSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setToast({
        type: "error",
        message: "Please enter a valid email address.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Something went wrong.");
      }

      if (data.status === "exists") {
        setToast({
          type: "info",
          message: "You’re already on the list!",
        });
      } else if (data.status === "subscribed") {
        setToast({
          type: "success",
          message: "You’re in! We’ll email you when we launch.",
        });
        setEmail("");
      } else {
        setToast({
          type: "success",
          message: "Thanks! You’re on the list.",
        });
      }
    } catch {
      setToast({
        type: "error",
        message: "Unable to save your email. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#221bff] via-[#2b24ff] to-[#3f37ff] text-white py-10 sm:py-16">
      <div className="max-w-5xl w-full px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-center">
        {/* Left content */}
        <div className="space-y-6 text-center md:text-left">
          <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/15 mx-auto md:mx-0">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-lime-400" />
            Coming soon · Be first to know
          </div>

          <Image
            src="/banner.png"
            alt="TrueQuest Learning"
            width={900}
            height={360}
            className="w-full max-w-xl mx-auto md:mx-0 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            priority
          />


          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
            Learn Skills.
            <br />
            <span className="text-lime-400">Build Careers.</span>
          </h1>


          <p className="text-white/80 max-w-md mx-auto md:mx-0">
            TrueQuest Learning is a professional skill training institute in Wayanad focused on providing job-ready courses in Digital Marketing and Human Resource. We offer corporate-style learning, industry expert training, and practical experience to help students build successful careers.
          </p>


          <div className="space-y-3 max-w-xl mx-auto md:mx-0">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)] space-y-3">
              <p className="text-sm font-semibold text-white">What we offer</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => openOfferModal("HR")}
                  className="px-4 py-3 rounded-xl bg-white text-[#1f17ff] font-semibold hover:bg-lime-300 transition w-full sm:w-auto shadow-md"
                >
                  HR (Human Resource)
                </button>
                <button
                  type="button"
                  onClick={() => openOfferModal("DIGITAL_MARKETING")}
                  className="px-4 py-3 rounded-xl bg-white text-[#1f17ff] font-semibold hover:bg-lime-300 transition w-full sm:w-auto shadow-md"
                >
                  Digital Marketing
                </button>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3 sm:p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
              <form
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center"
              >
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="px-4 py-3 rounded-xl w-full sm:max-w-xs text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-lime-400/80 shadow-sm"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-2 py-3 rounded-xl bg-lime-400 text-black font-semibold hover:bg-lime-300 active:bg-lime-400/90 transition w-full sm:w-auto text-center shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-80"
                >
                  {isSubmitting ? "Sending..." : "Notify me"}
                </button>
              </form>
            </div>
            <p className="text-xs text-white/70">
              No spam. Just launch updates and early access invites.
            </p>
          </div>

          <div className="mt-8 space-y-4 text-sm text-white/80">
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2">
                <LocationIcon />
                <Link
                  href="https://maps.app.goo.gl/n1m6JRndY7f8q4hP6?g_st=ic"
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-white/40 underline-offset-4 hover:text-lime-300 hover:decoration-lime-300"
                >
                  WTC, Sulthan Bathery, Wayanad
                </Link>
              </div>
              <div className="inline-flex items-center gap-2">
                <PhoneIcon />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  
                  <Link
                    href="tel:+919747003913"
                    className="underline decoration-white/40 underline-offset-4 hover:text-lime-300 hover:decoration-lime-300"
                  >
                    +91 97470 03913
                  </Link>
                  <span className="opacity-60">/</span>
                  <Link
                    href="tel:+919747003918"
                    className="underline decoration-white/40 underline-offset-4 hover:text-lime-300 hover:decoration-lime-300"
                  >
                    +91 97470 03918
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span className="text-xs uppercase tracking-wide text-white/60">
                Connect with us
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="https://www.instagram.com/truequestlearning"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium hover:bg-white/20 transition"
                >
                  <InstagramIcon />
                  <span>Instagram</span>
                </Link>
                <Link
                  href="https://www.facebook.com/truequestlearning"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium hover:bg-white/20 transition"
                >
                  <FacebookIcon />
                  <span>Facebook</span>
                </Link>
                <Link
                  href="https://www.linkedin.com/company/truequestlearning/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium hover:bg-white/20 transition"
                >
                  <LinkedInIcon />
                  <span>LinkedIn</span>
                </Link>
                <Link
                  href="https://youtube.com/@truequestlearning?si=v8rq-EW8KFl4JGY2"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium hover:bg-white/20 transition"
                >
                  <YouTubeIcon />
                  <span>YouTube</span>
                </Link>
              </div>
            </div>

            <div className="pt-1 text-xs text-white/60">
              <Link
                href="/privacy-policy"
                className="underline decoration-white/30 underline-offset-4 hover:text-lime-300 hover:decoration-lime-300"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>


        {/* Right visual */}
        <div className="flex justify-center md:justify-end">
          <div className="relative aspect-square w-48 sm:w-64 md:w-72 rounded-[2.25rem] bg-gradient-to-br from-[#1f17ff] via-[#2b24ff] to-[#3e2bff] shadow-[0_32px_80px_rgba(0,0,0,0.55)] flex items-center justify-center">
            <Image
              src="/TrueQuest Icon@72x-8.png"
              alt="TrueQuest Icon"
              width={220}
              height={220}
              className="w-24 sm:w-32 md:w-40 h-auto drop-shadow-2xl"
            />
          </div>
        </div>
      </div>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg hover:scale-105 hover:shadow-xl transition-transform"
        aria-label="Chat with us on WhatsApp"
      >
        <FaWhatsapp className="h-7 w-7" />
      </a>

      {toast && (
        <div className="fixed inset-x-0 bottom-4 flex justify-center px-4 sm:px-0">
          <div
            className={`max-w-md w-full sm:w-auto rounded-2xl px-4 py-3 text-sm shadow-lg backdrop-blur-md border ${
              toast.type === "success"
                ? "bg-emerald-500/90 border-emerald-400 text-white"
                : toast.type === "info"
                ? "bg-sky-500/90 border-sky-400 text-white"
                : "bg-red-500/90 border-red-400 text-white"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      {isOfferModalOpen && selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="relative w-full max-w-md rounded-2xl border border-white/20 bg-[#2b24ff] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <button
              type="button"
              onClick={closeOfferModal}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-lg text-white hover:bg-white/25 transition"
              aria-label="Close popup"
            >
              ×
            </button>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white">
                {getOfferLabel(selectedOffer)} Course Details
              </h2>
              <p className="mt-1 text-sm text-white/80">Choose an option to continue.</p>
            </div>

            <div className="mb-4 rounded-xl border border-white/15 bg-white/10 p-4 text-sm text-white/90">
              {selectedOffer === "DIGITAL_MARKETING" ? (
                <>
                  <p className="mb-3 leading-relaxed">
                    Become job-ready with our industry-focused Digital Marketing training.
                    Learn SEO, Social Media Marketing, Google Ads, Content Marketing and
                    Live Project handling inside a corporate learning environment.
                  </p>
                  <ul className="space-y-1 text-white/90">
                    <li>✔ 3 Month Job Ready Program</li>
                    <li>✔ Industry Expert Training</li>
                    <li>✔ Practical Live Projects</li>
                    <li>✔ Placement Assistance</li>
                    <li>✔ Corporate Learning Experience</li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="mb-3 leading-relaxed">
                    Build a successful career in Human Resource Management with practical
                    corporate training. Learn recruitment, payroll basics, employee
                    management, labor law basics, and real workplace HR operations.
                  </p>
                  <ul className="space-y-1 text-white/90">
                    <li>✔ Industry-Based Training</li>
                    <li>✔ Practical HR Process Learning</li>
                    <li>✔ Interview & Career Guidance</li>
                    <li>✔ Corporate Learning Environment</li>
                    <li>✔ Job Oriented Training</li>
                  </ul>
                </>
              )}
            </div>

            {offerModalStep === "details" ? (
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.open(whatsappHref, "_blank", "noopener,noreferrer")}
                  className="px-4 py-3 rounded-xl bg-lime-400 text-black font-semibold hover:bg-lime-300 transition w-full"
                >
                  Contact now
                </button>
                <button
                  type="button"
                  onClick={() => setOfferModalStep("brochure_form")}
                  className="px-4 py-3 rounded-xl bg-white/15 text-white font-medium hover:bg-white/25 transition w-full"
                >
                  Get brochure
                </button>
              </div>
            ) : (
              <form onSubmit={handleOfferSubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="Your name"
                  value={offerLeadName}
                  onChange={(event) => setOfferLeadName(event.target.value)}
                  className="px-4 py-3 rounded-xl w-full text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-lime-400/80 shadow-sm"
                />
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={offerPhoneNumber}
                  onChange={(event) => setOfferPhoneNumber(event.target.value)}
                  className="px-4 py-3 rounded-xl w-full text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-lime-400/80 shadow-sm"
                />

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOfferModalStep("details")}
                    className="px-4 py-3 rounded-xl bg-white/15 text-white font-medium hover:bg-white/25 transition w-full"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isOfferSubmitting}
                    className="px-4 py-3 rounded-xl bg-lime-400 text-black font-semibold hover:bg-lime-300 transition w-full disabled:cursor-not-allowed disabled:opacity-80"
                  >
                    {isOfferSubmitting ? "Opening..." : "View brochure"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

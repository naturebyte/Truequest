import Image from "next/image";
import Link from "next/link";

export default function FormsDashboardPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#221bff] via-[#2b24ff] to-[#3f37ff] text-white py-10 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-10 flex flex-col items-center text-center">
          <Image
            src="/banner.png"
            alt="TrueQuest Learning"
            width={900}
            height={360}
            className="w-full max-w-xl rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            priority
          />
          <h1 className="mt-6 text-3xl sm:text-4xl font-bold">Forms Dashboard</h1>
          <p className="mt-2 text-white/80 max-w-xl">
            Manage student admissions and review all registrations for the May batch.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Link
            href="/forms/register"
            className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-white/20"
          >
            <p className="text-sm uppercase tracking-wide text-white/70">Student Form</p>
            <h2 className="mt-2 text-2xl font-semibold">Registration Form</h2>
            <p className="mt-2 text-white/80">
              Fill and submit student admission details.
            </p>
          </Link>
          <Link
            href="/forms/webinar/select"
            className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-white/20"
          >
            <p className="text-sm uppercase tracking-wide text-white/70">Webinar Form</p>
            <h2 className="mt-2 text-2xl font-semibold">Webinar Registration</h2>
            <p className="mt-2 text-white/80">
              Register for upcoming webinar sessions and get a confirmation email.
            </p>
          </Link>
{ process.env.NODE_ENV === "development" && (
          <Link
            href="/admin"
            className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-white/20"
          >
            <p className="text-sm uppercase tracking-wide text-white/70">Admin Area</p>
            <h2 className="mt-2 text-2xl font-semibold">Admin Panel</h2>
            <p className="mt-2 text-white/80">
              Login and check all submitted registrations.
            </p>
          </Link>
          )}
        </div>
      </div>
    </main>
  );
}

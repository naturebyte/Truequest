"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type RegistrationRecord = {
  id: number;
  reg_no: string;
  name: string;
  whatsapp_number: string;
  email_id: string;
  course_selected: string | null;
  qualification: string;
  current_status: string | null;
  last_institution_attended: string | null;
  place: string;
  date_of_birth: string;
  created_at: string;
};

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function formatDate(value: string): string {
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

export default function FormsAdminPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);

  async function fetchRegistrations() {
    const response = await fetch("/api/admin/registrations");
    if (response.status === 401) {
      setIsAuthenticated(false);
      return;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Unable to load registrations.");
    }

    setRegistrations(data.registrations || []);
    setIsAuthenticated(true);
  }

  useEffect(() => {
    fetchRegistrations().catch(() => {});
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Login failed.");
      }

      await fetchRegistrations();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to login."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setIsAuthenticated(false);
    setRegistrations([]);
    setUsername("");
    setPassword("");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#221bff] via-[#2b24ff] to-[#3f37ff] text-white py-10 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-8 text-center">
          <Image
            src="/banner.png"
            alt="TrueQuest Learning"
            width={900}
            height={360}
            className="mx-auto w-full max-w-xl rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            priority
          />
          <h1 className="mt-6 text-3xl sm:text-4xl font-bold">Admin Panel</h1>
        </div>

        {!isAuthenticated ? (
          <form
            onSubmit={handleLogin}
            className="mx-auto max-w-md rounded-2xl border border-white/20 bg-white/10 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md space-y-4"
          >
            <label className="block">
              <span className="mb-1 block text-sm text-white/90">Username</span>
              <input
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-xl bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-lime-400/80"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-white/90">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
              disabled={isLoading}
              className="w-full rounded-xl bg-lime-400 px-4 py-3 font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-80"
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>
        ) : (
          <div className="rounded-2xl border border-white/20 bg-white/10 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">
                Registrations ({registrations.length})
              </h2>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
              >
                Logout
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/25 text-white/90">
                    <th className="px-3 py-2">Reg No</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">WhatsApp</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Course</th>
                    <th className="px-3 py-2">Qualification</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Institution</th>
                    <th className="px-3 py-2">Place</th>
                    <th className="px-3 py-2">DOB</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((row) => (
                    <tr key={row.id} className="border-b border-white/10 text-white/80">
                      <td className="px-3 py-2 font-medium text-lime-300">{row.reg_no}</td>
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2">{row.whatsapp_number}</td>
                      <td className="px-3 py-2">{row.email_id}</td>
                      <td className="px-3 py-2">{row.course_selected || "-"}</td>
                      <td className="px-3 py-2">{row.qualification}</td>
                      <td className="px-3 py-2">{row.current_status || "-"}</td>
                      <td className="px-3 py-2">
                        {row.last_institution_attended || "-"}
                      </td>
                      <td className="px-3 py-2">{row.place}</td>
                      <td className="px-3 py-2">{formatDate(row.date_of_birth)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-5 text-center text-sm">
          <Link href="/forms" className="text-lime-300 underline underline-offset-4">
            Back to Forms Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

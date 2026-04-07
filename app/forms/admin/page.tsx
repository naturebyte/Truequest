"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type RegistrationRecord = {
  id: number;
  reg_no: string | null;
  name: string;
  whatsapp_number: string;
  email_id: string;
  course_selected: string | null;
  qualification: string;
  current_status: string | null;
  last_institution_attended: string | null;
  place: string;
  date_of_birth: string;
  review_status: "approved" | "under_review";
  created_at: string;
};

type AllowlistRecord = {
  id: number;
  name: string;
  whatsapp_number: string;
  created_at: string;
};

type AdminTab = "overview" | "allowlist" | "registrations";

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

function getAgeFromDateOfBirth(value: string): string {
  const dateOfBirth = new Date(value);
  if (Number.isNaN(dateOfBirth.getTime())) {
    return "-";
  }

  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDifference = today.getMonth() - dateOfBirth.getMonth();
  const hasBirthdayPassedThisYear =
    monthDifference > 0 ||
    (monthDifference === 0 && today.getDate() >= dateOfBirth.getDate());

  if (!hasBirthdayPassedThisYear) {
    age -= 1;
  }

  return age >= 0 ? String(age) : "-";
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  const directDateMatch = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  if (directDateMatch) {
    return trimmed;
  }

  const parsedDate = new Date(trimmed);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toISOString().slice(0, 10);
}

function ActionIcon({
  path,
  className = "h-4 w-4",
}: {
  path: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ReviewBadge({ status }: { status: "approved" | "under_review" }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
        Approved
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
      Under Review
    </span>
  );
}

export default function FormsAdminPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [allowlist, setAllowlist] = useState<AllowlistRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [allowName, setAllowName] = useState("");
  const [allowPhone, setAllowPhone] = useState("");
  const [editingAllowData, setEditingAllowData] = useState<AllowlistRecord | null>(null);
  const [isAllowlistEditModalOpen, setIsAllowlistEditModalOpen] = useState(false);
  const [editingRegId, setEditingRegId] = useState<number | null>(null);
  const [editingRegData, setEditingRegData] = useState<Partial<RegistrationRecord>>({});
  const [isRegistrationEditModalOpen, setIsRegistrationEditModalOpen] = useState(false);
  const [allowlistPage, setAllowlistPage] = useState(1);
  const [registrationsPage, setRegistrationsPage] = useState(1);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    setAllowlist(data.allowlist || []);
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

  async function handleRefreshData() {
    setErrorMessage("");
    setIsRefreshing(true);
    try {
      await fetchRegistrations();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to sync latest data."));
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleAllowlistSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "allowlist_add",
          name: allowName,
          whatsappNumber: allowPhone,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to save allowlist student.");
      }

      setAllowName("");
      setAllowPhone("");
      await fetchRegistrations();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to save allowlist student."));
    } finally {
      setIsSaving(false);
    }
  }

  function startAllowlistEdit(row: AllowlistRecord) {
    setEditingAllowData({ ...row });
    setIsAllowlistEditModalOpen(true);
  }

  function cancelAllowlistEdit() {
    setIsAllowlistEditModalOpen(false);
    setEditingAllowData(null);
  }

  async function handleAllowlistEditSave() {
    if (!editingAllowData) {
      return;
    }

    setErrorMessage("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "allowlist_edit",
          id: editingAllowData.id,
          name: editingAllowData.name,
          whatsappNumber: editingAllowData.whatsapp_number,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to update allowlist student.");
      }

      cancelAllowlistEdit();
      await fetchRegistrations();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to update allowlist student."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAllowlistDelete(id: number) {
    const isConfirmed = window.confirm(
      "Delete this allowed student? This action cannot be undone.",
    );
    if (!isConfirmed) {
      return;
    }

    setErrorMessage("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/registrations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "allowlist_delete", id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to delete allowlist student.");
      }

      await fetchRegistrations();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to delete allowlist student."));
    } finally {
      setIsSaving(false);
    }
  }

  function startRegistrationEdit(row: RegistrationRecord) {
    setEditingRegId(row.id);
    setEditingRegData({
      ...row,
      date_of_birth: toDateInputValue(row.date_of_birth),
    });
    setIsRegistrationEditModalOpen(true);
  }

  function cancelRegistrationEdit() {
    setIsRegistrationEditModalOpen(false);
    setEditingRegId(null);
    setEditingRegData({});
  }

  async function handleRegistrationSave() {
    if (!editingRegId) {
      return;
    }

    setErrorMessage("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "registration_edit",
          id: editingRegId,
          name: editingRegData.name,
          emailId: editingRegData.email_id,
          courseSelected: editingRegData.course_selected,
          qualification: editingRegData.qualification,
          currentStatus: editingRegData.current_status,
          lastInstitutionAttended: editingRegData.last_institution_attended,
          place: editingRegData.place,
          dateOfBirth: editingRegData.date_of_birth,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to update registration.");
      }

      cancelRegistrationEdit();
      await fetchRegistrations();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to update registration."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRegistrationDelete(id: number) {
    const isConfirmed = window.confirm(
      "Delete this registration record? This action cannot be undone.",
    );
    if (!isConfirmed) {
      return;
    }

    setErrorMessage("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/registrations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "registration_delete", id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to delete registration.");
      }

      await fetchRegistrations();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to delete registration."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleApprove(id: number) {
    const isConfirmed = window.confirm(
      "Approve this registration and assign registration number now?",
    );
    if (!isConfirmed) {
      return;
    }

    setErrorMessage("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "registration_approve", id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to approve registration.");
      }

      await fetchRegistrations();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to approve registration."));
    } finally {
      setIsSaving(false);
    }
  }

  const allowlistPageSize = 8;
  const registrationsPageSize = 10;

  const approvedRegistrationsCount = registrations.filter(
    (registration) => registration.review_status === "approved",
  ).length;
  const underReviewRegistrationsCount = registrations.length - approvedRegistrationsCount;
  const allowlistTotalPages = Math.max(1, Math.ceil(allowlist.length / allowlistPageSize));
  const registrationsTotalPages = Math.max(
    1,
    Math.ceil(registrations.length / registrationsPageSize),
  );
  const paginatedAllowlist = allowlist.slice(
    (allowlistPage - 1) * allowlistPageSize,
    allowlistPage * allowlistPageSize,
  );
  const paginatedRegistrations = registrations.slice(
    (registrationsPage - 1) * registrationsPageSize,
    registrationsPage * registrationsPageSize,
  );

  useEffect(() => {
    if (allowlistPage > allowlistTotalPages) {
      setAllowlistPage(allowlistTotalPages);
    }
  }, [allowlistPage, allowlistTotalPages]);

  useEffect(() => {
    if (registrationsPage > registrationsTotalPages) {
      setRegistrationsPage(registrationsTotalPages);
    }
  }, [registrationsPage, registrationsTotalPages]);

  return (
    <main className="min-h-screen bg-white py-6 text-slate-900 sm:py-8">
      <div className="w-full px-3 sm:px-5 lg:px-6">
        {!isAuthenticated ? (
          <>
            <div className="mb-8 text-center">
              <h1 className="mt-6 text-3xl font-bold text-[#2b24ff] sm:text-4xl">Admin Panel</h1>
            </div>
            <form
              onSubmit={handleLogin}
              className="mx-auto max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            >
              <label className="block">
                <span className="mb-1 block text-sm text-slate-700">Username</span>
                <input
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-slate-700">Password</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
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
                className="w-full rounded-xl bg-[#2b24ff] px-4 py-3 font-semibold text-white transition hover:bg-[#221bff] disabled:cursor-not-allowed disabled:opacity-80"
              >
                {isLoading ? "Logging in..." : "Login"}
              </button>
            </form>
          </>
        ) : (
          <div className="grid min-h-[calc(100vh-12rem)] gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <aside className="flex rounded-2xl border border-slate-200 bg-white p-4 shadow-xl lg:h-full lg:flex-col">
              <h2 className="text-lg font-semibold">Admin Pages</h2>
              <p className="mt-1 text-sm text-slate-600">Select a page to view only that content.</p>
              <nav className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className={`block w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    activeTab === "overview"
                      ? "border-[#2b24ff]/30 bg-[#2b24ff]/10 text-[#2b24ff]"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("allowlist")}
                  className={`block w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    activeTab === "allowlist"
                      ? "border-[#2b24ff]/30 bg-[#2b24ff]/10 text-[#2b24ff]"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  Allowed Students
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("registrations")}
                  className={`block w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    activeTab === "registrations"
                      ? "border-[#2b24ff]/30 bg-[#2b24ff]/10 text-[#2b24ff]"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  Registrations
                </button>
              </nav>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-6 w-full rounded-lg bg-[#2b24ff] px-4 py-2 text-sm font-medium text-white hover:bg-[#221bff] lg:mt-auto"
              >
                Logout
              </button>
            </aside>

            <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-[#2b24ff] sm:text-4xl">Admin Panel</h1>
              <button
                type="button"
                onClick={handleRefreshData}
                disabled={isRefreshing}
                title="Refresh data"
                className="rounded-lg border border-[#2b24ff]/20 bg-[#2b24ff]/10 p-2 text-[#2b24ff] hover:bg-[#2b24ff]/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ActionIcon
                  path="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"
                  className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </button>
            </div>
            {activeTab === "overview" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Overview</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    This page gives a snapshot of current form activity. New forms can be added
                    here as separate admin pages later.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total Registrations</p>
                  <p className="mt-1 text-2xl font-semibold">{registrations.length}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-amber-700">Under Review</p>
                  <p className="mt-1 text-2xl font-semibold text-amber-700">{underReviewRegistrationsCount}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-emerald-700">Approved</p>
                  <p className="mt-1 text-2xl font-semibold text-emerald-700">{approvedRegistrationsCount}</p>
                </div>
              </div>
            </section>
            )}

            {activeTab === "allowlist" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Allowed Students ({allowlist.length})</h2>
              </div>

              <form onSubmit={handleAllowlistSave} className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                <input
                  required
                  value={allowName}
                  onChange={(event) => setAllowName(event.target.value)}
                  placeholder="Student name"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                />
                <input
                  required
                  value={allowPhone}
                  onChange={(event) => setAllowPhone(event.target.value)}
                  placeholder="WhatsApp number"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-[#2b24ff] px-6 py-3 font-semibold text-white hover:bg-[#221bff] disabled:opacity-70"
                >
                  Add Student
                </button>
              </form>

              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">WhatsApp</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAllowlist.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100 text-slate-700">
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2">{row.whatsapp_number}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startAllowlistEdit(row)}
                              title="Edit"
                              className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                            >
                              <ActionIcon path="M16.862 3.487a2.1 2.1 0 1 1 2.97 2.97L8.3 17.99 4 19l1.01-4.3L16.862 3.487Z" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAllowlistDelete(row.id)}
                              title="Delete"
                              className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"
                            >
                              <ActionIcon path="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {paginatedAllowlist.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                          No allowed students yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                <p>
                  Page {allowlistPage} of {allowlistTotalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={allowlistPage === 1}
                    onClick={() => setAllowlistPage((prev) => Math.max(1, prev - 1))}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={allowlistPage === allowlistTotalPages}
                    onClick={() =>
                      setAllowlistPage((prev) => Math.min(allowlistTotalPages, prev + 1))
                    }
                    className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
            )}

            {activeTab === "registrations" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Registrations ({registrations.length})</h2>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                      <th className="px-3 py-2">Reg No</th>
                      <th className="px-3 py-2">Review</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">WhatsApp</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Course</th>
                      <th className="px-3 py-2">Qualification</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Institution</th>
                      <th className="px-3 py-2">Place</th>
                      <th className="px-3 py-2">DOB</th>
                      <th className="px-3 py-2">Age</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRegistrations.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100 text-slate-700">
                        <td className="px-3 py-2 font-medium text-[#2b24ff]">{row.reg_no || "-"}</td>
                        <td className="px-3 py-2">
                          <ReviewBadge status={row.review_status} />
                        </td>
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2">{row.whatsapp_number}</td>
                        <td className="px-3 py-2">{row.email_id}</td>
                        <td className="px-3 py-2">{row.course_selected || "-"}</td>
                        <td className="px-3 py-2">{row.qualification}</td>
                        <td className="px-3 py-2">{row.current_status || "-"}</td>
                        <td className="px-3 py-2">{row.last_institution_attended || "-"}</td>
                        <td className="px-3 py-2">{row.place}</td>
                        <td className="px-3 py-2">{formatDate(row.date_of_birth)}</td>
                        <td className="px-3 py-2">{getAgeFromDateOfBirth(row.date_of_birth)}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startRegistrationEdit(row)}
                              title="Edit"
                              className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                            >
                              <ActionIcon path="M16.862 3.487a2.1 2.1 0 1 1 2.97 2.97L8.3 17.99 4 19l1.01-4.3L16.862 3.487Z" />
                            </button>
                            {row.review_status === "under_review" && (
                              <button
                                type="button"
                                onClick={() => handleApprove(row.id)}
                                title="Approve"
                                className="rounded-md border border-emerald-200 p-2 text-emerald-700 hover:bg-emerald-50"
                              >
                                <ActionIcon path="M5 12l4 4L19 6" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRegistrationDelete(row.id)}
                              title="Delete"
                              className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"
                            >
                              <ActionIcon path="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {paginatedRegistrations.length === 0 && (
                      <tr>
                        <td colSpan={13} className="px-3 py-6 text-center text-slate-500">
                          No registrations submitted yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                <p>
                  Page {registrationsPage} of {registrationsTotalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={registrationsPage === 1}
                    onClick={() => setRegistrationsPage((prev) => Math.max(1, prev - 1))}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={registrationsPage === registrationsTotalPages}
                    onClick={() =>
                      setRegistrationsPage((prev) =>
                        Math.min(registrationsTotalPages, prev + 1),
                      )
                    }
                    className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
            )}
            </div>

          {isAllowlistEditModalOpen && editingAllowData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                <h3 className="text-lg font-semibold">Edit Allowed Student</h3>
                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-sm text-slate-600">Name</span>
                    <input
                      value={editingAllowData.name}
                      onChange={(event) =>
                        setEditingAllowData((prev) =>
                          prev ? { ...prev, name: event.target.value } : prev,
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-slate-600">WhatsApp Number</span>
                    <input
                      value={editingAllowData.whatsapp_number}
                      onChange={(event) =>
                        setEditingAllowData((prev) =>
                          prev ? { ...prev, whatsapp_number: event.target.value } : prev,
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                    />
                  </label>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelAllowlistEdit}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleAllowlistEditSave}
                    className="rounded-xl bg-[#2b24ff] px-4 py-2 font-semibold text-white hover:bg-[#221bff] disabled:opacity-70"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {isRegistrationEditModalOpen && editingRegData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                <h3 className="text-lg font-semibold">Edit Registration</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    placeholder="Name"
                    value={editingRegData.name || ""}
                    onChange={(event) =>
                      setEditingRegData((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                  />
                  <input
                    placeholder="Email"
                    value={editingRegData.email_id || ""}
                    onChange={(event) =>
                      setEditingRegData((prev) => ({ ...prev, email_id: event.target.value }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                  />
                  <select
                    value={editingRegData.course_selected || ""}
                    onChange={(event) =>
                      setEditingRegData((prev) => ({
                        ...prev,
                        course_selected: event.target.value || null,
                      }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                  >
                    <option value="">Select course</option>
                    <option value="DM">DM</option>
                    <option value="HR">HR</option>
                  </select>
                  <input
                    placeholder="Qualification"
                    value={editingRegData.qualification || ""}
                    onChange={(event) =>
                      setEditingRegData((prev) => ({
                        ...prev,
                        qualification: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                  />
                  <input
                    placeholder="Current status"
                    value={editingRegData.current_status || ""}
                    onChange={(event) =>
                      setEditingRegData((prev) => ({
                        ...prev,
                        current_status: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                  />
                  <input
                    placeholder="Last institution attended"
                    value={editingRegData.last_institution_attended || ""}
                    onChange={(event) =>
                      setEditingRegData((prev) => ({
                        ...prev,
                        last_institution_attended: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                  />
                  <input
                    placeholder="Place"
                    value={editingRegData.place || ""}
                    onChange={(event) =>
                      setEditingRegData((prev) => ({ ...prev, place: event.target.value }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                  />
                  <input
                    type="date"
                    value={editingRegData.date_of_birth || ""}
                    onChange={(event) =>
                      setEditingRegData((prev) => ({ ...prev, date_of_birth: event.target.value }))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                  />
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelRegistrationEdit}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleRegistrationSave}
                    className="rounded-xl bg-[#2b24ff] px-4 py-2 font-semibold text-white hover:bg-[#221bff] disabled:opacity-70"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>
        )}

        <div className="mt-5 text-center text-sm">
          <Link href="/forms" className="text-[#2b24ff] underline underline-offset-4">
            Back to Forms Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

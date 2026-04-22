"use client";

import Link from "next/link";
import { FormEvent, Fragment, useEffect, useState } from "react";
import { ActionIcon } from "./components/ActionIcon";
import { AdminSidebar } from "./components/AdminSidebar";
import { LoginForm } from "./components/LoginForm";
import { ReviewBadge } from "./components/ReviewBadge";
import type {
  AdminAuthContext,
  AdminPermission,
  AdminTab,
  AllowlistRecord,
  BrochureRequestRecord,
  FeeTransaction,
  ManagedAdminUser,
  NotificationRequestRecord,
  RegistrationRecord,
  SmtpSettings,
  WebinarRecord,
  WebinarRegistrationRecord,
} from "./types";
import {
  downloadWebinarRegistrationsExcel,
  formatCurrency,
  formatDate,
  getAgeFromDateOfBirth,
  getErrorMessage,
  toDateInputValue,
} from "./utils";

const TAB_VIEW_PERMISSION: Record<AdminTab, AdminPermission> = {
  overview: "overview:view",
  admin_management: "admin_management:view",
  registrations: "registrations:view",
  webinar_registrations: "webinar_management:view",
  allowlist: "allowed_students:view",
  brochure_requests: "brochure_requests:view",
  fees: "fees:view",
};

const ADMIN_PERMISSION_OPTIONS: AdminPermission[] = [
  "overview:view",
  "overview:manage",
  "registrations:view",
  "registrations:manage",
  "webinar_management:view",
  "webinar_management:manage",
  "allowed_students:view",
  "allowed_students:manage",
  "brochure_requests:view",
  "brochure_requests:manage",
  "fees:view",
  "fees:manage",
  "admin_management:view",
  "admin_management:manage",
];

const ADMIN_PERMISSION_PRESETS: Array<{
  id: string;
  label: string;
  permissions: AdminPermission[];
}> = [
  {
    id: "all_view",
    label: "All View",
    permissions: [
      "overview:view",
      "registrations:view",
      "webinar_management:view",
      "allowed_students:view",
      "brochure_requests:view",
      "fees:view",
      "admin_management:view",
    ],
  },
  {
    id: "full_control",
    label: "Full Control",
    permissions: ADMIN_PERMISSION_OPTIONS,
  },
  {
    id: "operations_manager",
    label: "Operations Manager",
    permissions: [
      "overview:view",
      "overview:manage",
      "registrations:view",
      "registrations:manage",
      "allowed_students:view",
      "allowed_students:manage",
      "fees:view",
      "fees:manage",
      "brochure_requests:view",
      "brochure_requests:manage",
    ],
  },
  {
    id: "webinar_manager",
    label: "Webinar Manager",
    permissions: [
      "overview:view",
      "webinar_management:view",
      "webinar_management:manage",
      "brochure_requests:view",
      "brochure_requests:manage",
    ],
  },
];

function PaginationControls({
  page,
  totalPages,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
      <p>
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page === 1}
          onClick={onPrevious}
          className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page === totalPages}
          onClick={onNext}
          className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function parseLearningMode(value: string | null | undefined): "online" | "offline" | null {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "online") {
    return "online";
  }

  if (normalized === "offline") {
    return "offline";
  }

  return null;
}

function getRegistrationLearningMode(
  registration: Pick<RegistrationRecord, "learning_mode" | "reg_no">,
): "online" | "offline" | null {
  const direct = parseLearningMode(registration.learning_mode);
  if (direct) {
    return direct;
  }

  const regNo = registration.reg_no?.trim().toUpperCase();
  if (regNo?.startsWith("TQLO")) {
    return "online";
  }
  if (regNo?.startsWith("TQL")) {
    return "offline";
  }

  return null;
}

function formatLearningMode(value: "online" | "offline" | null): string {
  if (value === "online") {
    return "Online";
  }

  if (value === "offline") {
    return "Offline";
  }

  return "-";
}

function formatFeeModeSummary(registration: RegistrationRecord): string {
  return `${formatLearningMode(getRegistrationLearningMode(registration))} (${formatCurrency(
    registration.total_fee || 0,
  )})`;
}

export default function FormsAdminPage({ forcedTab }: { forcedTab?: AdminTab } = {}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [allowlist, setAllowlist] = useState<AllowlistRecord[]>([]);
  const [transactions, setTransactions] = useState<FeeTransaction[]>([]);
  const [brochureRequests, setBrochureRequests] = useState<BrochureRequestRecord[]>([]);
  const [webinars, setWebinars] = useState<WebinarRecord[]>([]);
  const [webinarRegistrations, setWebinarRegistrations] = useState<WebinarRegistrationRecord[]>([]);
  const [notificationRequestedUsers, setNotificationRequestedUsers] = useState<
    NotificationRequestRecord[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [allowName, setAllowName] = useState("");
  const [allowPhone, setAllowPhone] = useState("");
  const [editingAllowData, setEditingAllowData] = useState<AllowlistRecord | null>(null);
  const [isAllowlistEditModalOpen, setIsAllowlistEditModalOpen] = useState(false);
  const [editingRegId, setEditingRegId] = useState<number | null>(null);
  const [editingRegData, setEditingRegData] = useState<Partial<RegistrationRecord>>({});
  const [isRegistrationEditModalOpen, setIsRegistrationEditModalOpen] = useState(false);
  const [isRegistrationDetailsModalOpen, setIsRegistrationDetailsModalOpen] = useState(false);
  const [selectedRegistrationDetails, setSelectedRegistrationDetails] =
    useState<RegistrationRecord | null>(null);
  const [allowlistPage, setAllowlistPage] = useState(1);
  const [registrationsPage, setRegistrationsPage] = useState(1);
  const [registrationSearchTerm, setRegistrationSearchTerm] = useState("");
  const [registrationCourseFilter, setRegistrationCourseFilter] = useState<"all" | "HR" | "DM">("all");
  const [registrationReviewFilter, setRegistrationReviewFilter] = useState<
    "all" | "approved" | "under_review"
  >("all");
  const [registrationPaymentFilter, setRegistrationPaymentFilter] = useState<
    "all" | "fully_paid" | "pending_fee"
  >("all");
  const [hrBrochurePage, setHrBrochurePage] = useState(1);
  const [dmBrochurePage, setDmBrochurePage] = useState(1);
  const [notificationRequestedPage, setNotificationRequestedPage] = useState(1);
  const [feesPage, setFeesPage] = useState(1);
  const [paymentRemindersPage, setPaymentRemindersPage] = useState(1);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [paymentHistoryPage, setPaymentHistoryPage] = useState(1);
  const [activeTab, setActiveTab] = useState<AdminTab>(forcedTab ?? "overview");
  const currentTab = activeTab;
  const [authContext, setAuthContext] = useState<AdminAuthContext | null>(null);
  const [managedAdmins, setManagedAdmins] = useState<ManagedAdminUser[]>([]);
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminPermissions, setNewAdminPermissions] = useState<AdminPermission[]>([]);
  const [newAdminPreset, setNewAdminPreset] = useState("");
  const [editingManagedAdminId, setEditingManagedAdminId] = useState<number | null>(null);
  const [editingManagedPermissions, setEditingManagedPermissions] = useState<AdminPermission[]>([]);
  const [editingManagedIsActive, setEditingManagedIsActive] = useState(true);
  const [editingManagedPassword, setEditingManagedPassword] = useState("");
  const [editingManagedPreset, setEditingManagedPreset] = useState("");

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [selectedFeeRegistration, setSelectedFeeRegistration] = useState<RegistrationRecord | null>(null);
  const [feePlan, setFeePlan] = useState<"monthly_3x" | "one_time">("monthly_3x");
  const [paymentAmount, setPaymentAmount] = useState("10000");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "upi" | "cash" | "card_payment">(
    "bank_transfer",
  );
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings>({
    host: "",
    port: "",
    user: "",
    source: "unset",
    password_set: false,
  });
  const [smtpHostInput, setSmtpHostInput] = useState("");
  const [smtpPortInput, setSmtpPortInput] = useState("");
  const [smtpUserInput, setSmtpUserInput] = useState("");
  const [smtpPasswordInput, setSmtpPasswordInput] = useState("");
  const [nextBatchStartDate, setNextBatchStartDate] = useState("");
  const [nextBatchUpdatedAt, setNextBatchUpdatedAt] = useState("");
  const [nextBatchStartDateInput, setNextBatchStartDateInput] = useState("");
  const [smtpInfoMessage, setSmtpInfoMessage] = useState("");
  const [sendingNotificationEmail, setSendingNotificationEmail] = useState<string | null>(null);
  const [webinarTitleInput, setWebinarTitleInput] = useState("");
  const [webinarSlugInput, setWebinarSlugInput] = useState("");
  const [webinarBannerPathInput, setWebinarBannerPathInput] = useState("");
  const [webinarDateInput, setWebinarDateInput] = useState("");
  const [webinarTimeInput, setWebinarTimeInput] = useState("");
  const [webinarLocationInput, setWebinarLocationInput] = useState("Sultan Bathery, Wayanad");
  const [editingWebinarId, setEditingWebinarId] = useState<number | null>(null);
  const [selectedWebinarFilter, setSelectedWebinarFilter] = useState<"all" | number>("all");
  const [webinarRegistrationSearchTerm, setWebinarRegistrationSearchTerm] = useState("");
  const [isExportingWebinarExcel, setIsExportingWebinarExcel] = useState(false);
  const [copiedWebinarSlug, setCopiedWebinarSlug] = useState<string | null>(null);

  function hasPermission(permission: AdminPermission): boolean {
    if (!authContext) {
      return false;
    }
    if (authContext.isSuperAdmin) {
      return true;
    }
    return authContext.permissions.includes(permission);
  }

  const allowedTabs = (Object.keys(TAB_VIEW_PERMISSION) as AdminTab[]).filter((tab) =>
    hasPermission(TAB_VIEW_PERMISSION[tab]),
  );
  const canManageOverview = hasPermission("overview:manage");
  const canManageRegistrations = hasPermission("registrations:manage");
  const canManageFees = hasPermission("fees:manage");
  const canManageWebinar = hasPermission("webinar_management:manage");
  const canManageAllowlist = hasPermission("allowed_students:manage");
  const canManageBrochure = hasPermission("brochure_requests:manage");
  const canViewAdminManagement = hasPermission("admin_management:view");
  const canManageAdminManagement = hasPermission("admin_management:manage");

  async function fetchRegistrations() {
    try {
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
      setTransactions(data.transactions || []);
      setBrochureRequests(data.brochureRequests || []);
      setWebinars(data.webinars || []);
      setWebinarRegistrations(data.webinarRegistrations || []);
      setNotificationRequestedUsers(data.notificationRequestedUsers || []);
      setSmtpSettings(
        data.smtpSettings || {
          host: "",
          port: "",
          user: "",
          source: "unset",
          password_set: false,
        },
      );
      setSmtpHostInput(data.smtpSettings?.host || "");
      setSmtpPortInput(data.smtpSettings?.port || "");
      setSmtpUserInput(data.smtpSettings?.user || "");
      setSmtpPasswordInput("");
      setNextBatchStartDate(data.nextBatchStartDate || "");
      setNextBatchUpdatedAt(data.nextBatchUpdatedAt || "");
      setNextBatchStartDateInput(data.nextBatchStartDate || "");
      setAuthContext(data.auth || null);
      setIsAuthenticated(true);
    } finally {
      setIsInitializing(false);
    }
  }

  useEffect(() => {
    fetchRegistrations().catch(() => { });
  }, []);

  useEffect(() => {
    if (!allowedTabs.length) {
      return;
    }
    if (!allowedTabs.includes(currentTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [allowedTabs, currentTab]);

  useEffect(() => {
    if (!authContext) {
      setManagedAdmins([]);
      return;
    }
    const canViewAdminManagementFromSession =
      authContext.isSuperAdmin ||
      authContext.permissions.includes("admin_management:view") ||
      authContext.permissions.includes("admin_management:manage");
    if (canViewAdminManagementFromSession) {
      fetch("/api/admin/admins")
        .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) {
            throw new Error(data?.error || "Unable to load admin users.");
          }
          setManagedAdmins(data.admins || []);
        })
        .catch(() => { });
    }
  }, [authContext]);

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
    setAuthContext(null);
    setManagedAdmins([]);
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

  async function fetchManagedAdmins() {
    if (!canViewAdminManagement) {
      return;
    }
    const response = await fetch("/api/admin/admins");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Unable to load admin users.");
    }
    setManagedAdmins(data.admins || []);
  }

  async function handleCreateManagedAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newAdminUsername,
          password: newAdminPassword,
          permissions: newAdminPermissions,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to create admin.");
      }
      setNewAdminUsername("");
      setNewAdminPassword("");
      setNewAdminPermissions([]);
      setNewAdminPreset("");
      await fetchManagedAdmins();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to create admin."));
    } finally {
      setIsSaving(false);
    }
  }

  function startManagedAdminEdit(admin: ManagedAdminUser) {
    setEditingManagedAdminId(admin.id);
    setEditingManagedPermissions(admin.permissions || []);
    setEditingManagedIsActive(admin.is_active);
    setEditingManagedPassword("");
    setEditingManagedPreset("");
  }

  function cancelManagedAdminEdit() {
    setEditingManagedAdminId(null);
    setEditingManagedPermissions([]);
    setEditingManagedIsActive(true);
    setEditingManagedPassword("");
    setEditingManagedPreset("");
  }

  async function handleUpdateManagedAdmin() {
    if (!editingManagedAdminId) {
      return;
    }
    setErrorMessage("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingManagedAdminId,
          permissions: editingManagedPermissions,
          isActive: editingManagedIsActive,
          password: editingManagedPassword,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to update admin.");
      }
      cancelManagedAdminEdit();
      await fetchManagedAdmins();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to update admin."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSmtpSave() {
    setErrorMessage("");
    setSmtpInfoMessage("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "smtp_update",
          host: smtpHostInput,
          port: smtpPortInput,
          user: smtpUserInput,
          password: smtpPasswordInput,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to save SMTP settings.");
      }

      setSmtpInfoMessage("SMTP custom settings saved.");
      setSmtpPasswordInput("");
      await fetchRegistrations();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to save SMTP settings."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSmtpResetToEnv() {
    setErrorMessage("");
    setSmtpInfoMessage("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "smtp_reset" }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to reset SMTP settings.");
      }

      setSmtpInfoMessage("Custom SMTP removed. Using .env defaults if available.");
      setSmtpPasswordInput("");
      await fetchRegistrations();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to reset SMTP settings."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSendNotificationEmail(email: string) {
    setErrorMessage("");
    setSmtpInfoMessage("");
    setSendingNotificationEmail(email);

    try {
      const response = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "notification_send_email", email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to send email.");
      }
      setSmtpInfoMessage(`Notification email sent to ${email}.`);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to send email."));
    } finally {
      setSendingNotificationEmail(null);
    }
  }

  async function handleNextBatchDateSave() {
    setErrorMessage("");
    setSmtpInfoMessage("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "next_batch_update",
          nextBatchStartDate: nextBatchStartDateInput,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to save next batch date.");
      }
      setSmtpInfoMessage("Next batch start date saved.");
      await fetchRegistrations();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to save next batch date."));
    } finally {
      setIsSaving(false);
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

  function resetWebinarForm() {
    setEditingWebinarId(null);
    setWebinarTitleInput("");
    setWebinarSlugInput("");
    setWebinarBannerPathInput("");
    setWebinarDateInput("");
    setWebinarTimeInput("");
    setWebinarLocationInput("Sultan Bathery, Wayanad");
  }

  async function handleWebinarSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSaving(true);

    try {
      const action = editingWebinarId ? "webinar_update" : "webinar_create";
      const response = await fetch("/api/admin/registrations", {
        method: editingWebinarId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          id: editingWebinarId,
          title: webinarTitleInput,
          slug: webinarSlugInput,
          bannerImagePath: webinarBannerPathInput,
          eventDate: webinarDateInput,
          eventTime: webinarTimeInput,
          location: webinarLocationInput,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to save webinar.");
      }

      resetWebinarForm();
      await fetchRegistrations();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to save webinar."));
    } finally {
      setIsSaving(false);
    }
  }

  function startWebinarEdit(webinar: WebinarRecord) {
    setEditingWebinarId(webinar.id);
    setWebinarTitleInput(webinar.title);
    setWebinarSlugInput(webinar.slug);
    setWebinarBannerPathInput(webinar.banner_image_path || "");
    setWebinarDateInput(toDateInputValue(webinar.event_date));
    setWebinarTimeInput((webinar.event_time || "").slice(0, 5));
    setWebinarLocationInput(webinar.location || "Sultan Bathery, Wayanad");
  }

  async function handleWebinarDelete(id: number) {
    const isConfirmed = window.confirm(
      "Delete this webinar? All registrations for this webinar will also be deleted.",
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
        body: JSON.stringify({ action: "webinar_delete", id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to delete webinar.");
      }

      if (selectedWebinarFilter !== "all" && selectedWebinarFilter === id) {
        setSelectedWebinarFilter("all");
      }
      resetWebinarForm();
      await fetchRegistrations();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to delete webinar."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleWebinarActiveToggle(id: number, isActive: boolean) {
    setErrorMessage("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "webinar_toggle_active", id, isActive }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to update webinar status.");
      }
      await fetchRegistrations();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to update webinar status."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCopyWebinarLink(slug: string) {
    try {
      const webinarUrl = `${window.location.origin}/forms/webinar/${encodeURIComponent(slug)}`;
      await navigator.clipboard.writeText(webinarUrl);
      setCopiedWebinarSlug(slug);
      setTimeout(() => setCopiedWebinarSlug(null), 2000);
    } catch {
      setErrorMessage("Unable to copy webinar link.");
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

  function openRegistrationDetails(registration: RegistrationRecord) {
    setSelectedRegistrationDetails(registration);
    setIsRegistrationDetailsModalOpen(true);
  }

  function closeRegistrationDetails() {
    setIsRegistrationDetailsModalOpen(false);
    setSelectedRegistrationDetails(null);
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
          learningMode: editingRegData.learning_mode,
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

  function openFeeModal(registration: RegistrationRecord) {
    setSelectedFeeRegistration(registration);
    setFeePlan(registration.fee_plan || "monthly_3x");
    setPaymentAmount(String(registration.pending_fee || registration.total_fee || 0));
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentNotes("");
    setIsFeeModalOpen(true);
  }

  function closeFeeModal() {
    setIsFeeModalOpen(false);
    setSelectedFeeRegistration(null);
    setPaymentNotes("");
  }

  async function handleFeePlanUpdate() {
    if (!selectedFeeRegistration) {
      return;
    }

    setErrorMessage("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "registration_fee_update",
          id: selectedFeeRegistration.id,
          feePlan,
          totalFee: selectedFeeRegistration.total_fee,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to update fee plan.");
      }

      await fetchRegistrations();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to update fee plan."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddPayment() {
    if (!selectedFeeRegistration) {
      return;
    }

    setErrorMessage("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "registration_payment_add",
          registrationId: selectedFeeRegistration.id,
          amount: Number(paymentAmount),
          paymentDate,
          paymentMethod,
          notes: paymentNotes,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to add payment.");
      }

      setPaymentNotes("");
      await fetchRegistrations();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to add payment."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeletePayment(paymentId: number) {
    const isConfirmed = window.confirm("Delete this payment entry?");
    if (!isConfirmed) {
      return;
    }

    setErrorMessage("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/registrations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "registration_payment_delete", id: paymentId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to delete payment.");
      }

      await fetchRegistrations();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to delete payment."));
    } finally {
      setIsSaving(false);
    }
  }

  const allowlistPageSize = 8;
  const registrationsPageSize = 10;
  const brochurePageSize = 8;
  const notificationRequestsPageSize = 10;
  const feeRowsPageSize = 10;
  const remindersPageSize = 10;
  const transactionsPageSize = 12;
  const paymentHistoryPageSize = 8;

  const approvedRegistrationsCount = registrations.filter(
    (registration) => registration.review_status === "approved",
  ).length;
  const underReviewRegistrationsCount = registrations.length - approvedRegistrationsCount;
  const totalFeeAmount = registrations.reduce((sum, row) => sum + (row.total_fee || 0), 0);
  const totalPaidAmount = registrations.reduce((sum, row) => sum + (row.total_paid || 0), 0);
  const totalPendingAmount = registrations.reduce((sum, row) => sum + (row.pending_fee || 0), 0);
  const approvalRate = registrations.length
    ? Math.round((approvedRegistrationsCount / registrations.length) * 100)
    : 0;
  const collectionRate = totalFeeAmount ? Math.round((totalPaidAmount / totalFeeAmount) * 100) : 0;
  const underReviewRate = registrations.length
    ? Math.round((underReviewRegistrationsCount / registrations.length) * 100)
    : 0;
  const hrRegistrationsCount = registrations.filter((row) => row.course_selected === "HR").length;
  const dmRegistrationsCount = registrations.filter((row) => row.course_selected === "DM").length;
  const recentRegistrations = [...registrations]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
  const highestPendingRegistrations = [...registrations]
    .filter((row) => row.pending_fee > 0)
    .sort((a, b) => b.pending_fee - a.pending_fee)
    .slice(0, 5);
  const pendingReminderList = registrations
    .filter((row) => row.pending_fee > 0)
    .sort((a, b) => b.pending_fee - a.pending_fee);
  const hrBrochureRequests = brochureRequests.filter((request) => request.offer_type === "HR");
  const dmBrochureRequests = brochureRequests.filter(
    (request) => request.offer_type === "DIGITAL_MARKETING",
  );
  const hrBrochureTotalPages = Math.max(1, Math.ceil(hrBrochureRequests.length / brochurePageSize));
  const dmBrochureTotalPages = Math.max(1, Math.ceil(dmBrochureRequests.length / brochurePageSize));
  const notificationRequestedTotalPages = Math.max(
    1,
    Math.ceil(notificationRequestedUsers.length / notificationRequestsPageSize),
  );
  const feesTotalPages = Math.max(1, Math.ceil(registrations.length / feeRowsPageSize));
  const remindersTotalPages = Math.max(1, Math.ceil(pendingReminderList.length / remindersPageSize));
  const transactionsTotalPages = Math.max(1, Math.ceil(transactions.length / transactionsPageSize));
  const paymentHistoryTotalPages = Math.max(
    1,
    Math.ceil((selectedFeeRegistration?.payment_history?.length || 0) / paymentHistoryPageSize),
  );

  const paginatedHrBrochureRequests = hrBrochureRequests.slice(
    (hrBrochurePage - 1) * brochurePageSize,
    hrBrochurePage * brochurePageSize,
  );
  const paginatedDmBrochureRequests = dmBrochureRequests.slice(
    (dmBrochurePage - 1) * brochurePageSize,
    dmBrochurePage * brochurePageSize,
  );
  const paginatedNotificationRequestedUsers = notificationRequestedUsers.slice(
    (notificationRequestedPage - 1) * notificationRequestsPageSize,
    notificationRequestedPage * notificationRequestsPageSize,
  );
  const paginatedFeeRows = registrations.slice(
    (feesPage - 1) * feeRowsPageSize,
    feesPage * feeRowsPageSize,
  );
  const paginatedPaymentReminders = pendingReminderList.slice(
    (paymentRemindersPage - 1) * remindersPageSize,
    paymentRemindersPage * remindersPageSize,
  );
  const paginatedTransactions = transactions.slice(
    (transactionsPage - 1) * transactionsPageSize,
    transactionsPage * transactionsPageSize,
  );
  const paginatedPaymentHistory = (selectedFeeRegistration?.payment_history || []).slice(
    (paymentHistoryPage - 1) * paymentHistoryPageSize,
    paymentHistoryPage * paymentHistoryPageSize,
  );
  const allowlistTotalPages = Math.max(1, Math.ceil(allowlist.length / allowlistPageSize));
  const paginatedAllowlist = allowlist.slice(
    (allowlistPage - 1) * allowlistPageSize,
    allowlistPage * allowlistPageSize,
  );
  const normalizedRegistrationSearch = registrationSearchTerm.trim().toLowerCase();
  const filteredRegistrations = registrations.filter((row) => {
    const matchesSearch =
      !normalizedRegistrationSearch ||
      row.name.toLowerCase().includes(normalizedRegistrationSearch) ||
      row.whatsapp_number.toLowerCase().includes(normalizedRegistrationSearch) ||
      row.email_id.toLowerCase().includes(normalizedRegistrationSearch) ||
      (row.reg_no || "").toLowerCase().includes(normalizedRegistrationSearch);

    const matchesCourse =
      registrationCourseFilter === "all" || row.course_selected === registrationCourseFilter;

    const matchesReview =
      registrationReviewFilter === "all" || row.review_status === registrationReviewFilter;

    const matchesPayment =
      registrationPaymentFilter === "all" ||
      (registrationPaymentFilter === "fully_paid" ? row.pending_fee <= 0 : row.pending_fee > 0);

    return matchesSearch && matchesCourse && matchesReview && matchesPayment;
  });
  const registrationsTotalPages = Math.max(
    1,
    Math.ceil(filteredRegistrations.length / registrationsPageSize),
  );
  const paginatedRegistrations = filteredRegistrations.slice(
    (registrationsPage - 1) * registrationsPageSize,
    registrationsPage * registrationsPageSize,
  );
  const filteredWebinarRegistrations = webinarRegistrations.filter((row) =>
    selectedWebinarFilter === "all" ? true : row.webinar_id === selectedWebinarFilter,
  );
  const normalizedWebinarRegistrationSearch = webinarRegistrationSearchTerm.trim().toLowerCase();
  const searchedWebinarRegistrations = filteredWebinarRegistrations.filter((row) => {
    if (!normalizedWebinarRegistrationSearch) {
      return true;
    }

    return (
      row.name.toLowerCase().includes(normalizedWebinarRegistrationSearch) ||
      row.phone_number.toLowerCase().includes(normalizedWebinarRegistrationSearch) ||
      row.email_id.toLowerCase().includes(normalizedWebinarRegistrationSearch) ||
      (row.webinar_title || "").toLowerCase().includes(normalizedWebinarRegistrationSearch)
    );
  });
  const webinarRegistrationGroups = searchedWebinarRegistrations.reduce<
    Array<{ label: string; items: WebinarRegistrationRecord[] }>
  >((groups, row) => {
    const label = row.webinar_title || "Unassigned webinar";
    const existingGroup = groups.find((group) => group.label === label);
    if (existingGroup) {
      existingGroup.items.push(row);
      return groups;
    }
    groups.push({ label, items: [row] });
    return groups;
  }, []);

  async function handleExportWebinarRegistrationsExcel() {
    if (searchedWebinarRegistrations.length === 0) {
      return;
    }
    setIsExportingWebinarExcel(true);
    setErrorMessage("");
    try {
      await downloadWebinarRegistrationsExcel(searchedWebinarRegistrations);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to export webinar registrations."));
    } finally {
      setIsExportingWebinarExcel(false);
    }
  }

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

  useEffect(() => {
    setRegistrationsPage(1);
  }, [registrationSearchTerm, registrationCourseFilter, registrationReviewFilter, registrationPaymentFilter]);

  useEffect(() => {
    if (hrBrochurePage > hrBrochureTotalPages) {
      setHrBrochurePage(hrBrochureTotalPages);
    }
  }, [hrBrochurePage, hrBrochureTotalPages]);

  useEffect(() => {
    if (dmBrochurePage > dmBrochureTotalPages) {
      setDmBrochurePage(dmBrochureTotalPages);
    }
  }, [dmBrochurePage, dmBrochureTotalPages]);

  useEffect(() => {
    if (notificationRequestedPage > notificationRequestedTotalPages) {
      setNotificationRequestedPage(notificationRequestedTotalPages);
    }
  }, [notificationRequestedPage, notificationRequestedTotalPages]);

  useEffect(() => {
    if (feesPage > feesTotalPages) {
      setFeesPage(feesTotalPages);
    }
  }, [feesPage, feesTotalPages]);

  useEffect(() => {
    if (paymentRemindersPage > remindersTotalPages) {
      setPaymentRemindersPage(remindersTotalPages);
    }
  }, [paymentRemindersPage, remindersTotalPages]);

  useEffect(() => {
    if (transactionsPage > transactionsTotalPages) {
      setTransactionsPage(transactionsTotalPages);
    }
  }, [transactionsPage, transactionsTotalPages]);

  useEffect(() => {
    if (paymentHistoryPage > paymentHistoryTotalPages) {
      setPaymentHistoryPage(paymentHistoryTotalPages);
    }
  }, [paymentHistoryPage, paymentHistoryTotalPages]);

  useEffect(() => {
    if (!selectedFeeRegistration) {
      return;
    }

    const refreshed = registrations.find((row) => row.id === selectedFeeRegistration.id);
    if (refreshed) {
      setSelectedFeeRegistration(refreshed);
    }
  }, [registrations, selectedFeeRegistration]);

  useEffect(() => {
    setPaymentHistoryPage(1);
  }, [selectedFeeRegistration?.id]);

  return (
    <main className="min-h-screen bg-white py-6 text-slate-900 sm:py-8">
      <div className="w-full px-3 sm:px-5 lg:px-6">
        {isInitializing ? (
          <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center">
            <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#2b24ff]/30 border-t-[#2b24ff]" />
              <span className="text-sm font-medium text-slate-700">Loading admin panel...</span>
            </div>
          </div>
        ) : !isAuthenticated ? (
          <LoginForm
            username={username}
            password={password}
            isLoading={isLoading}
            errorMessage={errorMessage}
            onUsernameChange={setUsername}
            onPasswordChange={setPassword}
            onSubmit={handleLogin}
          />
        ) : (
          <div className="grid min-h-[calc(100vh-12rem)] gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <AdminSidebar
              activeTab={currentTab}
              onTabChange={setActiveTab}
              onLogout={handleLogout}
              useRouteNavigation={false}
              allowedTabs={allowedTabs}
            />

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
              {currentTab === "overview" && (
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
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-indigo-700">Total Fee</p>
                      <p className="mt-1 text-2xl font-semibold text-indigo-700">
                        {formatCurrency(totalFeeAmount)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-cyan-700">Paid</p>
                      <p className="mt-1 text-2xl font-semibold text-cyan-700">
                        {formatCurrency(totalPaidAmount)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-rose-700">Pending</p>
                      <p className="mt-1 text-2xl font-semibold text-rose-700">
                        {formatCurrency(totalPendingAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Approval Rate</p>
                      <p className="mt-1 text-xl font-semibold">{approvalRate}%</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Collection Rate</p>
                      <p className="mt-1 text-xl font-semibold">{collectionRate}%</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Under Review Rate</p>
                      <p className="mt-1 text-xl font-semibold">{underReviewRate}%</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Brochure Requests</p>
                      <p className="mt-1 text-xl font-semibold">{brochureRequests.length}</p>
                    </div>
                    <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-violet-700">HR Registrations</p>
                      <p className="mt-1 text-xl font-semibold text-violet-700">{hrRegistrationsCount}</p>
                    </div>
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-blue-700">DM Registrations</p>
                      <p className="mt-1 text-xl font-semibold text-blue-700">{dmRegistrationsCount}</p>
                    </div>
                    <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-cyan-700">Notify Requests</p>
                      <p className="mt-1 text-xl font-semibold text-cyan-700">
                        {notificationRequestedUsers.length}
                      </p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-amber-700">Pending Follow-ups</p>
                      <p className="mt-1 text-xl font-semibold text-amber-700">
                        {pendingReminderList.length}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 p-4">
                      <h3 className="text-base font-semibold">Recent Registrations</h3>
                      <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                        <table className="min-w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                              <th className="px-3 py-2">Reg No</th>
                              <th className="px-3 py-2">Name</th>
                              <th className="px-3 py-2">Course</th>
                              <th className="px-3 py-2">Submitted</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentRegistrations.map((row) => (
                              <tr key={row.id} className="border-b border-slate-100 text-slate-700">
                                <td className="px-3 py-2">{row.reg_no || "-"}</td>
                                <td className="px-3 py-2">{row.name}</td>
                                <td className="px-3 py-2">{row.course_selected || "-"}</td>
                                <td className="px-3 py-2">{formatDate(row.created_at)}</td>
                              </tr>
                            ))}
                            {recentRegistrations.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-3 py-5 text-center text-slate-500">
                                  No recent registrations.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4">
                      <h3 className="text-base font-semibold">Top Pending Fees</h3>
                      <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                        <table className="min-w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                              <th className="px-3 py-2">Reg No</th>
                              <th className="px-3 py-2">Name</th>
                              <th className="px-3 py-2">WhatsApp</th>
                              <th className="px-3 py-2">Pending</th>
                            </tr>
                          </thead>
                          <tbody>
                            {highestPendingRegistrations.map((row) => (
                              <tr key={row.id} className="border-b border-slate-100 text-slate-700">
                                <td className="px-3 py-2">{row.reg_no || "-"}</td>
                                <td className="px-3 py-2">{row.name}</td>
                                <td className="px-3 py-2">{row.whatsapp_number}</td>
                                <td className="px-3 py-2 font-semibold text-rose-700">
                                  {formatCurrency(row.pending_fee || 0)}
                                </td>
                              </tr>
                            ))}
                            {highestPendingRegistrations.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-3 py-5 text-center text-slate-500">
                                  No pending fee records.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-semibold">SMTP Settings</h3>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                        Source: {smtpSettings.source === "custom" ? "Admin Custom" : smtpSettings.source === "env" ? ".env Default" : "Not Set"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      Configure custom SMTP credentials here. If removed, system will automatically use
                      `.env` values (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`).
                    </p>
                    {!canManageOverview && (
                      <p className="mt-1 text-sm text-amber-700">
                        You have read-only access to Overview settings.
                      </p>
                    )}
                    <p className="mt-1 text-sm text-slate-600">
                      Current next batch start date: {nextBatchStartDate ? formatDate(nextBatchStartDate) : "Not set"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Last updated: {nextBatchUpdatedAt ? formatDate(nextBatchUpdatedAt) : "Not updated yet"}
                    </p>

                    {smtpInfoMessage && (
                      <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {smtpInfoMessage}
                      </p>
                    )}

                    {canManageOverview && (
                      <>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <input
                            value={smtpHostInput}
                            onChange={(event) => setSmtpHostInput(event.target.value)}
                            placeholder="SMTP Host"
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                          />
                          <input
                            value={smtpPortInput}
                            onChange={(event) => setSmtpPortInput(event.target.value)}
                            placeholder="SMTP Port"
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                          />
                          <input
                            value={smtpUserInput}
                            onChange={(event) => setSmtpUserInput(event.target.value)}
                            placeholder="SMTP User"
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                          />
                          <input
                            type="password"
                            value={smtpPasswordInput}
                            onChange={(event) => setSmtpPasswordInput(event.target.value)}
                            placeholder={
                              smtpSettings.password_set
                                ? "SMTP Password (leave empty to keep existing)"
                                : "SMTP Password"
                            }
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleSmtpSave}
                            disabled={isSaving}
                            className="rounded-xl bg-[#2b24ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#221bff] disabled:opacity-70"
                          >
                            Save SMTP
                          </button>
                          <button
                            type="button"
                            onClick={handleSmtpResetToEnv}
                            disabled={isSaving}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-70"
                          >
                            Reset to .env
                          </button>
                        </div>

                        <div className="mt-5 border-t border-slate-200 pt-4">
                          <h4 className="text-sm font-semibold text-slate-800">Next Batch Start Date</h4>
                          <p className="mt-1 text-sm text-slate-600">
                            Used automatically in notification emails when Send/Resend is clicked.
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <input
                              type="date"
                              value={nextBatchStartDateInput}
                              onChange={(event) => setNextBatchStartDateInput(event.target.value)}
                              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                            />
                            <button
                              type="button"
                              onClick={handleNextBatchDateSave}
                              disabled={isSaving}
                              className="rounded-xl bg-[#2b24ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#221bff] disabled:opacity-70"
                            >
                              Save Date
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                </section>
              )}

              {currentTab === "brochure_requests" && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                  <h2 className="text-2xl font-semibold">
                    Brochure Requests ({brochureRequests.length})
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Only submitted brochure requests are shown here, grouped by category.
                  </p>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-3">
                      <h4 className="text-sm font-semibold text-violet-900">
                        HR Submissions ({hrBrochureRequests.length})
                      </h4>
                      <div className="mt-3 overflow-x-auto rounded-lg border border-violet-200 bg-white">
                        <table className="min-w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-violet-200 bg-violet-50 text-violet-900">
                              <th className="px-3 py-2">Name</th>
                              <th className="px-3 py-2">Phone</th>
                              <th className="px-3 py-2">Category</th>
                              <th className="px-3 py-2">Submitted On</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedHrBrochureRequests.map((request) => (
                              <tr key={request.id} className="border-b border-violet-100 text-slate-700">
                                <td className="px-3 py-2">{request.name}</td>
                                <td className="px-3 py-2">{request.phone_number}</td>
                                <td className="px-3 py-2">HR</td>
                                <td className="px-3 py-2">{formatDate(request.created_at)}</td>
                              </tr>
                            ))}
                            {hrBrochureRequests.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-3 py-5 text-center text-slate-500">
                                  No HR brochure submissions yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <PaginationControls
                        page={hrBrochurePage}
                        totalPages={hrBrochureTotalPages}
                        onPrevious={() => setHrBrochurePage((prev) => Math.max(1, prev - 1))}
                        onNext={() =>
                          setHrBrochurePage((prev) => Math.min(hrBrochureTotalPages, prev + 1))
                        }
                      />
                    </div>

                    <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3">
                      <h4 className="text-sm font-semibold text-blue-900">
                        DM Submissions ({dmBrochureRequests.length})
                      </h4>
                      <div className="mt-3 overflow-x-auto rounded-lg border border-blue-200 bg-white">
                        <table className="min-w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-blue-200 bg-blue-50 text-blue-900">
                              <th className="px-3 py-2">Name</th>
                              <th className="px-3 py-2">Phone</th>
                              <th className="px-3 py-2">Category</th>
                              <th className="px-3 py-2">Submitted On</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedDmBrochureRequests.map((request) => (
                              <tr key={request.id} className="border-b border-blue-100 text-slate-700">
                                <td className="px-3 py-2">{request.name}</td>
                                <td className="px-3 py-2">{request.phone_number}</td>
                                <td className="px-3 py-2">Digital Marketing</td>
                                <td className="px-3 py-2">{formatDate(request.created_at)}</td>
                              </tr>
                            ))}
                            {dmBrochureRequests.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-3 py-5 text-center text-slate-500">
                                  No DM brochure submissions yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <PaginationControls
                        page={dmBrochurePage}
                        totalPages={dmBrochureTotalPages}
                        onPrevious={() => setDmBrochurePage((prev) => Math.max(1, prev - 1))}
                        onNext={() =>
                          setDmBrochurePage((prev) => Math.min(dmBrochureTotalPages, prev + 1))
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl border border-slate-200 p-4">
                    <h3 className="text-lg font-semibold">
                      Notification Requested ({notificationRequestedUsers.length})
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Users who used the Notify Me form on the home page.
                    </p>
                    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                      <table className="min-w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                            <th className="px-3 py-2">Email</th>
                            <th className="px-3 py-2">Requested On</th>
                            <th className="px-3 py-2">Email Status</th>
                            <th className="px-3 py-2">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedNotificationRequestedUsers.map((user) => (
                            <tr key={user.id} className="border-b border-slate-100 text-slate-700">
                              <td className="px-3 py-2">{user.email}</td>
                              <td className="px-3 py-2">{formatDate(user.created_at)}</td>
                              <td className="px-3 py-2">
                                {user.sent_count > 0 ? (
                                  <span className="text-emerald-700">
                                    Sent {user.sent_count} time{user.sent_count > 1 ? "s" : ""}
                                    {user.last_sent_at ? ` (last: ${formatDate(user.last_sent_at)})` : ""}
                                  </span>
                                ) : (
                                  <span className="text-amber-700">Not sent yet</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {canManageBrochure ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleSendNotificationEmail(user.email)}
                                    disabled={sendingNotificationEmail === user.email}
                                    className="inline-flex rounded-lg border border-[#2b24ff]/20 bg-[#2b24ff]/10 px-3 py-1.5 text-xs font-medium text-[#2b24ff] hover:bg-[#2b24ff]/15"
                                  >
                                    {sendingNotificationEmail === user.email
                                      ? "Sending..."
                                      : user.sent_count > 0
                                        ? "Resend"
                                        : "Send Email"}
                                  </button>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {notificationRequestedUsers.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-3 py-5 text-center text-slate-500">
                                No notification requests yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <PaginationControls
                      page={notificationRequestedPage}
                      totalPages={notificationRequestedTotalPages}
                      onPrevious={() =>
                        setNotificationRequestedPage((prev) => Math.max(1, prev - 1))
                      }
                      onNext={() =>
                        setNotificationRequestedPage((prev) =>
                          Math.min(notificationRequestedTotalPages, prev + 1),
                        )
                      }
                    />
                  </div>
                </section>
              )}

              {currentTab === "admin_management" && canViewAdminManagement && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                  <h2 className="text-2xl font-semibold">Admin Access Management</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Create admins and assign page-level view/manage permissions.
                  </p>
                  {canManageAdminManagement && (
                    <form onSubmit={handleCreateManagedAdmin} className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm text-slate-700">Permission Preset</label>
                      <select
                        value={newAdminPreset}
                        onChange={(event) => {
                          const presetId = event.target.value;
                          setNewAdminPreset(presetId);
                          const preset = ADMIN_PERMISSION_PRESETS.find((item) => item.id === presetId);
                          if (preset) {
                            setNewAdminPermissions(preset.permissions);
                          }
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                      >
                        <option value="">Custom (select manually)</option>
                        {ADMIN_PERMISSION_PRESETS.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      required
                      value={newAdminUsername}
                      onChange={(event) => setNewAdminUsername(event.target.value)}
                      placeholder="Admin username"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                    />
                    <input
                      required
                      type="password"
                      minLength={6}
                      value={newAdminPassword}
                      onChange={(event) => setNewAdminPassword(event.target.value)}
                      placeholder="Password (min 6)"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                    />
                    <div className="md:col-span-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {ADMIN_PERMISSION_OPTIONS.map((permission) => (
                        <label key={permission} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                          <input
                            type="checkbox"
                            checked={newAdminPermissions.includes(permission)}
                            onChange={(event) =>
                              setNewAdminPermissions((prev) =>
                                event.target.checked
                                  ? [...prev, permission]
                                  : prev.filter((item) => item !== permission),
                              )
                            }
                          />
                          <span>{permission}</span>
                        </label>
                      ))}
                    </div>
                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="rounded-xl bg-[#2b24ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#221bff] disabled:opacity-70"
                      >
                        Create Admin
                      </button>
                    </div>
                    </form>
                  )}
                  <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                          <th className="px-3 py-2">Username</th>
                          <th className="px-3 py-2">Permissions</th>
                          <th className="px-3 py-2">Status</th>
                          {canManageAdminManagement && <th className="px-3 py-2">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {managedAdmins.map((admin) => (
                          <Fragment key={admin.id}>
                            <tr className="border-b border-slate-100 text-slate-700">
                              <td className="px-3 py-2">{admin.username}</td>
                              <td className="px-3 py-2 text-xs">{admin.permissions.join(", ")}</td>
                              <td className="px-3 py-2">{admin.is_active ? "Active" : "Disabled"}</td>
                              {canManageAdminManagement && (
                                <td className="px-3 py-2">
                                  <button
                                    type="button"
                                    onClick={() => startManagedAdminEdit(admin)}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50"
                                  >
                                    Edit Permissions
                                  </button>
                                </td>
                              )}
                            </tr>
                            {canManageAdminManagement && editingManagedAdminId === admin.id && (
                              <tr className="border-b border-slate-100 bg-slate-50/60">
                                <td colSpan={4} className="px-3 py-3">
                                  <div className="grid gap-3 md:grid-cols-2">
                                    <div className="md:col-span-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                      <div className="sm:col-span-2 lg:col-span-3">
                                        <label className="mb-1 block text-xs text-slate-700">Permission Preset</label>
                                        <select
                                          value={editingManagedPreset}
                                          onChange={(event) => {
                                            const presetId = event.target.value;
                                            setEditingManagedPreset(presetId);
                                            const preset = ADMIN_PERMISSION_PRESETS.find((item) => item.id === presetId);
                                            if (preset) {
                                              setEditingManagedPermissions(preset.permissions);
                                            }
                                          }}
                                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                                        >
                                          <option value="">Custom (select manually)</option>
                                          {ADMIN_PERMISSION_PRESETS.map((preset) => (
                                            <option key={preset.id} value={preset.id}>
                                              {preset.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      {ADMIN_PERMISSION_OPTIONS.map((permission) => (
                                        <label
                                          key={`${admin.id}-${permission}`}
                                          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={editingManagedPermissions.includes(permission)}
                                            onChange={(event) =>
                                              setEditingManagedPermissions((prev) =>
                                                event.target.checked
                                                  ? [...prev, permission]
                                                  : prev.filter((item) => item !== permission),
                                              )
                                            }
                                          />
                                          <span>{permission}</span>
                                        </label>
                                      ))}
                                    </div>
                                    <label className="flex items-center gap-2 text-sm text-slate-700">
                                      <input
                                        type="checkbox"
                                        checked={editingManagedIsActive}
                                        onChange={(event) => setEditingManagedIsActive(event.target.checked)}
                                      />
                                      <span>Admin active</span>
                                    </label>
                                    <input
                                      type="password"
                                      value={editingManagedPassword}
                                      onChange={(event) => setEditingManagedPassword(event.target.value)}
                                      placeholder="New password (optional)"
                                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                                    />
                                    <div className="md:col-span-2 flex gap-2">
                                      <button
                                        type="button"
                                        onClick={handleUpdateManagedAdmin}
                                        disabled={isSaving}
                                        className="rounded-xl bg-[#2b24ff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#221bff] disabled:opacity-70"
                                      >
                                        Save Changes
                                      </button>
                                      <button
                                        type="button"
                                        onClick={cancelManagedAdminEdit}
                                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                        {managedAdmins.length === 0 && (
                          <tr>
                            <td colSpan={canManageAdminManagement ? 4 : 3} className="px-3 py-4 text-center text-slate-500">
                              No managed admins yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {currentTab === "webinar_registrations" && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                  <h2 className="text-2xl font-semibold">Webinar Management</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Create, update, and delete webinars. View registrations for each webinar.
                  </p>

                  {canManageWebinar && (
                    <form
                      onSubmit={handleWebinarSave}
                      className="mt-4 grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2"
                    >
                    <input
                      required
                      value={webinarTitleInput}
                      onChange={(event) => setWebinarTitleInput(event.target.value)}
                      placeholder="Webinar title"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                    />
                    <input
                      value={webinarSlugInput}
                      onChange={(event) => setWebinarSlugInput(event.target.value.toLowerCase())}
                      placeholder="URL slug (optional, e.g. april-career-day)"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                    />
                    <input
                      value={webinarBannerPathInput}
                      onChange={(event) => setWebinarBannerPathInput(event.target.value)}
                      placeholder="Banner path: /webinar/your-image.jpg (file in public/)"
                      className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                    />
                    <input
                      type="date"
                      required
                      value={webinarDateInput}
                      onChange={(event) => setWebinarDateInput(event.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                    />
                    <input
                      type="time"
                      required
                      value={webinarTimeInput}
                      onChange={(event) => setWebinarTimeInput(event.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                    />
                    <input
                      required
                      value={webinarLocationInput}
                      onChange={(event) => setWebinarLocationInput(event.target.value)}
                      placeholder="Location"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                    />
                    <div className="md:col-span-2 flex gap-2">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="rounded-xl bg-[#2b24ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#221bff] disabled:opacity-70"
                      >
                        {editingWebinarId ? "Update Webinar" : "Create Webinar"}
                      </button>
                      {editingWebinarId && (
                        <button
                          type="button"
                          onClick={resetWebinarForm}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                    </form>
                  )}

                  <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                          <th className="px-3 py-2">Title</th>
                          <th className="px-3 py-2">Slug / link</th>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Time</th>
                          <th className="px-3 py-2">Location</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {webinars.map((webinar) => (
                          <tr key={webinar.id} className="border-b border-slate-100 text-slate-700">
                            <td className="px-3 py-2">{webinar.title}</td>
                            <td className="px-3 py-2 font-mono text-xs text-slate-600">/{webinar.slug}</td>
                            <td className="px-3 py-2">{formatDate(webinar.event_date)}</td>
                            <td className="px-3 py-2">{(webinar.event_time || "").slice(0, 5)}</td>
                            <td className="px-3 py-2">{webinar.location}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${webinar.is_active
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-200 text-slate-700"
                                  }`}
                              >
                                {webinar.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => void handleCopyWebinarLink(webinar.slug)}
                                  className="rounded-lg border border-[#2b24ff]/20 bg-[#2b24ff]/10 px-3 py-1.5 text-[#2b24ff] hover:bg-[#2b24ff]/15"
                                >
                                  {copiedWebinarSlug === webinar.slug ? "Copied Link" : "Copy Link"}
                                </button>
                                {canManageWebinar && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => startWebinarEdit(webinar)}
                                      className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleWebinarActiveToggle(webinar.id, !webinar.is_active)}
                                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-700 hover:bg-amber-100"
                                    >
                                      {webinar.is_active ? "Deactivate" : "Activate"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleWebinarDelete(webinar.id)}
                                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-red-700 hover:bg-red-100"
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {webinars.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-3 py-5 text-center text-slate-500">
                              No webinars created yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold">
                        Webinar Registrations ({searchedWebinarRegistrations.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={selectedWebinarFilter === "all" ? "all" : String(selectedWebinarFilter)}
                          onChange={(event) =>
                            setSelectedWebinarFilter(
                              event.target.value === "all" ? "all" : Number(event.target.value),
                            )
                          }
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                        >
                          <option value="all">All webinars</option>
                          {webinars.map((webinar) => (
                            <option key={webinar.id} value={webinar.id}>
                              {webinar.title}
                            </option>
                          ))}
                        </select>
                        <input
                          value={webinarRegistrationSearchTerm}
                          onChange={(event) => setWebinarRegistrationSearchTerm(event.target.value)}
                          placeholder="Search name, phone, email..."
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                        />
                        <button
                          type="button"
                          disabled={
                            searchedWebinarRegistrations.length === 0 || isExportingWebinarExcel
                          }
                          onClick={() => void handleExportWebinarRegistrationsExcel()}
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isExportingWebinarExcel ? "Exporting…" : "Export Excel"}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-4">
                      {webinarRegistrationGroups.map((group) => (
                        <div key={group.label} className="rounded-lg border border-slate-200 bg-white">
                          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="text-sm font-semibold text-slate-700">{group.label}</p>
                            <span className="rounded-full bg-[#2b24ff]/10 px-2.5 py-1 text-xs font-medium text-[#2b24ff]">
                              {group.items.length} registration{group.items.length > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-700">
                                  <th className="px-3 py-2">Name</th>
                                  <th className="px-3 py-2">Phone</th>
                                  <th className="px-3 py-2">Email</th>
                                  <th className="px-3 py-2">Qualification</th>
                                  <th className="px-3 py-2">Submitted On</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.items.map((row) => (
                                  <tr key={row.id} className="border-b border-slate-100 text-slate-700">
                                    <td className="px-3 py-2 font-medium">{row.name}</td>
                                    <td className="px-3 py-2">{row.phone_number}</td>
                                    <td className="px-3 py-2">{row.email_id}</td>
                                    <td className="px-3 py-2">{row.qualification}</td>
                                    <td className="px-3 py-2">{formatDate(row.created_at)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                      {webinarRegistrationGroups.length === 0 && (
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-6 text-center text-slate-500">
                          No webinar registrations for the current filter/search.
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {currentTab === "fees" && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold">Fee Management</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Track total fee, paid amount, pending balance, mode-based fee setup, and payment dates.
                    </p>
                  </div>

                  <div className="mb-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-indigo-700">Total Fee</p>
                      <p className="mt-1 text-2xl font-semibold text-indigo-700">
                        {formatCurrency(totalFeeAmount)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-cyan-700">Total Paid</p>
                      <p className="mt-1 text-2xl font-semibold text-cyan-700">
                        {formatCurrency(totalPaidAmount)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-rose-700">Total Pending</p>
                      <p className="mt-1 text-2xl font-semibold text-rose-700">
                        {formatCurrency(totalPendingAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                          <th className="px-3 py-2">Reg No</th>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">WhatsApp</th>
                          <th className="px-3 py-2">Plan</th>
                          <th className="px-3 py-2">Total</th>
                          <th className="px-3 py-2">Paid</th>
                          <th className="px-3 py-2">Pending</th>
                          <th className="px-3 py-2">Last Payment</th>
                          <th className="px-3 py-2">Entries</th>
                          <th className="px-3 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedFeeRows.map((row) => (
                          <tr key={row.id} className="border-b border-slate-100 text-slate-700">
                            <td className="px-3 py-2 font-medium text-[#2b24ff]">{row.reg_no || "-"}</td>
                            <td className="px-3 py-2">{row.name}</td>
                            <td className="px-3 py-2">{row.whatsapp_number}</td>
                            <td className="px-3 py-2">
                              {formatFeeModeSummary(row)}
                            </td>
                            <td className="px-3 py-2">{formatCurrency(row.total_fee || 0)}</td>
                            <td className="px-3 py-2 text-cyan-700">
                              {formatCurrency(row.total_paid || 0)}
                            </td>
                            <td className="px-3 py-2 text-rose-700">
                              {formatCurrency(row.pending_fee || 0)}
                            </td>
                            <td className="px-3 py-2">
                              {row.last_payment_date ? formatDate(row.last_payment_date) : "-"}
                            </td>
                            <td className="px-3 py-2">{row.payment_count || 0}</td>
                            <td className="px-3 py-2">
                              {canManageFees ? (
                                <button
                                  type="button"
                                  onClick={() => openFeeModal(row)}
                                  className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50"
                                >
                                  Manage
                                </button>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {registrations.length === 0 && (
                          <tr>
                            <td colSpan={10} className="px-3 py-6 text-center text-slate-500">
                              No registrations found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <PaginationControls
                    page={feesPage}
                    totalPages={feesTotalPages}
                    onPrevious={() => setFeesPage((prev) => Math.max(1, prev - 1))}
                    onNext={() => setFeesPage((prev) => Math.min(feesTotalPages, prev + 1))}
                  />

                  <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                    <h3 className="text-base font-semibold text-amber-900">
                      Payment Reminders ({pendingReminderList.length})
                    </h3>
                    <p className="mt-1 text-sm text-amber-800">
                      Students with pending fee balance. Use this list for follow-up reminders.
                    </p>
                    <div className="mt-3 overflow-x-auto rounded-lg border border-amber-200 bg-white">
                      <table className="min-w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-amber-200 bg-amber-50 text-amber-900">
                            <th className="px-3 py-2">Reg No</th>
                            <th className="px-3 py-2">Name</th>
                            <th className="px-3 py-2">WhatsApp</th>
                            <th className="px-3 py-2">Plan</th>
                            <th className="px-3 py-2">Paid</th>
                            <th className="px-3 py-2">Pending</th>
                            <th className="px-3 py-2">Last Payment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedPaymentReminders.map((row) => (
                            <tr key={row.id} className="border-b border-amber-100 text-slate-700">
                              <td className="px-3 py-2 font-medium text-[#2b24ff]">{row.reg_no || "-"}</td>
                              <td className="px-3 py-2">{row.name}</td>
                              <td className="px-3 py-2">{row.whatsapp_number}</td>
                              <td className="px-3 py-2">
                                {formatFeeModeSummary(row)}
                              </td>
                              <td className="px-3 py-2 text-cyan-700">{formatCurrency(row.total_paid || 0)}</td>
                              <td className="px-3 py-2 font-semibold text-rose-700">
                                {formatCurrency(row.pending_fee || 0)}
                              </td>
                              <td className="px-3 py-2">
                                {row.last_payment_date ? formatDate(row.last_payment_date) : "No payment yet"}
                              </td>
                            </tr>
                          ))}
                          {pendingReminderList.length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-3 py-5 text-center text-slate-500">
                                No pending balances. All students are cleared.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <PaginationControls
                      page={paymentRemindersPage}
                      totalPages={remindersTotalPages}
                      onPrevious={() => setPaymentRemindersPage((prev) => Math.max(1, prev - 1))}
                      onNext={() =>
                        setPaymentRemindersPage((prev) => Math.min(remindersTotalPages, prev + 1))
                      }
                    />
                  </div>

                  <div className="mt-5 rounded-xl border border-slate-200 p-4">
                    <h3 className="text-base font-semibold">Transaction History ({transactions.length})</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Complete payment transactions across all students, latest first.
                    </p>
                    <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-slate-200">
                      <table className="min-w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Reg No</th>
                            <th className="px-3 py-2">Name</th>
                            <th className="px-3 py-2">WhatsApp</th>
                            <th className="px-3 py-2">Amount</th>
                            <th className="px-3 py-2">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedTransactions.map((transaction) => (
                            <tr key={transaction.id} className="border-b border-slate-100 text-slate-700">
                              <td className="px-3 py-2">{formatDate(transaction.payment_date)}</td>
                              <td className="px-3 py-2 font-medium text-[#2b24ff]">
                                {transaction.reg_no || "-"}
                              </td>
                              <td className="px-3 py-2">{transaction.name}</td>
                              <td className="px-3 py-2">{transaction.whatsapp_number}</td>
                              <td className="px-3 py-2 font-semibold text-emerald-700">
                                {formatCurrency(transaction.amount)}
                              </td>
                              <td className="px-3 py-2">{transaction.notes || "-"}</td>
                            </tr>
                          ))}
                          {transactions.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-3 py-5 text-center text-slate-500">
                                No transactions recorded yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <PaginationControls
                      page={transactionsPage}
                      totalPages={transactionsTotalPages}
                      onPrevious={() => setTransactionsPage((prev) => Math.max(1, prev - 1))}
                      onNext={() =>
                        setTransactionsPage((prev) => Math.min(transactionsTotalPages, prev + 1))
                      }
                    />
                  </div>
                </section>
              )}

              {currentTab === "allowlist" && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold">Allowed Students ({allowlist.length})</h2>
                  </div>

                  {canManageAllowlist && (
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
                  )}

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
                              {canManageAllowlist ? (
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
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
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

              {currentTab === "registrations" && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold">
                      Registrations ({filteredRegistrations.length})
                    </h2>
                  </div>

                  <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <input
                      value={registrationSearchTerm}
                      onChange={(event) => setRegistrationSearchTerm(event.target.value)}
                      placeholder="Search name, phone, email, reg no"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40 md:col-span-2"
                    />
                    <select
                      value={registrationCourseFilter}
                      onChange={(event) =>
                        setRegistrationCourseFilter(event.target.value as "all" | "HR" | "DM")
                      }
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                    >
                      <option value="all">All Courses</option>
                      <option value="HR">HR</option>
                      <option value="DM">DM</option>
                    </select>
                    <select
                      value={registrationReviewFilter}
                      onChange={(event) =>
                        setRegistrationReviewFilter(
                          event.target.value as "all" | "approved" | "under_review",
                        )
                      }
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                    >
                      <option value="all">All Reviews</option>
                      <option value="approved">Approved</option>
                      <option value="under_review">Under Review</option>
                    </select>
                    <select
                      value={registrationPaymentFilter}
                      onChange={(event) =>
                        setRegistrationPaymentFilter(
                          event.target.value as "all" | "fully_paid" | "pending_fee",
                        )
                      }
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                    >
                      <option value="all">All Payment States</option>
                      <option value="fully_paid">Fully Paid</option>
                      <option value="pending_fee">Pending Fee</option>
                    </select>
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
                          <th className="px-3 py-2">Mode</th>
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
                            <td className="px-3 py-2 font-medium text-[#2b24ff]">
                              {row.reg_no ? (
                                <button
                                  type="button"
                                  onClick={() => openRegistrationDetails(row)}
                                  className="underline underline-offset-4 hover:text-[#221bff]"
                                  title="View student and fee details"
                                >
                                  {row.reg_no}
                                </button>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <ReviewBadge status={row.review_status} />
                            </td>
                            <td className="px-3 py-2">{row.name}</td>
                            <td className="px-3 py-2">{row.whatsapp_number}</td>
                            <td className="px-3 py-2">{row.email_id}</td>
                            <td className="px-3 py-2">{row.course_selected || "-"}</td>
                            <td className="px-3 py-2">{row.qualification || "-"}</td>
                            <td className="px-3 py-2">
                              {formatLearningMode(getRegistrationLearningMode(row))}
                            </td>
                            <td className="px-3 py-2">{row.current_status || "-"}</td>
                            <td className="px-3 py-2">{row.last_institution_attended || "-"}</td>
                            <td className="px-3 py-2">{row.place}</td>
                            <td className="px-3 py-2">{formatDate(row.date_of_birth)}</td>
                            <td className="px-3 py-2">{getAgeFromDateOfBirth(row.date_of_birth)}</td>
                            <td className="px-3 py-2">
                              {canManageRegistrations ? (
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
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
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

            {canManageRegistrations && isRegistrationEditModalOpen && editingRegData && (
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
                    <select
                      value={editingRegData.learning_mode || ""}
                      onChange={(event) =>
                        setEditingRegData((prev) => ({
                          ...prev,
                          learning_mode: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                    >
                      <option value="">Select mode</option>
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
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

            {isRegistrationDetailsModalOpen && selectedRegistrationDetails && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                  <h3 className="text-lg font-semibold">
                    Student Details - {selectedRegistrationDetails.reg_no || "No Reg No"}
                  </h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs uppercase text-slate-500">Name</p>
                      <p className="mt-1 font-medium">{selectedRegistrationDetails.name}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs uppercase text-slate-500">WhatsApp</p>
                      <p className="mt-1 font-medium">{selectedRegistrationDetails.whatsapp_number}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs uppercase text-slate-500">Email</p>
                      <p className="mt-1 font-medium">{selectedRegistrationDetails.email_id}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs uppercase text-slate-500">Course</p>
                      <p className="mt-1 font-medium">{selectedRegistrationDetails.course_selected || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs uppercase text-slate-500">Qualification</p>
                      <p className="mt-1 font-medium">{selectedRegistrationDetails.qualification || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs uppercase text-slate-500">Mode</p>
                      <p className="mt-1 font-medium">
                        {formatLearningMode(getRegistrationLearningMode(selectedRegistrationDetails))}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs uppercase text-slate-500">Current Status</p>
                      <p className="mt-1 font-medium">{selectedRegistrationDetails.current_status || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs uppercase text-slate-500">Institution</p>
                      <p className="mt-1 font-medium">
                        {selectedRegistrationDetails.last_institution_attended || "-"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs uppercase text-slate-500">Place</p>
                      <p className="mt-1 font-medium">{selectedRegistrationDetails.place}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs uppercase text-slate-500">Date of Birth</p>
                      <p className="mt-1 font-medium">{formatDate(selectedRegistrationDetails.date_of_birth)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                      <p className="text-xs uppercase text-slate-500">Review</p>
                      <div className="mt-1">
                        <ReviewBadge status={selectedRegistrationDetails.review_status} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-slate-200 p-4">
                    <h4 className="font-semibold">Fee Details</h4>
                    <div className="mt-3 grid gap-3 sm:grid-cols-4">
                      <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2">
                        <p className="text-xs uppercase text-indigo-700">Plan</p>
                        <p className="font-semibold text-indigo-700">
                          {formatFeeModeSummary(selectedRegistrationDetails)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2">
                        <p className="text-xs uppercase text-indigo-700">Total</p>
                        <p className="font-semibold text-indigo-700">
                          {formatCurrency(selectedRegistrationDetails.total_fee || 0)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2">
                        <p className="text-xs uppercase text-cyan-700">Paid</p>
                        <p className="font-semibold text-cyan-700">
                          {formatCurrency(selectedRegistrationDetails.total_paid || 0)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                        <p className="text-xs uppercase text-rose-700">Pending</p>
                        <p className="font-semibold text-rose-700">
                          {formatCurrency(selectedRegistrationDetails.pending_fee || 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={closeRegistrationDetails}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isFeeModalOpen && selectedFeeRegistration && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                  <h3 className="text-lg font-semibold">
                    Manage Fees - {selectedFeeRegistration.name} ({selectedFeeRegistration.reg_no || "No Reg No"})
                  </h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2">
                      <p className="text-xs uppercase text-indigo-700">Total</p>
                      <p className="font-semibold text-indigo-700">
                        {formatCurrency(selectedFeeRegistration.total_fee || 0)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2">
                      <p className="text-xs uppercase text-cyan-700">Paid</p>
                      <p className="font-semibold text-cyan-700">
                        {formatCurrency(selectedFeeRegistration.total_paid || 0)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                      <p className="text-xs uppercase text-rose-700">Pending</p>
                      <p className="font-semibold text-rose-700">
                        {formatCurrency(selectedFeeRegistration.pending_fee || 0)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-xs uppercase text-slate-700">Payments</p>
                      <p className="font-semibold text-slate-700">{selectedFeeRegistration.payment_count || 0}</p>
                    </div>
                  </div>

                  {canManageFees && (
                    <div className="mt-4 rounded-xl border border-slate-200 p-4">
                      <h4 className="font-medium">Payment Tracking</h4>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <select
                          value={feePlan}
                          onChange={(event) =>
                            setFeePlan(event.target.value as "monthly_3x" | "one_time")
                          }
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                        >
                          <option value="monthly_3x">Installment tracking</option>
                          <option value="one_time">Full-payment tracking</option>
                        </select>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={handleFeePlanUpdate}
                          className="rounded-xl bg-[#2b24ff] px-4 py-2 font-semibold text-white hover:bg-[#221bff] disabled:opacity-70"
                        >
                          Save Plan
                        </button>
                      </div>
                    </div>
                  )}

                  {canManageFees && (
                    <div className="mt-4 rounded-xl border border-slate-200 p-4">
                      <h4 className="font-medium">Add Payment Entry</h4>
                      <div className="mt-3 grid gap-3 sm:grid-cols-5">
                      <input
                        type="number"
                        min={1}
                        value={paymentAmount}
                        onChange={(event) => setPaymentAmount(event.target.value)}
                        placeholder="Amount"
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                      />
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(event) => setPaymentDate(event.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                      />
                      <select
                        value={paymentMethod}
                        onChange={(event) =>
                          setPaymentMethod(
                            event.target.value as "bank_transfer" | "upi" | "cash" | "card_payment",
                          )
                        }
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40"
                      >
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="upi">UPI</option>
                        <option value="cash">Cash</option>
                        <option value="card_payment">Card Payment</option>
                      </select>
                      <input
                        value={paymentNotes}
                        onChange={(event) => setPaymentNotes(event.target.value)}
                        placeholder="Notes (optional)"
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-[#2b24ff]/40 sm:col-span-2"
                      />
                      </div>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={handleAddPayment}
                        className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
                      >
                        Add Payment
                      </button>
                    </div>
                  )}

                  <div className="mt-4 rounded-xl border border-slate-200">
                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
                      Payment History
                    </div>
                    <div className="max-h-64 overflow-auto">
                      {selectedFeeRegistration.payment_history?.length ? (
                        <table className="min-w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 bg-white text-slate-700">
                              <th className="px-3 py-2">Date</th>
                              <th className="px-3 py-2">Amount</th>
                              <th className="px-3 py-2">Notes</th>
                              <th className="px-3 py-2">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedPaymentHistory.map((payment) => (
                              <tr key={payment.id} className="border-b border-slate-100 text-slate-700">
                                <td className="px-3 py-2">{formatDate(payment.payment_date)}</td>
                                <td className="px-3 py-2">{formatCurrency(payment.amount)}</td>
                                <td className="px-3 py-2">{payment.notes || "-"}</td>
                                <td className="px-3 py-2">
                                  {canManageFees ? (
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePayment(payment.id)}
                                      className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"
                                    >
                                      <ActionIcon path="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" />
                                    </button>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="px-4 py-6 text-center text-slate-500">No payment entries yet.</p>
                      )}
                    </div>
                    {selectedFeeRegistration.payment_history?.length > 0 && (
                      <div className="px-4 pb-4">
                        <PaginationControls
                          page={paymentHistoryPage}
                          totalPages={paymentHistoryTotalPages}
                          onPrevious={() => setPaymentHistoryPage((prev) => Math.max(1, prev - 1))}
                          onNext={() =>
                            setPaymentHistoryPage((prev) => Math.min(paymentHistoryTotalPages, prev + 1))
                          }
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeFeeModal}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 text-center text-sm hidden">
          <Link href="/forms" className="text-[#2b24ff] underline underline-offset-4">
            Back to Forms Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

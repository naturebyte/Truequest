import Link from "next/link";
import type { AdminTab } from "../types";

type AdminSidebarProps = {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onLogout: () => void | Promise<void>;
  useRouteNavigation?: boolean;
  allowedTabs?: AdminTab[];
};

export const ADMIN_TAB_ITEMS: Array<{ id: AdminTab; label: string; shortLabel: string }> = [
  { id: "overview", label: "Overview", shortLabel: "Home" },
  { id: "admin_management", label: "Admin Management", shortLabel: "Admins" },
  { id: "registrations", label: "Registrations", shortLabel: "Regs" },
  { id: "webinar_registrations", label: "Webinar Management", shortLabel: "Webinar" },
  { id: "allowlist", label: "Allowed Students", shortLabel: "Allowed" },
  { id: "fees", label: "Fee Management", shortLabel: "Fees" },
  { id: "brochure_requests", label: "Brochure Requests", shortLabel: "Brochure" },
];

export function AdminSidebar({
  activeTab,
  onTabChange,
  onLogout,
  useRouteNavigation = false,
  allowedTabs,
}: AdminSidebarProps) {
  const visibleTabs = allowedTabs?.length
    ? ADMIN_TAB_ITEMS.filter((tab) => allowedTabs.includes(tab.id))
    : ADMIN_TAB_ITEMS;
  return (
    <aside className="hidden h-full self-stretch rounded-2xl border border-slate-200 bg-white p-4 shadow-xl lg:sticky lg:top-6 lg:flex lg:h-[calc(100vh-3rem)] lg:flex-col">
      <h2 className="text-lg font-semibold">Admin Pages</h2>
      <p className="mt-1 text-sm text-slate-600">Select a page to view only that content.</p>
      <nav className="mt-4 space-y-2 lg:flex-1 lg:overflow-y-auto lg:pr-1">
        {visibleTabs.map((tab) => (
          useRouteNavigation ? (
            <Link
              key={tab.id}
              href={`/admin/${tab.id}`}
              className={`block w-full rounded-lg border px-3 py-2 text-left text-sm ${
                activeTab === tab.id
                  ? "border-[#2b24ff]/30 bg-[#2b24ff]/10 text-[#2b24ff]"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </Link>
          ) : (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`block w-full rounded-lg border px-3 py-2 text-left text-sm ${
                activeTab === tab.id
                  ? "border-[#2b24ff]/30 bg-[#2b24ff]/10 text-[#2b24ff]"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          )
        ))}
      </nav>
      <button
        type="button"
        onClick={onLogout}
        className="mt-6 w-full rounded-lg bg-[#2b24ff] px-4 py-2 text-sm font-medium text-white hover:bg-[#221bff] lg:mt-auto"
      >
        Logout
      </button>
    </aside>
  );
}

import type { AdminTab } from "../types";

type AdminSidebarProps = {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onLogout: () => void | Promise<void>;
};

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "brochure_requests", label: "Brochure Requests" },
  { id: "allowlist", label: "Allowed Students" },
  { id: "fees", label: "Fee Management" },
  { id: "registrations", label: "Registrations" },
];

export function AdminSidebar({ activeTab, onTabChange, onLogout }: AdminSidebarProps) {
  return (
    <aside className="flex h-full self-stretch rounded-2xl border border-slate-200 bg-white p-4 shadow-xl lg:flex-col">
      <h2 className="text-lg font-semibold">Admin Pages</h2>
      <p className="mt-1 text-sm text-slate-600">Select a page to view only that content.</p>
      <nav className="mt-4 space-y-2">
        {tabs.map((tab) => (
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

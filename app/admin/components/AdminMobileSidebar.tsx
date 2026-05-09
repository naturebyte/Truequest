import type { AdminTab } from "../types";
import { ADMIN_TAB_ITEMS } from "./AdminSidebar";

type AdminMobileSidebarProps = {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onLogout: () => void | Promise<void>;
  onClose: () => void;
  allowedTabs?: AdminTab[];
};

export function AdminMobileSidebar({
  activeTab,
  onTabChange,
  onLogout,
  onClose,
  allowedTabs,
}: AdminMobileSidebarProps) {
  const visibleTabs = allowedTabs?.length
    ? ADMIN_TAB_ITEMS.filter((tab) => allowedTabs.includes(tab.id))
    : ADMIN_TAB_ITEMS;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40"
      />
      <aside className="relative h-full w-[85%] max-w-[18rem] border-r border-slate-200 bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Admin Menu</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700"
          >
            Close
          </button>
        </div>
        <nav className="space-y-2">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onTabChange(tab.id);
                onClose();
              }}
              className={`block w-full rounded-lg border px-3 py-2 text-left text-sm ${
                activeTab === tab.id
                  ? "border-[#2b24ff]/30 bg-[#2b24ff]/10 text-[#2b24ff]"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          onClick={async () => {
            await onLogout();
            onClose();
          }}
          className="mt-6 w-full rounded-lg bg-[#2b24ff] px-4 py-2 text-sm font-medium text-white"
        >
          Logout
        </button>
      </aside>
    </div>
  );
}

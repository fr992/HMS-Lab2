import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/layouts/Sidebar";

export default function AdminLayout() {
  const { pathname } = useLocation();
  const isDashboard = pathname === "/admin" || pathname === "/admin/dashboard";

  return (
    <div className="flex h-screen w-full max-w-full gap-3 overflow-hidden bg-slate-100 p-3 text-slate-900">
      <Sidebar />
      <main className="scrollbar-none min-h-0 min-w-0 flex-1 overflow-y-auto rounded-lg bg-slate-50">
        <div
          className={[
            "mx-auto flex h-full min-h-full w-full max-w-[120rem] flex-col",
            isDashboard ? "" : "p-4 sm:p-5 lg:p-6",
          ].join(" ")}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}

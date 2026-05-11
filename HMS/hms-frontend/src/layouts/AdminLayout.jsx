import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/layouts/Sidebar";

export default function AdminLayout() {
  const { pathname } = useLocation();
  const isDashboard =
    pathname === "/admin" ||
    pathname === "/admin/dashboard" ||
    pathname === "/staff/dashboard" ||
    pathname.endsWith("/dashboard");

  return (
    <div className="flex h-screen w-full max-w-full gap-2 overflow-hidden bg-slate-100 p-2 text-slate-900 sm:gap-3 sm:p-3">
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

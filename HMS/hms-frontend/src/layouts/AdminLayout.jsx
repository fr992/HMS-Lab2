import { Outlet } from "react-router-dom";
import Sidebar from "@/layouts/Sidebar";

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen w-full max-w-full bg-slate-50 text-slate-900">
      <Sidebar />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col p-4 sm:p-6 lg:p-8">
        <div className="mx-auto flex min-h-0 w-full max-w-[100rem] flex-1 flex-col">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

import { Outlet } from "react-router-dom";
import Sidebar from "@/layouts/Sidebar";

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen w-full max-w-full bg-slate-50 text-slate-900">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

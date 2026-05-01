import { useAuth } from "@/auth/AuthContext";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  UserRound,
  Users,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const auth = useAuth();
  const { pathname } = useLocation();
  const canReadPatients = auth.hasPermission("Patients.Read");
  const canReadAppointments = auth.hasPermission("Appointments.Read");
  const isAdmin = auth.userRole === "Admin";

  const linkClass = (to) => {
    const on = pathname === to || (to !== "/admin" && pathname.startsWith(to));
    return [
      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
      on
        ? "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-100"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
    ].join(" ");
  };

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-700 text-sm font-semibold text-white">
            HMS
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">
              City Hospital
            </p>
            <p className="text-xs text-slate-500">Administration</p>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="truncate text-sm font-semibold text-slate-900">
            {auth.userName ?? "User"}
          </p>
          {auth.userRole && (
            <p className="text-xs text-slate-500">{auth.userRole}</p>
          )}
        </div>
      </div>
      <nav className="p-2">
        {isAdmin && (
          <div className="mb-4 space-y-1">
            <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Administration
            </p>
            <Link className={linkClass("/admin/dashboard")} to="/admin/dashboard">
              <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
              Dashboard
            </Link>
            <Link className={linkClass("/admin/users")} to="/admin/users">
              <Users className="h-4 w-4 shrink-0" aria-hidden />
              Users
            </Link>
            {canReadAppointments && (
              <Link
                className={linkClass("/appointments")}
                to="/appointments"
              >
                <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
                Appointments
              </Link>
            )}
            {canReadAppointments && (
              <Link
                className={linkClass("/appointment-requests")}
                to="/appointment-requests"
              >
                <ClipboardList className="h-4 w-4 shrink-0" aria-hidden />
                Online Requests
              </Link>
            )}
          </div>
        )}

        {(canReadPatients || (canReadAppointments && !isAdmin)) && (
          <div className="space-y-1">
            <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Clinical
            </p>
            {canReadPatients && (
              <Link className={linkClass("/patients")} to="/patients">
                <UserRound className="h-4 w-4 shrink-0" aria-hidden />
                Patients
              </Link>
            )}
            {canReadAppointments && !isAdmin && (
              <Link
                className={linkClass("/appointments")}
                to="/appointments"
              >
                <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
                Appointments
              </Link>
            )}
            {canReadAppointments && !isAdmin && (
              <Link
                className={linkClass("/appointment-requests")}
                to="/appointment-requests"
              >
                <ClipboardList className="h-4 w-4 shrink-0" aria-hidden />
                Online Requests
              </Link>
            )}
          </div>
        )}

        <div className="mt-6 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={auth.logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            Sign out
          </button>
        </div>
      </nav>
    </aside>
  );
}

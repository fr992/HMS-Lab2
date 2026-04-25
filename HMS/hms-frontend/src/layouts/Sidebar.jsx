import { useAuth } from "@/auth/AuthContext";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const auth = useAuth();
  const { pathname } = useLocation();
  const canReadPatients = auth.hasPermission("Patients.Read");
  const isAdmin = auth.userRole === "Admin";

  const linkClass = (to) => {
    const on = pathname === to || (to !== "/admin" && pathname.startsWith(to));
    return [
      "block rounded-md px-3 py-2 text-sm font-medium transition",
      on
        ? "bg-sky-100 text-sky-900"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    ].join(" ");
  };

  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          HMS
        </p>
        <p className="mt-0.5 truncate text-sm text-slate-800">
          {auth.userName ?? "User"}
        </p>
        {auth.userRole && (
          <p className="text-xs text-slate-500">{auth.userRole}</p>
        )}
      </div>
      <nav className="p-2">
        {isAdmin && (
          <div className="mb-4">
            <p className="mb-1 px-2 text-xs font-medium uppercase text-slate-400">
              Administration
            </p>
            <Link className={linkClass("/admin/dashboard")} to="/admin/dashboard">
              Dashboard
            </Link>
            <Link className={linkClass("/admin/users")} to="/admin/users">
              Users
            </Link>
          </div>
        )}

        {canReadPatients && (
          <div>
            <p className="mb-1 px-2 text-xs font-medium uppercase text-slate-400">
              Clinical
            </p>
            <Link className={linkClass("/patients")} to="/patients">
              Patients
            </Link>
          </div>
        )}

        <div className="mt-6 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={auth.logout}
            className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </nav>
    </aside>
  );
}

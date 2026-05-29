import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Search, UserRound } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import Sidebar from "@/layouts/Sidebar";
import { TopBarSearchContext } from "@/layouts/TopBarSearchContext";
import NotificationBell from "@/features/notifications/NotificationBell";
import { useNotificationRealtime } from "@/features/notifications/useNotificationRealtime";

const TITLE_BY_PREFIX = [
  ["/admin/dashboard", "Dashboard"],
  ["/staff/dashboard", "Dashboard"],
  ["/doctor/dashboard", "Dashboard"],
  ["/nurse/dashboard", "Dashboard"],
  ["/patient/dashboard", "Dashboard"],
  ["/patient/appointments", "My Appointments"],
  ["/patient/payments", "My Payments"],
  ["/patient/invoices", "My Payments"],
  ["/patient/lab-results", "My Lab Results"],
  ["/admin/users", "Users"],
  ["/admin/staff", "Staff Management"],
  ["/admin/roles", "Roles"],
  ["/admin/settings", "Settings"],
  ["/admin/audit-logs", "Audit Logs"],
  ["/admin/encounters", "Doctor Encounters"],
  ["/doctor/encounters", "Encounters"],
  ["/patient/encounters", "My Encounters"],
  ["/patients", "Patients"],
  ["/appointments", "Appointments"],
  ["/appointment-requests", "Online Requests"],
  ["/medications", "Medications"],
  ["/lab-tests", "Lab Tests"],
  ["/lab-requests", "Lab Requests"],
  ["/nurse-tasks", "Nurse Tasks"],
  ["/bed-assignments", "Bed Assignments"],
  ["/bed-requests", "Bed Requests"],
  ["/bed-management", "Bed Management"],
  ["/doctor/beds", "Bed Assignments"],
  ["/invoices", "Invoices"],
  ["/payments", "Payments"],
  ["/notifications", "Notifications"],
  ["/profile", "Profile"],
];

const ROUTES_WITH_LOCAL_SEARCH = [
  "/admin/users",
  "/admin/staff",
  "/admin/roles",
  "/admin/settings",
  "/admin/audit-logs",
  "/admin/encounters",
  "/doctor/encounters",
  "/patients",
  "/appointments",
  "/appointment-requests",
  "/medications",
  "/lab-tests",
  "/lab-requests",
  "/nurse-tasks",
  "/bed-assignments",
  "/bed-requests",
  "/bed-management",
  "/doctor/beds",
  "/invoices",
  "/payments",
  "/notifications",
  "/doctor/dashboard",
  "/patient/dashboard",
  "/patient/appointments",
  "/patient/payments",
  "/patient/invoices",
  "/patient/lab-results",
  "/staff/dashboard",
];

function pageTitle(pathname) {
  const match = TITLE_BY_PREFIX.find(([prefix]) => pathname.startsWith(prefix));
  return match?.[1] ?? "Hospital Portal";
}

function hasLocalSearch(pathname) {
  return ROUTES_WITH_LOCAL_SEARCH.some((prefix) => pathname.startsWith(prefix));
}

function initials(value) {
  return String(value ?? "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";
}

export default function AdminLayout() {
  useNotificationRealtime();

  const auth = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [search, setSearch] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const showTopBarSearch = !hasLocalSearch(pathname);
  const isDashboard =
    pathname === "/admin" ||
    pathname === "/admin/dashboard" ||
    pathname === "/staff/dashboard" ||
    pathname.endsWith("/dashboard");

  useEffect(() => {
    setSearch("");
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!userMenuRef.current?.contains(event.target)) setUserMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const handleLogout = () => {
    window.sessionStorage.setItem("hms.logout.redirect", "/");
    auth.logout();
    navigate("/", { replace: true });
  };

  return (
    <TopBarSearchContext.Provider
      value={{
        search,
        setSearch,
        clearSearch: () => setSearch(""),
      }}
    >
    <div className="flex h-screen w-full max-w-full gap-2 overflow-hidden bg-slate-100 p-2 text-slate-900 sm:gap-3 sm:p-3">
      <Sidebar />
      <main className="scrollbar-none min-h-0 min-w-0 flex-1 overflow-y-auto rounded-lg bg-slate-50">
        <header className="sticky top-0 z-[100] overflow-visible rounded-t-lg border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-5 lg:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h1 className="truncate text-xl font-semibold text-slate-950 sm:text-2xl">
              {pageTitle(pathname)}
            </h1>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              {showTopBarSearch && (
                <label className="relative block w-full sm:w-[24rem]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Global search"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20"
                    aria-label="Global search"
                  />
                </label>
              )}
              <NotificationBell />
              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className="flex items-center gap-3 rounded-lg px-1 py-1 text-left transition hover:bg-slate-100"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <div className="flex size-9 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                    {initials(auth.userName)}
                  </div>
                  <div className="hidden min-w-0 sm:block">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {auth.userName ?? "User"}
                    </p>
                    <p className="truncate text-xs text-slate-500">{auth.userRole ?? "Portal"}</p>
                  </div>
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 z-[120] mt-2 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-slate-950/5"
                    role="menu"
                  >
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                      role="menuitem"
                    >
                      <UserRound className="size-4" aria-hidden />
                      Profile
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                      role="menuitem"
                    >
                      <LogOut className="size-4" aria-hidden />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
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
    </TopBarSearchContext.Provider>
  );
}

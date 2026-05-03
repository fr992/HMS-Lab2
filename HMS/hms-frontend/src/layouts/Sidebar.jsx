import { useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Pill,
  Stethoscope,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const auth = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const canReadPatients = auth.hasPermission("Patients.Read");
  const canReadAppointments = auth.hasPermission("Appointments.Read");
  const canReadEncounters = auth.hasPermission("Encounters.Read");
  const canReadMedications = auth.hasPermission("Medications.Read");
  const isAdmin = auth.userRole === "Admin";
  const isDoctor = auth.userRole === "Doctor";
  const isPatient = auth.userRole === "Patient";

  const linkClass = (to) => {
    const on = pathname === to || (to !== "/admin" && pathname.startsWith(to));
    return [
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
      collapsed ? "justify-center" : "",
      on
        ? "bg-blue-600 text-white shadow-sm shadow-blue-950/25"
        : "text-slate-300 hover:bg-slate-800/90 hover:text-white",
    ].join(" ");
  };

  const handleLogout = () => {
    auth.logout();
    navigate("/", { replace: true });
  };

  return (
    <aside
      className={[
        "flex h-full shrink-0 flex-col rounded-lg border border-slate-800 bg-slate-900 text-white shadow-sm transition-all duration-300",
        collapsed ? "w-[4.5rem]" : "w-60",
      ].join(" ")}
    >
      <div className="border-b border-slate-800 px-3 py-3.5">
        <div
          className={
            collapsed
              ? "flex flex-col items-center gap-2"
              : "flex items-center justify-between gap-3"
          }
        >
          <div
            className={[
              "flex min-w-0 items-center gap-3",
              collapsed ? "justify-center" : "",
            ].join(" ")}
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-950/25">
              <Stethoscope className="size-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-base font-semibold leading-tight">
                  HMS
                </p>
                <p className="text-xs font-medium text-slate-400">
                  Hospital Management
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="inline-flex size-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-800 hover:text-white"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        </div>
      </div>

      <nav className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-2.5 py-4">
        {isAdmin && (
          <Section title="Overview" collapsed={collapsed}>
            <NavLink
              to="/admin/dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
              className={linkClass("/admin/dashboard")}
              collapsed={collapsed}
            />
          </Section>
        )}

        {isAdmin &&
          (canReadPatients || canReadAppointments || canReadEncounters) && (
            <Section title="Patient Care" collapsed={collapsed}>
              {canReadPatients && (
                <NavLink
                  to="/patients"
                  icon={Users}
                  label="Patients"
                  className={linkClass("/patients")}
                  collapsed={collapsed}
                />
              )}
              {canReadAppointments && (
                <NavLink
                  to="/appointments"
                  icon={CalendarDays}
                  label="Appointments"
                  className={linkClass("/appointments")}
                  collapsed={collapsed}
                />
              )}
              {canReadAppointments && (
                <NavLink
                  to="/appointment-requests"
                  icon={ClipboardList}
                  label="Online Requests"
                  className={linkClass("/appointment-requests")}
                  collapsed={collapsed}
                />
              )}
              {canReadEncounters && (
                <NavLink
                  to="/admin/encounters"
                  icon={Stethoscope}
                  label="Encounters"
                  className={linkClass("/admin/encounters")}
                  collapsed={collapsed}
                />
              )}
            </Section>
          )}

        {isAdmin && canReadMedications && (
          <Section title="Operations" collapsed={collapsed}>
            <NavLink
              to="/medications"
              icon={Pill}
              label="Medications"
              className={linkClass("/medications")}
              collapsed={collapsed}
            />
          </Section>
        )}

        {!isAdmin &&
          (isPatient ||
            canReadPatients ||
            canReadAppointments ||
            canReadEncounters) && (
          <Section title="Clinical" collapsed={collapsed}>
            {canReadPatients && !isAdmin && (
              <NavLink
                to="/patients"
                icon={UserRound}
                label="Patients"
                className={linkClass("/patients")}
                collapsed={collapsed}
              />
            )}
            {isPatient && (
              <NavLink
                to="/patient/encounters"
                icon={ClipboardList}
                label="My Encounters"
                className={linkClass("/patient/encounters")}
                collapsed={collapsed}
              />
            )}
            {canReadEncounters && isDoctor && (
              <NavLink
                to="/doctor/encounters"
                icon={Stethoscope}
                label="Encounters"
                className={linkClass("/doctor/encounters")}
                collapsed={collapsed}
              />
            )}
            {canReadAppointments && !isAdmin && (
              <NavLink
                to="/appointments"
                icon={CalendarDays}
                label="Appointments"
                className={linkClass("/appointments")}
                collapsed={collapsed}
              />
            )}
            {canReadAppointments && !isAdmin && (
              <NavLink
                to="/appointment-requests"
                icon={ClipboardList}
                label="Online Requests"
                className={linkClass("/appointment-requests")}
                collapsed={collapsed}
              />
            )}
          </Section>
        )}

        {!isAdmin && canReadMedications && (
          <Section title="Operations" collapsed={collapsed}>
            <NavLink
              to="/medications"
              icon={Pill}
              label="Medications"
              className={linkClass("/medications")}
              collapsed={collapsed}
            />
          </Section>
        )}

        {isAdmin && (
          <Section title="Administration" collapsed={collapsed}>
            <NavLink
              to="/admin/users"
              icon={UserCog}
              label="Users"
              className={linkClass("/admin/users")}
              collapsed={collapsed}
            />
          </Section>
        )}
      </nav>

      <div className="mt-auto border-t border-slate-800 p-3">
        <div className={collapsed ? "mb-3 flex justify-center" : "mb-3 flex items-center gap-3"}>
          <div className="flex size-10 items-center justify-center rounded-full bg-blue-950 text-sm font-semibold text-blue-200">
            {(auth.userName ?? "U").slice(0, 2).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {auth.userName ?? "User"}
              </p>
              <p className="text-xs text-slate-400">{auth.userRole ?? "Portal"}</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className={[
            "flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white",
            collapsed ? "justify-center" : "gap-3",
          ].join(" ")}
          title="Sign out"
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          {!collapsed && "Sign out"}
        </button>
      </div>
    </aside>
  );
}

function Section({ title, children, collapsed }) {
  return (
    <div className="mb-5 space-y-1">
      {!collapsed && (
        <p className="mb-2 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

function NavLink({ to, icon, label, className, collapsed }) {
  const Icon = icon;

  return (
    <Link className={className} to={to} title={collapsed ? label : undefined}>
      <Icon className="size-4 shrink-0" aria-hidden />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

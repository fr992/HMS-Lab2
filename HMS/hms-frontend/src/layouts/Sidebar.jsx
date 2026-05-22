import { useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  CalendarDays,
  BedDouble,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Pill,
  CreditCard,
  ReceiptText,
  Stethoscope,
  UserCog,
  UserRoundCog,
  UserRound,
  Users,
  BriefcaseMedical,
  FlaskConical,
  Settings,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { HOSPITAL_LOGO_PATH, HOSPITAL_NAME, HOSPITAL_TAGLINE } from "@/config/branding";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(() =>
    typeof window === "undefined" ? false : window.innerWidth < 900
  );
  const auth = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const canReadPatients = auth.hasPermission("Patients.Read");
  const canReadAppointments = auth.hasPermission("Appointments.Read");
  const canReadEncounters = auth.hasPermission("Encounters.Read");
  const canReadMedications = auth.hasPermission("Medications.Read");
  const canReadLabTests = auth.hasPermission("LabTests.Read");
  const canReadLabRequests = auth.hasPermission("LabRequests.Read");
  const canReadNurseTasks = auth.hasPermission("NurseTasks.Read");
  const canReadBeds = auth.hasPermission("Beds.Read");
  const canManageBeds =
    auth.hasPermission("Beds.Create") ||
    auth.hasPermission("Beds.Update") ||
    auth.hasPermission("Beds.Release");
  const canReadInvoices = auth.hasPermission("Invoices.Read");
  const canReadPayments = auth.hasPermission("Payments.Read");
  const canManageSettings = auth.hasPermission("Settings.Manage");
  const canReadAuditLogs = auth.hasPermission("AuditLogs.Read");
  const isSuperAdmin = auth.hasRole("SuperAdmin");
  const isAdmin = auth.hasRole("Admin") || isSuperAdmin;
  const isDoctor = auth.userRole === "Doctor";
  const isNurse = auth.hasRole("Nurse") || auth.hasRole("Infermier");
  const isPatient = auth.userRole === "Patient";
  const isOperationalStaff = !isAdmin && !isDoctor && !isNurse && !isPatient;

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
    window.sessionStorage.setItem("hms.logout.redirect", "/");
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
            <div className="flex size-10 items-center justify-center overflow-hidden rounded-lg bg-white shadow-lg shadow-blue-950/25">
              <img src={HOSPITAL_LOGO_PATH} alt="" className="size-9 object-contain" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-base font-semibold leading-tight">
                  {HOSPITAL_NAME}
                </p>
                <p className="text-xs font-medium text-slate-400">
                  {HOSPITAL_TAGLINE}
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
          (canReadPatients || canReadAppointments || canReadEncounters || canReadNurseTasks || canReadBeds) && (
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
              {canReadNurseTasks && (
                <NavLink
                  to="/nurse-tasks"
                  icon={ClipboardCheck}
                  label="Nurse Tasks"
                  className={linkClass("/nurse-tasks")}
                  collapsed={collapsed}
                />
              )}
              {canReadBeds && (
                <NavLink
                  to="/bed-assignments"
                  icon={BedDouble}
                  label="Bed Assignments"
                  className={linkClass("/bed-assignments")}
                  collapsed={collapsed}
                />
              )}
              {(canReadBeds || canManageBeds) && (
                <NavLink
                  to="/bed-management"
                  icon={BedDouble}
                  label="Bed Management"
                  className={linkClass("/bed-management")}
                  collapsed={collapsed}
                />
              )}
            </Section>
          )}

        {isAdmin && (canReadMedications || canReadLabTests || canReadLabRequests || canReadInvoices || canReadPayments) && (
          <Section title="Operations" collapsed={collapsed}>
            {canReadMedications && (
              <NavLink
                to="/medications"
                icon={Pill}
                label="Medications"
                className={linkClass("/medications")}
                collapsed={collapsed}
              />
            )}
            {canReadLabTests && (
              <NavLink
                to="/lab-tests"
                icon={BriefcaseMedical}
                label="Lab Tests"
                className={linkClass("/lab-tests")}
                collapsed={collapsed}
              />
            )}
            {canReadLabRequests && (
              <NavLink
                to="/lab-requests"
                icon={FlaskConical}
                label="Lab Requests"
                className={linkClass("/lab-requests")}
                collapsed={collapsed}
              />
            )}
            {canReadInvoices && (
              <NavLink
                to="/invoices"
                icon={ReceiptText}
                label="Invoices"
                className={linkClass("/invoices")}
                collapsed={collapsed}
              />
            )}
            {canReadPayments && (
              <NavLink
                to="/payments"
                icon={CreditCard}
                label="Payments"
                className={linkClass("/payments")}
                collapsed={collapsed}
              />
            )}
          </Section>
        )}

        {!isAdmin &&
          (isPatient ||
            isOperationalStaff ||
            canReadPatients ||
            canReadAppointments ||
            canReadEncounters ||
            canReadNurseTasks ||
            canReadBeds) && (
          <Section title={isOperationalStaff ? "Overview" : "Clinical"} collapsed={collapsed}>
            {isDoctor && (
              <NavLink
                to="/doctor/dashboard"
                icon={LayoutDashboard}
                label="Dashboard"
                className={linkClass("/doctor/dashboard")}
                collapsed={collapsed}
              />
            )}
            {isNurse && (
              <NavLink
                to="/nurse/dashboard"
                icon={LayoutDashboard}
                label="Dashboard"
                className={linkClass("/nurse/dashboard")}
                collapsed={collapsed}
              />
            )}
            {isPatient && (
              <NavLink
                to="/patient/dashboard"
                icon={LayoutDashboard}
                label="Dashboard"
                className={linkClass("/patient/dashboard")}
                collapsed={collapsed}
              />
            )}
            {isOperationalStaff && (
              <NavLink
                to="/staff/dashboard"
                icon={LayoutDashboard}
                label="Dashboard"
                className={linkClass("/staff/dashboard")}
                collapsed={collapsed}
              />
            )}
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
            {isPatient && (
              <NavLink
                to="/patient/dashboard#appointments"
                icon={CalendarDays}
                label="My Appointments"
                className={linkClass("/patient/dashboard#appointments")}
                collapsed={collapsed}
              />
            )}
            {isPatient && (
              <NavLink
                to="/patient/dashboard#invoices"
                icon={ReceiptText}
                label="My Invoices"
                className={linkClass("/patient/dashboard#invoices")}
                collapsed={collapsed}
              />
            )}
            {isPatient && (
              <NavLink
                to="/patient/dashboard#lab-results"
                icon={FlaskConical}
                label="My Lab Results"
                className={linkClass("/patient/dashboard#lab-results")}
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
            {canReadNurseTasks && (
              <NavLink
                to="/nurse-tasks"
                icon={ClipboardCheck}
                label="Nurse Tasks"
                className={linkClass("/nurse-tasks")}
                collapsed={collapsed}
              />
            )}
            {canReadBeds && isDoctor && (
              <NavLink
                to="/doctor/beds"
                icon={BedDouble}
                label="Department Beds"
                className={linkClass("/doctor/beds")}
                collapsed={collapsed}
              />
            )}
            {canReadBeds && !isDoctor && (
              <NavLink
                to="/bed-assignments"
                icon={BedDouble}
                label="Bed Assignments"
                className={linkClass("/bed-assignments")}
                collapsed={collapsed}
              />
            )}
            {(canReadBeds || canManageBeds) && !isDoctor && !isNurse && (
              <NavLink
                to="/bed-management"
                icon={BedDouble}
                label="Bed Management"
                className={linkClass("/bed-management")}
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

        {!isAdmin && (canReadMedications || canReadLabTests || canReadLabRequests || canReadInvoices || canReadPayments) && (
          <Section title="Operations" collapsed={collapsed}>
            {canReadMedications && (
              <NavLink
                to="/medications"
                icon={Pill}
                label="Medications"
                className={linkClass("/medications")}
                collapsed={collapsed}
              />
            )}
            {canReadLabTests && (
              <NavLink
                to="/lab-tests"
                icon={BriefcaseMedical}
                label="Lab Tests"
                className={linkClass("/lab-tests")}
                collapsed={collapsed}
              />
            )}
            {canReadLabRequests && (
              <NavLink
                to="/lab-requests"
                icon={FlaskConical}
                label="Lab Requests"
                className={linkClass("/lab-requests")}
                collapsed={collapsed}
              />
            )}
            {canReadInvoices && (
              <NavLink
                to="/invoices"
                icon={ReceiptText}
                label="Invoices"
                className={linkClass("/invoices")}
                collapsed={collapsed}
              />
            )}
            {canReadPayments && (
              <NavLink
                to="/payments"
                icon={CreditCard}
                label="Payments"
                className={linkClass("/payments")}
                collapsed={collapsed}
              />
            )}
          </Section>
        )}

        {(isSuperAdmin || canManageSettings || canReadAuditLogs) && (
          <Section title="Administration" collapsed={collapsed}>
            {isSuperAdmin && (
              <NavLink
                to="/admin/users"
                icon={UserCog}
                label="Users"
                className={linkClass("/admin/users")}
                collapsed={collapsed}
              />
            )}
            {isSuperAdmin && (
              <NavLink
                to="/admin/staff"
                icon={UserRoundCog}
                label="Staff"
                className={linkClass("/admin/staff")}
                collapsed={collapsed}
              />
            )}
            {isSuperAdmin && (
              <NavLink
                to="/admin/roles"
                icon={ShieldCheck}
                label="Roles"
                className={linkClass("/admin/roles")}
                collapsed={collapsed}
              />
            )}
            {canManageSettings && (
              <NavLink
                to="/admin/settings"
                icon={Settings}
                label="Settings"
                className={linkClass("/admin/settings")}
                collapsed={collapsed}
              />
            )}
            {canReadAuditLogs && (
              <NavLink
                to="/admin/audit-logs"
                icon={ShieldAlert}
                label="Audit Logs"
                className={linkClass("/admin/audit-logs")}
                collapsed={collapsed}
              />
            )}
          </Section>
        )}

      </nav>

      <div className="mt-auto border-t border-slate-800 p-3">
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

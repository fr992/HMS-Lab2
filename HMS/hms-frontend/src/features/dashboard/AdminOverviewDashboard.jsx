import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FlaskConical,
  ReceiptText,
  ShieldCheck,
  Stethoscope,
  UserCog,
  Users,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import {
  CardShell,
  DashboardFrame,
  EmptyState,
  ErrorBanner,
  AnimatedStatNumber,
  LoadingDashboard,
  MetricCard,
} from "@/features/dashboard/DashboardPrimitives";
import { fetchAdminDashboardData } from "@/features/dashboard/roleDashboardApi";
import {
  formatDateTime,
  formatMoney,
  getApiErrorMessage,
  getPagedItems,
  getTotalCount,
  keyOf,
  titleCase,
} from "@/features/dashboard/dashboardUtils";

export default function AdminOverviewDashboard() {
  const auth = useAuth();
  const [search, setSearch] = useState("");
  const [state, setState] = useState({ status: "loading", data: {}, error: "" });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: "loading", error: "" }));
    try {
      const data = await fetchAdminDashboardData(auth);
      setState({ status: "ready", data, error: "" });
    } catch (error) {
      setState({ status: "error", data: {}, error: getApiErrorMessage(error) });
    }
  }, [auth]);

  useEffect(() => {
    void load();
  }, [load]);

  const dashboard = useMemo(() => buildAdminDashboard(state.data, auth), [auth, state.data]);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredAppointments = filterItems(
    dashboard.appointments,
    normalizedSearch,
    ["patientName", "doctorName", "departmentName", "status", "appointmentType"]
  );
  const filteredInvoices = filterItems(
    dashboard.invoices,
    normalizedSearch,
    ["invoiceNumber", "patientName", "patientNumber", "status"]
  );
  const filteredTasks = filterItems(
    dashboard.nurseTasks,
    normalizedSearch,
    ["patientName", "assignedToNurseName", "type", "priority", "status"]
  );

  return (
    <DashboardFrame
      title={
        auth.isSuperAdmin
          ? "SuperAdmin Dashboard"
          : auth.hasRole("Admin")
            ? "Admin Dashboard"
            : `${auth.userRole || "Staff"} Dashboard`
      }
      subtitle={
        auth.isSuperAdmin
          ? "Full hospital command view across operations, billing, access, and clinical flow."
          : auth.hasRole("Admin")
            ? "Operational view scoped to your assigned administration permissions."
            : "Role-based operational view with only the modules your permissions allow."
      }
      userName={auth.userName}
      userRole={auth.userRole}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search patients, invoices, appointments..."
      quickAddActions={[
        { label: "Register Patient", to: "/patients/new", kind: "patient", visible: auth.hasPermission("Patients.Register") },
        { label: "New Appointment", to: "/appointments/new", kind: "appointment", visible: auth.hasPermission("Appointments.Create") },
      ]}
    >
      {state.status === "loading" && (
        <LoadingDashboard statCount={8} cardCount={4} columns="lg:grid-cols-4" />
      )}
      {state.status === "error" && <ErrorBanner message={state.error} onRetry={() => void load()} />}

      {state.status === "ready" && (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {dashboard.metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
            <CardShell
              title="Upcoming Appointments"
              action={auth.hasPermission("Appointments.Read") && <DashboardLink to="/appointments" label="View all" />}
            >
              <AppointmentRows items={filteredAppointments.slice(0, 6)} />
            </CardShell>
            <CardShell
              title="Billing Snapshot"
              action={auth.hasPermission("Invoices.Read") && <DashboardLink to="/invoices" label="Open invoices" />}
            >
              <BillingSummary dashboard={dashboard} />
            </CardShell>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <CardShell
              title="Recent Invoices"
              action={auth.hasPermission("Payments.Read") && <DashboardLink to="/payments" label="Payments" />}
            >
              <InvoiceRows items={filteredInvoices.slice(0, 6)} />
            </CardShell>
            <CardShell
              title={auth.isSuperAdmin ? "SuperAdmin Oversight" : "Care Team Work"}
              action={auth.hasPermission("NurseTasks.Read") && <DashboardLink to="/nurse-tasks" label="Nurse tasks" />}
            >
              {auth.isSuperAdmin ? (
                <SuperAdminRows dashboard={dashboard} />
              ) : (
                <TaskRows items={filteredTasks.slice(0, 6)} />
              )}
            </CardShell>
          </section>

          <ModuleHealth data={state.data} />
        </>
      )}
    </DashboardFrame>
  );
}

function buildAdminDashboard(data, auth) {
  const patients = getList(data.patients?.data);
  const appointments = getList(data.appointments?.data);
  const invoices = getPagedItems(data.invoices?.data);
  const payments = getPagedItems(data.payments?.data);
  const labRequests = getPagedItems(data.labRequests?.data);
  const nurseTasks = getList(data.nurseTasks?.data);
  const beds = getList(data.beds?.data);
  const assignments = getList(data.bedAssignments?.data);
  const users = getPagedItems(data.users?.data);
  const roles = getList(data.roles?.data);

  const openInvoices = invoices.filter((item) =>
    ["draft", "issued", "partially_paid"].includes(keyOf(item.status))
  );
  const dueInvoices = invoices.filter((item) => {
    if (!item.dueAt) return false;
    const dueAt = new Date(item.dueAt);
    return !Number.isNaN(dueAt.getTime()) && dueAt < new Date() && keyOf(item.status) !== "paid";
  });
  const paidInvoices = invoices.filter((item) => keyOf(item.status) === "paid");
  const pendingPayments = payments.filter((item) => keyOf(item.status) === "pending");
  const openTasks = nurseTasks.filter((item) => keyOf(item.status) !== "completed");
  const occupiedBeds = beds.filter((item) => keyOf(item.status || item.occupancyStatus) === "occupied").length || assignments.length;

  const metrics = [
    auth.hasPermission("Patients.Read") && {
      label: "Patients",
      value: getTotal(data.patients?.data, patients),
      helper: "Registered profiles",
      icon: <Users className="size-5" />,
      tone: "bg-blue-50 text-blue-700",
    },
    auth.hasPermission("Appointments.Read") && {
      label: "Upcoming",
      value: appointments.length,
      helper: "Scheduled from now",
      icon: <CalendarDays className="size-5" />,
      tone: "bg-teal-50 text-teal-700",
    },
    auth.hasPermission("Invoices.Read") && {
      label: "Open Invoices",
      value: openInvoices.length,
      helper: `${dueInvoices.length} overdue`,
      icon: <ReceiptText className="size-5" />,
      tone: "bg-amber-50 text-amber-700",
    },
    auth.hasPermission("Payments.Read") && {
      label: "Pending Payments",
      value: pendingPayments.length,
      helper: "Awaiting confirmation",
      icon: <CreditCard className="size-5" />,
      tone: "bg-sky-50 text-sky-700",
    },
    auth.hasPermission("LabRequests.Read") && {
      label: "Lab Requests",
      value: labRequests.length,
      helper: "Visible workflow items",
      icon: <FlaskConical className="size-5" />,
      tone: "bg-indigo-50 text-indigo-700",
    },
    auth.hasPermission("NurseTasks.Read") && {
      label: "Open Nurse Tasks",
      value: openTasks.length,
      helper: "Pending care work",
      icon: <ClipboardList className="size-5" />,
      tone: "bg-rose-50 text-rose-700",
    },
    auth.hasPermission("Beds.Read") && {
      label: "Occupied Beds",
      value: occupiedBeds,
      helper: `${Math.max(beds.length - occupiedBeds, 0)} available`,
      icon: <BedDouble className="size-5" />,
      tone: "bg-emerald-50 text-emerald-700",
    },
    auth.isSuperAdmin && {
      label: "Total Users",
      value: getTotal(data.users?.data, users),
      helper: `${roles.length} roles configured`,
      icon: <ShieldCheck className="size-5" />,
      tone: "bg-violet-50 text-violet-700",
    },
  ].filter(Boolean);

  return {
    patients,
    appointments,
    invoices,
    payments,
    labRequests,
    nurseTasks,
    users,
    roles,
    dueInvoices,
    paidInvoices,
    openInvoices,
    pendingPayments,
    openTasks,
    occupiedBeds,
    totalBeds: beds.length,
    metrics,
  };
}

function getList(data) {
  return Array.isArray(data) ? data : getPagedItems(data);
}

function getTotal(data, list) {
  return getTotalCount(data) || list.length;
}

function filterItems(items, search, keys) {
  if (!search) return items;
  return items.filter((item) =>
    keys.some((key) => String(item?.[key] ?? "").toLowerCase().includes(search))
  );
}

function DashboardLink({ to, label }) {
  return (
    <Link to={to} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
      {label}
    </Link>
  );
}

function AppointmentRows({ items }) {
  if (!items.length) return <EmptyState>No upcoming appointments in this view.</EmptyState>;

  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <div key={item.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-950">{item.patientName || "Patient"}</p>
            <p className="mt-1 truncate text-sm text-slate-500">
              {[item.doctorName, item.departmentName, item.appointmentType].filter(Boolean).join(" - ")}
            </p>
          </div>
          <div className="text-sm font-medium text-slate-700">{formatDateTime(item.scheduledStart)}</div>
        </div>
      ))}
    </div>
  );
}

function BillingSummary({ dashboard }) {
  return (
    <div className="space-y-3">
      <SummaryLine label="Open invoices" value={dashboard.openInvoices.length} icon={<ReceiptText className="size-4" />} />
      <SummaryLine label="Overdue invoices" value={dashboard.dueInvoices.length} icon={<Activity className="size-4" />} />
      <SummaryLine label="Paid invoices" value={dashboard.paidInvoices.length} icon={<CheckCircle2 className="size-4" />} />
      <SummaryLine label="Pending payments" value={dashboard.pendingPayments.length} icon={<CreditCard className="size-4" />} />
    </div>
  );
}

function SummaryLine({ label, value, icon }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
        <span className="text-slate-400">{icon}</span>
        {label}
      </span>
      <span className="font-semibold text-slate-950">
        {typeof value === "number" ? <AnimatedStatNumber value={value} /> : value}
      </span>
    </div>
  );
}

function InvoiceRows({ items }) {
  if (!items.length) return <EmptyState>No invoices match the current search.</EmptyState>;

  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <div key={item.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-950">{item.invoiceNumber}</p>
            <p className="mt-1 truncate text-sm text-slate-500">
              {[item.patientName, titleCase(item.status)].filter(Boolean).join(" - ")}
            </p>
          </div>
          <div className="text-sm font-semibold text-slate-900">
            {formatMoney(item.totalAmount, item.currency)}
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskRows({ items }) {
  if (!items.length) return <EmptyState>No nurse tasks match the current search.</EmptyState>;

  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <div key={item.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-950">{item.type || "Nurse task"}</p>
            <p className="mt-1 truncate text-sm text-slate-500">
              {[item.patientName, item.assignedToNurseName || "Unassigned", titleCase(item.status)].filter(Boolean).join(" - ")}
            </p>
          </div>
          <div className="text-sm text-slate-600">{formatDateTime(item.dueAt)}</div>
        </div>
      ))}
    </div>
  );
}

function SuperAdminRows({ dashboard }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SummaryLine label="Users" value={dashboard.users.length} icon={<UserCog className="size-4" />} />
      <SummaryLine label="Roles" value={dashboard.roles.length} icon={<ShieldCheck className="size-4" />} />
      <SummaryLine label="Lab requests" value={dashboard.labRequests.length} icon={<FlaskConical className="size-4" />} />
      <SummaryLine label="Clinical tasks" value={dashboard.openTasks.length} icon={<Stethoscope className="size-4" />} />
    </div>
  );
}

function ModuleHealth({ data }) {
  const failed = Object.entries(data).filter(([, result]) => result && !result.ok);
  if (!failed.length) return null;

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-semibold">Some widgets were hidden because their data could not be loaded.</p>
      <p className="mt-1">
        {failed.map(([key]) => titleCase(key)).join(", ")}
      </p>
    </section>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  FlaskConical,
  ReceiptText,
  Stethoscope,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import {
  CardShell,
  DashboardFrame,
  EmptyState,
  ErrorBanner,
  LoadingDashboard,
  MetricCard,
} from "@/features/dashboard/DashboardPrimitives";
import { fetchPatientDashboardData } from "@/features/dashboard/roleDashboardApi";
import {
  formatDateTime,
  formatMoney,
  getApiErrorMessage,
  getPagedItems,
  isUpcomingAppointment,
  keyOf,
  titleCase,
} from "@/features/dashboard/dashboardUtils";

export default function PatientDashboardPage() {
  const auth = useAuth();
  const [state, setState] = useState({ status: "loading", data: {}, error: "" });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: "loading", error: "" }));
    try {
      const data = await fetchPatientDashboardData();
      setState({ status: "ready", data, error: "" });
    } catch (error) {
      setState({ status: "error", data: {}, error: getApiErrorMessage(error) });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dashboard = useMemo(() => buildPatientDashboard(state.data), [state.data]);

  return (
    <DashboardFrame
      title="My Dashboard"
      subtitle="Your appointments, invoices, lab results, and visit history in one place."
      userName={auth.userName}
      userRole={auth.userRole}
    >
      {state.status === "loading" && (
        <LoadingDashboard statCount={4} cardCount={4} columns="lg:grid-cols-4" />
      )}
      {state.status === "error" && <ErrorBanner message={state.error} onRetry={() => void load()} />}

      {state.status === "ready" && (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Upcoming Appointments"
              value={dashboard.upcomingAppointments.length}
              helper="Scheduled care"
              icon={<CalendarDays className="size-5" />}
              tone="bg-blue-50 text-blue-700"
            />
            <MetricCard
              label="Invoices Due"
              value={dashboard.dueInvoices.length}
              helper={formatMoney(dashboard.dueAmount, dashboard.currency)}
              icon={<ReceiptText className="size-5" />}
              tone="bg-amber-50 text-amber-700"
            />
            <MetricCard
              label="Paid Invoices"
              value={dashboard.paidInvoices.length}
              helper="Completed billing"
              icon={<CheckCircle2 className="size-5" />}
              tone="bg-emerald-50 text-emerald-700"
            />
            <MetricCard
              label="Lab Results"
              value={dashboard.labResults.length}
              helper="Published to portal"
              icon={<FlaskConical className="size-5" />}
              tone="bg-indigo-50 text-indigo-700"
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
            <CardShell title="Upcoming Appointments">
              <PatientAppointments items={dashboard.upcomingAppointments.slice(0, 6)} />
            </CardShell>
            <CardShell title="Invoices">
              <PatientInvoices items={dashboard.invoices.slice(0, 6)} />
            </CardShell>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <CardShell title="Recent Encounters">
              <PatientEncounters items={dashboard.encounters.slice(0, 5)} />
            </CardShell>
            <CardShell title="Recent Lab Results">
              <PatientLabResults items={dashboard.labResults.slice(0, 5)} />
            </CardShell>
          </section>
        </>
      )}
    </DashboardFrame>
  );
}

function buildPatientDashboard(data) {
  const appointments = getList(data.appointments?.data);
  const invoices = getPagedItems(data.invoices?.data);
  const labResults = getList(data.labResults?.data);
  const encounters = getList(data.encounters?.data);
  const upcomingAppointments = appointments.filter(isUpcomingAppointment);
  const paidInvoices = invoices.filter((item) => keyOf(item.status) === "paid");
  const dueInvoices = invoices.filter((item) =>
    ["draft", "issued", "partially_paid"].includes(keyOf(item.status))
  );
  const dueAmount = dueInvoices.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);

  return {
    appointments,
    invoices,
    labResults,
    encounters,
    upcomingAppointments,
    paidInvoices,
    dueInvoices,
    dueAmount,
    currency: invoices[0]?.currency || "EUR",
  };
}

function getList(data) {
  return Array.isArray(data) ? data : getPagedItems(data);
}

function PatientAppointments({ items }) {
  if (!items.length) return <EmptyState>No upcoming appointments.</EmptyState>;
  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <Row
          key={item.id}
          icon={<Clock3 className="size-4" />}
          title={item.appointmentType || "Appointment"}
          detail={[item.doctorName, item.departmentName, titleCase(item.status)].filter(Boolean).join(" - ")}
          value={formatDateTime(item.scheduledStart)}
        />
      ))}
    </div>
  );
}

function PatientInvoices({ items }) {
  if (!items.length) return <EmptyState>No invoices available.</EmptyState>;
  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <Row
          key={item.id}
          icon={<FileText className="size-4" />}
          title={item.invoiceNumber}
          detail={[titleCase(item.status), item.dueAt ? `Due ${formatDateTime(item.dueAt)}` : null].filter(Boolean).join(" - ")}
          value={formatMoney(item.totalAmount, item.currency)}
        />
      ))}
    </div>
  );
}

function PatientEncounters({ items }) {
  if (!items.length) return <EmptyState>No encounters recorded yet.</EmptyState>;
  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <Row
          key={item.id}
          icon={<Stethoscope className="size-4" />}
          title={item.encounterNumber || "Encounter"}
          detail={[item.doctorName, titleCase(item.status)].filter(Boolean).join(" - ")}
          value={formatDateTime(item.startedAt)}
        />
      ))}
    </div>
  );
}

function PatientLabResults({ items }) {
  if (!items.length) return <EmptyState>No published lab results yet.</EmptyState>;
  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <Row
          key={item.id}
          icon={<FlaskConical className="size-4" />}
          title={item.testName || item.requestNumber || "Lab result"}
          detail={[item.testCode, item.interpretation].filter(Boolean).join(" - ")}
          value={formatDateTime(item.verifiedAt || item.createdAt)}
        />
      ))}
    </div>
  );
}

function Row({ icon, title, detail, value }) {
  return (
    <div className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950">{title || "-"}</p>
          <p className="mt-1 truncate text-sm text-slate-500">{detail || "-"}</p>
        </div>
      </div>
      <p className="text-sm font-medium text-slate-700">{value}</p>
    </div>
  );
}

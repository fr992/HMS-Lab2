import { useCallback, useEffect, useMemo, useState } from "react";
import { BedDouble, CheckCircle2, ClipboardCheck, Clock3, Stethoscope } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import {
  CardShell,
  DashboardFrame,
  EmptyState,
  ErrorBanner,
  LoadingDashboard,
  MetricCard,
} from "@/features/dashboard/DashboardPrimitives";
import { fetchNurseDashboardData } from "@/features/dashboard/roleDashboardApi";
import { useDashboardRealtime } from "@/features/dashboard/useDashboardRealtime";
import {
  formatDateTime,
  getApiErrorMessage,
  getPagedItems,
  keyOf,
  titleCase,
} from "@/features/dashboard/dashboardUtils";

export default function NurseDashboardPage() {
  const auth = useAuth();
  const [state, setState] = useState({ status: "loading", data: {}, error: "" });

  const load = useCallback(async ({ quiet = false } = {}) => {
    setState((current) => ({
      ...current,
      status: quiet ? current.status : "loading",
      error: "",
    }));
    try {
      const data = await fetchNurseDashboardData(auth);
      setState({ status: "ready", data, error: "" });
    } catch (error) {
      setState({ status: "error", data: {}, error: getApiErrorMessage(error) });
    }
  }, [auth]);

  useEffect(() => {
    void load();
  }, [load]);

  useDashboardRealtime(() => {
    void load({ quiet: true });
  });

  const dashboard = useMemo(() => buildNurseDashboard(state.data), [state.data]);

  return (
    <DashboardFrame
      title="Nurse Dashboard"
      subtitle="Assigned tasks, due work, and active patient bed context."
      userName={auth.userName}
      userRole={auth.userRole}
    >
      {state.status === "loading" && (
        <LoadingDashboard statCount={4} cardCount={2} columns="lg:grid-cols-4" />
      )}
      {state.status === "error" && <ErrorBanner message={state.error} onRetry={() => void load()} />}

      {state.status === "ready" && (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Assigned Tasks"
              value={dashboard.tasks.length}
              helper="Visible to you"
              icon={<ClipboardCheck className="size-5" />}
              tone="bg-blue-50 text-blue-700"
            />
            <MetricCard
              label="Due Soon"
              value={dashboard.dueSoon.length}
              helper="Next 24 hours"
              icon={<Clock3 className="size-5" />}
              tone="bg-amber-50 text-amber-700"
            />
            <MetricCard
              label="Completed"
              value={dashboard.completed.length}
              helper="Finished tasks"
              icon={<CheckCircle2 className="size-5" />}
              tone="bg-emerald-50 text-emerald-700"
            />
            <MetricCard
              label="Active Beds"
              value={dashboard.assignments.length}
              helper={`${dashboard.beds.length} beds visible`}
              icon={<BedDouble className="size-5" />}
              tone="bg-sky-50 text-sky-700"
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
            <CardShell title="My Task Queue">
              <TaskRows items={dashboard.openTasks.slice(0, 8)} />
            </CardShell>
            <CardShell title="Active Bed Assignments">
              <BedRows items={dashboard.assignments.slice(0, 8)} />
            </CardShell>
          </section>
        </>
      )}
    </DashboardFrame>
  );
}

function buildNurseDashboard(data) {
  const tasks = getList(data.nurseTasks?.data);
  const beds = getList(data.beds?.data);
  const assignments = getList(data.bedAssignments?.data);
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const completed = tasks.filter((item) => keyOf(item.status) === "completed");
  const openTasks = tasks.filter((item) => keyOf(item.status) !== "completed");
  const dueSoon = openTasks.filter((item) => {
    const dueAt = new Date(item.dueAt).getTime();
    return Number.isFinite(dueAt) && dueAt >= now && dueAt <= now + dayMs;
  });

  return { tasks, beds, assignments, completed, openTasks, dueSoon };
}

function getList(data) {
  return Array.isArray(data) ? data : getPagedItems(data);
}

function TaskRows({ items }) {
  if (!items.length) return <EmptyState>No open nurse tasks assigned.</EmptyState>;
  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <div key={item.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Stethoscope className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-950">{item.type || "Nurse task"}</p>
              <p className="mt-1 truncate text-sm text-slate-500">
                {[item.patientName, item.encounterNumber, titleCase(item.priority), titleCase(item.status)].filter(Boolean).join(" - ")}
              </p>
            </div>
          </div>
          <p className="text-sm font-medium text-slate-700">{formatDateTime(item.dueAt)}</p>
        </div>
      ))}
    </div>
  );
}

function BedRows({ items }) {
  if (!items.length) return <EmptyState>No active bed assignments visible.</EmptyState>;
  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <div key={item.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-950">
              {item.bedNumber || item.bedName || `Bed assignment #${item.id}`}
            </p>
            <p className="mt-1 truncate text-sm text-slate-500">
              {[item.patientName, item.departmentName, item.roomNumber].filter(Boolean).join(" - ")}
            </p>
          </div>
          <p className="text-sm font-medium text-slate-700">{formatDateTime(item.assignedAt || item.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}

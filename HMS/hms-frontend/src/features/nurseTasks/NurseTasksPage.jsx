import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { CountUpValue } from "@/features/dashboard/DashboardPrimitives";
import { getPagedItems, getPagination, MAX_LIST_PAGE_SIZE, PaginationBar } from "@/lib/pagination.jsx";
import {
  completeNurseTask,
  createNurseTask,
  fetchNurses,
  fetchNurseTasks,
  getApiErrorMessage,
  updateNurseTask,
} from "@/features/nurseTasks/api/nurseTasksApi";

const EMPTY_FORM = {
  encounterId: "",
  assignedToNurseId: "",
  type: "",
  priority: "routine",
  dueAt: "",
  notes: "",
};

const TASK_TYPES = [
  "Medication administration",
  "Vital signs",
  "Wound care",
  "Patient monitoring",
  "Lab sample collection",
  "Discharge preparation",
];

const PRIORITIES = ["routine", "urgent", "stat"];

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function toLocalInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInputValue(value) {
  return value ? new Date(value).toISOString() : null;
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function statusMeta(status) {
  const value = normalize(status);
  if (value === "completed") {
    return {
      label: "Completed",
      classes: "bg-emerald-50 text-emerald-800 ring-emerald-200",
      icon: CheckCircle2,
    };
  }
  return {
    label: "Pending",
    classes: "bg-amber-50 text-amber-800 ring-amber-200",
    icon: Clock3,
  };
}

function priorityClasses(priority) {
  const value = normalize(priority);
  if (value === "stat") return "bg-rose-50 text-rose-800 ring-rose-200";
  if (value === "urgent") return "bg-orange-50 text-orange-800 ring-orange-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export default function NurseTasksPage() {
  const auth = useAuth();
  const canAssign = auth.hasPermission("NurseTasks.Assign");
  const canComplete = auth.hasPermission("NurseTasks.Complete");
  const canReadNurses = auth.hasPermission("Nurses.Read");

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [nurses, setNurses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [dialogMode, setDialogMode] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const showToast = useCallback((message, type = "success") => {
    toast[type === "error" ? "error" : type === "warning" ? "warning" : "success"](message);
  }, []);

  useEffect(() => {
    if (error) showToast(error, "error");
  }, [error, showToast]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [taskData, nurseData] = await Promise.all([
        fetchNurseTasks({
          page,
          pageSize: MAX_LIST_PAGE_SIZE,
          search: search.trim() || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
          priority: priorityFilter === "all" ? undefined : priorityFilter,
        }),
        canReadNurses ? fetchNurses() : Promise.resolve([]),
      ]);
      setItems(getPagedItems(taskData));
      setPagination(getPagination(taskData));
      setNurses(nurseData);
    } catch (e) {
      setError(getApiErrorMessage(e));
      setItems([]);
      setPagination(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canReadNurses, page, search, statusFilter, priorityFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = items;

  const stats = useMemo(() => {
    const pending = items.filter((task) => normalize(task.status) !== "completed");
    const completed = items.filter((task) => normalize(task.status) === "completed");
    const overdue = pending.filter((task) => task.dueAt && new Date(task.dueAt) < new Date());
    return [
      { label: "Total tasks", value: items.length, icon: ClipboardCheck, tone: "blue" },
      { label: "Pending", value: pending.length, icon: Clock3, tone: "amber" },
      { label: "Completed", value: completed.length, icon: CheckCircle2, tone: "emerald" },
      { label: "Overdue", value: overdue.length, icon: Clock3, tone: "rose" },
    ];
  }, [items]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, priorityFilter]);

  const taskPage = { items: filteredItems, pagination };

  function openCreate() {
    setActiveTask(null);
    setDialogMode("create");
    setForm(EMPTY_FORM);
  }

  function openEdit(task) {
    setActiveTask(task);
    setDialogMode("edit");
    setForm({
      encounterId: String(task.encounterId ?? ""),
      assignedToNurseId: task.assignedToNurseId ? String(task.assignedToNurseId) : "",
      type: task.type ?? "",
      priority: task.priority ?? "routine",
      dueAt: toLocalInputValue(task.dueAt),
      notes: task.notes ?? "",
    });
  }

  function closeDialog() {
    if (saving) return;
    setDialogMode(null);
    setActiveTask(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    const encounterId = Number.parseInt(form.encounterId, 10);
    if (!encounterId || !form.type.trim()) {
      showToast("Encounter and task type are required.", "error");
      return;
    }

    const payload = {
      encounterId,
      assignedToNurseId: form.assignedToNurseId
        ? Number.parseInt(form.assignedToNurseId, 10)
        : null,
      type: form.type.trim(),
      priority: form.priority || null,
      dueAt: fromLocalInputValue(form.dueAt),
      notes: form.notes.trim() || null,
    };

    setSaving(true);
    try {
      if (dialogMode === "edit") {
        await updateNurseTask(activeTask.id, payload);
        showToast("Nurse task updated.");
      } else {
        await createNurseTask(payload);
        showToast("Nurse task assigned.");
      }
      closeDialog();
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(task) {
    if (saving) return;
    setSaving(true);
    try {
      await completeNurseTask(task.id);
      showToast("Task completed.");
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
        <div className="flex gap-2">
          {canAssign && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Assign task
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              void load();
            }}
            disabled={loading || refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_12rem_12rem_auto] lg:items-end">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search task, patient, encounter..."
          />
          <SelectField label="Status" value={statusFilter} onChange={setStatusFilter}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </SelectField>
          <SelectField label="Priority" value={priorityFilter} onChange={setPriorityFilter}>
            <option value="all">All priorities</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </SelectField>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setPriorityFilter("all");
            }}
            className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      </section>

      <div className="scrollbar-none min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[16rem] items-center justify-center text-sm text-slate-500">
            Loading nurse tasks...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex min-h-[16rem] items-center justify-center p-8 text-center text-sm text-slate-500">
            No nurse tasks found.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Patient / Encounter</th>
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {taskPage.items.map((task) => {
                const meta = statusMeta(task.status);
                const StatusIcon = meta.icon;
                const completed = normalize(task.status) === "completed";
                return (
                  <tr key={task.id} className="align-top transition hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-950">{task.type}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${priorityClasses(task.priority)}`}>
                          {task.priority || "routine"}
                        </span>
                      </div>
                      {task.notes && (
                        <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{task.notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="font-medium text-slate-900">{task.patientName || "Patient"}</div>
                      <div className="text-xs text-slate-500">
                        {task.encounterNumber || `Encounter #${task.encounterId}`}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-2">
                        <UserRound className="size-4 text-slate-400" aria-hidden />
                        <span>{task.assignedToNurseName || "Unassigned"}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <Stethoscope className="size-3.5" aria-hidden />
                        <span>{task.assignedByDoctorName || "Doctor"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(task.dueAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${meta.classes}`}>
                        <StatusIcon className="size-3.5" aria-hidden />
                        {meta.label}
                      </span>
                      {task.completedAt && (
                        <div className="mt-1 text-xs text-slate-500">
                          {formatDate(task.completedAt)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {canAssign && !completed && (
                          <button
                            type="button"
                            onClick={() => openEdit(task)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            <Edit3 className="size-3.5" aria-hidden />
                            Edit
                          </button>
                        )}
                        {canComplete && !completed && (
                          <button
                            type="button"
                            onClick={() => void handleComplete(task)}
                            disabled={saving}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <CheckCircle2 className="size-3.5" aria-hidden />
                            Complete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <PaginationBar pagination={taskPage.pagination} loading={loading} onPageChange={setPage} />
      </div>

      {dialogMode && (
        <TaskDialog
          mode={dialogMode}
          form={form}
          nurses={nurses}
          saving={saving}
          onClose={closeDialog}
          onSubmit={handleSubmit}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        />
      )}
    </div>
  );
}

function StatCard({ stat }) {
  const Icon = stat.icon;
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-600">{stat.label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            <CountUpValue value={stat.value} />
          </p>
        </div>
        <div className={`flex size-12 items-center justify-center rounded-xl ${tones[stat.tone]}`}>
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
      >
        {children}
      </select>
    </label>
  );
}

function SearchField({ value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Search
      </span>
      <span className="relative mt-1.5 block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
        />
      </span>
    </label>
  );
}

function TaskDialog({ mode, form, nurses, saving, onClose, onSubmit, onChange }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
      <section className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ClipboardCheck className="size-6" aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">
                {mode === "edit" ? "Edit nurse task" : "Assign nurse task"}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Assign encounter work to an active nurse and track completion.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 bg-slate-50 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Encounter ID" required>
              <input
                type="number"
                min="1"
                value={form.encounterId}
                onChange={(event) => onChange({ encounterId: event.target.value })}
                disabled={saving || mode === "edit"}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:bg-slate-100"
                required
              />
            </Field>
            <Field label="Assign to nurse">
              <select
                value={form.assignedToNurseId}
                onChange={(event) => onChange({ assignedToNurseId: event.target.value })}
                disabled={saving}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="">Unassigned</option>
                {nurses.map((nurse) => (
                  <option key={nurse.id} value={nurse.id}>
                    {nurse.fullName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Task type" required>
              <input
                list="nurse-task-types"
                value={form.type}
                onChange={(event) => onChange({ type: event.target.value })}
                disabled={saving}
                placeholder="Medication administration"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                required
              />
              <datalist id="nurse-task-types">
                {TASK_TYPES.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            </Field>
            <Field label="Priority">
              <select
                value={form.priority}
                onChange={(event) => onChange({ priority: event.target.value })}
                disabled={saving}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Due at">
              <input
                type="datetime-local"
                value={form.dueAt}
                onChange={(event) => onChange({ dueAt: event.target.value })}
                disabled={saving}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(event) => onChange({ notes: event.target.value })}
              disabled={saving}
              rows={4}
              placeholder="Clinical instructions, frequency, precautions..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </Field>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : mode === "edit" ? "Save changes" : "Assign task"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

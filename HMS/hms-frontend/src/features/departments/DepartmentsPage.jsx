import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import {
  createDepartment,
  deleteDepartment,
  fetchDepartmentsList,
  getApiErrorMessage,
  updateDepartment,
} from "@/features/departments/api/departmentsApi";

const EMPTY_FORM = {
  name: "",
  description: "",
};

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

export default function DepartmentsPage() {
  const auth = useAuth();
  const canManageDepartments = auth.hasRole("Admin") || auth.hasRole("SuperAdmin");
  const canCreate = canManageDepartments;
  const canUpdate = canManageDepartments;
  const canDelete = canManageDepartments;

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const showToast = useCallback((message, type = "success") => {
    toast[type === "error" ? "error" : type === "warning" ? "warning" : "success"](message);
  }, []);

  const load = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      setDepartments(await fetchDepartmentsList());
    } catch (e) {
      setDepartments([]);
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (error) showToast(error, "error");
  }, [error, showToast]);

  const filteredDepartments = useMemo(() => {
    const term = normalize(search);
    if (!term) return departments;

    return departments.filter((department) =>
      [department.name, department.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [departments, search]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(department) {
    if (!canUpdate) return;
    setEditing(department);
    setForm({
      name: department.name ?? "",
      description: department.description ?? "",
    });
    setFormOpen(true);
  }

  function closeForm() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(false);
  }

  function openDelete(department) {
    if (!canDelete || saving) return;
    setDeleteTarget(department);
    setDeleteError("");
  }

  function closeDelete() {
    if (saving) return;
    setDeleteTarget(null);
    setDeleteError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    const name = form.name.trim();
    if (!name) {
      showToast("Department name is required.", "error");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateDepartment(editing.id, {
          name,
          description: form.description,
        });
        showToast("Department updated.");
      } else {
        await createDepartment({
          name,
          description: form.description,
        });
        showToast("Department created.");
      }

      closeForm();
      await load({ refresh: true });
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!canDelete || saving || !deleteTarget) return;

    setSaving(true);
    setDeleteError("");
    try {
      await deleteDepartment(deleteTarget.id);
      showToast("Department deleted.");
      if (editing?.id === deleteTarget.id) closeForm();
      setDeleteTarget(null);
      await load({ refresh: true });
    } catch (e) {
      setDeleteError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Facility directory
          </p>
          <p className="mt-1.5 text-sm text-slate-600">
            Manage hospital departments used by staff, appointments, and beds.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
            >
              <Plus className="size-4" aria-hidden />
              Add department
            </button>
          )}
          <button
            type="button"
            onClick={() => void load({ refresh: true })}
            disabled={loading || refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Search
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Department name or description"
            className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
        </label>
      </section>

      <div className="scrollbar-none min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[16rem] items-center justify-center text-sm text-slate-500">
            Loading departments...
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="flex min-h-[16rem] flex-col items-center justify-center gap-2 p-8 text-center text-sm text-slate-500">
            <Building2 className="size-8 text-slate-300" aria-hidden />
            <span>{departments.length === 0 ? "No departments found." : "No departments match your search."}</span>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Department Name</th>
                <th className="px-4 py-3">Description</th>
                {(canUpdate || canDelete) && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredDepartments.map((department) => (
                <tr key={department.id} className="align-top">
                  <td className="px-4 py-3 font-medium text-slate-900">{department.name}</td>
                  <td className="px-4 py-3 text-slate-600">{department.description || "-"}</td>
                  {(canUpdate || canDelete) && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => openEdit(department)}
                            className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                            aria-label={`Edit ${department.name}`}
                            title="Edit"
                          >
                            <Pencil className="size-4" aria-hidden />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => openDelete(department)}
                            disabled={saving}
                            className="inline-flex size-8 items-center justify-center rounded-md border border-rose-200 text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                            aria-label={`Delete ${department.name}`}
                            title="Delete"
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!canCreate && !canUpdate && !canDelete && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Your account can view departments. Ask an administrator for create, update, or delete permission to manage them.
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4" role="dialog" aria-modal="true">
          <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {editing ? "Edit department" : "Create department"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Department name is required. Description is optional.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Name *</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  rows={4}
                  placeholder="Optional description"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || (!editing && !canCreate) || (editing && !canUpdate)}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : editing ? "Save changes" : "Create"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-department-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close delete confirmation"
            onClick={saving ? undefined : closeDelete}
          />
          <section className="relative w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start gap-4 border-b border-slate-200 px-5 py-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <AlertTriangle className="size-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 id="delete-department-title" className="text-base font-semibold text-slate-950">
                  Delete department
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  This will remove "{deleteTarget.name}" from the department directory.
                </p>
              </div>
            </div>

            <div className="space-y-4 bg-slate-50 px-5 py-4">
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Deletion is only allowed when no staff, beds, or appointments reference this department.
              </p>

              {deleteError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert">
                  {deleteError}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={closeDelete}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="size-4" aria-hidden />
                  {saving ? "Deleting..." : "Delete department"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

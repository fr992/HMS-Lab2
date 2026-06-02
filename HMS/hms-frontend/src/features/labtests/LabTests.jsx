import { Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import {
  createLabTest,
  deactivateLabTest,
  fetchLabTests,
  getApiErrorMessage,
  updateLabTest,
} from "@/features/labtests/api/labTests";
import { getPagedItems, getPagination, PaginationBar } from "@/lib/pagination.jsx";
import DataTransferMenu from "@/features/dataTransfer/DataTransferMenu";

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function statusMeta(isActive) {
  return isActive
    ? {
      label: "Active",
      classes: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    }
    : {
      label: "Inactive",
      classes: "bg-slate-100 text-slate-700 ring-slate-200",
    };
}

function toFilterParam(filter) {
  if (filter === "active") return true;
  if (filter === "inactive") return false;
  return "all";
}

function toNullablePrice(value) {
  if (value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPrice(value) {
  if (value == null) return "-";

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function LabTestsPage() {
  const auth = useAuth();
  const canCreate = auth.hasPermission("LabTests.Create");
  const canUpdate = auth.hasPermission("LabTests.Update");
  const canDelete = auth.hasPermission("LabTests.Delete");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    testCode: "",
    name: "",
    specimenType: "",
    description: "",
    isActive: true,
    price: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchLabTests({
        isActive: toFilterParam(statusFilter),
        search: search.trim() || undefined,
        page,
        pageSize: 25,
      });
      setItems(getPagedItems(data));
      setPagination(getPagination(data));
    } catch (e) {
      setError(getApiErrorMessage(e));
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, search, page]);

  const showToast = useCallback((message, type = "success") => {
    toast[type === "error" ? "error" : type === "warning" ? "warning" : "success"](message);
  }, []);

  useEffect(() => {
    if (error) showToast(error, "error");
  }, [error, showToast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filteredItems = items;


  function resetForm() {
    setFormOpen(false);
    setEditing(null);
    setForm({
      testCode: "",
      name: "",
      specimenType: "",
      description: "",
      isActive: true,
      price: "",
    });
  }

  function beginEdit(item) {
    if (!canUpdate) return;
    setFormOpen(true);
    setEditing(item);
    setForm({
      testCode: item.testCode ?? "",
      name: item.name ?? "",
      specimenType: item.specimenType ?? "",
      description: item.description ?? "",
      isActive: Boolean(item.isActive),
      price: item.price != null ? String(item.price) : "",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;

    const name = form.name.trim();
    if (!name) {
      showToast("Lab test name is required.", "error");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateLabTest(editing.id, {
          testCode: form.testCode,
          name,
          specimenType: form.specimenType,
          description: form.description,
          isActive: form.isActive,
          price: toNullablePrice(form.price),
        });
        showToast("Lab test updated.");
      } else {
        await createLabTest({
          testCode: form.testCode,
          name,
          specimenType: form.specimenType,
          description: form.description,
          price: toNullablePrice(form.price),
          isActive: true,
        });
        showToast("Lab test created.");
      }

      resetForm();
      await load();
    } catch (e2) {
      showToast(getApiErrorMessage(e2), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(item) {
    if (!canDelete || saving) return;
    setSaving(true);
    try {
      await deactivateLabTest(item.id);
      showToast("Lab test deactivated.");
      if (editing?.id === item.id) {
        resetForm();
      }
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Clinical catalog
          </p>
          <p className="mt-1.5 text-sm text-slate-600">
            Manage the lab tests available for ordering and results.
          </p>
        </div>

        <div className="flex gap-2">
          <DataTransferMenu
            endpoint="/data-transfer/lab-tests"
            exportParams={{
              isActive: toFilterParam(statusFilter) === "all" ? undefined : toFilterParam(statusFilter),
              search: search.trim() || undefined,
            }}
            canImport={canCreate}
            onImported={load}
          />
          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm({
                  testCode: "",
                  name: "",
                  specimenType: "",
                  description: "",
                  isActive: true,
                  price: "",
                });
                setFormOpen(true);
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add lab test
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
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden
            />
            Refresh
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_12rem_auto] md:items-end">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Search
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Code, name, specimen, or description"
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            >
              {FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setPage(1);
              setStatusFilter("all");
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
            Loading lab tests...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex min-h-[16rem] items-center justify-center p-8 text-center text-sm text-slate-500">
            No lab tests found.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Specimen</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredItems.map((item) => {
                const meta = statusMeta(item.isActive);
                return (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-3 text-slate-600">{item.testCode || "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 text-slate-600">{item.specimenType || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.description || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${meta.classes}`}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatPrice(item.price)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => beginEdit(item)}
                            className="h-8 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Edit
                          </button>
                        )}
                        {canDelete && item.isActive && (
                          <button
                            type="button"
                            onClick={() => void handleDeactivate(item)}
                            disabled={saving}
                            className="h-8 rounded-md border border-rose-200 px-3 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                          >
                            Deactivate
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
        <PaginationBar pagination={pagination} loading={loading} onPageChange={setPage} />
      </div>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-sm font-semibold text-slate-900">
              {editing ? `Edit #${editing.id}` : "Create lab test"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Fields align with backend lab test DTOs.
            </p>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Code</span>
                <input
                  type="text"
                  value={form.testCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, testCode: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  placeholder="Optional test code"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Name *</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Specimen type
                </span>
                <input
                  type="text"
                  value={form.specimenType}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, specimenType: e.target.value }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  placeholder="Blood, urine, swab..."
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Description
                </span>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  placeholder="Optional notes for clinicians"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Price (USD)
                </span>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  placeholder="Cost for billing purposes"
                  min="0"
                  step="0.01"
                />
              </label>
              {editing && canUpdate && (
                <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                  />
                  Active
                </label>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || (!canCreate && !editing) || (editing && !canUpdate)}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : editing ? "Save changes" : "Create"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

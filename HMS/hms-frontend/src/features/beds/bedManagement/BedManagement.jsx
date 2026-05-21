import { useCallback, useEffect, useMemo, useState } from "react";
import { BedDouble, Plus, RefreshCw } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import {
  createBed,
  fetchBeds,
  fetchDepartmentsList,
  getApiErrorMessage,
  updateBed,
} from "@/features/beds/api/bedAssignmentsApi";
import BedBoard from "@/features/beds/components/BedBoard";
import BedFilters from "@/features/beds/components/BedFilters";
import BedFormDialog from "@/features/beds/components/BedFormDialog";
import { EmptyState, LoadingState, ToastNotice } from "@/features/beds/components/BedPageStates";
import BedSummaryCards from "@/features/beds/components/BedSummaryCards";
import {
  buildBedPayload,
  EMPTY_BED_FORM,
  getBedStats,
  mapBedToForm,
  normalize,
} from "@/features/beds/components/bedUtils";

const EMPTY_FILTERS = {
  search: "",
  departmentId: "all",
  roomNumber: "all",
  status: "all",
};

export default function BedManagement() {
  const auth = useAuth();
  const canCreate = auth.hasPermission("Beds.Create");
  const canUpdate = auth.hasPermission("Beds.Update");

  const [beds, setBeds] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [dialog, setDialog] = useState({ bed: null, open: false });
  const [form, setForm] = useState(EMPTY_BED_FORM);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  const loadBeds = useCallback(async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const [bedData, departmentData] = await Promise.all([
        fetchBeds({
          status: filters.status,
          departmentId: filters.departmentId,
        }),
        fetchDepartmentsList(),
      ]);
      setBeds(bedData);
      setDepartments(departmentData);
    } catch (e) {
      setBeds([]);
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters.departmentId, filters.status]);

  useEffect(() => {
    void loadBeds();
  }, [loadBeds]);

  const roomOptions = useMemo(() => {
    return [...new Set(beds.map((bed) => bed.roomNumber).filter(Boolean))].sort();
  }, [beds]);

  const wardOptions = useMemo(() => {
    return [...new Set(beds.map((bed) => bed.ward).filter(Boolean))].sort();
  }, [beds]);

  const filteredBeds = useMemo(() => {
    const term = normalize(filters.search);

    return beds.filter((bed) => {
      const haystack = [
        bed.ward,
        bed.departmentName,
        bed.roomNumber,
        bed.bedNumber,
        bed.floor,
        bed.status,
        bed.notes,
        bed.currentAssignment?.patientName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !term || haystack.includes(term);
      const matchesRoom = filters.roomNumber === "all" || bed.roomNumber === filters.roomNumber;
      const matchesWard =
        filters.departmentId === "all" ||
        !filters.departmentId.startsWith("ward:") ||
        filters.departmentId === `ward:${bed.ward}`;

      return matchesSearch && matchesRoom && matchesWard;
    });
  }, [beds, filters.departmentId, filters.roomNumber, filters.search]);

  const stats = useMemo(() => getBedStats(beds), [beds]);

  function changeFilters(patch) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function openCreate() {
    setForm(EMPTY_BED_FORM);
    setDialog({ bed: null, open: true });
  }

  function openEdit(bed) {
    setForm(mapBedToForm(bed));
    setDialog({ bed, open: true });
  }

  function closeDialog() {
    setDialog({ bed: null, open: false });
    setForm(EMPTY_BED_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    if (!form.ward.trim() || !form.roomNumber.trim() || !form.bedNumber.trim()) {
      showToast("Ward, room number, and bed number are required.", "error");
      return;
    }

    setSaving(true);
    try {
      if (dialog.bed) {
        await updateBed(dialog.bed.id, buildBedPayload(form, true));
        showToast("Bed updated.");
      } else {
        await createBed(buildBedPayload(form));
        showToast("Bed created.");
      }

      closeDialog();
      await loadBeds({ refresh: true });
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Facility operations
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Bed Management
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            Create and maintain ward beds, rooms, departments, and bed availability.
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
              Create bed
            </button>
          )}
          <button
            type="button"
            onClick={() => void loadBeds({ refresh: true })}
            disabled={loading || refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      <BedSummaryCards stats={stats} />

      <BedFilters
        departments={departments}
        filters={filters}
        roomOptions={roomOptions}
        wardOptions={wardOptions}
        onChange={changeFilters}
        onClear={() => setFilters(EMPTY_FILTERS)}
      />

      <ToastNotice
        notice={toast || (error ? { message: error, type: "error" } : null)}
        onClose={() => {
          setToast(null);
          setError("");
        }}
      />

      {loading ? (
        <LoadingState />
      ) : filteredBeds.length === 0 ? (
        <EmptyState
          label="No beds found"
          detail={beds.length === 0 ? "Create the first bed to start managing capacity." : "Adjust filters to see more beds."}
        />
      ) : (
        <BedBoard beds={filteredBeds} canUpdate={canUpdate} onEdit={openEdit} />
      )}

      {!canCreate && !canUpdate && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <BedDouble className="mr-2 inline size-4 align-text-bottom text-slate-400" aria-hidden />
          Your account can view beds. Ask an administrator for create or update permission to manage them.
        </div>
      )}

      {dialog.open && (
        <BedFormDialog
          bed={dialog.bed}
          departments={departments}
          form={form}
          saving={saving}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          onClose={closeDialog}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

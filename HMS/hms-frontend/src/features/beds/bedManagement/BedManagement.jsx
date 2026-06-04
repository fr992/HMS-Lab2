import { useCallback, useEffect, useMemo, useState } from "react";
import { BedDouble, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
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
import { EmptyState, LoadingState } from "@/features/beds/components/BedPageStates";
import BedSummaryCards from "@/features/beds/components/BedSummaryCards";
import {
  buildBedPayload,
  EMPTY_BED_FORM,
  getBedStats,
  mapBedToForm,
  normalize,
} from "@/features/beds/components/bedUtils";
import DataTransferMenu from "@/features/dataTransfer/DataTransferMenu";
import { getPagedItems, getPagination } from "@/lib/pagination.jsx";

const EMPTY_FILTERS = {
  search: "",
  departmentId: "all",
  roomNumber: "all",
  status: "all",
};
const BED_PAGE_SIZE = 40;

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
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [dialog, setDialog] = useState({ bed: null, open: false });
  const [form, setForm] = useState(EMPTY_BED_FORM);

  const showToast = useCallback((message, type = "success") => {
    toast[type === "error" ? "error" : type === "warning" ? "warning" : "success"](message);
  }, []);

  useEffect(() => {
    if (error) showToast(error, "error");
  }, [error, showToast]);

  const loadBeds = useCallback(async (page = 1, { append = false, refresh = false } = {}) => {
    if (append || refresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const bedData = await fetchBeds({
        search: filters.search.trim() || undefined,
        status: filters.status,
        departmentId: filters.departmentId,
        roomNumber: filters.roomNumber,
        page,
        pageSize: BED_PAGE_SIZE,
      });
      const items = getPagedItems(bedData);
      setBeds((current) => (append ? [...current, ...items] : items));
      setPagination(getPagination(bedData));
    } catch (e) {
      if (!append) {
        setBeds([]);
        setPagination(null);
      }
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters.departmentId, filters.roomNumber, filters.search, filters.status]);

  useEffect(() => {
    let active = true;

    async function loadDepartments() {
      try {
        const departmentData = await fetchDepartmentsList();
        if (active) setDepartments(departmentData);
      } catch (e) {
        if (active) setError(getApiErrorMessage(e));
      }
    }

    void loadDepartments();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void loadBeds(1);
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

    if (!form.ward.trim() || !form.roomNumber.trim() || !form.bedNumber.trim() || !form.departmentId) {
      showToast("Ward, room number, bed number, and department are required.", "error");
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
      await loadBeds(1, { refresh: true });
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
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            Create and maintain ward beds, rooms, departments, and bed availability.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <DataTransferMenu
            endpoint="/data-transfer/beds"
            exportParams={{
              status: filters.status === "all" ? undefined : filters.status,
              departmentId:
                filters.departmentId === "all" || filters.departmentId.startsWith("ward:")
                  ? undefined
                  : filters.departmentId,
            }}
            canImport={canCreate}
            onImported={() => loadBeds(1, { refresh: true })}
          />
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
            onClick={() => void loadBeds(1, { refresh: true })}
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

      {loading ? (
        <LoadingState />
      ) : filteredBeds.length === 0 ? (
        <EmptyState
          label="No beds found"
          detail={beds.length === 0 ? "Create the first bed to start managing capacity." : "Adjust filters to see more beds."}
        />
      ) : (
        <>
          <BedBoard beds={filteredBeds} canUpdate={canUpdate} onEdit={openEdit} />
          <BedRevealControls
            visibleCount={beds.length}
            totalCount={pagination?.totalCount ?? beds.length}
            loading={refreshing}
            hasMore={Boolean(pagination?.hasNextPage)}
            onMore={() => loadBeds((pagination?.page ?? 1) + 1, { append: true })}
          />
        </>
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

function BedRevealControls({ visibleCount, totalCount, loading, hasMore, onMore }) {
  if (!hasMore) return null;

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-center shadow-sm sm:flex-row sm:justify-between sm:text-left">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-900">{visibleCount}</span> of{" "}
        <span className="font-medium text-slate-900">{totalCount}</span> beds
      </p>
      <button
        type="button"
        onClick={() => void onMore()}
        disabled={loading}
        className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
      >
        {loading ? "Loading..." : "View more"}
      </button>
    </div>
  );
}

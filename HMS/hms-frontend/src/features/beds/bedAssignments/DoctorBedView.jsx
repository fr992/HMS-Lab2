import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  CheckCircle2,
  RefreshCw,
  Search,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  createBedAssignmentRequest,
  fetchDoctorDepartmentBeds,
  getApiErrorMessage,
} from "@/features/beds/api/bedAssignmentsApi";
import { getPagedItems, getPagination } from "@/lib/pagination.jsx";

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusMeta(bed) {
  const status = normalize(bed?.status);
  const occupied = Boolean(bed?.patientProfileId);

  if (occupied || status === "occupied") {
    return {
      label: "Occupied",
      icon: UserRound,
      card: "border-blue-200 bg-blue-50/80 text-blue-950 hover:bg-blue-50",
      badge: "bg-blue-100 text-blue-800 ring-blue-200",
      dot: "bg-blue-500",
    };
  }

  if (status === "inactive" || status === "maintenance" || bed?.isActive === false) {
    return {
      label: "Maintenance",
      icon: Wrench,
      card: "border-amber-200 bg-amber-50/80 text-amber-950 hover:bg-amber-50",
      badge: "bg-amber-100 text-amber-900 ring-amber-200",
      dot: "bg-amber-500",
    };
  }

  return {
    label: "Available",
    icon: CheckCircle2,
    card: "border-emerald-200 bg-emerald-50/80 text-emerald-950 hover:bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
  };
}

function bedLabel(bed) {
  return bed.bedLabel || bed.bedNumber || `Bed #${bed.bedId}`;
}

function bedLocation(bed) {
  return [bed.departmentName || bed.ward, bed.floor, bed.roomNumber ? `Room ${bed.roomNumber}` : null]
    .filter(Boolean)
    .join(" / ");
}

function initialsFromName(value) {
  return (
    String(value ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "P"
  );
}

const BED_PAGE_SIZE = 40;

export default function DoctorBedView() {
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedBed, setSelectedBed] = useState(null);
  const [requesting, setRequesting] = useState(false);

  const loadBeds = useCallback(async (page = 1, { append = false, refresh = false } = {}) => {
    if (append || refresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const data = await fetchDoctorDepartmentBeds({
        search: search.trim() || undefined,
        page,
        pageSize: BED_PAGE_SIZE,
      });
      const items = getPagedItems(data);
      setBeds((current) => (append ? [...current, ...items] : items));
      setPagination(getPagination(data));
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
  }, [search]);

  useEffect(() => {
    void loadBeds(1);
  }, [loadBeds]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  async function requestBedAction(bed, intent) {
    if (!bed?.encounterId) {
      toast.error("This bed assignment is not linked to an encounter.");
      return;
    }

    setRequesting(true);
    try {
      await createBedAssignmentRequest(bed.encounterId, {
        priority: "routine",
        preferredWard: bed.ward || bed.departmentName || null,
        notes:
          intent === "release"
            ? `[Bed release request] Please review release for ${bedLocation(bed)}.`
            : `[Bed change request] Please review reassignment from ${bedLocation(bed)}.`,
      });
      toast.success(intent === "release" ? "Bed release request sent." : "Bed change request sent.");
      setSelectedBed(null);
      await loadBeds(1, { refresh: true });
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    } finally {
      setRequesting(false);
    }
  }

  const filteredBeds = useMemo(() => {
    const term = normalize(search);
    if (!term) return beds;

    return beds.filter((bed) => {
      const haystack = [
        bed.departmentName,
        bed.ward,
        bed.floor,
        bed.roomNumber,
        bedLabel(bed),
        bed.status,
        bed.patientName,
        bed.patientNumber,
        bed.encounterNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [beds, search]);

  const groupedRooms = useMemo(() => {
    const groups = new Map();

    for (const bed of filteredBeds) {
      const key = [
        bed.departmentName || bed.ward || "Department",
        bed.ward || "Ward",
        bed.roomNumber || "Room",
      ].join("|");

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          departmentName: bed.departmentName,
          ward: bed.ward || "Unassigned ward",
          roomNumber: bed.roomNumber || "Unassigned",
          floor: bed.floor,
          beds: [],
        });
      }

      groups.get(key).beds.push(bed);
    }

    return [...groups.values()].sort((a, b) =>
      `${a.ward} ${a.roomNumber}`.localeCompare(`${b.ward} ${b.roomNumber}`)
    );
  }, [filteredBeds]);

  const stats = useMemo(() => {
    const occupied = beds.filter((bed) => Boolean(bed.patientProfileId)).length;
    const maintenance = beds.filter((bed) => {
      const status = normalize(bed.status);
      return bed.isActive === false || status === "inactive" || status === "maintenance";
    }).length;
    const available = Math.max(beds.length - occupied - maintenance, 0);

    return [
      { label: "Total beds", value: beds.length, icon: BedDouble, tone: "bg-slate-100 text-slate-700" },
      { label: "Occupied", value: occupied, icon: UserRound, tone: "bg-blue-100 text-blue-700" },
      { label: "Available", value: available, icon: CheckCircle2, tone: "bg-emerald-100 text-emerald-700" },
      { label: "Maintenance", value: maintenance, icon: Wrench, tone: "bg-amber-100 text-amber-700" },
    ];
  }, [beds]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="block lg:w-[24rem]">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Search
          </span>
          <span className="relative mt-1.5 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search bed, room, patient..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </span>
        </label>
        <button
          type="button"
          onClick={() => void loadBeds(1, { refresh: true })}
          disabled={loading || refreshing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <SummaryCard key={stat.label} stat={stat} />
        ))}
      </div>

      <section className="min-h-[22rem] rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {loading ? (
          <StateMessage label="Loading department beds..." />
        ) : groupedRooms.length === 0 ? (
          <StateMessage
            label={beds.length === 0 ? "No beds found for your department." : "No beds match your search."}
          />
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              {groupedRooms.map((room) => (
                <RoomCard key={room.key} room={room} onSelectBed={setSelectedBed} />
              ))}
            </div>
            <BedRevealControls
              visibleCount={beds.length}
              totalCount={pagination?.totalCount ?? beds.length}
              loading={refreshing}
              hasMore={Boolean(pagination?.hasNextPage)}
              onMore={() => loadBeds((pagination?.page ?? 1) + 1, { append: true })}
            />
          </>
        )}
      </section>

      {selectedBed && (
        <BedDetailsModal
          bed={selectedBed}
          requesting={requesting}
          onRequest={requestBedAction}
          onClose={() => setSelectedBed(null)}
        />
      )}
    </div>
  );
}

function BedRevealControls({ visibleCount, totalCount, loading, hasMore, onMore }) {
  if (!hasMore) return null;

  return (
    <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-center sm:flex-row sm:justify-between sm:text-left">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-900">{visibleCount}</span> of{" "}
        <span className="font-medium text-slate-900">{totalCount}</span> beds
      </p>
      <button
        type="button"
        onClick={() => void onMore()}
        disabled={loading}
        className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
      >
        {loading ? "Loading..." : "View more"}
      </button>
    </div>
  );
}

function SummaryCard({ stat }) {
  const Icon = stat.icon;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{stat.label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{stat.value}</p>
        </div>
        <div className={`flex size-11 items-center justify-center rounded-lg ${stat.tone}`}>
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
    </article>
  );
}

function RoomCard({ room, onSelectBed }) {
  const occupied = room.beds.filter((bed) => Boolean(bed.patientProfileId)).length;
  const available = room.beds.length - occupied;

  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            Room {room.roomNumber}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {[room.departmentName || room.ward, room.floor].filter(Boolean).join(" / ")}
          </p>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
          {occupied} occupied / {Math.max(available, 0)} open
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {room.beds.map((bed) => (
          <BedButton key={bed.bedId} bed={bed} onClick={() => onSelectBed(bed)} />
        ))}
      </div>
    </article>
  );
}

function BedButton({ bed, onClick }) {
  const meta = statusMeta(bed);
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-32 rounded-lg border p-3 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sky-500/30 ${meta.card}`}
    >
      <div className="flex items-center justify-between gap-2">
        <Icon className="size-5 shrink-0" aria-hidden />
        <span className={`size-2.5 rounded-full ${meta.dot}`} />
      </div>
      <p className="mt-3 truncate text-sm font-semibold">{bedLabel(bed)}</p>
      <p className="mt-1 truncate text-xs opacity-75">{meta.label}</p>
      <p className="mt-3 min-h-8 text-xs leading-4 opacity-80">
        {bed.patientName || "Not occupied"}
      </p>
    </button>
  );
}

function BedDetailsModal({ bed, requesting, onRequest, onClose }) {
  const meta = statusMeta(bed);
  const occupied = Boolean(bed.patientProfileId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
      <section className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-950">Bed {bedLabel(bed)}</h2>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${meta.badge}`}>
                {meta.label}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-slate-600">
              {bedLocation(bed) || "Location unavailable"}
            </p>
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

        <div className="space-y-4 bg-slate-50 px-6 py-5">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                {occupied ? initialsFromName(bed.patientName) : <BedDouble className="size-5" aria-hidden />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient</p>
                <h3 className="mt-1 truncate text-base font-semibold text-slate-950">
                  {occupied ? bed.patientName : "Not occupied"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {occupied
                    ? "This bed currently has an active patient assignment."
                    : "There is no active patient assignment for this bed."}
                </p>
              </div>
            </div>
          </div>

          <DetailGrid
            items={[
              ["Patient number", occupied ? bed.patientNumber || "-" : "-"],
              ["Encounter", occupied ? bed.encounterNumber || bed.encounterId || "-" : "-"],
              ["Assigned at", occupied ? formatDateTime(bed.assignedAt) : "-"],
              ["Department", bed.departmentName || "-"],
              ["Ward", bed.ward || "-"],
              ["Room", bed.roomNumber || "-"],
            ]}
          />

          {bed.notes && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bed notes</p>
              <p className="mt-2">{bed.notes}</p>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
            {occupied && (
              <>
                <button
                  type="button"
                  onClick={() => onRequest(bed, "change")}
                  disabled={requesting}
                  className="h-10 rounded-lg border border-sky-200 bg-white px-4 text-sm font-medium text-sky-700 transition hover:bg-sky-50 disabled:opacity-60"
                >
                  Request bed change
                </button>
                <button
                  type="button"
                  onClick={() => onRequest(bed, "release")}
                  disabled={requesting}
                  className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-60"
                >
                  Request release
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function DetailGrid({ items }) {
  return (
    <dl className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function StateMessage({ label }) {
  return (
    <div className="flex min-h-[18rem] items-center justify-center p-8 text-center">
      <div>
        <BedDouble className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
        <p className="mt-3 text-sm font-medium text-slate-900">{label}</p>
      </div>
    </div>
  );
}

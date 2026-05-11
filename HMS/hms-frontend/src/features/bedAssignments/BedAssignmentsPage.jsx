import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  MapPin,
  RefreshCw,
  Search,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { CountUpValue } from "@/features/dashboard/DashboardPrimitives";
import { fetchPatients } from "@/features/patients/patientsApi";
import {
  assignBed,
  fetchActiveBedAssignments,
  fetchBeds,
  fetchDepartmentsList,
  getApiErrorMessage,
  releaseBed,
  releaseBedAssignment,
} from "@/features/bedAssignments/api/bedAssignmentsApi";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "Available", label: "Available" },
  { value: "Occupied", label: "Occupied" },
  { value: "Inactive", label: "Maintenance" },
];

const ASSIGNMENT_OPTIONS = [
  { value: "all", label: "All assignments" },
  { value: "active", label: "Active" },
  { value: "unassigned", label: "Unassigned" },
];

const EMPTY_ASSIGN_FORM = {
  patientProfileId: "",
  encounterId: "",
  ward: "all",
  roomNumber: "all",
  bedId: "",
  notes: "",
};

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function titleCase(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

function patientLabel(patient) {
  const name = [patient.firstName, patient.lastName].filter(Boolean).join(" ");
  return name || patient.patientName || "Patient";
}

function bedLocation(bed) {
  return [bed.departmentName || bed.ward, bed.roomNumber, bed.bedNumber]
    .filter(Boolean)
    .join(" / ");
}

function statusMeta(status) {
  const key = normalize(status);
  if (key === "available") {
    return {
      label: "Available",
      icon: CheckCircle2,
      badge: "bg-emerald-50 text-emerald-800 ring-emerald-200",
      card: "border-emerald-200 bg-emerald-50/70 text-emerald-950 hover:bg-emerald-50",
      rail: "border-l-emerald-400",
      dot: "bg-emerald-500",
    };
  }
  if (key === "occupied") {
    return {
      label: "Occupied",
      icon: UserRound,
      badge: "bg-blue-50 text-blue-800 ring-blue-200",
      card: "border-blue-200 bg-blue-50/70 text-blue-950 hover:bg-blue-50",
      rail: "border-l-blue-400",
      dot: "bg-blue-500",
    };
  }
  if (key === "inactive" || key === "maintenance") {
    return {
      label: "Maintenance",
      icon: Wrench,
      badge: "bg-amber-50 text-amber-900 ring-amber-200",
      card: "border-amber-200 bg-amber-50/70 text-amber-950 hover:bg-amber-50",
      rail: "border-l-amber-400",
      dot: "bg-amber-500",
    };
  }
  if (key === "cleaning") {
    return {
      label: "Cleaning",
      icon: Wrench,
      badge: "bg-slate-100 text-slate-700 ring-slate-200",
      card: "border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100",
      rail: "border-l-slate-400",
      dot: "bg-slate-400",
    };
  }
  if (key === "reserved" || key === "assigned") {
    return {
      label: titleCase(status),
      icon: Clock,
      badge: "bg-violet-50 text-violet-800 ring-violet-200",
      card: "border-violet-200 bg-violet-50/70 text-violet-950 hover:bg-violet-50",
      rail: "border-l-violet-400",
      dot: "bg-violet-500",
    };
  }
  return {
    label: titleCase(status) || "Unknown",
    icon: BedDouble,
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    card: "border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100",
    rail: "border-l-slate-300",
    dot: "bg-slate-400",
  };
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

function assignmentStatus(bed) {
  return bed.currentAssignment ? "active" : "unassigned";
}

export default function BedAssignmentsPage() {
  const auth = useAuth();
  const canAssign = auth.hasPermission("Beds.Assign");
  const canRelease = auth.hasPermission("Beds.Release");
  const canReadPatients = auth.hasPermission("Patients.Read");

  const [beds, setBeds] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roomFilter, setRoomFilter] = useState("all");
  const [bedStatusFilter, setBedStatusFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [dialog, setDialog] = useState({ type: null, bed: null, assignment: null });
  const [assignForm, setAssignForm] = useState(EMPTY_ASSIGN_FORM);
  const [patientSearch, setPatientSearch] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [bedData, assignmentData, departmentData, patientData] = await Promise.all([
        fetchBeds({
          departmentId: departmentFilter,
        }),
        fetchActiveBedAssignments(),
        canReadPatients ? fetchDepartmentsList() : Promise.resolve([]),
        canReadPatients ? fetchPatients() : Promise.resolve([]),
      ]);
      setBeds(bedData);
      setAssignments(assignmentData);
      setDepartments(departmentData);
      setPatients(Array.isArray(patientData) ? patientData : []);
    } catch (e) {
      setError(getApiErrorMessage(e));
      setBeds([]);
      setAssignments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canReadPatients, departmentFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const rooms = useMemo(() => {
    return [...new Set(beds.map((bed) => bed.roomNumber).filter(Boolean))].sort();
  }, [beds]);

  const wardOptions = useMemo(() => {
    return [...new Set(beds.map((bed) => bed.ward).filter(Boolean))].sort();
  }, [beds]);

  const modalRoomOptions = useMemo(() => {
    return [
      ...new Set(
        beds
          .filter((bed) => assignForm.ward === "all" || bed.ward === assignForm.ward)
          .map((bed) => bed.roomNumber)
          .filter(Boolean)
      ),
    ].sort();
  }, [assignForm.ward, beds]);

  const availableBeds = useMemo(() => {
    return beds.filter((bed) => {
      const isAvailable = normalize(bed.status) === "available" && bed.isActive !== false;
      const matchesWard = assignForm.ward === "all" || bed.ward === assignForm.ward;
      const matchesRoom =
        assignForm.roomNumber === "all" || bed.roomNumber === assignForm.roomNumber;
      return isAvailable && matchesWard && matchesRoom;
    });
  }, [assignForm.roomNumber, assignForm.ward, beds]);

  const filteredBeds = useMemo(() => {
    const term = normalize(search);
    return beds.filter((bed) => {
      const assignment = bed.currentAssignment;
      const haystack = [
        bed.ward,
        bed.departmentName,
        bed.roomNumber,
        bed.bedNumber,
        bed.status,
        bed.notes,
        assignment?.patientName,
        assignment?.patientNumber,
        assignment?.encounterNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !term || haystack.includes(term);
      const matchesDepartment =
        departmentFilter === "all" ||
        String(bed.departmentId ?? "") === departmentFilter ||
        `ward:${bed.ward}` === departmentFilter;
      const matchesRoom = roomFilter === "all" || bed.roomNumber === roomFilter;
      const matchesBedStatus =
        bedStatusFilter === "all" || normalize(bed.status) === normalize(bedStatusFilter);
      const matchesAssignment =
        assignmentFilter === "all" || assignmentStatus(bed) === assignmentFilter;
      return (
        matchesSearch &&
        matchesDepartment &&
        matchesRoom &&
        matchesBedStatus &&
        matchesAssignment
      );
    });
  }, [assignmentFilter, bedStatusFilter, beds, departmentFilter, roomFilter, search]);

  const groupedRooms = useMemo(() => {
    const groups = new Map();
    for (const bed of filteredBeds) {
      const key = `${bed.departmentName || bed.ward || "Ward"}|${bed.roomNumber || "Room"}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          ward: bed.departmentName || bed.ward || "Unassigned ward",
          roomNumber: bed.roomNumber || "Unassigned",
          beds: [],
        });
      }
      groups.get(key).beds.push(bed);
    }
    return [...groups.values()]
      .map((room) => {
        const occupied = room.beds.filter((bed) => normalize(bed.status) === "occupied").length;
        const available = room.beds.filter((bed) => normalize(bed.status) === "available").length;
        return { ...room, occupied, available };
      })
      .sort((a, b) => `${a.ward} ${a.roomNumber}`.localeCompare(`${b.ward} ${b.roomNumber}`));
  }, [filteredBeds]);

  const stats = useMemo(() => {
    const occupied = beds.filter((bed) => normalize(bed.status) === "occupied").length;
    const available = beds.filter((bed) => normalize(bed.status) === "available").length;
    const maintenance = beds.filter((bed) =>
      ["inactive", "maintenance"].includes(normalize(bed.status))
    ).length;
    return [
      { label: "Total Beds", value: beds.length, icon: BedDouble, tone: "blue" },
      { label: "Occupied Beds", value: occupied, icon: UserRound, tone: "sky" },
      { label: "Available Beds", value: available, icon: CheckCircle2, tone: "emerald" },
      { label: "Maintenance Beds", value: maintenance, icon: Wrench, tone: "amber" },
    ];
  }, [beds]);

  function openAssign(bed = null) {
    setDialog({ type: "assign", bed, assignment: null });
    setPatientSearch("");
    setAssignForm({
      ...EMPTY_ASSIGN_FORM,
      ward: bed?.ward || "all",
      roomNumber: bed?.roomNumber || "all",
      bedId: bed?.id ? String(bed.id) : "",
    });
  }

  function openView(bed) {
    setDialog({ type: "view", bed, assignment: bed.currentAssignment });
  }

  function openRelease(bed) {
    setReleaseNotes("");
    setDialog({ type: "release", bed, assignment: bed.currentAssignment });
  }

  function closeDialog() {
    setDialog({ type: null, bed: null, assignment: null });
    setAssignForm(EMPTY_ASSIGN_FORM);
    setReleaseNotes("");
  }

  async function handleAssign(event) {
    event.preventDefault();
    if (saving) return;

    const bedId = Number.parseInt(assignForm.bedId, 10);
    const patientProfileId = Number.parseInt(assignForm.patientProfileId, 10);
    const encounterId = assignForm.encounterId
      ? Number.parseInt(assignForm.encounterId, 10)
      : null;

    if (!bedId || !patientProfileId) {
      showToast("Patient and available bed are required.", "error");
      return;
    }
    if (assignForm.encounterId && !encounterId) {
      showToast("Encounter ID must be a valid number.", "error");
      return;
    }

    setSaving(true);
    try {
      await assignBed(bedId, {
        patientProfileId,
        encounterId,
        notes: assignForm.notes.trim() || null,
      });
      showToast("Bed assigned.");
      closeDialog();
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleRelease() {
    if (saving || !dialog.bed) return;

    setSaving(true);
    try {
      if (dialog.assignment?.id) {
        await releaseBedAssignment(dialog.assignment.id, {
          releaseNotes: releaseNotes.trim() || null,
        });
      } else {
        await releaseBed(dialog.bed.id, {
          releaseNotes: releaseNotes.trim() || null,
        });
      }
      showToast("Bed released.");
      closeDialog();
      await load();
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
            Patient care operations
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Bed Assignments
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            Monitor current bed usage across wards, rooms, and active patient assignments.
          </p>
        </div>

        <div className="flex gap-2">
          {canAssign && (
            <button
              type="button"
              onClick={() => openAssign()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
            >
              <BedDouble className="h-4 w-4" aria-hidden />
              Assign bed
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <SummaryCard key={stat.label} stat={stat} />
        ))}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_12rem_10rem_12rem_13rem_auto] lg:items-end">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Search
            </span>
            <span className="relative mt-1.5 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Patient, bed, room, ward"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </span>
          </label>
          <SelectField label="Department/Ward" value={departmentFilter} onChange={setDepartmentFilter}>
            <option value="all">All wards</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
            {departments.length === 0 &&
              wardOptions.map((ward) => (
                <option key={ward} value={`ward:${ward}`}>
                  {ward}
                </option>
              ))}
          </SelectField>
          <SelectField label="Room" value={roomFilter} onChange={setRoomFilter}>
            <option value="all">All rooms</option>
            {rooms.map((room) => (
              <option key={room} value={room}>
                {room}
              </option>
            ))}
          </SelectField>
          <SelectField label="Bed Status" value={bedStatusFilter} onChange={setBedStatusFilter}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <SelectField label="Assignment Status" value={assignmentFilter} onChange={setAssignmentFilter}>
            {ASSIGNMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setDepartmentFilter("all");
              setRoomFilter("all");
              setBedStatusFilter("all");
              setAssignmentFilter("all");
            }}
            className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      </section>

      {toast && (
        <div
          role={toast.type === "error" ? "alert" : "status"}
          className={
            toast.type === "error"
              ? "rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
              : "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          }
        >
          {toast.message}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert">
          {error}
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Visual Bed Management</h2>
            <p className="mt-1 text-sm text-slate-500">
              {assignments.length} active assignments across the current bed view.
            </p>
          </div>
          <ClipboardList className="size-5 text-slate-400" aria-hidden />
        </div>

        {loading ? (
          <LoadingState label="Loading bed layout..." />
        ) : groupedRooms.length === 0 ? (
          <EmptyState label="No beds found" detail="Adjust filters or add active beds before assigning patients." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {groupedRooms.map((room) => (
              <RoomCard
                key={room.key}
                room={room}
                canAssign={canAssign}
                canRelease={canRelease}
                onAssign={openAssign}
                onRelease={openRelease}
                onView={openView}
              />
            ))}
          </div>
        )}
      </section>

      <div className="scrollbar-none min-h-[18rem] flex-1 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <LoadingState label="Loading bed assignments..." />
        ) : filteredBeds.length === 0 ? (
          <EmptyState label="No bed assignments found" detail="Try changing the search or filters." />
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Patient Number</th>
                <th className="px-4 py-3">Department/Ward</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Bed</th>
                <th className="px-4 py-3">Bed Status</th>
                <th className="px-4 py-3">Assigned Date</th>
                <th className="px-4 py-3">Assigned By</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredBeds.map((bed) => (
                <BedRow
                  key={bed.id}
                  bed={bed}
                  canAssign={canAssign}
                  canRelease={canRelease}
                  onAssign={openAssign}
                  onRelease={openRelease}
                  onView={openView}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {dialog.type === "assign" && (
        <AssignBedDialog
          form={assignForm}
          saving={saving}
          patients={patients}
          patientSearch={patientSearch}
          availableBeds={availableBeds}
          wardOptions={wardOptions}
          roomOptions={modalRoomOptions}
          onPatientSearch={setPatientSearch}
          onChange={(patch) => setAssignForm((current) => ({ ...current, ...patch }))}
          onClose={closeDialog}
          onSubmit={handleAssign}
        />
      )}

      {dialog.type === "release" && (
        <ReleaseDialog
          bed={dialog.bed}
          assignment={dialog.assignment}
          saving={saving}
          releaseNotes={releaseNotes}
          onReleaseNotes={setReleaseNotes}
          onClose={closeDialog}
          onConfirm={handleRelease}
        />
      )}

      {dialog.type === "view" && (
        <ViewDialog
          bed={dialog.bed}
          assignment={dialog.assignment}
          canRelease={canRelease}
          onRelease={openRelease}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}

function SummaryCard({ stat }) {
  const Icon = stat.icon;
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    sky: "bg-sky-50 text-sky-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
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

function StatusBadge({ status }) {
  const meta = statusMeta(status);
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${meta.badge}`}>
      <Icon className="size-3.5" aria-hidden />
      {meta.label}
    </span>
  );
}

function RoomCard({ room, canAssign, canRelease, onAssign, onRelease, onView }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold leading-5 text-slate-950">{room.ward}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
            <MapPin className="size-3.5" aria-hidden />
            Room {room.roomNumber}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            {room.beds.length} beds
          </span>
          <p className="mt-1.5 text-xs text-slate-500">
            <span className="font-medium text-blue-700">{room.occupied}</span> occupied ·{" "}
            <span className="font-medium text-emerald-700">{room.available}</span> open
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {room.beds.map((bed) => (
          <BedTile
            key={bed.id}
            bed={bed}
            canAssign={canAssign}
            canRelease={canRelease}
            onAssign={onAssign}
            onRelease={onRelease}
            onView={onView}
          />
        ))}
      </div>
    </article>
  );
}

function BedTile({ bed, canAssign, canRelease, onAssign, onRelease, onView }) {
  const meta = statusMeta(bed.status);
  const occupied = normalize(bed.status) === "occupied";
  const available = normalize(bed.status) === "available";
  return (
    <div className={`rounded-lg border-l-4 p-2.5 transition ${meta.card} ${meta.rail}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold leading-tight">{bed.bedNumber}</p>
        <span className={`size-2.5 shrink-0 rounded-full ${meta.dot}`} title={meta.label} />
      </div>
      <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-wide text-current/70">
        {meta.label}
      </p>
      <p className="mt-1.5 line-clamp-2 min-h-8 text-xs text-current/75">
        {occupied
          ? bed.currentAssignment?.patientName || "Occupied"
          : bed.notes || "Ready for assignment"}
      </p>
      <div className="mt-2 flex gap-1.5">
        {occupied && (
          <button
            type="button"
            onClick={() => onView(bed)}
            className="inline-flex h-7 w-8 items-center justify-center rounded-md border border-white/70 bg-white/75 text-slate-700 shadow-sm transition hover:bg-white"
            aria-label={`View bed ${bed.bedNumber}`}
            title="View assignment"
          >
            <Eye className="size-3.5" aria-hidden />
          </button>
        )}
        {available && canAssign && (
          <button
            type="button"
            onClick={() => onAssign(bed)}
            className="inline-flex h-7 flex-1 items-center justify-center rounded-md bg-sky-600 px-2 text-xs font-medium text-white shadow-sm transition hover:bg-sky-700"
          >
            Assign
          </button>
        )}
        {occupied && canRelease && (
          <button
            type="button"
            onClick={() => onRelease(bed)}
            className="inline-flex h-7 flex-1 items-center justify-center rounded-md border border-white/70 bg-white/80 px-2 text-xs font-medium text-slate-800 shadow-sm transition hover:bg-white"
          >
            Release
          </button>
        )}
      </div>
    </div>
  );
}

function BedRow({ bed, canAssign, canRelease, onAssign, onRelease, onView }) {
  const assignment = bed.currentAssignment;
  const available = normalize(bed.status) === "available";
  const occupied = normalize(bed.status) === "occupied";
  return (
    <tr className="align-middle transition hover:bg-slate-50/70">
      <td className="px-4 py-3">
        <div className="font-medium text-slate-900">{assignment?.patientName || "Unassigned"}</div>
        {assignment?.encounterNumber && (
          <div className="mt-1 text-xs text-slate-500">{assignment.encounterNumber}</div>
        )}
      </td>
      <td className="px-4 py-3 text-slate-600">{assignment?.patientNumber || "-"}</td>
      <td className="px-4 py-3 text-slate-600">{bed.departmentName || bed.ward || "-"}</td>
      <td className="px-4 py-3 text-slate-600">{bed.roomNumber || "-"}</td>
      <td className="px-4 py-3 font-medium text-slate-900">{bed.bedNumber || "-"}</td>
      <td className="px-4 py-3"><StatusBadge status={bed.status} /></td>
      <td className="px-4 py-3 text-slate-600">{formatDateTime(assignment?.assignedAt)}</td>
      <td className="px-4 py-3 text-slate-600">
        {assignment?.assignedByUserId ? `User #${assignment.assignedByUserId}` : "-"}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          {occupied && (
            <button
              type="button"
              onClick={() => onView(bed)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Eye className="size-3.5" aria-hidden />
              View
            </button>
          )}
          {available && canAssign && (
            <button
              type="button"
              onClick={() => onAssign(bed)}
              className="inline-flex h-8 items-center rounded-md bg-sky-600 px-3 text-xs font-medium text-white transition hover:bg-sky-700"
            >
              Assign
            </button>
          )}
          {occupied && canRelease && (
            <button
              type="button"
              onClick={() => onRelease(bed)}
              className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Release
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function AssignBedDialog({
  form,
  saving,
  patients,
  patientSearch,
  availableBeds,
  wardOptions,
  roomOptions,
  onPatientSearch,
  onChange,
  onClose,
  onSubmit,
}) {
  const selectedPatient = patients.find((patient) => String(patient.id) === String(form.patientProfileId));
  const visiblePatients = patients
    .filter((patient) => {
      const term = normalize(patientSearch);
      const haystack = [
        patientLabel(patient),
        patient.patientNumber,
        patient.personalNumber,
        patient.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return !term || haystack.includes(term);
    })
    .slice(0, 8);

  function choosePatient(patient) {
    onChange({ patientProfileId: String(patient.id) });
    onPatientSearch(
      `${patientLabel(patient)}${patient.patientNumber ? ` - ${patient.patientNumber}` : ""}`
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
      <section className="w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <DialogHeader title="Assign bed" subtitle="Select a patient and an available bed." onClose={onClose} />
        <form onSubmit={onSubmit} className="space-y-4 bg-slate-50 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Patient" required>
              <div className="relative">
                <input
                  type="search"
                  value={patientSearch}
                  onChange={(event) => {
                    onPatientSearch(event.target.value);
                    onChange({ patientProfileId: "" });
                  }}
                  disabled={saving}
                  placeholder="Search and select patient"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
                {patientSearch && !form.patientProfileId && visiblePatients.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    {visiblePatients.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => choosePatient(patient)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-slate-900">
                            {patientLabel(patient)}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {patient.patientNumber || patient.personalNumber || "No patient number"}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedPatient && (
                <p className="mt-1.5 text-xs font-medium text-slate-500">
                  Selected: {patientLabel(selectedPatient)}
                  {selectedPatient.patientNumber ? ` - ${selectedPatient.patientNumber}` : ""}
                </p>
              )}
            </Field>
            <Field label="Ward filter">
              <select
                value={form.ward}
                onChange={(event) =>
                  onChange({ ward: event.target.value, roomNumber: "all", bedId: "" })
                }
                disabled={saving}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="all">All wards</option>
                {wardOptions.map((ward) => (
                  <option key={ward} value={ward}>{ward}</option>
                ))}
              </select>
            </Field>
            <Field label="Room filter">
              <select
                value={form.roomNumber}
                onChange={(event) => onChange({ roomNumber: event.target.value, bedId: "" })}
                disabled={saving}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="all">All rooms</option>
                {roomOptions.map((room) => (
                  <option key={room} value={room}>{room}</option>
                ))}
              </select>
            </Field>
            <Field label="Available bed" required>
              <select
                value={form.bedId}
                onChange={(event) => onChange({ bedId: event.target.value })}
                disabled={saving}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                required
              >
                <option value="">Select bed</option>
                {availableBeds.map((bed) => (
                  <option key={bed.id} value={bed.id}>{bedLocation(bed)}</option>
                ))}
              </select>
            </Field>
            <Field label="Encounter ID">
              <input
                type="number"
                min="1"
                value={form.encounterId}
                onChange={(event) => onChange({ encounterId: event.target.value })}
                disabled={saving}
                placeholder="Optional"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(event) => onChange({ notes: event.target.value })}
              disabled={saving}
              rows={4}
              placeholder="Assignment notes"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </Field>
          <DialogActions onClose={onClose} saving={saving} submitLabel="Assign bed" savingLabel="Assigning..." />
        </form>
      </section>
    </div>
  );
}

function ReleaseDialog({ bed, assignment, saving, releaseNotes, onReleaseNotes, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
      <section className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <DialogHeader title="Release bed" subtitle="Confirm that this patient is leaving the bed." onClose={onClose} />
        <div className="space-y-4 bg-slate-50 px-6 py-5">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <DetailGrid
              items={[
                ["Patient", assignment?.patientName || "-"],
                ["Bed", bed?.bedNumber || "-"],
                ["Room", bed?.roomNumber || "-"],
                ["Department/Ward", bed?.departmentName || bed?.ward || "-"],
                ["Assigned date", formatDateTime(assignment?.assignedAt)],
              ]}
            />
          </div>
          <Field label="Release notes">
            <textarea
              value={releaseNotes}
              onChange={(event) => onReleaseNotes(event.target.value)}
              disabled={saving}
              rows={3}
              placeholder="Optional release notes"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </Field>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="button" onClick={onConfirm} disabled={saving} className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50">
              {saving ? "Releasing..." : "Confirm Release"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ViewDialog({ bed, assignment, canRelease, onRelease, onClose }) {
  const meta = statusMeta(bed?.status);
  const activeAssignment = assignment && !assignment.releasedAt && normalize(bed?.status) === "occupied";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
      <section className="w-full max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-950">Bed {bed?.bedNumber || "-"}</h2>
              <StatusBadge status={bed?.status} />
            </div>
            <p className="mt-1.5 text-sm text-slate-600">
              {[bed?.departmentName || bed?.ward, bed?.roomNumber ? `Room ${bed.roomNumber}` : null]
                .filter(Boolean)
                .join(" · ") || "Location unavailable"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Close">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="grid gap-4 bg-slate-50 px-6 py-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                  {initialsFromName(assignment?.patientName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient</p>
                  <h3 className="mt-1 truncate text-base font-semibold text-slate-950">
                    {assignment?.patientName || "Unassigned"}
                  </h3>
                  <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                    <InfoLine label="Patient number" value={assignment?.patientNumber || "-"} />
                    <InfoLine label="Encounter" value={assignment?.encounterNumber || assignment?.encounterId || "-"} />
                    <InfoLine label="Assignment status" value={assignment ? (assignment.releasedAt ? "Released" : "Active") : "Unassigned"} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-950">Assignment timeline</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoLine label="Assigned date" value={formatDateTime(assignment?.assignedAt)} />
                <InfoLine label="Assigned by" value={assignment?.assignedByUserId ? `User #${assignment.assignedByUserId}` : "-"} />
                <InfoLine label="Released date" value={formatDateTime(assignment?.releasedAt)} />
                <InfoLine label="Released by" value={assignment?.releasedByUserId ? `User #${assignment.releasedByUserId}` : "-"} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className={`rounded-lg border border-slate-200 border-l-4 bg-white p-4 shadow-sm ${meta.rail}`}>
              <h3 className="mb-3 text-sm font-semibold text-slate-950">Bed details</h3>
              <div className="grid gap-3">
                <InfoLine label="Department/Ward" value={bed?.departmentName || bed?.ward || "-"} />
                <InfoLine label="Room" value={bed?.roomNumber || "-"} />
                <InfoLine label="Bed" value={bed?.bedNumber || "-"} />
                <InfoLine label="Bed status" value={meta.label} />
              </div>
            </div>

          {(assignment?.notes || assignment?.releaseNotes || bed?.notes) && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-slate-950">Notes</h3>
              {assignment?.notes && <p>{assignment.notes}</p>}
              {assignment?.releaseNotes && <p className="mt-2">{assignment.releaseNotes}</p>}
              {bed?.notes && <p className="mt-2">{bed.notes}</p>}
            </div>
          )}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 lg:col-span-2">
            <button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              Close
            </button>
            {activeAssignment && canRelease && (
              <button
                type="button"
                onClick={() => onRelease(bed)}
                className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700"
              >
                Release bed
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function DialogHeader({ title, subtitle, onClose }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
      <div className="flex items-start gap-4">
        <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <BedDouble className="size-6" aria-hidden />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
      </div>
      <button type="button" onClick={onClose} className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Close">
        <X className="size-5" aria-hidden />
      </button>
    </div>
  );
}

function DialogActions({ onClose, saving, submitLabel, savingLabel }) {
  return (
    <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
      <button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
        Cancel
      </button>
      <button type="submit" disabled={saving} className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50">
        {saving ? savingLabel : submitLabel}
      </button>
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

function DetailGrid({ items }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function LoadingState({ label }) {
  return (
    <div className="flex min-h-[14rem] items-center justify-center text-sm text-slate-500">
      {label}
    </div>
  );
}

function EmptyState({ label, detail }) {
  return (
    <div className="flex min-h-[14rem] items-center justify-center p-8 text-center">
      <div>
        <BedDouble className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
        <p className="mt-3 text-sm font-medium text-slate-900">{label}</p>
        <p className="mt-1 text-sm text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

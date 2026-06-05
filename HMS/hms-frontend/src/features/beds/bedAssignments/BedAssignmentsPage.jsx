import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BedDouble,
  ChevronLeft,
  ChevronRight,
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
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { CountUpValue } from "@/features/dashboard/DashboardPrimitives";
import { fetchPatients } from "@/features/patients/patientsApi";
import {
  assignBed,
  assignBedAssignmentRequest,
  createBedAssignmentRequest,
  fetchBedAssignmentRequests,
  fetchBeds,
  fetchDepartmentsList,
  fetchEncounters,
  getApiErrorMessage,
  rejectBedAssignmentRequest,
  releaseBed,
  releaseBedAssignment,
} from "@/features/beds/api/bedAssignmentsApi";
import { getPagedItems, getPagination } from "@/lib/pagination.jsx";

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

const BED_REQUEST_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "assigned", label: "Assigned" },
  { value: "rejected", label: "Rejected" },
];

const BED_REQUEST_PRIORITY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "routine", label: "Routine" },
  { value: "urgent", label: "Urgent" },
];

const BED_REQUEST_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "urgent", label: "Urgent First" },
  { value: "ward", label: "Ward" },
];

const BED_PAGE_SIZE = 40;
const BED_REQUEST_PAGE_SIZE = 75;

const EMPTY_REQUEST_PAGINATION = {
  page: 1,
  pageSize: BED_REQUEST_PAGE_SIZE,
  totalCount: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

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

function patientSearchLabel(patient) {
  if (!patient) return "";
  return `${patientLabel(patient)}${patient.patientNumber ? ` - ${patient.patientNumber}` : ""}`;
}

function encounterLabel(encounter) {
  if (!encounter) return "";
  const number = encounter.encounterNumber || `Encounter #${encounter.id}`;
  return [number, encounter.patientName].filter(Boolean).join(" - ");
}

function userDisplayName(name, userId) {
  return String(name ?? "").trim() || (userId ? `User #${userId}` : "-");
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
  if (key === "pending") {
    return {
      label: "Pending",
      icon: Clock,
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

function requestPriorityClasses(priority) {
  const value = normalize(priority);
  if (value === "stat") return "bg-rose-50 text-rose-800 ring-rose-200";
  if (value === "urgent") return "bg-orange-50 text-orange-800 ring-orange-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function isBedReleaseRequest(request) {
  return String(request?.notes ?? "")
    .toLowerCase()
    .includes("[bed release request]");
}

function isBedChangeRequest(request) {
  return String(request?.notes ?? "")
    .toLowerCase()
    .includes("[bed change request]");
}

function requestCreatorName(request) {
  return request?.createdByUserName || request?.requestedByDoctorName || "-";
}

function currentBedFromRequest(request) {
  if (request?.assignedBedLabel) return request.assignedBedLabel;
  const notes = String(request?.notes ?? "");
  const match = notes.match(/from\s+(.+?)\.\s*$/i);
  return match?.[1]?.trim() || "";
}

function requestReason(request) {
  return String(request?.notes ?? "").trim();
}

function encounterRouteForRequest(request, auth) {
  if (!request?.encounterId) return "";
  if (auth.hasRole("Admin") || auth.hasRole("SuperAdmin")) {
    return `/admin/encounters/${request.encounterId}`;
  }
  if (auth.hasRole("Doctor")) {
    return `/doctor/encounters/${request.encounterId}`;
  }
  return "";
}

export default function BedAssignmentsPage({ readOnly = false, requestsOnly = false }) {
  const auth = useAuth();
  const isRequesterOnlyRole =
    auth.hasRole("Doctor") || auth.hasRole("Nurse") || auth.hasRole("Infermier");
  const canAssign = !readOnly && !isRequesterOnlyRole && auth.hasPermission("Beds.Assign");
  const canRelease = !readOnly && !isRequesterOnlyRole && auth.hasPermission("Beds.Release");
  const canLoadAssignmentOptions = !readOnly && auth.hasPermission("Patients.Read");
  const canLoadEncounterOptions = canLoadAssignmentOptions && !requestsOnly;
  const canReadBedRequests =
    !readOnly && requestsOnly && auth.hasPermission("BedAssignmentRequests.Read");
  const canAssignBedRequests = !readOnly && auth.hasPermission("BedAssignmentRequests.Assign");
  const canRejectBedRequests = !readOnly && auth.hasPermission("BedAssignmentRequests.Reject");
  const canRequestBedChange =
    !readOnly &&
    (auth.hasPermission("BedAssignmentRequests.Create") ||
      isRequesterOnlyRole);

  const [beds, setBeds] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [bedPagination, setBedPagination] = useState(null);
  const [bedRequests, setBedRequests] = useState([]);
  const [requestPagination, setRequestPagination] = useState(EMPTY_REQUEST_PAGINATION);
  const [departments, setDepartments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestLoading, setRequestLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roomFilter, setRoomFilter] = useState("all");
  const [bedStatusFilter, setBedStatusFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [dialog, setDialog] = useState({ type: null, bed: null, assignment: null });
  const [requestDialog, setRequestDialog] = useState({ type: null, request: null });
  const [assignForm, setAssignForm] = useState(EMPTY_ASSIGN_FORM);
  const [patientSearch, setPatientSearch] = useState("");
  const [encounterSearch, setEncounterSearch] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [debouncedRequestSearch, setDebouncedRequestSearch] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState("all");
  const [requestPriorityFilter, setRequestPriorityFilter] = useState("all");
  const [requestWardFilter, setRequestWardFilter] = useState("all");
  const [requestSort, setRequestSort] = useState("newest");
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    toast[type === "error" ? "error" : type === "warning" ? "warning" : "success"](message);
  }, []);

  useEffect(() => {
    if (error) showToast(error, "error");
  }, [error, showToast]);

  const load = useCallback(async (page = 1, { append = false } = {}) => {
    if (append) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [bedData, departmentData, patientData, encounterData] = await Promise.all([
        fetchBeds({
          departmentId: departmentFilter,
          search: search.trim() || undefined,
          roomNumber: roomFilter,
          status: bedStatusFilter,
          assignmentStatus: assignmentFilter,
          page,
          pageSize: BED_PAGE_SIZE,
        }),
        canLoadAssignmentOptions ? fetchDepartmentsList() : Promise.resolve([]),
        canLoadAssignmentOptions ? fetchPatients() : Promise.resolve([]),
        canLoadEncounterOptions ? fetchEncounters().catch(() => []) : Promise.resolve([]),
      ]);
      const items = getPagedItems(bedData);
      setBeds((current) => (append ? [...current, ...items] : items));
      setAssignments((current) => {
        const nextItems = items.map((bed) => bed.currentAssignment).filter(Boolean);
        return append ? [...current, ...nextItems] : nextItems;
      });
      setBedPagination(getPagination(bedData));
      setDepartments(departmentData);
      setPatients(Array.isArray(patientData) ? patientData : []);
      setEncounters(Array.isArray(encounterData) ? encounterData : []);
    } catch (e) {
      setError(getApiErrorMessage(e));
      if (!append) {
        setBeds([]);
        setAssignments([]);
        setBedPagination(null);
        setEncounters([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [assignmentFilter, bedStatusFilter, canLoadAssignmentOptions, canLoadEncounterOptions, departmentFilter, roomFilter, search]);

  const loadBedRequests = useCallback(
    async (page = 1, { append = false } = {}) => {
      if (!canReadBedRequests) {
        setBedRequests([]);
        setRequestPagination(EMPTY_REQUEST_PAGINATION);
        return;
      }

      setRequestLoading(true);
      setError("");
      try {
        const data = await fetchBedAssignmentRequests({
          status: requestStatusFilter,
          search: debouncedRequestSearch,
          page,
          pageSize: BED_REQUEST_PAGE_SIZE,
        });

        const items = Array.isArray(data.items) ? data.items : [];
        setBedRequests((current) => (append ? [...current, ...items] : items));
        setRequestPagination({
          page: data.page ?? page,
          pageSize: data.pageSize ?? BED_REQUEST_PAGE_SIZE,
          totalCount: data.totalCount ?? items.length,
          totalPages: data.totalPages ?? 0,
          hasNextPage: Boolean(data.hasNextPage),
          hasPreviousPage: Boolean(data.hasPreviousPage),
        });
      } catch (e) {
        setError(getApiErrorMessage(e));
        setBedRequests([]);
        setRequestPagination(EMPTY_REQUEST_PAGINATION);
      } finally {
        setRequestLoading(false);
      }
    },
    [canReadBedRequests, debouncedRequestSearch, requestStatusFilter]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedRequestSearch(requestSearch.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [requestSearch]);

  useEffect(() => {
    void loadBedRequests(1);
  }, [loadBedRequests]);

  const refreshRequestsView = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([load(), loadBedRequests(1)]);
    } finally {
      setRefreshing(false);
    }
  }, [load, loadBedRequests]);

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

  const assignedPatientIds = useMemo(() => {
    const ids = new Set();
    for (const assignment of assignments) {
      const patientId = Number(assignment.patientProfileId);
      if (Number.isFinite(patientId) && patientId > 0) ids.add(patientId);
    }
    for (const bed of beds) {
      const patientId = Number(bed.currentAssignment?.patientProfileId);
      if (Number.isFinite(patientId) && patientId > 0) ids.add(patientId);
    }
    return ids;
  }, [assignments, beds]);

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
      const key = `${bed.departmentName || bed.ward || "Ward"}|${bed.floor || ""}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          ward: bed.departmentName || bed.ward || "Unassigned ward",
          floor: bed.floor || "Floor not set",
          rooms: new Map(),
        });
      }
      const roomKey = bed.roomNumber || "Unassigned";
      const group = groups.get(key);
      if (!group.rooms.has(roomKey)) {
        group.rooms.set(roomKey, {
          key: `${key}|${roomKey}`,
          roomNumber: roomKey,
          beds: [],
        });
      }
      group.rooms.get(roomKey).beds.push(bed);
    }
    return [...groups.values()]
      .map((group) => {
        const rooms = [...group.rooms.values()].map((room) => ({
          ...room,
          beds: room.beds.sort((a, b) =>
            `${a.bedNumber || ""}`.localeCompare(`${b.bedNumber || ""}`)
          ),
        }));
        const bedsInGroup = rooms.flatMap((room) => room.beds);
        const occupied = bedsInGroup.filter((bed) => normalize(bed.status) === "occupied").length;
        const available = bedsInGroup.filter((bed) => normalize(bed.status) === "available").length;
        return {
          ...group,
          occupied,
          available,
          total: bedsInGroup.length,
          rooms: rooms.sort((a, b) => `${a.roomNumber}`.localeCompare(`${b.roomNumber}`)),
        };
      })
      .sort((a, b) => `${a.ward} ${a.floor}`.localeCompare(`${b.ward} ${b.floor}`));
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

  const requestWardOptions = useMemo(() => {
    return [
      ...new Set(
        bedRequests
          .map((request) => request.preferredWard)
          .filter(Boolean)
          .map(String)
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [bedRequests]);

  const filteredBedRequests = useMemo(() => {
    const term = normalize(requestSearch);
    return bedRequests.filter((request) => {
      const status = normalize(request.status);
      const priority = normalize(request.priority || "routine");
      const ward = String(request.preferredWard ?? "");
      const haystack = [
        request.patientName,
        request.patientNumber,
        request.encounterNumber,
        request.encounterId,
        request.requestedByDoctorName,
        request.createdByUserName,
        request.preferredWard,
        request.notes,
        request.assignedBedLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !term || haystack.includes(term);
      const matchesStatus =
        requestStatusFilter === "all" || status === requestStatusFilter;
      const matchesPriority =
        requestPriorityFilter === "all" ||
        priority === requestPriorityFilter ||
        (requestPriorityFilter === "urgent" && priority === "stat");
      const matchesWard =
        requestWardFilter === "all" || ward === requestWardFilter;
      return matchesSearch && matchesStatus && matchesPriority && matchesWard;
    });
  }, [
    bedRequests,
    requestPriorityFilter,
    requestSearch,
    requestStatusFilter,
    requestWardFilter,
  ]);

  const sortedBedRequests = useMemo(() => {
    const priorityRank = (request) => {
      const priority = normalize(request.priority);
      if (priority === "stat") return 0;
      if (priority === "urgent") return 1;
      return 2;
    };
    const timeValue = (request) => {
      const date = new Date(request.requestedAt);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    };

    return [...filteredBedRequests].sort((a, b) => {
      if (requestSort === "oldest") return timeValue(a) - timeValue(b);
      if (requestSort === "urgent") {
        const priorityDiff = priorityRank(a) - priorityRank(b);
        return priorityDiff !== 0 ? priorityDiff : timeValue(b) - timeValue(a);
      }
      if (requestSort === "ward") {
        const wardDiff = String(a.preferredWard || "").localeCompare(String(b.preferredWard || ""));
        return wardDiff !== 0 ? wardDiff : timeValue(b) - timeValue(a);
      }
      return timeValue(b) - timeValue(a);
    });
  }, [filteredBedRequests, requestSort]);

  const requestHasActiveFilters =
    requestSearch.trim() !== "" ||
    requestStatusFilter !== "all" ||
    requestPriorityFilter !== "all" ||
    requestWardFilter !== "all";

  const selectedBedRequest = useMemo(() => {
    return sortedBedRequests.find((request) => request.id === selectedRequestId) || null;
  }, [selectedRequestId, sortedBedRequests]);

  const requestStats = useMemo(() => {
    const pendingLoaded = bedRequests.filter((request) => normalize(request.status) === "pending").length;
    const urgentLoaded = bedRequests.filter((request) =>
      ["urgent", "stat"].includes(normalize(request.priority))
    ).length;

    return [
      {
        label: "Matching Requests",
        value: requestPagination.totalCount || bedRequests.length,
        icon: ClipboardList,
        tone: "blue",
      },
      {
        label: "Loaded Requests",
        value: bedRequests.length,
        icon: Clock,
        tone: "sky",
      },
      {
        label: "Pending Loaded",
        value: pendingLoaded,
        icon: AlertTriangle,
        tone: "amber",
      },
      {
        label: "Urgent Loaded",
        value: urgentLoaded,
        icon: CheckCircle2,
        tone: "emerald",
      },
    ];
  }, [bedRequests, requestPagination.totalCount]);

  function openAssign(bed = null) {
    setDialog({ type: "assign", bed, assignment: null });
    setPatientSearch("");
    setEncounterSearch("");
    setAssignForm({
      ...EMPTY_ASSIGN_FORM,
      ward: bed?.ward || "all",
      roomNumber: bed?.roomNumber || "all",
      bedId: bed?.id ? String(bed.id) : "",
    });
  }

  function openRequestAssign(request) {
    setSelectedRequestId(null);
    setRequestDialog({ type: "assignRequest", request });
    setAssignForm({
      ...EMPTY_ASSIGN_FORM,
      patientProfileId: String(request.patientProfileId || ""),
      encounterId: String(request.encounterId || ""),
      ward: request.preferredWard || "all",
      notes: request.notes || "",
    });
  }

  function openRequestReject(request) {
    setSelectedRequestId(null);
    setRejectNotes("");
    setRequestDialog({ type: "rejectRequest", request });
  }

  function openView(bed) {
    setDialog({ type: "view", bed, assignment: bed.currentAssignment });
  }

  function openRelease(bed) {
    setReleaseNotes("");
    setDialog({ type: "release", bed, assignment: bed.currentAssignment });
  }

  async function handleRequestBedChange(bed, intent = "change") {
    const encounterId = bed?.currentAssignment?.encounterId;
    if (!encounterId) {
      showToast("This bed assignment is not linked to an encounter.", "error");
      return;
    }

    setSaving(true);
    try {
      await createBedAssignmentRequest(encounterId, {
        priority: "routine",
        preferredWard: bed?.ward || bed?.departmentName || null,
        notes:
          intent === "release"
            ? `[Bed release request] Please review release for ${bedLocation(bed)}.`
            : `[Bed change request] Please review reassignment from ${bedLocation(bed)}.`,
      });
      showToast(intent === "release" ? "Bed release request sent." : "Bed change request sent.");
      closeDialog();
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  function closeDialog() {
    setDialog({ type: null, bed: null, assignment: null });
    setRequestDialog({ type: null, request: null });
    setAssignForm(EMPTY_ASSIGN_FORM);
    setPatientSearch("");
    setEncounterSearch("");
    setReleaseNotes("");
    setRejectNotes("");
    setSelectedRequestId(null);
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
    if (assignedPatientIds.has(patientProfileId)) {
      showToast("This patient already has an active bed assignment.", "error");
      return;
    }
    if (assignForm.encounterId && !encounterId) {
      showToast("Encounter ID must be a valid number.", "error");
      return;
    }
    if (encounterSearch.trim() && !encounterId) {
      showToast("Select an encounter from the list.", "error");
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

  async function handleAssignRequest(event) {
    event.preventDefault();
    if (saving || !requestDialog.request) return;

    const bedId = Number.parseInt(assignForm.bedId, 10);
    const releaseRequest = isBedReleaseRequest(requestDialog.request);
    if (!bedId && !releaseRequest) {
      showToast("Available bed is required.", "error");
      return;
    }

    setSaving(true);
    try {
      await assignBedAssignmentRequest(requestDialog.request.id, {
        bedId: releaseRequest ? 0 : bedId,
        notes: assignForm.notes.trim() || null,
      });
      showToast(
        releaseRequest
          ? "Bed release request approved."
          : isBedChangeRequest(requestDialog.request)
            ? "Bed change request completed."
            : "Bed request assigned."
      );
      closeDialog();
      await refreshRequestsView();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleRejectRequest() {
    if (saving || !requestDialog.request) return;

    setSaving(true);
    try {
      await rejectBedAssignmentRequest(requestDialog.request.id, {
        reason: rejectNotes.trim() || null,
      });
      showToast("Bed request rejected.");
      closeDialog();
      await refreshRequestsView();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-5">
      {!requestsOnly && (
        <>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-end">
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

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <SummaryCard key={stat.label} stat={stat} />
            ))}
          </div>

          <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid min-w-0 grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(10rem,1fr)_minmax(9rem,0.85fr)_minmax(8rem,0.7fr)_minmax(8.5rem,0.75fr)_minmax(10rem,0.85fr)_auto]">
              <SearchField
                value={search}
                onChange={setSearch}
                placeholder="Search bed, room, patient..."
              />
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
        </>
      )}

      {requestsOnly && (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Bed Requests</h2>
              <p className="mt-1 text-sm text-slate-500">
                Review and manage pending bed assignment requests from doctors.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void refreshRequestsView();
              }}
              disabled={loading || requestLoading || refreshing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
              Refresh
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {requestStats.map((stat) => (
              <SummaryCard key={stat.label} stat={stat} />
            ))}
          </div>

          <RequestFilterBar
            search={requestSearch}
            onSearch={setRequestSearch}
            status={requestStatusFilter}
            onStatus={setRequestStatusFilter}
            priority={requestPriorityFilter}
            onPriority={setRequestPriorityFilter}
            ward={requestWardFilter}
            onWard={setRequestWardFilter}
            wards={requestWardOptions}
            onClear={() => {
              setRequestSearch("");
              setRequestStatusFilter("all");
              setRequestPriorityFilter("all");
              setRequestWardFilter("all");
            }}
          />
        </>
      )}

      {canReadBedRequests && (
        <section className="flex h-136 max-h-[calc(100vh-23rem)] min-h-120 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Request Queue</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {sortedBedRequests.length} of {requestPagination.totalCount || bedRequests.length} requests
                  </p>
                </div>
                <ClipboardList className="size-5 text-slate-400" aria-hidden />
              </div>
              <div className="mt-3 max-w-xs">
                <SelectField label="Sort" value={requestSort} onChange={setRequestSort}>
                  {BED_REQUEST_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>

            {loading || requestLoading ? (
              <RequestQueueSkeleton />
            ) : error ? (
              <RequestErrorState
                compact
                message={error}
                onRetry={() => {
                  void refreshRequestsView();
                }}
              />
            ) : sortedBedRequests.length === 0 ? (
              <RequestEmptyState
                compact
                filtered={requestHasActiveFilters}
                onClear={() => {
                  setRequestSearch("");
                  setRequestStatusFilter("all");
                  setRequestPriorityFilter("all");
                  setRequestWardFilter("all");
                }}
              />
            ) : (
              <div className="scrollbar-none min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {sortedBedRequests.map((request) => (
                  <RequestQueueItem
                    key={request.id}
                    request={request}
                    selected={selectedBedRequest?.id === request.id}
                    onSelect={() => setSelectedRequestId(request.id)}
                  />
                ))}
                {requestPagination.hasNextPage && (
                  <button
                    type="button"
                    onClick={() => {
                      void loadBedRequests(requestPagination.page + 1, { append: true });
                    }}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Load more
                  </button>
                )}
              </div>
            )}
        </section>
      )}

      {!requestsOnly && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Ward Bed Board</h2>
            <p className="mt-1 text-sm text-slate-500">
              {assignments.length} active assignments across the current bed view.
            </p>
          </div>
          <ClipboardList className="size-5 text-slate-400" aria-hidden />
        </div>
        <div className="mb-4 flex flex-wrap gap-4 text-sm text-slate-700">
          <LegendItem label="Occupied" className="border-blue-300 bg-blue-100" />
          <LegendItem label="Available" className="border-emerald-300 bg-emerald-100" />
          <LegendItem label="Maintenance" className="border-slate-300 bg-slate-200" />
        </div>

        {loading ? (
          <LoadingState label="Loading bed layout..." />
        ) : groupedRooms.length === 0 ? (
          <EmptyState label="No beds found" detail="Adjust filters or add active beds before assigning patients." />
        ) : (
          <>
            <div className="grid gap-4">
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
            <BedRevealControls
              visibleCount={beds.length}
              totalCount={bedPagination?.totalCount ?? beds.length}
              loading={refreshing}
              hasMore={Boolean(bedPagination?.hasNextPage)}
              onMore={() => load((bedPagination?.page ?? 1) + 1, { append: true })}
            />
          </>
        )}
        </section>
      )}

      {dialog.type === "assign" && (
        <AssignBedDialog
          form={assignForm}
          saving={saving}
          patients={patients}
          encounters={encounters}
          assignedPatientIds={assignedPatientIds}
          patientSearch={patientSearch}
          encounterSearch={encounterSearch}
          availableBeds={availableBeds}
          wardOptions={wardOptions}
          roomOptions={modalRoomOptions}
          onPatientSearch={setPatientSearch}
          onEncounterSearch={setEncounterSearch}
          onChange={(patch) => setAssignForm((current) => ({ ...current, ...patch }))}
          onClose={closeDialog}
          onSubmit={handleAssign}
        />
      )}

      {selectedBedRequest && (
        <RequestDetailDialog
          request={selectedBedRequest}
          encounterHref={encounterRouteForRequest(selectedBedRequest, auth)}
          canAssign={canAssignBedRequests}
          canReject={canRejectBedRequests}
          onAssign={openRequestAssign}
          onReject={openRequestReject}
          onClose={() => setSelectedRequestId(null)}
        />
      )}

      {requestDialog.type === "assignRequest" && (
        <RequestAssignDialog
          request={requestDialog.request}
          form={assignForm}
          saving={saving}
          availableBeds={availableBeds}
          wardOptions={wardOptions}
          roomOptions={modalRoomOptions}
          isReleaseRequest={isBedReleaseRequest(requestDialog.request)}
          onChange={(patch) => setAssignForm((current) => ({ ...current, ...patch }))}
          onClose={closeDialog}
          onSubmit={handleAssignRequest}
        />
      )}

      {requestDialog.type === "rejectRequest" && (
        <RejectRequestDialog
          request={requestDialog.request}
          saving={saving}
          notes={rejectNotes}
          onNotes={setRejectNotes}
          onClose={closeDialog}
          onConfirm={handleRejectRequest}
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
          canRequestBedChange={canRequestBedChange && !canAssign && !canRelease}
          onRelease={openRelease}
          onRequestBedChange={handleRequestBedChange}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}

function RequestFilterBar({
  search,
  onSearch,
  status,
  onStatus,
  priority,
  onPriority,
  ward,
  onWard,
  wards,
  onClear,
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[minmax(18rem,1fr)_10rem_10rem_12rem_auto] lg:items-end">
        <SearchField
          value={search}
          onChange={onSearch}
          placeholder="Search patient, doctor, encounter..."
        />
        <SelectField label="Status" value={status} onChange={onStatus}>
          {BED_REQUEST_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <SelectField label="Priority" value={priority} onChange={onPriority}>
          {BED_REQUEST_PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <SelectField label="Ward" value={ward} onChange={onWard}>
          <option value="all">All wards</option>
          {wards.map((wardName) => (
            <option key={wardName} value={wardName}>
              {wardName}
            </option>
          ))}
        </SelectField>
        <button
          type="button"
          onClick={onClear}
          className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          Clear
        </button>
      </div>
    </section>
  );
}

function RequestQueueItem({ request, selected, onSelect }) {
  const currentBed = currentBedFromRequest(request);
  const urgent = ["urgent", "stat"].includes(normalize(request.priority));
  const changeRequest = isBedChangeRequest(request);
  const releaseRequest = isBedReleaseRequest(request);
  const selectedClass = selected
    ? "border-blue-300 bg-blue-50 shadow-sm ring-1 ring-blue-100"
    : urgent
      ? "border-rose-200 bg-white hover:bg-rose-50/40"
      : "border-slate-200 bg-white hover:bg-slate-50";
  const accentClass = selected ? "bg-blue-500" : urgent ? "bg-rose-500" : "bg-slate-300";
  const creatorName = requestCreatorName(request);
  const initials = initialsFromName(creatorName);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative w-full rounded-lg border px-3 py-2.5 text-left transition ${selectedClass}`}
    >
      <span className={`absolute left-0 top-3 h-10 w-1 rounded-r-full ${accentClass}`} />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{request.patientName || "Patient"}</p>
          <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{request.patientNumber || "-"}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${requestPriorityClasses(request.priority)}`}>
          {request.priority || "routine"}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 pl-2">
        <div className="min-w-0">
          <p className="truncate text-xs text-slate-500">{formatDateTime(request.requestedAt)}</p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {changeRequest ? "Bed change" : releaseRequest ? "Bed release" : "Bed request"} · {currentBed || request.preferredWard || "Ward not set"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600" title={creatorName}>
            {initials}
          </span>
          <span className={`size-2 rounded-full ${statusDotClass(request.status)}`} title={request.status} />
        </div>
      </div>
    </button>
  );
}

function RequestDetailDialog({ request, encounterHref, canAssign, canReject, onAssign, onReject, onClose }) {
  const currentBed = currentBedFromRequest(request);
  const reason = requestReason(request);
  const pending = normalize(request.status) === "pending";
  const changeRequest = isBedChangeRequest(request);
  const releaseRequest = isBedReleaseRequest(request);
  const actionLabel = releaseRequest ? "Approve Release" : changeRequest ? "Approve & Change Bed" : "Assign Bed";

  return (
    <div className="hms-modal-overlay-mobile" role="dialog" aria-modal="true">
      <section className="hms-modal-panel-scroll max-w-4xl">
        <div className="shrink-0 border-b border-slate-200 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-semibold text-slate-950">{request.patientName || "Patient"}</h2>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${requestPriorityClasses(request.priority)}`}>
                  {request.priority || "routine"}
                </span>
                <StatusBadge status={request.status} />
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {[request.patientNumber, request.encounterNumber || `Encounter #${request.encounterId}`].filter(Boolean).join(" - ")}
              </p>
            </div>
            <button type="button" onClick={onClose} className="hms-modal-close" aria-label="Close">
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-950">Patient Info</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <InfoLine label="Patient" value={request.patientName || "-"} />
                <InfoLine label="Encounter" value={request.encounterNumber || request.encounterId || "-"} />
                <InfoLine label="Requested by" value={requestCreatorName(request)} />
                <InfoLine label="Requested date" value={formatDateTime(request.requestedAt)} />
                <InfoLine label="Preferred ward" value={request.preferredWard || "-"} />
                <InfoLine label="Current bed" value={currentBed || "-"} />
              </div>
            </section>

            <section className="rounded-lg border border-sky-100 bg-sky-50/70 p-4">
              <h3 className="text-sm font-semibold text-slate-950">Reason</h3>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {reason || "No request note provided."}
              </p>
            </section>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:justify-end">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            Close
          </button>
          {encounterHref && (
            <Link
              to={encounterHref}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              View Encounter
            </Link>
          )}
          {canReject && pending && (
            <button
              type="button"
              onClick={() => onReject(request)}
              className="h-10 rounded-lg border border-rose-200 bg-white px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
            >
              Reject
            </button>
          )}
          {canAssign && pending && (
            <button
              type="button"
              onClick={() => onAssign(request)}
              className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function RequestQueueSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex justify-between gap-3">
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="h-5 w-16 rounded-full bg-slate-100" />
          </div>
          <div className="mt-3 h-3 w-24 rounded bg-slate-100" />
          <div className="mt-3 h-3 w-40 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function RequestEmptyState({ filtered, onClear, compact = false }) {
  return (
    <div className={`flex ${compact ? "min-h-80" : "min-h-72"} items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center`}>
      <div>
        <ClipboardList className="mx-auto size-10 text-slate-300" aria-hidden />
        <p className="mt-3 text-sm font-semibold text-slate-950">
          {filtered ? "No requests match these filters" : "No bed requests found"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {filtered
            ? "Clear filters or search for a different patient, doctor, or encounter."
            : "Doctor bed assignment requests will appear here when submitted."}
        </p>
        {filtered && (
          <button
            type="button"
            onClick={onClear}
            className="mt-4 h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

function RequestErrorState({ message, onRetry, compact = false }) {
  return (
    <div className={`flex ${compact ? "min-h-80" : "min-h-64"} items-center justify-center rounded-lg border border-rose-200 bg-rose-50 p-8 text-center`}>
      <div>
        <AlertTriangle className="mx-auto size-10 text-rose-400" aria-hidden />
        <p className="mt-3 text-sm font-semibold text-rose-950">Unable to load bed requests</p>
        <p className="mt-1 text-sm text-rose-700">{message || "Please try again."}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 h-9 rounded-lg border border-rose-200 bg-white px-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function statusDotClass(status) {
  const key = normalize(status);
  if (key === "pending") return "bg-amber-500";
  if (key === "assigned") return "bg-emerald-500";
  if (key === "rejected") return "bg-rose-500";
  return "bg-slate-400";
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
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="break-words text-sm font-medium text-slate-600">{stat.label}</p>
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

function SelectField({ label, value, onChange, children }) {
  return (
    <label className="block min-w-0">
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
    <label className="block min-w-0">
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

function LegendItem({ label, className }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`size-3 rounded border ${className}`} />
      {label}
    </span>
  );
}

function RoomCard({ room, canAssign, canRelease, onAssign, onRelease, onView }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold leading-5 text-slate-950">{room.ward}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <MapPin className="size-3.5" aria-hidden />
            {room.floor}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {room.available} available
          </span>
          <p className="mt-1.5 text-xs text-slate-500">
            <span className="font-medium text-blue-700">{room.occupied}</span> occupied /{" "}
            <span className="font-medium text-slate-700">{room.total}</span> total
          </p>
        </div>
      </div>
      <div className="-mx-1 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-1 pb-2 [scrollbar-gutter:stable]">
        {room.rooms.map((roomGroup) => (
          <div
            key={roomGroup.key}
            className="w-fit min-w-48 max-w-none shrink-0 snap-start rounded-lg border border-slate-200 bg-slate-50/70 p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-900">Room {roomGroup.roomNumber}</h4>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                {roomGroup.beds.length} beds
              </span>
            </div>
            <BedCarousel
              beds={roomGroup.beds}
              renderBed={(bed) => (
                <BedTile
                  bed={bed}
                  canAssign={canAssign}
                  canRelease={canRelease}
                  onAssign={onAssign}
                  onRelease={onRelease}
                  onView={onView}
                />
              )}
            />
          </div>
        ))}
      </div>
    </article>
  );
}

function BedCarousel({ beds, renderBed }) {
  const scrollerRef = useRef(null);
  const showControls = beds.length > 4;

  function move(direction) {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left: direction * scroller.clientWidth,
      behavior: "smooth",
    });
  }

  return (
    <div className="flex items-center gap-2">
      {showControls && (
        <CarouselButton label="Previous 4 beds" onClick={() => move(-1)} icon={ChevronLeft} />
      )}
      <div
        ref={scrollerRef}
        className="flex shrink-0 gap-2 overflow-hidden scroll-smooth"
        style={bedViewportStyle(beds.length)}
      >
        {beds.map((bed) => (
          <div key={bed.id} className="shrink-0">
            {renderBed(bed)}
          </div>
        ))}
      </div>
      {showControls && (
        <CarouselButton label="Next 4 beds" onClick={() => move(1)} icon={ChevronRight} />
      )}
    </div>
  );
}

function CarouselButton({ icon, label, onClick }) {
  const ActionIcon = icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
      aria-label={label}
      title={label}
    >
      <ActionIcon className="size-4" aria-hidden />
    </button>
  );
}

function bedViewportStyle(bedCount) {
  const visibleBeds = Math.max(1, Math.min(bedCount, 4));
  const gapCount = Math.max(0, visibleBeds - 1);
  return {
    width: `${visibleBeds * 9 + gapCount * 0.5}rem`,
    maxWidth: "calc(100vw - 12rem)",
  };
}

function BedTile({ bed, canAssign, canRelease, onAssign, onRelease, onView }) {
  const occupied = normalize(bed.status) === "occupied";
  const available = normalize(bed.status) === "available";
  const maintenance = bed.isActive === false || ["inactive", "maintenance"].includes(normalize(bed.status));
  const tileTone = occupied
    ? "border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100"
    : maintenance
      ? "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
      : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100";
  const iconTone = occupied ? "text-blue-500" : maintenance ? "text-slate-400" : "text-emerald-500";

  return (
    <article className={`group min-h-20 w-36 shrink-0 rounded-lg border p-2 text-left transition ${tileTone}`}>
      <button
        type="button"
        onClick={() => occupied && onView(bed)}
        disabled={!occupied}
        className="block w-full disabled:cursor-default"
        title={bedLocation(bed)}
      >
        <BedDouble className={`size-4 shrink-0 ${iconTone}`} aria-hidden />
        <p className="mt-1 truncate text-sm font-semibold leading-tight">
          Bed {bed.bedNumber || `#${bed.id}`}
        </p>
      </button>
      <p className="mt-0.5 line-clamp-1 min-h-4 text-[11px] font-medium text-current/80">
        {occupied
          ? bed.currentAssignment?.patientName || "Occupied"
          : maintenance
            ? "Maintenance"
            : "Available"}
      </p>
      <div className="mt-1.5 flex justify-center gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        {occupied && (
          <button
            type="button"
            onClick={() => onView(bed)}
            className="inline-flex size-6 items-center justify-center rounded-md border border-white/80 bg-white/85 text-slate-700 shadow-sm transition hover:bg-white"
            aria-label={`View bed ${bed.bedNumber}`}
            title="View assignment"
          >
            <Eye className="size-3" aria-hidden />
          </button>
        )}
        {available && canAssign && (
          <button
            type="button"
            onClick={() => onAssign(bed)}
            className="inline-flex h-6 items-center justify-center rounded-md bg-sky-600 px-2 text-[11px] font-medium text-white shadow-sm transition hover:bg-sky-700"
          >
            Assign
          </button>
        )}
        {occupied && canRelease && (
          <button
            type="button"
            onClick={() => onRelease(bed)}
            className="inline-flex h-6 items-center justify-center rounded-md border border-white/80 bg-white/85 px-2 text-[11px] font-medium text-slate-800 shadow-sm transition hover:bg-white"
          >
            Release
          </button>
        )}
      </div>
    </article>
  );

}

function AssignBedDialog({
  form,
  saving,
  patients,
  encounters,
  assignedPatientIds,
  patientSearch,
  encounterSearch,
  availableBeds,
  wardOptions,
  roomOptions,
  onPatientSearch,
  onEncounterSearch,
  onChange,
  onClose,
  onSubmit,
}) {
  const selectedPatient = patients.find((patient) => String(patient.id) === String(form.patientProfileId));
  const selectedEncounter = encounters.find((encounter) => String(encounter.id) === String(form.encounterId));
  const [encounterPickerOpen, setEncounterPickerOpen] = useState(false);
  const visiblePatients = patients
    .filter((patient) => {
      if (assignedPatientIds.has(Number(patient.id))) return false;
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
  const visibleEncounters = encounters
    .filter((encounter) => {
      if (assignedPatientIds.has(Number(encounter.patientProfileId))) return false;
      const term = normalize(encounterSearch);
      const haystack = [
        encounter.encounterNumber,
        encounter.id,
        encounter.patientName,
        encounter.patientNumber,
        encounter.encounterType,
        encounter.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return !term || haystack.includes(term);
    })
    .slice(0, 8);

  function choosePatient(patient) {
    onChange({ patientProfileId: String(patient.id), encounterId: "" });
    onPatientSearch(patientSearchLabel(patient));
    onEncounterSearch("");
  }

  function chooseEncounter(encounter) {
    const matchingPatient = patients.find((patient) => String(patient.id) === String(encounter.patientProfileId));
    onChange({
      encounterId: String(encounter.id),
      patientProfileId: String(encounter.patientProfileId || ""),
    });
    onEncounterSearch(encounterLabel(encounter));
    onPatientSearch(patientSearchLabel(matchingPatient) || encounter.patientName || "");
    setEncounterPickerOpen(false);
  }

  return (
    <div className="hms-modal-overlay" role="dialog" aria-modal="true">
      <section className="hms-modal-panel-scroll max-w-4xl">
        <DialogHeader title="Assign bed" subtitle="Select a patient and an available bed." onClose={onClose} />
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col bg-slate-50">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Encounter">
                <div className="relative">
                  <input
                    type="search"
                    value={encounterSearch}
                    onChange={(event) => {
                      onEncounterSearch(event.target.value);
                      onChange({ encounterId: "" });
                      setEncounterPickerOpen(true);
                    }}
                    onFocus={() => setEncounterPickerOpen(true)}
                    disabled={saving}
                    placeholder="Search and select encounter"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  />
                  {encounterPickerOpen && !form.encounterId && (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                      {visibleEncounters.length > 0 ? (
                        visibleEncounters.map((encounter) => (
                          <button
                            key={encounter.id}
                            type="button"
                            onClick={() => chooseEncounter(encounter)}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-slate-900">
                                {encounter.encounterNumber || `Encounter #${encounter.id}`}
                              </span>
                              <span className="block truncate text-xs text-slate-500">
                                {[encounter.patientName, encounter.patientNumber, encounter.status]
                                  .filter(Boolean)
                                  .join(" - ") || "No patient details"}
                              </span>
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2 text-sm text-slate-500">No encounters found.</p>
                      )}
                    </div>
                  )}
                </div>
                {selectedEncounter && (
                  <p className="mt-1.5 text-xs font-medium text-slate-500">
                    Selected: {encounterLabel(selectedEncounter)}
                  </p>
                )}
              </Field>
              <Field label="Patient" required>
                <div className="relative">
                  <input
                    type="search"
                    value={patientSearch}
                    onChange={(event) => {
                      onPatientSearch(event.target.value);
                      onChange({ patientProfileId: "", encounterId: "" });
                      onEncounterSearch("");
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
          </div>
          <div className="hms-modal-footer bg-white px-6 py-4">
            <DialogActions
              onClose={onClose}
              saving={saving}
              submitLabel="Assign bed"
              savingLabel="Assigning..."
              className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end"
            />
          </div>
        </form>
      </section>
    </div>
  );
}

function RequestAssignDialog({
  request,
  form,
  saving,
  availableBeds,
  wardOptions,
  roomOptions,
  isReleaseRequest,
  onChange,
  onClose,
  onSubmit,
}) {
  const currentBed = currentBedFromRequest(request);
  const reason = requestReason(request);
  const isChangeRequest = isBedChangeRequest(request);
  const bedsByRoom = useMemo(() => {
    const sourceBeds = availableBeds;
    const groups = new Map();
    for (const bed of sourceBeds) {
      const matchesWard = form.ward === "all" || bed.ward === form.ward;
      const matchesRoom = form.roomNumber === "all" || bed.roomNumber === form.roomNumber;
      if (!matchesWard || !matchesRoom) continue;

      const room = bed.roomNumber || "Unassigned";
      if (!groups.has(room)) groups.set(room, []);
      groups.get(room).push(bed);
    }
    return [...groups.entries()]
      .map(([room, beds]) => ({
        room,
        beds: beds.sort((a, b) => `${a.bedNumber || ""}`.localeCompare(`${b.bedNumber || ""}`, undefined, { numeric: true })),
      }))
      .sort((a, b) => `${a.room}`.localeCompare(`${b.room}`, undefined, { numeric: true }));
  }, [availableBeds, form.roomNumber, form.ward]);

  return (
    <div className="hms-modal-overlay z-160" role="dialog" aria-modal="true">
      <section className="animate-in fade-in-0 zoom-in-95 flex max-h-[80vh] w-full max-w-250 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl duration-150">
        <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-950">
                  {isReleaseRequest ? "Approve Bed Release" : isChangeRequest ? "Approve & Change Bed" : "Assign Bed"}
                </h2>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${requestPriorityClasses(request?.priority)}`}>
                  {request?.priority || "routine"}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {request?.patientName || "Patient"} · {request?.patientNumber || "-"} ·{" "}
                {request?.encounterNumber || request?.encounterId || "-"}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
                <span>Preferred ward: <span className="text-slate-800">{request?.preferredWard || "-"}</span></span>
                <span>Requested by: <span className="text-slate-800">{requestCreatorName(request)}</span></span>
                <span>Requested: <span className="text-slate-800">{formatDateTime(request?.requestedAt)}</span></span>
              </div>
            </div>
            <button type="button" onClick={onClose} className="hms-modal-close" aria-label="Close">
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col bg-slate-50">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-950">Request Summary</h3>
                  <DetailGrid
                    items={[
                      ["Patient", request?.patientName || "-"],
                      ["Patient Number", request?.patientNumber || "-"],
                      ["Encounter", request?.encounterNumber || request?.encounterId || "-"],
                      ["Current room/bed", currentBed || "-"],
                      ["Preferred ward", request?.preferredWard || "-"],
                      ["Requesting user", requestCreatorName(request)],
                    ]}
                  />
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-950">Reason</h3>
                  <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-3 text-sm leading-6 text-slate-700">
                    {reason || "No request note provided."}
                  </div>
                </section>
              </div>

              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">
                      {isReleaseRequest ? "Release Approval" : "Assignment"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {isReleaseRequest ? "Approve the selected release request." : "Filter by ward and room, then select a bed."}
                    </p>
                  </div>
                  {!isReleaseRequest && (
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                      {form.bedId ? "Bed selected" : "No bed selected"}
                    </span>
                  )}
                </div>

                {!isReleaseRequest && (
                  <>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Field label="Ward">
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
                      <Field label="Room">
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
                    </div>

                    <div className="mt-4 space-y-3">
                      {bedsByRoom.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                          No available beds match these filters.
                        </div>
                      ) : (
                        bedsByRoom.map((roomGroup) => (
                          <div key={roomGroup.room} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                            <h4 className="text-sm font-semibold text-slate-900">Room {roomGroup.room}</h4>
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {roomGroup.beds.map((bed) => {
                                const available = normalize(bed.status) === "available" && bed.isActive !== false;
                                return (
                                  <RequestBedOption
                                    key={bed.id}
                                    bed={bed}
                                    selected={String(form.bedId) === String(bed.id)}
                                    disabled={saving || !available}
                                    onSelect={() => onChange({ bedId: String(bed.id) })}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </section>
            </div>

            <div className="mt-4">
              <Field label="Assignment notes">
                <textarea
                  value={form.notes}
                  onChange={(event) => onChange({ notes: event.target.value })}
                  disabled={saving}
                  rows={3}
                  placeholder="Optional assignment notes"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </Field>
            </div>
          </div>

          <div className="sticky bottom-0 flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
            <button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50">
              {saving
                ? isReleaseRequest
                  ? "Approving..."
                  : isChangeRequest
                    ? "Changing..."
                    : "Assigning..."
                : isReleaseRequest
                  ? "Approve Release"
                  : isChangeRequest
                    ? "Approve & Change Bed"
                    : "Assign Bed"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function RequestBedOption({ bed, selected, disabled, onSelect }) {
  const label = bed.bedNumber || `#${bed.id}`;
  const occupied = normalize(bed.status) === "occupied";
  const available = normalize(bed.status) === "available" && bed.isActive !== false;
  const classes = selected
    ? "border-blue-400 bg-blue-50 text-blue-800 ring-2 ring-blue-200"
    : occupied
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : available
        ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
        : "border-slate-200 bg-slate-100 text-slate-600";
  const statusText = selected ? "Selected" : occupied ? "Occupied" : available ? "Available" : "Unavailable";
  const dotClass = selected ? "bg-blue-500" : occupied ? "bg-rose-500" : available ? "bg-emerald-500" : "bg-slate-400";

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`min-h-20 rounded-lg border px-3 py-2 text-left shadow-sm transition disabled:cursor-not-allowed disabled:opacity-75 ${classes}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Bed {label}</span>
        <span className={`size-2.5 rounded-full ${dotClass}`} />
      </div>
      <p className="mt-1 text-xs font-medium">{statusText}</p>
      <p className="mt-2 truncate text-xs opacity-80">{bedLocation(bed)}</p>
    </button>
  );
}

function RejectRequestDialog({ request, saving, notes, onNotes, onClose, onConfirm }) {
  return (
    <div className="hms-modal-overlay" role="dialog" aria-modal="true">
      <section className="hms-modal-panel max-w-xl">
        <DialogHeader title="Reject Bed Request" subtitle="Confirm that this request should not be assigned." onClose={onClose} />
        <div className="hms-modal-body">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <DetailGrid
              items={[
                ["Patient", request?.patientName || "-"],
                ["Encounter", request?.encounterNumber || request?.encounterId || "-"],
                ["Requested By", request?.requestedByDoctorName || "-"],
                ["Requested Date", formatDateTime(request?.requestedAt)],
              ]}
            />
          </div>
          <Field label="Reason">
            <textarea
              value={notes}
              onChange={(event) => onNotes(event.target.value)}
              disabled={saving}
              rows={3}
              placeholder="Optional rejection reason"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </Field>
          <div className="hms-modal-footer">
            <button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="button" onClick={onConfirm} disabled={saving} className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50">
              {saving ? "Rejecting..." : "Reject Request"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ReleaseDialog({ bed, assignment, saving, releaseNotes, onReleaseNotes, onClose, onConfirm }) {
  return (
    <div className="hms-modal-overlay" role="dialog" aria-modal="true">
      <section className="hms-modal-panel max-w-xl">
        <DialogHeader title="Release bed" subtitle="Confirm that this patient is leaving the bed." onClose={onClose} />
        <div className="hms-modal-body">
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
          <div className="hms-modal-footer">
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

function ViewDialog({
  bed,
  assignment,
  canRelease,
  canRequestBedChange,
  onRelease,
  onRequestBedChange,
  onClose,
}) {
  const meta = statusMeta(bed?.status);
  const activeAssignment = assignment && !assignment.releasedAt && normalize(bed?.status) === "occupied";
  return (
    <div className="hms-modal-overlay" role="dialog" aria-modal="true">
      <section className="hms-modal-panel max-w-4xl">
        <div className="hms-modal-header">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-950">Bed {bed?.bedNumber || "-"}</h2>
              <StatusBadge status={bed?.status} />
            </div>
            <p className="mt-1.5 text-sm text-slate-600">
              {[bed?.departmentName || bed?.ward, bed?.roomNumber ? `Room ${bed.roomNumber}` : null]
                .filter(Boolean)
                .join(" - ") || "Location unavailable"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="hms-modal-close" aria-label="Close">
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
                <InfoLine label="Assigned by" value={userDisplayName(assignment?.assignedByUserName, assignment?.assignedByUserId)} />
                <InfoLine label="Released date" value={formatDateTime(assignment?.releasedAt)} />
                <InfoLine label="Released by" value={userDisplayName(assignment?.releasedByUserName, assignment?.releasedByUserId)} />
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
            {activeAssignment && canRequestBedChange && (
              <>
                <button
                  type="button"
                  onClick={() => onRequestBedChange(bed, "change")}
                  className="h-10 rounded-lg border border-sky-200 bg-white px-4 text-sm font-medium text-sky-700 transition hover:bg-sky-50"
                >
                  Request bed change
                </button>
                <button
                  type="button"
                  onClick={() => onRequestBedChange(bed, "release")}
                  className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700"
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
    <div className="hms-modal-header">
      <div className="flex items-start gap-4">
        <div className="hms-modal-header-icon">
          <BedDouble className="size-6" aria-hidden />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
      </div>
      <button type="button" onClick={onClose} className="hms-modal-close" aria-label="Close">
        <X className="size-5" aria-hidden />
      </button>
    </div>
  );
}

function DialogActions({ onClose, saving, submitLabel, savingLabel, className = "hms-modal-footer" }) {
  return (
    <div className={className}>
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
    <div className="flex min-h-56 items-center justify-center text-sm text-slate-500">
      {label}
    </div>
  );
}

function EmptyState({ label, detail }) {
  return (
    <div className="flex min-h-56 items-center justify-center p-8 text-center">
      <div>
        <BedDouble className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
        <p className="mt-3 text-sm font-medium text-slate-900">{label}</p>
        <p className="mt-1 text-sm text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

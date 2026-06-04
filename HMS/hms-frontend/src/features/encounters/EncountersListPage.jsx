import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  ChevronDown,
  FileText,
  Pill,
  RefreshCw,
  Search,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import apiClient from "@/api/apiClient";
import { useAuth } from "@/auth/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusClass(status) {
  const key = String(status ?? "").toLowerCase();

  if (key === "open") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (key === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (key === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function optionalCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? count : null;
}

function encounterCount(encounter, camelName, pascalName) {
  return optionalCount(encounter[camelName] ?? encounter[pascalName]);
}

function countLabel(count, label) {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function EncounterCounts({ encounter }) {
  const diagnosesCount = encounterCount(
    encounter,
    "diagnosesCount",
    "DiagnosesCount"
  );
  const prescriptionsCount = encounterCount(
    encounter,
    "prescriptionsCount",
    "PrescriptionsCount"
  );

  if (diagnosesCount === null && prescriptionsCount === null) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {diagnosesCount !== null && (
        <Badge
          variant="outline"
          className="border-slate-200 bg-slate-50 text-slate-700"
        >
          <FileText className="h-3 w-3" aria-hidden />
          {countLabel(diagnosesCount, "diagnosis")}
        </Badge>
      )}
      {prescriptionsCount !== null && (
        <Badge
          variant="outline"
          className="border-slate-200 bg-slate-50 text-slate-700"
        >
          <Pill className="h-3 w-3" aria-hidden />
          {countLabel(prescriptionsCount, "prescription")}
        </Badge>
      )}
    </div>
  );
}

function groupByDoctor(encounters) {
  const groups = new Map();

  for (const encounter of encounters) {
    const doctorName = encounter.doctorName || "Unassigned doctor";
    const key = encounter.doctorProfileId
      ? `doctor-${encounter.doctorProfileId}`
      : `doctor-${doctorName}`;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        doctorName,
        encounters: [],
      });
    }

    groups.get(key).encounters.push(encounter);
  }

  return Array.from(groups.values()).sort((a, b) =>
    a.doctorName.localeCompare(b.doctorName)
  );
}

function filterEncounters(encounters, searchTerm, isAdmin) {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return encounters;

  return encounters.filter((encounter) => {
    const searchable = [
      encounter.patientName,
      isAdmin ? encounter.doctorName : null,
      encounter.encounterNumber,
      encounter.encounterType,
      encounter.status,
      formatDate(encounter.startedAt),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(term);
  });
}

function EncounterRow({ encounter, panelBasePath }) {
  return (
    <div className="grid min-h-20 gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_9rem_auto] md:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950">
          {encounter.encounterNumber}
        </p>
        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-slate-600">
          <UserRound className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <span className="truncate">{encounter.patientName}</span>
        </p>
      </div>

      <div className="min-w-0 text-sm text-slate-600">
        <p className="truncate">{encounter.encounterType || "Encounter"}</p>
        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{formatDate(encounter.startedAt)}</span>
        </p>
        <EncounterCounts encounter={encounter} />
      </div>

      <div>
        <Badge
          variant="outline"
          className={`border ${statusClass(encounter.status)}`}
        >
          {encounter.status}
        </Badge>
      </div>

      <div className="md:justify-self-end">
        <Button asChild size="sm" variant="outline">
          <Link to={`${panelBasePath}/${encounter.id}`}>Open Panel</Link>
        </Button>
      </div>
    </div>
  );
}

function DoctorEncounterList({ encounters, panelBasePath }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {encounters.map((encounter) => (
        <EncounterRow
          key={encounter.id}
          encounter={encounter}
          panelBasePath={panelBasePath}
        />
      ))}
    </div>
  );
}

function AdminDoctorGroup({ group, isOpen, onToggle, panelBasePath }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
        aria-expanded={isOpen}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-100 bg-sky-50 text-sky-700">
            <Stethoscope className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-950">
              {group.doctorName} Encounters
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              {group.encounters.length} total
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <Badge variant="secondary">{group.encounters.length}</Badge>
          <ChevronDown
            className={`h-4 w-4 text-slate-500 transition ${
              isOpen ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-slate-100">
          <div className="scrollbar-none max-h-100 overflow-y-auto">
            {group.encounters.map((encounter) => (
              <EncounterRow
                key={encounter.id}
                encounter={encounter}
                panelBasePath={panelBasePath}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function AdminGroupedEncounters({ groups, panelBasePath }) {
  const [openDoctorKeys, setOpenDoctorKeys] = useState(
    () => new Set(groups.length > 0 ? [groups[0].key] : [])
  );

  const toggleDoctor = (key) => {
    setOpenDoctorKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <AdminDoctorGroup
          key={group.key}
          group={group}
          isOpen={openDoctorKeys.has(group.key)}
          onToggle={() => toggleDoctor(group.key)}
          panelBasePath={panelBasePath}
        />
      ))}
    </div>
  );
}

export default function EncountersListPage() {
  const auth = useAuth();
  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const isAdmin = auth.userRole === "Admin";
  const panelBasePath = isAdmin ? "/admin/encounters" : "/doctor/encounters";

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiClient.get("/encounters", {
        params: isAdmin && searchTerm.trim() ? { search: searchTerm.trim() } : undefined,
      });
      setEncounters(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load encounters", err);
      setError(
        err?.response?.data?.error ||
          "Failed to load encounters. Please try again."
      );
      setEncounters([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, searchTerm]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  const filteredEncounters = useMemo(
    () => filterEncounters(encounters, searchTerm, isAdmin),
    [encounters, isAdmin, searchTerm]
  );
  const doctorGroups = useMemo(
    () => groupByDoctor(filteredEncounters),
    [filteredEncounters]
  );
  const searchPlaceholder = isAdmin
    ? "Search doctor, patient, encounter"
    : "Search patient or encounter";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Clinical
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setRefreshing(true);
            void load();
          }}
          disabled={loading || refreshing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            aria-hidden
          />
          Refresh
        </button>
      </div>

      {error && (
        <div
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
          role="alert"
        >
          {error}
        </div>
      )}

      {!loading && encounters.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Search
              </span>
              <span className="relative mt-1.5 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </span>
            </label>

            <Button
              type="button"
              variant="outline"
              disabled={!searchTerm}
              onClick={() => setSearchTerm("")}
              className="h-10"
            >
              <X className="h-4 w-4" aria-hidden />
              Clear
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Showing {filteredEncounters.length} of {encounters.length} encounters
          </p>
        </section>
      )}

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500 shadow-sm">
          Loading encounters...
        </div>
      ) : encounters.length === 0 ? (
        <div className="flex min-h-72 items-center justify-center rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div>
            <Stethoscope className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
            <p className="mt-3 text-sm font-medium text-slate-900">
              No encounters found
            </p>
          </div>
        </div>
      ) : filteredEncounters.length === 0 ? (
        <div className="flex min-h-72 items-center justify-center rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div>
            <Search className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
            <p className="mt-3 text-sm font-medium text-slate-900">
              No matching encounters
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try a different {isAdmin ? "doctor or patient" : "patient"} name.
            </p>
          </div>
        </div>
      ) : isAdmin ? (
        <AdminGroupedEncounters
          key={doctorGroups.map((group) => group.key).join("|")}
          groups={doctorGroups}
          panelBasePath={panelBasePath}
        />
      ) : (
        <DoctorEncounterList
          encounters={filteredEncounters}
          panelBasePath={panelBasePath}
        />
      )}
    </div>
  );
}

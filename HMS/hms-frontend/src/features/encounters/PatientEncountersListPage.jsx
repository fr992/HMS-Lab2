import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CalendarClock,
  ChevronRight,
  FileText,
  Pill,
  RefreshCw,
  Stethoscope,
} from "lucide-react";
import { encountersApi } from "./api/encountersApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  if (key === "open") return "border-sky-200 bg-sky-50 text-sky-700";
  if (key === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (key === "cancelled") return "border-rose-200 bg-rose-50 text-rose-700";

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function countValue(...values) {
  const value = values.find((candidate) => candidate !== undefined);
  const count = Number(value);
  return Number.isFinite(count) ? count : null;
}

function CountTile({ label, value, icon }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500">
        {icon}
      </span>
      <span>
        <span className="block text-lg font-semibold leading-none text-slate-950">
          {value ?? "-"}
        </span>
        <span className="mt-1 block text-xs font-medium text-slate-500">
          {label}
        </span>
      </span>
    </div>
  );
}

function PatientEncounterCard({ encounter }) {
  const diagnosesCount = countValue(
    encounter.diagnosesCount,
    encounter.DiagnosesCount
  );
  const prescriptionsCount = countValue(
    encounter.prescriptionsCount,
    encounter.PrescriptionsCount
  );

  return (
    <Card className="border border-slate-200 bg-white shadow-sm">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-100 bg-sky-50 text-sky-700">
              <Stethoscope className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <CardTitle className="truncate text-base font-semibold text-slate-950">
                {encounter.encounterNumber}
              </CardTitle>
              <p className="mt-1 truncate text-sm text-slate-600">
                Doctor: {encounter.doctorName || "Unknown"}
              </p>
            </div>
          </div>
        </div>

        <Badge
          variant="outline"
          className={`w-fit border ${statusClass(encounter.status)}`}
        >
          {encounter.status || "Unknown"}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Type
            </p>
            <p className="mt-1 font-medium text-slate-900">
              {encounter.encounterType || "Encounter"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Started
            </p>
            <p className="mt-1 flex items-center gap-1.5 font-medium text-slate-900">
              <CalendarClock className="h-4 w-4 text-slate-400" aria-hidden />
              {formatDate(encounter.startedAt)}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <CountTile
            label="Diagnoses"
            value={diagnosesCount}
            icon={<FileText className="h-4 w-4" aria-hidden />}
          />
          <CountTile
            label="Prescriptions"
            value={prescriptionsCount}
            icon={<Pill className="h-4 w-4" aria-hidden />}
          />
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <Button asChild>
            <Link to={`/patient/encounters/${encounter.id}/diagnoses`}>
              View Diagnoses
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PatientEncountersListPage() {
  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const response = await encountersApi.getPatientEncounters();
        if (!cancelled) {
          setEncounters(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err) {
        console.error("Failed to load patient encounters", err);
        if (!cancelled) {
          setEncounters([]);
          setError(
            err?.response?.data?.error ||
              "Failed to load your encounters. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Patient portal
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            My Encounters
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            Review your visit history, diagnoses, and prescriptions recorded by
            your care team.
          </p>
        </div>
      </div>

      {error && (
        <div
          className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[18rem] items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500 shadow-sm">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          Loading encounters...
        </div>
      ) : encounters.length === 0 ? (
        <div className="flex min-h-[18rem] items-center justify-center rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div>
            <Stethoscope
              className="mx-auto h-9 w-9 text-slate-300"
              aria-hidden
            />
            <p className="mt-3 text-sm font-medium text-slate-900">
              No encounters yet
            </p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Your completed and active visits will appear here after they are
              recorded by the hospital team.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {encounters.map((encounter) => (
            <PatientEncounterCard key={encounter.id} encounter={encounter} />
          ))}
        </div>
      )}
    </div>
  );
}

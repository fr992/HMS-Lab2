import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  History,
  Hospital,
  MoreHorizontal,
  Pencil,
  PlayCircle,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import {
  createEncounterFromAppointment,
  fetchAppointmentById,
  fetchEncounterByAppointment,
  getApiErrorMessage,
  patchAppointmentStatus,
} from "@/features/appointments/api/appointmentsApi";
import AppointmentCancelModal from "@/features/appointments/components/AppointmentCancelModal";
import AppointmentStatusBadge from "@/features/appointments/components/AppointmentStatusBadge";
import { APPOINTMENT_STATUS } from "@/features/appointments/appointmentConstants";
import { fetchPatientById } from "@/features/patients/patientsApi";
import { useDoctorOptionsStore } from "@/features/patients/doctorOptionsStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const detailIconClass = "h-4 w-4 text-sky-700";

function voidStr(value) {
  if (value == null || value === "") return "-";
  return String(value);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeRange(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";
  return `${start.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function getInitials(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "PT";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getAge(dateOfBirth) {
  if (!dateOfBirth) return "-";
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return "-";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? `${age}` : "-";
}

function DetailRow({ icon, label, children }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sky-700 shadow-sm ring-1 ring-slate-200/80">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <div className="mt-0.5 text-sm font-medium text-slate-900">{children}</div>
      </div>
    </div>
  );
}

function SummaryLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="min-w-0 text-right text-sm font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}

function TimelineItem({ label, value, state }) {
  const done = state === "done";
  return (
    <div className="relative flex gap-3 pb-4 last:pb-0">
      <span
        className={[
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-4 ring-white",
          done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400",
        ].join(" ")}
      >
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">{value}</p>
      </div>
    </div>
  );
}

function PrintField({ label, value }) {
  return (
    <div className="appointment-print-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default function AppointmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const canEdit = auth.hasPermission("Appointments.Create");
  const canManageStatus = auth.hasPermission("Appointments.ManageStatus");
  const canReadEncounters = auth.hasPermission("Encounters.Read");
  const canCreateEncounters = auth.hasPermission("Encounters.Create");
  const encounterBasePath =
    auth.userRole === "Doctor" ? "/doctor/encounters" : "/admin/encounters";

  const loadDoctors = useDoctorOptionsStore((state) => state.load);
  const doctors = useDoctorOptionsStore((state) => state.items);

  const [row, setRow] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [patientError, setPatientError] = useState(null);
  const [linkedEncounter, setLinkedEncounter] = useState(null);
  const [encounterLoading, setEncounterLoading] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [startingEncounter, setStartingEncounter] = useState(false);
  const [mutatingAction, setMutatingAction] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [actionError, setActionError] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    void loadDoctors();
  }, [loadDoctors]);

  const loadAppointment = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAppointmentById(Number(id));
      setRow(data);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadAppointment();
  }, [loadAppointment]);

  useEffect(() => {
    let cancelled = false;
    if (!row?.patientProfileId) {
      setPatient(null);
      return;
    }
    (async () => {
      setPatientError(null);
      try {
        const data = await fetchPatientById(Number(row.patientProfileId));
        if (!cancelled) setPatient(data);
      } catch (e) {
        if (!cancelled) setPatientError(getApiErrorMessage(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [row?.patientProfileId]);

  useEffect(() => {
    let cancelled = false;
    if (!row || !canReadEncounters) {
      setLinkedEncounter(null);
      setEncounterLoading(false);
      return;
    }

    (async () => {
      setEncounterLoading(true);
      try {
        const encounter = await fetchEncounterByAppointment(row);
        if (!cancelled) setLinkedEncounter(encounter);
      } catch {
        if (!cancelled) setLinkedEncounter(null);
      } finally {
        if (!cancelled) setEncounterLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [row, canReadEncounters]);

  useEffect(() => {
    if (!actionsOpen) return undefined;
    const close = (event) => {
      if (!menuRef.current?.contains(event.target)) setActionsOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [actionsOpen]);

  const doctor = useMemo(
    () => doctors.find((item) => Number(item.id) === Number(row?.doctorProfileId)),
    [doctors, row?.doctorProfileId]
  );

  const editable =
    row &&
    !row.isOnlineRequest &&
    (row.status === APPOINTMENT_STATUS.SCHEDULED ||
      row.status === APPOINTMENT_STATUS.CONFIRMED);
  const canStartEncounter =
    canReadEncounters &&
    canCreateEncounters &&
    row &&
    (!row.isOnlineRequest || row.status === APPOINTMENT_STATUS.CHECKED_IN);
  const canUseEncounterButton = linkedEncounter?.id
    ? canReadEncounters
    : canStartEncounter;
  const encounterButtonLabel = linkedEncounter?.id
    ? row.status === APPOINTMENT_STATUS.COMPLETED
      ? "View Encounter"
      : "Continue Encounter"
    : "Start Encounter";

  const handleStartEncounter = async () => {
    if (!row || startingEncounter || !canUseEncounterButton) return;
    setStartingEncounter(true);
    setActionError(null);
    setActionsOpen(false);
    try {
      const encounter = linkedEncounter?.id
        ? linkedEncounter
        : await createEncounterFromAppointment(row);
      navigate(`${encounterBasePath}/${encounter.id}`);
    } catch (e) {
      setActionError(getApiErrorMessage(e));
    } finally {
      setStartingEncounter(false);
    }
  };

  const updateStatus = async (status) => {
    if (!row || mutatingAction) return;
    setMutatingAction(true);
    setActionError(null);
    setActionsOpen(false);
    try {
      const updated = await patchAppointmentStatus(row.id, { status });
      setRow(updated);
    } catch (e) {
      setActionError(getApiErrorMessage(e));
    } finally {
      setMutatingAction(false);
    }
  };

  const submitCancel = async (reason) => {
    if (!row || mutatingAction) return;
    setMutatingAction(true);
    setCancelError("");
    setActionError(null);
    try {
      const updated = await patchAppointmentStatus(row.id, {
        status: APPOINTMENT_STATUS.CANCELLED,
        cancellationReason: reason,
      });
      setRow(updated);
      setCancelOpen(false);
    } catch (e) {
      setCancelError(getApiErrorMessage(e));
    } finally {
      setMutatingAction(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-600">Loading appointment...</p>;
  }

  if (error || !row) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
        {error ?? "Appointment not found."}
      </div>
    );
  }

  const patientNumber = patient?.patientNumber
    ? `#${patient.patientNumber}`
    : `Profile #${row.patientProfileId}`;
  const confirmed =
    row.status === APPOINTMENT_STATUS.CONFIRMED ||
    row.status === APPOINTMENT_STATUS.COMPLETED;
  const encounterStarted = Boolean(linkedEncounter?.id) || row.status === APPOINTMENT_STATUS.COMPLETED;
  const canCancel =
    canManageStatus &&
    row.status !== APPOINTMENT_STATUS.CANCELLED &&
    row.status !== APPOINTMENT_STATUS.COMPLETED;
  const canConfirm =
    canManageStatus && !row.isOnlineRequest && row.status === APPOINTMENT_STATUS.SCHEDULED;
  const canCheckIn =
    canManageStatus && row.isOnlineRequest && row.status === APPOINTMENT_STATUS.CONFIRMED;
  const canMarkNoShow =
    canManageStatus &&
    !row.isOnlineRequest &&
    (row.status === APPOINTMENT_STATUS.SCHEDULED ||
      row.status === APPOINTMENT_STATUS.CONFIRMED);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <nav className="flex items-center gap-2 text-sm text-slate-500">
            <Link to="/appointments" className="font-medium text-sky-800 hover:underline">
              Appointments
            </Link>
            <span>/</span>
            <span className="truncate text-slate-600">Appointment #{row.id}</span>
          </nav>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              Appointment #{row.id}
            </h1>
            <AppointmentStatusBadge status={row.status} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Appointment details and schedule
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && editable && (
            <Button asChild className="h-9 bg-sky-600 px-3 text-white hover:bg-sky-700">
              <Link to={`/appointments/${row.id}/edit`}>
                <Pencil className="h-4 w-4" aria-hidden />
                Edit Schedule
              </Link>
            </Button>
          )}
          {(canUseEncounterButton || encounterLoading) && (
            <Button
              type="button"
              className="h-9 bg-teal-600 px-3 text-white hover:bg-teal-700"
              disabled={!canUseEncounterButton || startingEncounter || encounterLoading}
              onClick={handleStartEncounter}
            >
              <PlayCircle className="h-4 w-4" aria-hidden />
              {startingEncounter
                ? linkedEncounter?.id
                  ? "Opening..."
                  : "Starting..."
                : encounterLoading
                  ? "Checking..."
                  : encounterButtonLabel}
            </Button>
          )}
          <div className="relative" ref={menuRef}>
            <Button
              type="button"
              variant="outline"
              className="h-9 px-3"
              aria-haspopup="menu"
              aria-expanded={actionsOpen}
              onClick={() => setActionsOpen((open) => !open)}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
              More actions
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </Button>
            {actionsOpen && (
              <div
                className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl"
                role="menu"
              >
                {canConfirm && (
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={mutatingAction}
                    onClick={() => updateStatus(APPOINTMENT_STATUS.CONFIRMED)}
                    role="menuitem"
                  >
                    Confirm appointment
                  </button>
                )}
                {canCheckIn && (
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={mutatingAction}
                    onClick={() => updateStatus(APPOINTMENT_STATUS.CHECKED_IN)}
                    role="menuitem"
                  >
                    Check in patient
                  </button>
                )}
                {canCancel && (
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={mutatingAction}
                    onClick={() => {
                      setActionsOpen(false);
                      setCancelError("");
                      setCancelOpen(true);
                    }}
                    role="menuitem"
                  >
                    Cancel appointment
                  </button>
                )}
                {canMarkNoShow && (
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={mutatingAction}
                    onClick={() => updateStatus(APPOINTMENT_STATUS.NO_SHOW)}
                    role="menuitem"
                  >
                    Mark as no-show
                  </button>
                )}
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                  onClick={() => {
                    setActionsOpen(false);
                    window.setTimeout(() => window.print(), 0);
                  }}
                  role="menuitem"
                >
                  Print details
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {(actionError || patientError) && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="alert"
        >
          {actionError || `Patient summary could not load: ${patientError}`}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(18rem,3fr)]">
        <Card className="rounded-xl bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-base text-slate-950">
              <CalendarDays className="h-4 w-4 text-sky-700" aria-hidden />
              Appointment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <DetailRow icon={<UserRound className={detailIconClass} />} label="Patient">
                <Link
                  className="text-sky-800 hover:underline"
                  to={`/patients/${row.patientProfileId}`}
                >
                  {voidStr(row.patientName)}
                </Link>
              </DetailRow>
              <DetailRow icon={<Stethoscope className={detailIconClass} />} label="Doctor">
                {voidStr(row.doctorName)}
              </DetailRow>
              <DetailRow icon={<Hospital className={detailIconClass} />} label="Department">
                {voidStr(row.departmentName)}
              </DetailRow>
              <DetailRow icon={<FileText className={detailIconClass} />} label="Appointment Type">
                {voidStr(row.appointmentType)}
              </DetailRow>
              <DetailRow icon={<CalendarDays className={detailIconClass} />} label="Date">
                {formatDate(row.scheduledStart)}
              </DetailRow>
              <DetailRow icon={<Clock3 className={detailIconClass} />} label="Time">
                {formatTimeRange(row.scheduledStart, row.scheduledEnd)}
              </DetailRow>
              <div className="md:col-span-2">
                <DetailRow icon={<FileText className={detailIconClass} />} label="Reason">
                  <p className="leading-relaxed text-slate-800">{voidStr(row.reason)}</p>
                </DetailRow>
              </div>
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card className="rounded-xl bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base text-slate-950">Patient Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sm font-bold text-sky-800 ring-1 ring-sky-200">
                  {getInitials(row.patientName)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {voidStr(row.patientName)}
                  </p>
                  <p className="text-xs text-slate-500">{patientNumber}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <SummaryLine label="Age" value={getAge(patient?.dateOfBirth)} />
                <SummaryLine label="Blood type" value={voidStr(patient?.bloodType)} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base text-slate-950">Doctor Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <SummaryLine label="Doctor" value={voidStr(row.doctorName)} />
              <SummaryLine
                label="Specialization"
                value={voidStr(doctor?.specializationName)}
              />
            </CardContent>
          </Card>

          <Card className="rounded-xl bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-base text-slate-950">
                <History className="h-4 w-4 text-sky-700" aria-hidden />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TimelineItem label="Created" value="Appointment record created" state="done" />
              <TimelineItem
                label="Confirmed"
                value={confirmed ? "Appointment confirmed" : "Awaiting confirmation"}
                state={confirmed ? "done" : "pending"}
              />
              <TimelineItem
                label="Encounter Started"
                value={encounterStarted ? "Encounter is available" : "Not started"}
                state={encounterStarted ? "done" : "pending"}
              />
            </CardContent>
          </Card>
        </aside>
      </div>

      <AppointmentCancelModal
        open={cancelOpen}
        onClose={() => !mutatingAction && setCancelOpen(false)}
        onSubmit={submitCancel}
        submitting={mutatingAction}
        error={cancelError}
      />

      <section className="appointment-print-document" aria-hidden="true">
        <header className="appointment-print-header">
          <div>
            <p>Nexora Hospital Management</p>
            <h1>Appointment #{row.id}</h1>
            <span>{voidStr(row.status)}</span>
          </div>
          <div>
            <p>Printed</p>
            <strong>{new Date().toLocaleDateString()}</strong>
          </div>
        </header>

        <div className="appointment-print-section">
          <h2>Appointment Details</h2>
          <dl>
            <PrintField label="Patient" value={voidStr(row.patientName)} />
            <PrintField label="Patient ID" value={patientNumber} />
            <PrintField label="Doctor" value={voidStr(row.doctorName)} />
            <PrintField label="Department" value={voidStr(row.departmentName)} />
            <PrintField label="Appointment Type" value={voidStr(row.appointmentType)} />
            <PrintField label="Date" value={formatDate(row.scheduledStart)} />
            <PrintField label="Time" value={formatTimeRange(row.scheduledStart, row.scheduledEnd)} />
            <PrintField label="Reason" value={voidStr(row.reason)} />
          </dl>
        </div>

        <div className="appointment-print-grid">
          <div className="appointment-print-section">
            <h2>Patient Summary</h2>
            <dl>
              <PrintField label="Age" value={getAge(patient?.dateOfBirth)} />
              <PrintField label="Blood Type" value={voidStr(patient?.bloodType)} />
            </dl>
          </div>
          <div className="appointment-print-section">
            <h2>Doctor Summary</h2>
            <dl>
              <PrintField label="Doctor" value={voidStr(row.doctorName)} />
              <PrintField label="Specialization" value={voidStr(doctor?.specializationName)} />
            </dl>
          </div>
        </div>

        <div className="appointment-print-section">
          <h2>Timeline</h2>
          <dl>
            <PrintField label="Created" value="Appointment record created" />
            <PrintField
              label="Confirmed"
              value={confirmed ? "Appointment confirmed" : "Awaiting confirmation"}
            />
            <PrintField
              label="Encounter Started"
              value={encounterStarted ? "Encounter is available" : "Not started"}
            />
          </dl>
        </div>
      </section>
    </div>
  );
}

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clock3,
  FileText,
  Search,
  Stethoscope,
  UserRound,
  UsersRound,
} from "lucide-react";
import { fetchPatients, getApiErrorMessage } from "@/features/patients/patientsApi";
import { useDoctorOptionsStore } from "@/features/patients/doctorOptionsStore";
import {
  fetchAppointments,
  fetchDepartmentsList,
} from "@/features/appointments/api/appointmentsApi";
import {
  hasTimeOverlap,
  isActiveForConflict,
} from "@/features/appointments/appointmentScheduling";

const labelCls = "text-xs font-semibold uppercase tracking-wide text-slate-500";
const inputCls =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50";
const textareaCls =
  "min-h-20 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50";
const APPOINTMENT_TYPES = [
  "Consultation",
  "Follow-up",
  "Routine",
  "Emergency",
  "Checkup",
  "Other",
];
const DURATION_OPTIONS = [
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
  { label: "Custom", value: "custom" },
];
const MONTH_SHORT_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function FieldErr({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs font-medium text-rose-600" role="alert">
      {message}
    </p>
  );
}

function Section({ icon, title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-sky-100">
          {icon}
        </span>
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function optionText(option) {
  return [option?.label, option?.meta, option?.subtext].filter(Boolean).join(" ");
}

function SearchableSelect({
  id,
  label,
  placeholder,
  value,
  options,
  disabled,
  loading,
  error,
  onChange,
  fieldError,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const selected = options.find((option) => String(option.value) === String(value));
  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => optionText(option).toLowerCase().includes(term));
  }, [options, query]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <label className={labelCls} htmlFor={id}>
        {label}
      </label>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((next) => !next);
          setQuery("");
        }}
        className={[
          "mt-1.5 flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-left text-sm shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50",
          fieldError ? "border-rose-400" : "border-slate-200",
        ].join(" ")}
      >
        <span className="min-w-0">
          {selected ? (
            <>
              <span className="block truncate font-medium text-slate-900">
                {selected.label}
              </span>
              {(selected.meta || selected.subtext) && (
                <span className="block truncate text-xs text-slate-500">
                  {[selected.meta, selected.subtext].filter(Boolean).join(" - ")}
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-400">
              {loading ? "Loading..." : placeholder}
            </span>
          )}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </button>
      {open && !disabled && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="relative border-b border-slate-100">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="h-10 w-full border-0 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500">
                No matches found.
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = String(option.value) === String(value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(String(option.value));
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-sky-50"
                  >
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        isSelected ? "text-sky-700" : "text-transparent"
                      }`}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-900">
                        {option.label}
                      </span>
                      {(option.meta || option.subtext) && (
                        <span className="block truncate text-xs text-slate-500">
                          {[option.meta, option.subtext].filter(Boolean).join(" - ")}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
      <FieldErr id={`${id}-err`} message={fieldError} />
      {error && (
        <p className="mt-1.5 text-xs font-medium text-amber-800" role="status">
          {error}
        </p>
      )}
    </div>
  );
}

function toDateTimeLocal(date, time) {
  if (!date || !time) return "";
  return `${date}T${time}`;
}

function addMinutesToTime(date, time, minutes) {
  const start = new Date(toDateTimeLocal(date, time));
  if (Number.isNaN(start.getTime()) || !Number.isFinite(minutes)) return "";
  start.setMinutes(start.getMinutes() + minutes);
  return start.toTimeString().slice(0, 5);
}

function minutesBetween(date, startTime, endTime) {
  const start = new Date(toDateTimeLocal(date, startTime));
  const end = new Date(toDateTimeLocal(date, endTime));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

function formatDate(date) {
  if (!date) return "Not selected";
  const parsed = new Date(`${date}T00:00`);
  if (Number.isNaN(parsed.getTime())) return "Not selected";
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function dateInputValue(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseDateInput(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfMonth(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(1);
  return next;
}

function addMonths(date, amount) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return startOfMonth(next);
}

function addYears(date, amount) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + amount);
  return startOfMonth(next);
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function DatePickerField({ id, label, value, disabled, fieldError, onChange }) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(parseDateInput(value) || new Date())
  );
  const rootRef = useRef(null);
  const selectedDate = parseDateInput(value);
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  useEffect(() => {
    const parsed = parseDateInput(value);
    if (parsed) setViewMonth(startOfMonth(parsed));
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const monthLabel = viewMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const monthStart = startOfMonth(viewMonth);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });

  const selectDate = (date) => {
    onChange(dateInputValue(date));
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <label className={labelCls} htmlFor={id}>
        {label}
      </label>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((next) => !next)}
        className={[
          "mt-1.5 flex h-10 w-full items-center justify-between gap-3 rounded-lg border bg-white px-3 text-left text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50",
          fieldError ? "border-rose-400" : "border-slate-200",
        ].join(" ")}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className={value ? "font-medium" : "text-slate-400"}>
          {value ? formatDate(value) : "Select appointment date"}
        </span>
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </button>

      {open && !disabled && (
        <div
          className="absolute left-0 z-40 mt-2 w-[min(19.5rem,calc(100vw-3rem))] overflow-hidden rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xl ring-1 ring-slate-950/5"
          role="dialog"
          aria-label="Choose appointment date"
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setViewMonth((current) => addMonths(current, -1))}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <div className="text-sm font-semibold text-slate-950">{monthLabel}</div>
            <button
              type="button"
              onClick={() => setViewMonth((current) => addMonths(current, 1))}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setViewMonth((current) => addYears(current, -1))}
              className="inline-flex h-7 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-white hover:text-slate-950 hover:shadow-sm"
            >
              -1 year
            </button>
            <select
              value={viewMonth.getFullYear()}
              onChange={(event) => {
                const next = new Date(viewMonth);
                next.setFullYear(Number(event.target.value));
                setViewMonth(startOfMonth(next));
              }}
              className="h-7 rounded-md border border-slate-200 bg-white px-2 text-center text-xs font-semibold text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              aria-label="Select year"
            >
              {Array.from({ length: 21 }, (_, index) => today.getFullYear() - 10 + index).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setViewMonth((current) => addYears(current, 1))}
              className="inline-flex h-7 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-white hover:text-slate-950 hover:shadow-sm"
            >
              +1 year
            </button>
          </div>

          <div className="mt-1.5 grid grid-cols-6 gap-1">
            {MONTH_SHORT_LABELS.map((month, index) => {
              const active = index === viewMonth.getMonth();
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => {
                    const next = new Date(viewMonth);
                    next.setMonth(index);
                    setViewMonth(startOfMonth(next));
                  }}
                  className={[
                    "h-6 rounded-md text-[11px] font-semibold transition",
                    active
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-950",
                  ].join(" ")}
                >
                  {month}
                </button>
              );
            })}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="py-0.5">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const selected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, today);
              const isMuted = day.getMonth() !== viewMonth.getMonth();

              return (
                <button
                  key={dateInputValue(day)}
                  type="button"
                  onClick={() => selectDate(day)}
                  className={[
                    "flex h-8 items-center justify-center rounded-md text-sm font-semibold transition",
                    selected
                      ? "bg-sky-600 text-white shadow-sm hover:bg-sky-700"
                      : isToday
                        ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200 hover:bg-sky-100"
                        : "text-slate-700 hover:bg-slate-100",
                    isMuted && !selected
                      ? "!font-medium !text-slate-300 hover:!text-slate-400 hover:bg-slate-50"
                      : "",
                  ].join(" ")}
                  aria-pressed={Boolean(selected)}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2.5">
            <button
              type="button"
              onClick={() => onChange("")}
              className="h-7 rounded-lg px-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMonth(startOfMonth(today));
                selectDate(today);
              }}
              className="h-7 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Today
            </button>
          </div>
        </div>
      )}

      <FieldErr id={`${id}-err`} message={fieldError} />
    </div>
  );
}

function buildPayload(form) {
  const start = new Date(toDateTimeLocal(form.date, form.startTime));
  const end = new Date(toDateTimeLocal(form.date, form.endTime));
  const dept = form.departmentId.trim();
  return {
    patientProfileId: Number.parseInt(form.patientProfileId, 10),
    doctorProfileId: Number.parseInt(form.doctorProfileId, 10),
    departmentId: dept === "" ? null : Number.parseInt(dept, 10),
    scheduledStart: start.toISOString(),
    scheduledEnd: end.toISOString(),
    appointmentType:
      form.appointmentType.trim() === "" ? null : form.appointmentType.trim(),
    reason: form.reason.trim() === "" ? null : form.reason.trim(),
  };
}

function getSlotCheckInput(form) {
  const doctorId = Number.parseInt(form.doctorProfileId, 10);
  if (!Number.isFinite(doctorId) || !form.date || !form.startTime || !form.endTime) {
    return null;
  }
  const start = new Date(toDateTimeLocal(form.date, form.startTime));
  const end = new Date(toDateTimeLocal(form.date, form.endTime));
  if (!(end > start)) return null;
  return { doctorId, start, end };
}

function buildInitialForm(initialSlot) {
  const date =
    typeof initialSlot?.date === "string" && initialSlot.date
      ? initialSlot.date
      : "";
  const startTime =
    typeof initialSlot?.startTime === "string" && initialSlot.startTime
      ? initialSlot.startTime
      : "";
  const minutes = Number(initialSlot?.durationMinutes) || 30;
  const endTime = date && startTime ? addMinutesToTime(date, startTime, minutes) : "";

  return {
    patientProfileId: "",
    doctorProfileId: "",
    departmentId: "",
    date,
    startTime,
    durationMode: DURATION_OPTIONS.some((option) => option.value === minutes)
      ? minutes
      : "custom",
    customMinutes: "",
    endTime,
    appointmentType: "",
    reason: "",
  };
}

function getPagedItems(response) {
  return Array.isArray(response) ? response : response?.items ?? [];
}

export default function AppointmentForm({
  submitting,
  serverError,
  initialSlot,
  onCancel,
  onSubmit,
}) {
  const formId = useId();
  const [form, setForm] = useState(() => buildInitialForm(initialSlot));
  const [err, setErr] = useState({});
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [departmentsError, setDepartmentsError] = useState(null);
  const [slotError, setSlotError] = useState(null);
  const [checkingSlot, setCheckingSlot] = useState(false);

  const loadDoctors = useDoctorOptionsStore((s) => s.load);
  const doctorsStatus = useDoctorOptionsStore((s) => s.status);
  const doctorsError = useDoctorOptionsStore((s) => s.error);
  const doctors = useDoctorOptionsStore((s) => s.items);

  useEffect(() => {
    void loadDoctors();
  }, [loadDoctors]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPatientsLoading(true);
      setPatientsError(null);
      try {
        const response = await fetchPatients({ pageSize: 100 });
        if (!cancelled) setPatients(getPagedItems(response));
      } catch (e) {
        if (!cancelled) setPatientsError(getApiErrorMessage(e));
      } finally {
        if (!cancelled) setPatientsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDepartmentsLoading(true);
      setDepartmentsError(null);
      try {
        const list = await fetchDepartmentsList();
        if (!cancelled) setDepartments(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!cancelled) setDepartmentsError(getApiErrorMessage(e));
      } finally {
        if (!cancelled) setDepartmentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const slotInput = getSlotCheckInput(form);
    if (!slotInput) return;

    (async () => {
      setCheckingSlot(true);
      try {
        const list = await fetchAppointments(form.date);
        if (cancelled) return;
        const hasConflict = (Array.isArray(list) ? list : []).some((appointment) => {
          if (!isActiveForConflict(appointment.status)) return false;
          if (Number(appointment.doctorProfileId) !== slotInput.doctorId) return false;
          return hasTimeOverlap(
            slotInput.start,
            slotInput.end,
            new Date(appointment.scheduledStart),
            new Date(appointment.scheduledEnd)
          );
        });
        setSlotError(
          hasConflict
            ? "This doctor already has an appointment during that time."
            : null
        );
      } catch {
        setSlotError(null);
      } finally {
        if (!cancelled) setCheckingSlot(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [form]);

  const patientOptions = useMemo(
    () =>
      patients.map((patient) => ({
        value: patient.id,
        label:
          [patient.firstName, patient.lastName].filter(Boolean).join(" ").trim() ||
          `Patient #${patient.id}`,
        meta: patient.patientNumber ? `#${patient.patientNumber}` : `Profile #${patient.id}`,
      })),
    [patients]
  );

  const doctorOptions = useMemo(
    () =>
      doctors.map((doctor) => ({
        value: doctor.id,
        label: doctor.fullName,
        meta: doctor.specializationName,
        subtext: doctor.departmentName,
      })),
    [doctors]
  );

  const selectedPatient = patientOptions.find(
    (patient) => String(patient.value) === String(form.patientProfileId)
  );
  const selectedDoctor = doctorOptions.find(
    (doctor) => String(doctor.value) === String(form.doctorProfileId)
  );
  const selectedDepartment = departments.find(
    (department) => String(department.id) === String(form.departmentId)
  );

  const currentDuration = minutesBetween(form.date, form.startTime, form.endTime);
  const requiredMissing =
    !form.patientProfileId ||
    !form.doctorProfileId ||
    !form.date ||
    !form.startTime ||
    !form.endTime ||
    currentDuration == null ||
    currentDuration <= 0;
  const canSubmit = !submitting && !checkingSlot && !slotError && !requiredMissing;

  const setField = (name, value) => {
    setForm((previous) => {
      const next = { ...previous, [name]: value };
      if (name === "date" || name === "startTime") {
        if (next.durationMode !== "custom") {
          next.endTime = addMinutesToTime(
            next.date,
            next.startTime,
            Number(next.durationMode)
          );
        }
      }
      if (name === "durationMode") {
        if (value !== "custom") {
          next.customMinutes = "";
          next.endTime = addMinutesToTime(next.date, next.startTime, Number(value));
        }
      }
      if (name === "customMinutes") {
        const minutes = Number.parseInt(value, 10);
        if (Number.isFinite(minutes) && minutes > 0) {
          next.endTime = addMinutesToTime(next.date, next.startTime, minutes);
        }
      }
      return next;
    });
    setErr((previous) => ({ ...previous, [name]: undefined }));
    if (["doctorProfileId", "date", "startTime", "durationMode", "endTime"].includes(name)) {
      setSlotError(null);
    }
  };

  const validate = () => {
    const next = {};
    if (!form.patientProfileId) next.patientProfileId = "Select a patient.";
    if (!form.doctorProfileId) next.doctorProfileId = "Select a doctor.";
    if (!form.date) next.date = "Select a date.";
    if (!form.startTime) next.startTime = "Choose a start time.";
    if (!form.endTime) next.endTime = "Choose a valid duration.";
    if (form.durationMode === "custom" && !form.customMinutes && !form.endTime) {
      next.customMinutes = "Enter custom minutes or an end time.";
    }
    if (form.date && form.startTime && form.endTime) {
      const duration = minutesBetween(form.date, form.startTime, form.endTime);
      if (duration == null || duration <= 0) {
        next.endTime = "End time must be after the start time.";
      }
    }
    setErr(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate() || slotError) return;
    await onSubmit(buildPayload(form));
  };

  const doctorsBusy = doctorsStatus === "loading";

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit} noValidate>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {serverError && (
          <div
            className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900"
            role="alert"
          >
            {serverError}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-4">
            <Section icon={<UsersRound className="h-4 w-4" aria-hidden />} title="Participants">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <SearchableSelect
                    id={`${formId}-patient`}
                    label="Patient"
                    placeholder="Search by patient name or number"
                    value={form.patientProfileId}
                    options={patientOptions}
                    loading={patientsLoading}
                    disabled={submitting || patientsLoading}
                    error={patientsError}
                    fieldError={err.patientProfileId}
                    onChange={(value) => setField("patientProfileId", value)}
                  />
                </div>
                <SearchableSelect
                  id={`${formId}-doctor`}
                  label="Doctor"
                  placeholder="Search by doctor or specialty"
                  value={form.doctorProfileId}
                  options={doctorOptions}
                  loading={doctorsBusy}
                  disabled={submitting || doctorsBusy}
                  error={doctorsError}
                  fieldError={err.doctorProfileId}
                  onChange={(value) => setField("doctorProfileId", value)}
                />
                <div>
                  <label className={labelCls} htmlFor={`${formId}-department`}>
                    Department optional
                  </label>
                  <select
                    id={`${formId}-department`}
                    value={form.departmentId}
                    onChange={(event) => setField("departmentId", event.target.value)}
                    disabled={submitting || departmentsLoading}
                    className={`${inputCls} mt-1.5`}
                  >
                    <option value="">
                      {departmentsLoading ? "Loading departments..." : "No department"}
                    </option>
                    {departments.map((department) => (
                      <option key={department.id} value={String(department.id)}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                  {departmentsError && (
                    <p className="mt-1.5 text-xs font-medium text-amber-800" role="status">
                      {departmentsError}
                    </p>
                  )}
                </div>
              </div>
            </Section>

            <Section icon={<CalendarDays className="h-4 w-4" aria-hidden />} title="Schedule">
              <div className="grid gap-4 md:grid-cols-2">
                <DatePickerField
                  id={`${formId}-date`}
                  label="Date"
                  value={form.date}
                  disabled={submitting}
                  fieldError={err.date}
                  onChange={(value) => setField("date", value)}
                />
                <div>
                  <label className={labelCls} htmlFor={`${formId}-start-time`}>
                    Start time
                  </label>
                  <input
                    id={`${formId}-start-time`}
                    type="time"
                    value={form.startTime}
                    onChange={(event) => setField("startTime", event.target.value)}
                    disabled={submitting}
                    className={`${inputCls} mt-1.5 ${
                      err.startTime ? "border-rose-400" : ""
                    }`}
                  />
                  <FieldErr id={`${formId}-start-time-err`} message={err.startTime} />
                </div>

                <div className="md:col-span-2">
                  <span className={labelCls}>Duration</span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {DURATION_OPTIONS.map((option) => {
                      const selected = form.durationMode === option.value;
                      return (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => setField("durationMode", option.value)}
                          disabled={submitting}
                          className={[
                            "h-9 rounded-lg px-3 text-sm font-semibold transition",
                            selected
                              ? "bg-sky-600 text-white shadow-sm"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {form.durationMode === "custom" && (
                  <>
                    <div>
                      <label className={labelCls} htmlFor={`${formId}-custom-minutes`}>
                        Custom minutes
                      </label>
                      <input
                        id={`${formId}-custom-minutes`}
                        type="number"
                        min="1"
                        value={form.customMinutes}
                        onChange={(event) =>
                          setField("customMinutes", event.target.value)
                        }
                        disabled={submitting}
                        placeholder="e.g. 75"
                        className={`${inputCls} mt-1.5 ${
                          err.customMinutes ? "border-rose-400" : ""
                        }`}
                      />
                      <FieldErr
                        id={`${formId}-custom-minutes-err`}
                        message={err.customMinutes}
                      />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor={`${formId}-end-time`}>
                        End time
                      </label>
                      <input
                        id={`${formId}-end-time`}
                        type="time"
                        value={form.endTime}
                        onChange={(event) => setField("endTime", event.target.value)}
                        disabled={submitting}
                        className={`${inputCls} mt-1.5 ${
                          err.endTime ? "border-rose-400" : ""
                        }`}
                      />
                      <FieldErr id={`${formId}-end-time-err`} message={err.endTime} />
                    </div>
                  </>
                )}

                {form.durationMode !== "custom" && (
                  <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    End time:{" "}
                    <span className="font-semibold text-slate-900">
                      {form.endTime || "Select date and start time"}
                    </span>
                  </div>
                )}
              </div>
              {slotError && (
                <p className="mt-3 text-xs font-medium text-rose-600" role="alert">
                  {slotError}
                </p>
              )}
              {!slotError && checkingSlot && (
                <p className="mt-3 text-xs font-medium text-slate-500" role="status">
                  Checking doctor availability...
                </p>
              )}
            </Section>

            <Section icon={<FileText className="h-4 w-4" aria-hidden />} title="Details">
              <div className="space-y-4">
                <div>
                  <span className={labelCls}>Appointment type</span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {APPOINTMENT_TYPES.map((type) => {
                      const selected = form.appointmentType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setField("appointmentType", type)}
                          disabled={submitting}
                          className={[
                            "h-9 rounded-lg px-3 text-sm font-semibold transition",
                            selected
                              ? "bg-teal-600 text-white shadow-sm"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    value={form.appointmentType}
                    onChange={(event) => setField("appointmentType", event.target.value)}
                    disabled={submitting}
                    placeholder="Or type a custom appointment type"
                    className={`${inputCls} mt-3`}
                  />
                </div>

                <div>
                  <label className={labelCls} htmlFor={`${formId}-reason`}>
                    Reason / notes
                  </label>
                  <textarea
                    id={`${formId}-reason`}
                    rows={3}
                    value={form.reason}
                    onChange={(event) => setField("reason", event.target.value)}
                    disabled={submitting}
                    placeholder="Short booking note"
                    className={`${textareaCls} mt-1.5`}
                  />
                </div>
              </div>
            </Section>
          </div>

          <aside className="xl:sticky xl:top-0 xl:self-start">
            <div className="appointment-summary rounded-xl border border-sky-100 bg-gradient-to-b from-sky-50 to-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sky-700 shadow-sm ring-1 ring-sky-100">
                  <Clock3 className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">
                    Appointment summary
                  </h2>
                  <p className="text-xs text-slate-500">Status: Scheduled</p>
                </div>
              </div>

              <dl className="mt-4 space-y-3 text-sm">
                <PreviewItem
                  icon={<UserRound className="h-3.5 w-3.5" aria-hidden />}
                  label="Patient"
                  value={selectedPatient?.label || "Not selected"}
                  meta={selectedPatient?.meta}
                />
                <PreviewItem
                  icon={<Stethoscope className="h-3.5 w-3.5" aria-hidden />}
                  label="Doctor"
                  value={selectedDoctor?.label || "Not selected"}
                  meta={[selectedDoctor?.meta, selectedDoctor?.subtext]
                    .filter(Boolean)
                    .join(" - ")}
                />
                <PreviewText
                  label="Department"
                  value={selectedDepartment?.name || "No department"}
                />
                <PreviewText label="Date" value={formatDate(form.date)} />
                <PreviewText
                  label="Time"
                  value={
                    form.startTime && form.endTime
                      ? `${form.startTime} - ${form.endTime}`
                      : "Not selected"
                  }
                />
                <PreviewText
                  label="Duration"
                  value={currentDuration && currentDuration > 0 ? `${currentDuration} min` : "Not selected"}
                />
                <PreviewText
                  label="Type"
                  value={form.appointmentType || "Not selected"}
                />
              </dl>
            </div>
          </aside>
        </div>
      </div>

      <div className="sticky bottom-0 z-20 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white/95 px-5 py-4 shadow-[0_-10px_24px_rgba(15,23,42,0.06)] backdrop-blur sm:flex-row sm:justify-end sm:px-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create appointment"}
        </button>
      </div>
    </form>
  );
}

function PreviewItem({ icon, label, value, meta }) {
  return (
    <div className="appointment-summary-item rounded-lg border border-white/80 bg-white/80 p-3">
      <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 min-w-0 text-sm font-semibold text-slate-950">
        <span className="block truncate">{value}</span>
        {meta && <span className="block truncate text-xs font-medium text-slate-500">{meta}</span>}
      </dd>
    </div>
  );
}

function PreviewText({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 pb-2 last:border-b-0 last:pb-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-sm font-semibold text-slate-900">
        {value}
      </dd>
    </div>
  );
}

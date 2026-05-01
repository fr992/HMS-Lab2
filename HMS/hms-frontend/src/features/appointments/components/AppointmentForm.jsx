import { useEffect, useId, useState } from "react";
import { fetchPatients, getApiErrorMessage } from "@/features/patients/patientsApi";
import { useDoctorOptionsStore } from "@/features/patients/doctorOptionsStore";
import { NATIVE_SELECT_CHEVRON } from "@/features/patients/selectFieldStyles";
import {
  fetchAppointments,
  fetchDepartmentsList,
} from "@/features/appointments/api/appointmentsApi";
import {
  hasTimeOverlap,
  isActiveForConflict,
} from "@/features/appointments/appointmentScheduling";

const labelCls =
  "text-xs font-semibold uppercase tracking-wide text-slate-500";
const inputCore =
  "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50";
const selectFieldCore = inputCore.replace("px-3.5", "pl-3.5");
const fieldTop = "mt-1.5";
const inputField = (extra = "") => `${fieldTop} ${inputCore} ${extra}`.trim();
const errRing = (name, err) =>
  err[name] ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20" : "";
const selectCls = (name, err) =>
  `${fieldTop} ${selectFieldCore} ${errRing(
    name,
    err
  )} ${NATIVE_SELECT_CHEVRON}`.trim();

function FormSection({ icon, title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-600 shadow-sm">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
            {title}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
            {subtitle}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function FieldErr({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-rose-600" role="alert">
      {message}
    </p>
  );
}

function IconPerson() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0113.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5"
      />
    </svg>
  );
}

const initialForm = {
  patientProfileId: "",
  doctorProfileId: "",
  departmentId: "",
  scheduledStart: "",
  scheduledEnd: "",
  appointmentType: "",
  reason: "",
};

function buildPayload(form) {
  const dept = form.departmentId.trim();
  const start = new Date(form.scheduledStart);
  const end = new Date(form.scheduledEnd);
  return {
    patientProfileId: Number.parseInt(form.patientProfileId, 10),
    doctorProfileId: Number.parseInt(form.doctorProfileId, 10),
    departmentId: dept === "" ? null : Number.parseInt(dept, 10),
    scheduledStart: start.toISOString(),
    scheduledEnd: end.toISOString(),
    appointmentType:
      form.appointmentType.trim() === ""
        ? null
        : form.appointmentType.trim(),
    reason: form.reason.trim() === "" ? null : form.reason.trim(),
  };
}

function getSlotCheckInput(form) {
  const doctorId = Number.parseInt(form.doctorProfileId, 10);
  if (!Number.isFinite(doctorId) || !form.scheduledStart || !form.scheduledEnd) {
    return null;
  }

  const start = new Date(form.scheduledStart);
  const end = new Date(form.scheduledEnd);
  if (!(end > start)) {
    return null;
  }

  return { doctorId, start, end };
}

export default function AppointmentForm({ submitting, onCancel, onSubmit }) {
  const formId = useId();
  const [form, setForm] = useState(initialForm);
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
  const selectedDoctorProfileId = form.doctorProfileId;
  const selectedScheduledStart = form.scheduledStart;
  const selectedScheduledEnd = form.scheduledEnd;

  useEffect(() => {
    void loadDoctors();
  }, [loadDoctors]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPatientsLoading(true);
      setPatientsError(null);
      try {
        const list = await fetchPatients();
        if (!cancelled) setPatients(Array.isArray(list) ? list : []);
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
    const slotInput = getSlotCheckInput({
      doctorProfileId: selectedDoctorProfileId,
      scheduledStart: selectedScheduledStart,
      scheduledEnd: selectedScheduledEnd,
    });
    if (!slotInput) {
      return;
    }

    (async () => {
      setCheckingSlot(true);
      try {
        const day = selectedScheduledStart.slice(0, 10);
        const list = await fetchAppointments(day);
        if (cancelled) return;
        const hasConflict = (Array.isArray(list) ? list : []).some((a) => {
          if (!isActiveForConflict(a.status)) return false;
          if (a.doctorProfileId !== slotInput.doctorId) return false;
          return hasTimeOverlap(
            slotInput.start,
            slotInput.end,
            new Date(a.scheduledStart),
            new Date(a.scheduledEnd)
          );
        });
        setSlotError(
          hasConflict
            ? "Doctor already has an appointment in this time range."
            : null
        );
      } catch {
        // Keep server-side validation as final guard.
        setSlotError(null);
      } finally {
        if (!cancelled) setCheckingSlot(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDoctorProfileId, selectedScheduledEnd, selectedScheduledStart]);

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

  const setField = (name, value) => {
    const nextForm = { ...form, [name]: value };
    setForm(nextForm);
    setErr((e) => ({ ...e, [name]: undefined }));

    if (
      name === "doctorProfileId" ||
      name === "scheduledStart" ||
      name === "scheduledEnd"
    ) {
      setSlotError(null);
      if (!getSlotCheckInput(nextForm)) {
        setCheckingSlot(false);
      }
    }
  };

  const validate = () => {
    const next = {};
    if (!form.patientProfileId) next.patientProfileId = "Select a patient.";
    if (!form.doctorProfileId) next.doctorProfileId = "Select a doctor.";
    if (!form.scheduledStart) next.scheduledStart = "Start is required.";
    if (!form.scheduledEnd) next.scheduledEnd = "End is required.";
    if (form.scheduledStart && form.scheduledEnd) {
      const s = new Date(form.scheduledStart);
      const e = new Date(form.scheduledEnd);
      if (!(e > s)) next.scheduledEnd = "End must be after start.";
    }
    setErr(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || slotError) return;
    await onSubmit(buildPayload(form));
  };

  const doctorsBusy = doctorsStatus === "loading";

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <FormSection
        icon={<IconPerson />}
        title="Participants"
        subtitle="Patient profile, treating doctor, and optional department."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor={`${formId}-patient`}>
              Patient (patient profile id)
            </label>
            <select
              id={`${formId}-patient`}
              className={selectCls("patientProfileId", err)}
              value={form.patientProfileId}
              onChange={(e) => setField("patientProfileId", e.target.value)}
              disabled={submitting || patientsLoading}
            >
              <option value="">
                {patientsLoading ? "Loading patients..." : "Select patient"}
              </option>
              {patients.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.firstName} {p.lastName} - #{p.patientNumber}
                </option>
              ))}
            </select>
            <FieldErr id={`${formId}-patient-err`} message={err.patientProfileId} />
            {patientsError && (
              <p className="mt-1 text-xs text-amber-800" role="status">
                {patientsError}
              </p>
            )}
          </div>

          <div>
            <label className={labelCls} htmlFor={`${formId}-doctor`}>
              Doctor (doctor profile id)
            </label>
            <select
              id={`${formId}-doctor`}
              className={selectCls("doctorProfileId", err)}
              value={form.doctorProfileId}
              onChange={(e) => setField("doctorProfileId", e.target.value)}
              disabled={submitting || doctorsBusy}
            >
              <option value="">
                {doctorsBusy ? "Loading doctors..." : "Select doctor"}
              </option>
              {doctors.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {[
                    d.fullName,
                    d.specializationName ? `(${d.specializationName})` : null,
                    d.departmentName ? `- ${d.departmentName}` : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </option>
              ))}
            </select>
            <FieldErr id={`${formId}-doctor-err`} message={err.doctorProfileId} />
            {doctorsError && (
              <p className="mt-1 text-xs text-amber-800" role="status">
                {doctorsError}
              </p>
            )}
            {doctorsStatus === "ready" && doctors.length === 0 && (
              <p className="mt-1 text-xs text-amber-800" role="status">
                No active doctor users with the Doctor role were returned.
              </p>
            )}
          </div>

          <div>
            <label className={labelCls} htmlFor={`${formId}-dept`}>
              Department (optional)
            </label>
            <select
              id={`${formId}-dept`}
              className={selectCls("departmentId", err)}
              value={form.departmentId}
              onChange={(e) => setField("departmentId", e.target.value)}
              disabled={submitting || departmentsLoading}
            >
              <option value="">
                {departmentsLoading ? "Loading departments..." : "No department"}
              </option>
              {departments.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name}
                </option>
              ))}
            </select>
            <FieldErr id={`${formId}-dept-err`} message={err.departmentId} />
            {departmentsError && (
              <p className="mt-1 text-xs text-amber-800" role="status">
                {departmentsError}
              </p>
            )}
          </div>
        </div>
      </FormSection>

      <FormSection
        icon={<IconCalendar />}
        title="Schedule and details"
        subtitle="Appointment time, type, and booking notes."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor={`${formId}-start`}>
              Scheduled start
            </label>
            <input
              id={`${formId}-start`}
              type="datetime-local"
              className={inputField(errRing("scheduledStart", err))}
              value={form.scheduledStart}
              onChange={(e) => setField("scheduledStart", e.target.value)}
              disabled={submitting}
            />
            <FieldErr id={`${formId}-start-err`} message={err.scheduledStart} />
          </div>
          <div>
            <label className={labelCls} htmlFor={`${formId}-end`}>
              Scheduled end
            </label>
            <input
              id={`${formId}-end`}
              type="datetime-local"
              className={inputField(errRing("scheduledEnd", err))}
              value={form.scheduledEnd}
              onChange={(e) => setField("scheduledEnd", e.target.value)}
              disabled={submitting}
            />
            <FieldErr id={`${formId}-end-err`} message={err.scheduledEnd} />
            {slotError && (
              <p className="mt-1 text-xs text-rose-600" role="alert">
                {slotError}
              </p>
            )}
            {!slotError && checkingSlot && (
              <p className="mt-1 text-xs text-slate-500" role="status">
                Checking doctor availability...
              </p>
            )}
          </div>

          <div>
            <label className={labelCls} htmlFor={`${formId}-type`}>
              Appointment type (optional)
            </label>
            <input
              id={`${formId}-type`}
              type="text"
              className={inputField()}
              value={form.appointmentType}
              onChange={(e) => setField("appointmentType", e.target.value)}
              disabled={submitting}
              placeholder="e.g. Follow-up"
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor={`${formId}-reason`}>
              Reason (optional)
            </label>
            <textarea
              id={`${formId}-reason`}
              rows={3}
              className={inputField()}
              value={form.reason}
              onChange={(e) => setField("reason", e.target.value)}
              disabled={submitting}
              placeholder="Clinical or booking notes"
            />
          </div>
        </div>
      </FormSection>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || checkingSlot || !!slotError}
          className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create appointment"}
        </button>
      </div>
    </form>
  );
}

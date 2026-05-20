import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarClock, Clock3, FileText, Hospital, Stethoscope } from "lucide-react";
import {
  fetchAppointmentById,
  fetchAppointments,
  fetchDepartmentsList,
  getApiErrorMessage,
  updateAppointment,
} from "@/features/appointments/api/appointmentsApi";
import { useDoctorOptionsStore } from "@/features/patients/doctorOptionsStore";
import { APPOINTMENT_STATUS } from "@/features/appointments/appointmentConstants";
import {
  hasTimeOverlap,
  isActiveForConflict,
} from "@/features/appointments/appointmentScheduling";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const labelCls = "text-xs font-semibold uppercase tracking-wide text-slate-500";
const fieldCls =
  "mt-1.5 h-10 rounded-lg border-slate-200 bg-white text-sm shadow-sm focus-visible:ring-sky-500/20";
const selectCls =
  "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50";

function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datePart(value) {
  return value ? value.slice(0, 10) : "";
}

function timePart(value) {
  return value ? value.slice(11, 16) : "";
}

function combineDateTime(date, time) {
  if (!date || !time) return "";
  return `${date}T${time}`;
}

function FormField({ icon, label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-sky-100">
          {icon}
        </span>
        <span className={labelCls}>{label}</span>
      </span>
      {children}
    </label>
  );
}

export default function AppointmentEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const loadDoctors = useDoctorOptionsStore((s) => s.load);
  const doctors = useDoctorOptionsStore((s) => s.items);
  const doctorsStatus = useDoctorOptionsStore((s) => s.status);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [slotError, setSlotError] = useState(null);
  const [checkingSlot, setCheckingSlot] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [departmentsStatus, setDepartmentsStatus] = useState("idle");
  const [departmentsError, setDepartmentsError] = useState(null);
  const [form, setForm] = useState({
    doctorProfileId: "",
    departmentId: "",
    scheduledStart: "",
    scheduledEnd: "",
    appointmentType: "",
    reason: "",
  });

  useEffect(() => {
    void loadDoctors();
  }, [loadDoctors]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDepartmentsStatus("loading");
      setDepartmentsError(null);
      try {
        const list = await fetchDepartmentsList();
        if (!cancelled) {
          setDepartments(Array.isArray(list) ? list : []);
          setDepartmentsStatus("ready");
        }
      } catch (e) {
        if (!cancelled) {
          setDepartments([]);
          setDepartmentsStatus("error");
          setDepartmentsError(getApiErrorMessage(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const doctorId = Number.parseInt(form.doctorProfileId, 10);
    if (!Number.isFinite(doctorId) || !form.scheduledStart || !form.scheduledEnd) {
      setSlotError(null);
      setCheckingSlot(false);
      return;
    }
    const start = new Date(form.scheduledStart);
    const end = new Date(form.scheduledEnd);
    if (!(end > start)) {
      setSlotError(null);
      setCheckingSlot(false);
      return;
    }

    (async () => {
      setCheckingSlot(true);
      try {
        const day = form.scheduledStart.slice(0, 10);
        const list = await fetchAppointments(day);
        if (cancelled) return;
        const hasConflict = (Array.isArray(list) ? list : []).some((a) => {
          if (a.id === Number(id)) return false;
          if (!isActiveForConflict(a.status)) return false;
          if (a.doctorProfileId !== doctorId) return false;
          return hasTimeOverlap(
            start,
            end,
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
        setSlotError(null);
      } finally {
        if (!cancelled) setCheckingSlot(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [form.doctorProfileId, form.scheduledStart, form.scheduledEnd, id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const a = await fetchAppointmentById(Number(id));
        if (cancelled || !a) return;
        const status = String(a.status).toLowerCase();
        if (
          status !== APPOINTMENT_STATUS.SCHEDULED &&
          status !== APPOINTMENT_STATUS.CONFIRMED
        ) {
          setError("This appointment can no longer be edited.");
          return;
        }
        setForm({
          doctorProfileId: String(a.doctorProfileId),
          departmentId: a.departmentId != null ? String(a.departmentId) : "",
          scheduledStart: toDatetimeLocalValue(a.scheduledStart),
          scheduledEnd: toDatetimeLocalValue(a.scheduledEnd),
          appointmentType: a.appointmentType ?? "",
          reason: a.reason ?? "",
        });
      } catch (e) {
        if (!cancelled) setError(getApiErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const setAppointmentDate = (date) => {
    setForm((current) => ({
      ...current,
      scheduledStart: combineDateTime(date, timePart(current.scheduledStart)),
      scheduledEnd: combineDateTime(date, timePart(current.scheduledEnd)),
    }));
  };

  const setStartTime = (time) => {
    setForm((current) => ({
      ...current,
      scheduledStart: combineDateTime(datePart(current.scheduledStart), time),
    }));
  };

  const setEndTime = (time) => {
    setForm((current) => ({
      ...current,
      scheduledEnd: combineDateTime(datePart(current.scheduledStart), time),
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const start = new Date(form.scheduledStart);
      const end = new Date(form.scheduledEnd);
      if (!(start < end)) {
        setError("End time must be after start time.");
        setSaving(false);
        return;
      }
      if (slotError) {
        setError(slotError);
        setSaving(false);
        return;
      }
      await updateAppointment(Number(id), {
        doctorProfileId: Number(form.doctorProfileId),
        departmentId: form.departmentId.trim()
          ? Number(form.departmentId)
          : null,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        appointmentType: form.appointmentType.trim() || null,
        reason: form.reason.trim() || null,
      });
      navigate(`/appointments/${id}`);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-600">Loading...</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 ring-1 ring-sky-200">
            <CalendarClock className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <Link
              to={`/appointments/${id}`}
              className="text-sm font-medium text-sky-800 hover:underline"
            >
              Back to appointment
            </Link>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Edit Appointment
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Update appointment schedule and information
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
          role="alert"
        >
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <Card className="rounded-xl bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-base text-slate-950">Schedule Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                icon={<Stethoscope className="h-4 w-4" aria-hidden />}
                label="Doctor"
              >
                <select
                  required
                  value={form.doctorProfileId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, doctorProfileId: e.target.value }))
                  }
                  disabled={saving || doctorsStatus === "loading"}
                  className={selectCls}
                >
                  <option value="">Select doctor</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                icon={<Hospital className="h-4 w-4" aria-hidden />}
                label="Department"
              >
                <select
                  value={form.departmentId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, departmentId: e.target.value }))
                  }
                  disabled={saving || departmentsStatus === "loading"}
                  className={selectCls}
                >
                  <option value="">
                    {departmentsStatus === "loading"
                      ? "Loading departments..."
                      : "No department"}
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.name}
                    </option>
                  ))}
                </select>
                {departmentsError && (
                  <p className="mt-1.5 text-xs font-medium text-amber-800" role="status">
                    {departmentsError}
                  </p>
                )}
              </FormField>

              <FormField
                icon={<FileText className="h-4 w-4" aria-hidden />}
                label="Appointment Type"
              >
                <Input
                  type="text"
                  value={form.appointmentType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, appointmentType: e.target.value }))
                  }
                  disabled={saving}
                  className={fieldCls}
                />
              </FormField>

              <FormField
                icon={<CalendarClock className="h-4 w-4" aria-hidden />}
                label="Date"
              >
                <Input
                  type="date"
                  required
                  value={datePart(form.scheduledStart)}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  disabled={saving}
                  className={fieldCls}
                />
              </FormField>

              <FormField icon={<Clock3 className="h-4 w-4" aria-hidden />} label="Start Time">
                <Input
                  type="time"
                  required
                  value={timePart(form.scheduledStart)}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={saving}
                  className={fieldCls}
                />
              </FormField>

              <FormField icon={<Clock3 className="h-4 w-4" aria-hidden />} label="End Time">
                <Input
                  type="time"
                  required
                  value={timePart(form.scheduledEnd)}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={saving}
                  className={fieldCls}
                />
                {slotError && (
                  <p className="mt-1.5 text-xs font-medium text-rose-600" role="alert">
                    {slotError}
                  </p>
                )}
                {!slotError && checkingSlot && (
                  <p className="mt-1.5 text-xs font-medium text-slate-500" role="status">
                    Checking doctor availability...
                  </p>
                )}
              </FormField>

              <FormField
                icon={<FileText className="h-4 w-4" aria-hidden />}
                label="Reason"
                className="md:col-span-2"
              >
                <Textarea
                  value={form.reason}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reason: e.target.value }))
                  }
                  rows={3}
                  disabled={saving}
                  className="mt-1.5 min-h-24 rounded-lg border-slate-200 bg-white text-sm shadow-sm focus-visible:ring-sky-500/20"
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        <div className="sticky bottom-0 z-20 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white/95 px-0 py-4 shadow-[0_-10px_24px_rgba(15,23,42,0.06)] backdrop-blur sm:flex-row sm:justify-end">
          <Button asChild variant="outline" className="h-10 px-4">
            <Link to={`/appointments/${id}`}>Cancel</Link>
          </Button>
          <Button
            type="submit"
            disabled={saving || checkingSlot || !!slotError}
            className="h-10 bg-sky-600 px-4 text-white hover:bg-sky-700"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}

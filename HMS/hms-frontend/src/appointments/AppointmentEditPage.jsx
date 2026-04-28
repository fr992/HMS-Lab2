import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  fetchAppointmentById,
  fetchAppointments,
  fetchDepartmentsList,
  getApiErrorMessage,
  updateAppointment,
} from "@/appointments/appointmentsApi";
import { useDoctorOptionsStore } from "@/patients/doctorOptionsStore";
import { APPOINTMENT_STATUS } from "@/appointments/appointmentConstants";
import {
  hasTimeOverlap,
  isActiveForConflict,
} from "@/appointments/appointmentScheduling";

function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
          departmentId:
            a.departmentId != null ? String(a.departmentId) : "",
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
    return <p className="text-sm text-slate-600">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          to={`/appointments/${id}`}
          className="text-sm font-medium text-sky-800 hover:underline"
        >
          ← Back
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">
          Edit appointment
        </h1>
      </div>

      {error && (
        <div
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
          role="alert"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Doctor</span>
          <select
            required
            value={form.doctorProfileId}
            onChange={(e) =>
              setForm((f) => ({ ...f, doctorProfileId: e.target.value }))
            }
            disabled={saving || doctorsStatus === "loading"}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">Select doctor</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Department (optional)
          </span>
          <select
            value={form.departmentId}
            onChange={(e) =>
              setForm((f) => ({ ...f, departmentId: e.target.value }))
            }
            disabled={saving || departmentsStatus === "loading"}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
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
            <p className="mt-1 text-xs text-amber-800" role="status">
              {departmentsError}
            </p>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Starts</span>
          <input
            type="datetime-local"
            required
            value={form.scheduledStart}
            onChange={(e) =>
              setForm((f) => ({ ...f, scheduledStart: e.target.value }))
            }
            disabled={saving}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Ends</span>
          <input
            type="datetime-local"
            required
            value={form.scheduledEnd}
            onChange={(e) =>
              setForm((f) => ({ ...f, scheduledEnd: e.target.value }))
            }
            disabled={saving}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
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
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Appointment type
          </span>
          <input
            type="text"
            value={form.appointmentType}
            onChange={(e) =>
              setForm((f) => ({ ...f, appointmentType: e.target.value }))
            }
            disabled={saving}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Reason</span>
          <textarea
            value={form.reason}
            onChange={(e) =>
              setForm((f) => ({ ...f, reason: e.target.value }))
            }
            rows={3}
            disabled={saving}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Link
            to={`/appointments/${id}`}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || checkingSlot || !!slotError}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

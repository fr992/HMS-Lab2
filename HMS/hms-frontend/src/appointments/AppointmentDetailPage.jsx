import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import {
  fetchAppointmentById,
  getApiErrorMessage,
} from "@/appointments/appointmentsApi";
import AppointmentStatusBadge from "@/appointments/components/AppointmentStatusBadge";
import { APPOINTMENT_STATUS } from "@/appointments/appointmentConstants";

export default function AppointmentDetailPage() {
  const { id } = useParams();
  const auth = useAuth();
  const canEdit = auth.hasPermission("Appointments.Create");

  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAppointmentById(Number(id));
        if (!cancelled) setRow(data);
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

  const editable =
    row &&
    (row.status === APPOINTMENT_STATUS.SCHEDULED ||
      row.status === APPOINTMENT_STATUS.CONFIRMED);

  if (loading) {
    return (
      <p className="text-sm text-slate-600">Loading appointment…</p>
    );
  }

  if (error || !row) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
        {error ?? "Appointment not found."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/appointments"
            className="text-sm font-medium text-sky-800 hover:underline"
          >
            ← Appointments
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-slate-900">
            Appointment #{row.id}
          </h1>
        </div>
        {canEdit && editable && (
          <Link
            to={`/appointments/${row.id}/edit`}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            Edit schedule
          </Link>
        )}
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">Status</p>
          <div className="mt-1">
            <AppointmentStatusBadge status={row.status} />
          </div>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">When</p>
          <p className="mt-1 text-slate-900">
            {new Date(row.scheduledStart).toLocaleString()} –{" "}
            {new Date(row.scheduledEnd).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">Patient</p>
          <p className="mt-1">
            <Link
              className="font-medium text-sky-800 hover:underline"
              to={`/patients/${row.patientProfileId}`}
            >
              {row.patientName}
            </Link>
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">Doctor</p>
          <p className="mt-1 text-slate-900">{row.doctorName}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">
            Department
          </p>
          <p className="mt-1 text-slate-900">{row.departmentName ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">Type</p>
          <p className="mt-1 text-slate-900">{row.appointmentType ?? "—"}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs font-medium uppercase text-slate-500">Reason</p>
          <p className="mt-1 text-slate-800">{row.reason ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}

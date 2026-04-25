import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { fetchPatientById, getApiErrorMessage } from "@/patients/patientsApi";

function toDisplayDate(v) {
  if (v == null) return "—";
  if (typeof v === "string") {
    if (v.length >= 10) return v.slice(0, 10);
    return v;
  }
  return String(v);
}

export default function PatientDetailPage() {
  const { id } = useParams();
  const patientId = Number.parseInt(id, 10);
  const navigate = useNavigate();
  const auth = useAuth();
  const canUpdate = auth.hasPermission("Patients.Update");

  const [patient, setPatient] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const data = await fetchPatientById(patientId);
        if (!cancel) setPatient(data);
      } catch (e) {
        if (!cancel) setError(getApiErrorMessage(e));
      }
    })();
    return () => {
      cancel = true;
    };
  }, [patientId]);

  if (error) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-900">
        <p className="font-medium">Could not open patient</p>
        <p className="mt-1 text-sm">{error}</p>
        <Link
          to="/patients"
          className="mt-3 inline-block text-sm text-sky-800 underline"
        >
          Back to list
        </Link>
      </div>
    );
  }

  if (!patient) {
    return (
      <p className="text-sm text-slate-500" aria-live="polite">
        Loading…
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {patient.lastName}, {patient.firstName}
          </h1>
          <p className="text-sm text-slate-500">{patient.patientNumber}</p>
        </div>
        {canUpdate && (
          <Link
            to={`/patients/${patient.id}/edit`}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
          >
            Edit
          </Link>
        )}
      </div>
      <dl className="grid max-w-2xl gap-3 sm:grid-cols-2">
        {[
          ["Email", patient.email || "—"],
          ["Username", patient.userName || "—"],
          ["Phone", patient.phone || "—"],
          ["Date of birth", toDisplayDate(patient.dateOfBirth)],
          ["Gender", patient.gender || "—"],
          ["Personal number", patient.personalNumber || "—"],
          ["Address", patient.address || "—"],
          ["City", patient.city || "—"],
          ["Country", patient.country || "—"],
          ["Insurance", patient.insuranceNumber || "—"],
          ["Blood type", patient.bloodType || "—"],
          [
            "Primary doctor (id)",
            patient.primaryDoctorId != null
              ? String(patient.primaryDoctorId)
              : "—",
          ],
        ].map(([k, v]) => (
          <div key={k} className="border-b border-slate-100 pb-2">
            <dt className="text-xs font-medium uppercase text-slate-500">
              {k}
            </dt>
            <dd className="mt-0.5 text-sm text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6">
        <button
          type="button"
          onClick={() => navigate("/patients")}
          className="text-sm text-sky-800 hover:underline"
        >
          ← Back to patients
        </button>
      </div>
    </div>
  );
}

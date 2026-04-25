import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PatientForm from "@/patients/components/PatientForm";
import { fetchPatientById, getApiErrorMessage } from "@/patients/patientsApi";
import { usePatientsStore } from "@/patients/patientsStore";

export default function PatientEditPage() {
  const { id } = useParams();
  const patientId = Number.parseInt(id, 10);
  const navigate = useNavigate();
  const updatePatient = usePatientsStore((s) => s.updatePatient);

  const [patient, setPatient] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const data = await fetchPatientById(patientId);
        if (!cancel) setPatient(data);
      } catch (e) {
        if (!cancel) setLoadError(getApiErrorMessage(e));
      }
    })();
    return () => {
      cancel = true;
    };
  }, [patientId]);

  if (loadError) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-900">
        <p className="font-medium">Could not load patient</p>
        <p className="mt-1 text-sm">{loadError}</p>
        <button
          type="button"
          onClick={() => navigate("/patients")}
          className="mt-3 text-sm text-sky-800 underline"
        >
          Back to list
        </button>
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
      <h1 className="text-2xl font-semibold text-slate-900">Edit patient</h1>
      {formError && (
        <div
          className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
          role="alert"
        >
          {formError}
        </div>
      )}
      <div className="mt-6 max-w-3xl">
        <PatientForm
          key={patient.id}
          mode="edit"
          initial={patient}
          submitting={submitting}
          onCancel={() => navigate(`/patients/${patient.id}`)}
          onSubmit={async (body) => {
            setFormError(null);
            setSubmitting(true);
            const updated = await updatePatient(patient.id, body);
            setSubmitting(false);
            if (updated) navigate(`/patients/${patient.id}`);
            else {
              const st = usePatientsStore.getState();
              setFormError(st.lastActionError || "Update failed.");
            }
          }}
        />
      </div>
    </div>
  );
}

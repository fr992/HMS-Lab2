import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PatientForm from "@/patients/components/PatientForm";
import { usePatientsStore } from "@/patients/patientsStore";

export default function PatientCreatePage() {
  const navigate = useNavigate();
  const createPatient = usePatientsStore((s) => s.createPatient);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">New patient</h1>
      <p className="mt-1 text-sm text-slate-600">
        Create a patient record and linked portal account.
      </p>
      {error && (
        <div
          className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
          role="alert"
        >
          {error}
        </div>
      )}
      <div className="mt-6 max-w-3xl">
        <PatientForm
          key="create"
          mode="create"
          submitting={submitting}
          onCancel={() => navigate("/patients")}
          onSubmit={async (body) => {
            setError(null);
            setSubmitting(true);
            const created = await createPatient(body);
            setSubmitting(false);
            if (created) navigate(`/patients/${created.id}`);
            else {
              const st = usePatientsStore.getState();
              if (st.lastActionError) setError(st.lastActionError);
              else setError("Could not create patient.");
            }
          }}
        />
      </div>
    </div>
  );
}

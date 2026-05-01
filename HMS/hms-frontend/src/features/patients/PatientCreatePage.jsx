import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PatientForm from "@/features/patients/components/PatientForm";
import { usePatientsStore } from "@/features/patients/patientsStore";

export default function PatientCreatePage() {
  const navigate = useNavigate();
  const createPatient = usePatientsStore((s) => s.createPatient);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          New patient
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Create a patient record and linked portal account.
        </p>
      </div>
      {error && (
        <div
          className="rounded-xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm text-rose-900 shadow-sm"
          role="alert"
        >
          {error}
        </div>
      )}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 md:p-8">
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

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import PatientForm from "@/features/patients/components/PatientForm";
import { fetchPatientById, getApiErrorMessage } from "@/features/patients/patientsApi";
import { usePatientsStore } from "@/features/patients/patientsStore";

export default function PatientEditPage() {
  const { id } = useParams();
  const patientId = Number.parseInt(id, 10);
  const navigate = useNavigate();
  const auth = useAuth();
  const updatePatient = usePatientsStore((s) => s.updatePatient);
  const linkPortalAccount = usePatientsStore((s) => s.linkPortalAccount);
  const lastActionSuccess = usePatientsStore((s) => s.lastActionSuccess);
  const clearFeedback = usePatientsStore((s) => s.clearFeedback);

  const [patient, setPatient] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [linkingPortal, setLinkingPortal] = useState(false);
  const [formError, setFormError] = useState(null);

  const canUpdate = auth.hasPermission("Patients.Update");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const data = await fetchPatientById(patientId);
        if (!cancel) {
          setPatient(data);
          clearFeedback();
        }
      } catch (e) {
        if (!cancel) setLoadError(getApiErrorMessage(e));
      }
    })();
    return () => {
      cancel = true;
    };
  }, [patientId, clearFeedback]);

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
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Edit patient
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          {patient.userId
            ? "Update registration details. The linked portal account is shown in the card above."
            : "Update registration details. You can add a patient portal sign-in below if they do not have one yet."}
        </p>
      </div>
      {lastActionSuccess && (
        <div
          className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900 shadow-sm"
          role="status"
        >
          {lastActionSuccess}
        </div>
      )}
      {formError && (
        <div
          className="rounded-xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm text-rose-900 shadow-sm"
          role="alert"
        >
          {formError}
        </div>
      )}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 md:p-8">
        <PatientForm
          key={patient.id}
          mode="edit"
          initial={patient}
          submitting={submitting}
          addPortalSubmitting={linkingPortal}
          onAddPortal={
            canUpdate
              ? async (body) => {
                  setFormError(null);
                  clearFeedback();
                  setLinkingPortal(true);
                  const updated = await linkPortalAccount(patient.id, body);
                  setLinkingPortal(false);
                  if (updated) {
                    setPatient(updated);
                    return updated;
                  }
                  setFormError(
                    usePatientsStore.getState().lastActionError ||
                      "Could not add portal access."
                  );
                  return null;
                }
              : undefined
          }
          onCancel={() => navigate(`/patients/${patient.id}`)}
          onSubmit={async (body) => {
            setFormError(null);
            clearFeedback();
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

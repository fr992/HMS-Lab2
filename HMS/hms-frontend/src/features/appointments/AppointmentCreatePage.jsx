import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppointmentForm from "@/features/appointments/components/AppointmentForm";
import {
  createAppointment,
  getApiErrorMessage,
} from "@/features/appointments/api/appointmentsApi";

export default function AppointmentCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          New appointment
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Book a visit for an existing patient.
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
        <AppointmentForm
          submitting={submitting}
          onCancel={() => navigate("/appointments")}
          onSubmit={async (body) => {
            setError(null);
            setSubmitting(true);
            try {
              const created = await createAppointment(body);
              navigate(returnTo || `/appointments/${created.id}`);
            } catch (e) {
              setError(getApiErrorMessage(e));
            } finally {
              setSubmitting(false);
            }
          }}
        />
      </div>
    </div>
  );
}

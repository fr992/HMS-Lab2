import { useAppointmentStore } from "@/features/appointment/appointmentStore";
import { CLINIC_OPTIONS } from "@/features/landing/landingData";

export default function AppointmentForm() {
  const { form, submitting, submitted, error, setField, submit, reset } =
    useAppointmentStore();

  function handleSubmit(e) {
    e.preventDefault();
    submit();
  }

  if (submitted) {
    return (
      <section id="appointment" className="bg-slate-900 py-24">
        <div className="mx-auto max-w-xl px-6 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/20">
            <span className="text-2xl text-sky-400">✓</span>
          </div>
          <h3 className="text-2xl font-bold text-white">Request Received</h3>
          <p className="mt-3 text-sm text-slate-400">
            Thank you. Our scheduling team will contact you within one business day to confirm your appointment.
          </p>
          <button
            onClick={reset}
            className="mt-8 rounded-lg border border-slate-600 px-6 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-400 hover:text-white"
          >
            Book Another
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id="appointment" className="bg-slate-900 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-16 lg:grid-cols-[1fr_2fr]">
          <div className="text-white">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-sky-400">Appointments</p>
            <h2 className="text-3xl font-bold leading-tight tracking-tight">
              Book a Consultation
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Fill in your details and select a clinic. Our team will reach out to confirm availability and provide any pre-visit information.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-slate-400">
              {[
                "Confirmation within 24 hours",
                "No referral required for initial consultation",
                "Available Mon–Sat, 08:00–18:00",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 text-sky-500">✦</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="rounded-xl bg-white p-8">
            {error && (
              <p className="mb-6 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="First Name" required>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(v) => setField("firstName", v)}
                  autoComplete="given-name"
                />
              </Field>

              <Field label="Last Name" required>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(v) => setField("lastName", v)}
                  autoComplete="family-name"
                />
              </Field>

              <Field label="Email Address" required>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(v) => setField("email", v)}
                  autoComplete="email"
                />
              </Field>

              <Field label="Phone Number" required>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(v) => setField("phone", v)}
                  autoComplete="tel"
                />
              </Field>

              <Field label="City" required>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(v) => setField("city", v)}
                  autoComplete="address-level2"
                />
              </Field>

              <Field label="Country" required>
                <Input
                  id="country"
                  value={form.country}
                  onChange={(v) => setField("country", v)}
                  autoComplete="country-name"
                />
              </Field>

              <Field label="Preferred Clinic" required>
                <select
                  id="clinic"
                  value={form.clinic}
                  onChange={(e) => setField("clinic", e.target.value)}
                  required
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">Select a clinic…</option>
                  {CLINIC_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>

              <Field label="Preferred Date">
                <Input
                  id="preferredDate"
                  type="date"
                  value={form.preferredDate}
                  onChange={(v) => setField("preferredDate", v)}
                />
              </Field>
            </div>

            <Field label="Additional Notes" className="mt-5">
              <textarea
                id="notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Describe your symptoms or reason for visit…"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </Field>

            <div className="mt-7">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-sky-600 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Request Appointment"}
              </button>
              <p className="mt-3 text-center text-xs text-slate-400">
                Your information is handled in accordance with our privacy policy.
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children, required = false, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-slate-600">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ id, value, onChange, type = "text", autoComplete, placeholder }) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      placeholder={placeholder}
      required
      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
    />
  );
}
import { useMemo, useState } from "react";
import { Eye, EyeOff, Lock, Mail, MapPin, UserRound, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import PrimaryDoctorSelect from "@/features/patients/components/PrimaryDoctorSelect";
import { BLOOD_TYPES } from "@/features/patients/patientFieldOptions";
import { NATIVE_SELECT_CHEVRON } from "@/features/patients/selectFieldStyles";
import { usePatientsStore } from "@/features/patients/patientsStore";

const STEPS = [
  { id: "account", label: "Account", fields: ["userName", "email", "password"] },
  { id: "personal", label: "Personal", fields: ["firstName", "lastName"] },
  { id: "address", label: "Address", fields: [] },
  { id: "medical", label: "Medical", fields: [] },
];

const initialForm = {
  userName: "",
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  personalNumber: "",
  dateOfBirth: "",
  gender: "",
  phone: "",
  address: "",
  city: "",
  country: "",
  insuranceNumber: "",
  bloodType: "",
  primaryDoctorId: "",
};

const inputClass =
  "h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20";
const selectClass =
  `${inputClass.replace("px-4", "pl-4")} ${NATIVE_SELECT_CHEVRON}`.trim();
const labelClass =
  "mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-500";

function WizardIcon() {
  return (
    <div className="hms-modal-header-icon">
      <UserRound className="size-6" aria-hidden />
    </div>
  );
}

export default function PatientCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo;

  return (
    <RegisterPatientModal
      onClose={() => navigate("/patients")}
      onCreated={(created) => navigate(returnTo || `/patients/${created.id}`)}
    />
  );
}

function Field({ label, required, icon, error, children }) {
  return (
    <label className="block">
      <span className={labelClass}>
        {icon}
        {label}
        {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
}

export function RegisterPatientModal({ onClose, onCreated }) {
  const createPatient = usePatientsStore((s) => s.createPatient);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});

  const currentStep = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  const body = useMemo(() => {
    const primaryDoctorId = form.primaryDoctorId.trim();
    return {
      createPortalAccount: true,
      userName: form.userName.trim(),
      email: form.email.trim(),
      password: form.password,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      personalNumber: form.personalNumber.trim() || null,
      dateOfBirth: form.dateOfBirth || null,
      gender: form.gender || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      country: form.country.trim() || null,
      insuranceNumber: form.insuranceNumber.trim() || null,
      bloodType: form.bloodType || null,
      primaryDoctorId: primaryDoctorId ? Number.parseInt(primaryDoctorId, 10) || null : null,
    };
  }, [form]);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function validateAll() {
    const next = {};
    if (!form.userName.trim()) next.userName = "Required";
    if (!form.email.trim()) next.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "Invalid email";
    }
    if (!form.password) next.password = "Required";
    else if (form.password.length < 8) next.password = "Minimum 8 characters";
    if (!form.firstName.trim()) next.firstName = "Required";
    if (!form.lastName.trim()) next.lastName = "Required";
    return next;
  }

  function validateCurrentStep() {
    const all = validateAll();
    return Object.fromEntries(
      Object.entries(all).filter(([key]) => currentStep.fields.includes(key))
    );
  }

  function nextStep() {
    const next = validateCurrentStep();
    if (Object.keys(next).length) {
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    setStepIndex((index) => Math.min(index + 1, STEPS.length - 1));
  }

  async function submit(event) {
    event.preventDefault();
    const next = validateAll();
    if (Object.keys(next).length) {
      setFieldErrors(next);
      const firstInvalidStep = STEPS.findIndex((step) =>
        step.fields.some((field) => next[field])
      );
      if (firstInvalidStep >= 0) setStepIndex(firstInvalidStep);
      return;
    }

    setError(null);
    setSubmitting(true);
    const created = await createPatient(body);
    setSubmitting(false);
    if (created) onCreated(created);
    else {
      const state = usePatientsStore.getState();
      setError(state.lastActionError || "Could not create patient.");
    }
  }

  return (
    <div className="hms-modal-overlay">
      <section
        className="flex h-140 w-full max-w-200 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="hms-modal-header">
          <div className="flex items-start gap-4">
            <WizardIcon />
            <div>
              <h1 className="text-xl font-semibold leading-6 text-slate-950">
                Register Patient
              </h1>
              <p className="mt-1 text-sm text-slate-600">Create a new patient record</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-slate-100 bg-white px-6 pt-5">
            <div className="rounded-lg bg-slate-100 p-1">
              <div className="grid grid-cols-4 gap-1">
                {STEPS.map((step, index) => {
                  const active = stepIndex === index;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setStepIndex(index)}
                      className={[
                        "h-9 rounded-md px-2 text-sm font-medium transition",
                        active
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-500 hover:bg-white/70 hover:text-slate-800",
                      ].join(" ")}
                    >
                      {step.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {error && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {error}
              </div>
            )}

            {currentStep.id === "account" && (
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Username"
                  required
                  error={fieldErrors.userName}
                  icon={<UserRound className="size-4" aria-hidden />}
                >
                  <input
                    className={inputClass}
                    value={form.userName}
                    onChange={(event) => update("userName", event.target.value)}
                    placeholder="john.smith"
                    autoComplete="username"
                    disabled={submitting}
                  />
                </Field>
                <Field
                  label="Email"
                  required
                  error={fieldErrors.email}
                  icon={<Mail className="size-4" aria-hidden />}
                >
                  <input
                    type="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    placeholder="patient@email.com"
                    autoComplete="email"
                    disabled={submitting}
                  />
                </Field>
                <div className="col-span-2">
                  <Field
                    label="Password"
                    required
                    error={fieldErrors.password}
                    icon={<Lock className="size-4" aria-hidden />}
                  >
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        className={`${inputClass} pr-12`}
                        value={form.password}
                        onChange={(event) => update("password", event.target.value)}
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                        disabled={submitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" aria-hidden />
                        ) : (
                          <Eye className="size-4" aria-hidden />
                        )}
                      </button>
                    </div>
                  </Field>
                </div>
              </div>
            )}

            {currentStep.id === "personal" && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="First name" required error={fieldErrors.firstName}>
                  <input
                    className={inputClass}
                    value={form.firstName}
                    onChange={(event) => update("firstName", event.target.value)}
                    placeholder="John"
                    autoComplete="given-name"
                    disabled={submitting}
                  />
                </Field>
                <Field label="Last name" required error={fieldErrors.lastName}>
                  <input
                    className={inputClass}
                    value={form.lastName}
                    onChange={(event) => update("lastName", event.target.value)}
                    placeholder="Smith"
                    autoComplete="family-name"
                    disabled={submitting}
                  />
                </Field>
                <Field label="Personal number">
                  <input
                    className={inputClass}
                    value={form.personalNumber}
                    onChange={(event) => update("personalNumber", event.target.value)}
                    placeholder="National ID"
                    disabled={submitting}
                  />
                </Field>
                <Field label="Date of birth">
                  <input
                    type="date"
                    className={inputClass}
                    value={form.dateOfBirth}
                    onChange={(event) => update("dateOfBirth", event.target.value)}
                    disabled={submitting}
                  />
                </Field>
                <Field label="Gender">
                  <select
                    className={selectClass}
                    value={form.gender}
                    onChange={(event) => update("gender", event.target.value)}
                    disabled={submitting}
                  >
                    <option value="">Not specified</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>
                <Field label="Phone">
                  <input
                    className={inputClass}
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                    placeholder="+1 555-0123"
                    autoComplete="tel"
                    disabled={submitting}
                  />
                </Field>
              </div>
            )}

            {currentStep.id === "address" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field
                    label="Address"
                    icon={<MapPin className="size-4" aria-hidden />}
                  >
                    <input
                      className={inputClass}
                      value={form.address}
                      onChange={(event) => update("address", event.target.value)}
                      placeholder="Street and number"
                      disabled={submitting}
                    />
                  </Field>
                </div>
                <Field label="City">
                  <input
                    className={inputClass}
                    value={form.city}
                    onChange={(event) => update("city", event.target.value)}
                    placeholder="Boston"
                    disabled={submitting}
                  />
                </Field>
                <Field label="Country">
                  <input
                    className={inputClass}
                    value={form.country}
                    onChange={(event) => update("country", event.target.value)}
                    placeholder="USA"
                    autoComplete="country-name"
                    disabled={submitting}
                  />
                </Field>
              </div>
            )}

            {currentStep.id === "medical" && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Insurance number">
                  <input
                    className={inputClass}
                    value={form.insuranceNumber}
                    onChange={(event) => update("insuranceNumber", event.target.value)}
                    placeholder="Insurance ID"
                    disabled={submitting}
                  />
                </Field>
                <Field label="Blood type">
                  <select
                    className={selectClass}
                    value={form.bloodType}
                    onChange={(event) => update("bloodType", event.target.value)}
                    disabled={submitting}
                  >
                    <option value="">Not specified</option>
                    {BLOOD_TYPES.map((bloodType) => (
                      <option key={bloodType} value={bloodType}>
                        {bloodType}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="col-span-2">
                  <Field label="Primary doctor">
                    <PrimaryDoctorSelect
                      hideLabel
                      value={form.primaryDoctorId}
                      onValueChange={(value) => update("primaryDoctorId", value)}
                      disabled={submitting}
                    />
                  </Field>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
            <p className="text-sm text-slate-500">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
            <div className="flex items-center gap-3">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setStepIndex((index) => Math.max(index - 1, 0))}
                  disabled={submitting}
                  className="h-11 rounded-lg border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="h-11 rounded-lg border border-transparent bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              {isLastStep ? (
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-sky-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Register"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={submitting}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-sky-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
                >
                  Next
                  <span aria-hidden>›</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

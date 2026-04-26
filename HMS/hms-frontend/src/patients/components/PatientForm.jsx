import { useState, useMemo, useEffect } from "react";
import PrimaryDoctorSelect from "@/patients/components/PrimaryDoctorSelect";
import {
  normalizeGenderValue,
  normalizeBloodTypeValue,
  BLOOD_TYPES,
} from "@/patients/patientFieldOptions";
import { NATIVE_SELECT_CHEVRON } from "@/patients/selectFieldStyles";

function toDateInput(v) {
  if (v == null) return "";
  if (typeof v === "string") return v.length >= 10 ? v.slice(0, 10) : "";
  return "";
}

function cleanUpdatePayload(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, val]) => val !== undefined)
  );
}

const initialCreate = {
  createPortalAccount: true,
  userName: "",
  email: "",
  password: "",
  password2: "",
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

function patientToFormState(p) {
  return {
    firstName: p.firstName ?? "",
    lastName: p.lastName ?? "",
    personalNumber: p.personalNumber ?? "",
    dateOfBirth: toDateInput(p.dateOfBirth),
    gender: normalizeGenderValue(p.gender),
    phone: p.phone ?? "",
    address: p.address ?? "",
    city: p.city ?? "",
    country: p.country ?? "",
    insuranceNumber: p.insuranceNumber ?? "",
    bloodType: normalizeBloodTypeValue(p.bloodType),
    primaryDoctorId:
      p.primaryDoctorId != null && p.primaryDoctorId !== ""
        ? String(p.primaryDoctorId)
        : "",
  };
}

// Tailwind: shared field chrome (hospital / admin style)
const labelCls =
  "text-xs font-semibold uppercase tracking-wide text-slate-500";
const inputCore =
  "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50";
/* Same as inputCore but pl-3.5 only; right padding comes from NATIVE_SELECT_CHEVRON. */
const selectFieldCore = inputCore.replace("px-3.5", "pl-3.5");
const fieldTop = "mt-1.5";
const inputField = (extra = "") => `${fieldTop} ${inputCore} ${extra}`.trim();
const errRing = (name, err) =>
  err[name] ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20" : "";
const selectCls = (name, err) =>
  `${fieldTop} ${selectFieldCore} ${errRing(
    name,
    err
  )} ${NATIVE_SELECT_CHEVRON}`.trim();

function FormSection({ icon, title, subtitle, children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm sm:p-6 ${className}`}
    >
      <div className="mb-5 flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-600 shadow-sm">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
            {title}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
            {subtitle}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function FieldErr({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-rose-600" role="alert">
      {message}
    </p>
  );
}

// Icons (inline, no extra deps)
function IconAccount() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 1115 0H4.5z"
      />
    </svg>
  );
}
function IconPerson() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0113.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}
function IconMap() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7-9 12.5-9 12.5S1.5 17.5 1.5 10.5a7.5 7.5 0 1115 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 10.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
      />
    </svg>
  );
}
function IconMedical() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <rect
        x="4"
        y="3"
        width="16"
        height="18"
        rx="1.5"
        strokeLinejoin="round"
      />
      <path strokeLinecap="round" d="M8.5 8h5M8.5 12h6M8.5 16h3.5" />
    </svg>
  );
}

/**
 * @param {object} p
 * @param {"create"|"edit"} p.mode
 * @param {object} [p.initial] patient DTO for edit
 * @param {boolean} p.submitting
 * @param {function} p.onSubmit
 * @param {function} p.onCancel
 * @param {function} [p.onAddPortal] async ({{ userName, email, password }}) => unknown — edit only, when patient has no portal user
 * @param {boolean} [p.addPortalSubmitting]
 */
export default function PatientForm({
  mode,
  initial = null,
  submitting,
  onSubmit,
  onCancel,
  onAddPortal,
  addPortalSubmitting = false,
}) {
  const isEdit = mode === "edit";
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const [v, setV] = useState(() => {
    if (mode === "create") return { ...initialCreate };
    if (initial) return patientToFormState(initial);
    return { ...initialCreate };
  });
  const [err, setErr] = useState({});

  const [linkPortal, setLinkPortal] = useState({
    userName: "",
    email: "",
    password: "",
    password2: "",
  });
  const [linkErr, setLinkErr] = useState({});

  const canSubmit = useMemo(
    () => !submitting && !addPortalSubmitting,
    [submitting, addPortalSubmitting]
  );
  const formBusy = submitting || addPortalSubmitting;

  useEffect(() => {
    if (isEdit && initial?.userId) {
      setLinkPortal({ userName: "", email: "", password: "", password2: "" });
      setLinkErr({});
    }
  }, [isEdit, initial?.userId]);

  const setF = (name, value) => {
    setV((s) => ({ ...s, [name]: value }));
  };

  /**
   * API: when createPortalAccount is true (default), userName, email, password are required; when false, no user row.
   */
  const validateCreate = () => {
    const e = {};
    const withPortal = v.createPortalAccount !== false;
    if (withPortal) {
      if (!v.userName?.trim()) e.userName = "Required";
      if (!v.email?.trim()) e.email = "Required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) {
        e.email = "Invalid email";
      }
      if (!v.password?.length) e.password = "Required";
      if (v.password !== v.password2) e.password2 = "Passwords do not match";
    }
    if (!v.firstName?.trim()) e.firstName = "Required";
    if (!v.lastName?.trim()) e.lastName = "Required";
    return e;
  };

  /**
   * UpdatePatientRequestDto: all fields optional; we always send core person + profile fields from form.
   * At minimum keep first/last non-empty to avoid clearing names unintentionally.
   */
  const validateEdit = () => {
    const e = {};
    if (!v.firstName?.trim()) e.firstName = "Required";
    if (!v.lastName?.trim()) e.lastName = "Required";
    return e;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    if (isEdit) {
      const e = validateEdit();
      if (Object.keys(e).length) {
        setErr(e);
        return;
      }
      setErr({});
      const pDoc = (v.primaryDoctorId || "").trim();
      onSubmit(
        cleanUpdatePayload({
          firstName: v.firstName.trim(),
          lastName: v.lastName.trim(),
          personalNumber: (v.personalNumber || "").trim() || null,
          dateOfBirth: v.dateOfBirth ? v.dateOfBirth : null,
          gender: (v.gender || "").trim() || null,
          phone: (v.phone || "").trim() || null,
          address: (v.address || "").trim() || null,
          city: (v.city || "").trim() || null,
          country: (v.country || "").trim() || null,
          insuranceNumber: (v.insuranceNumber || "").trim() || null,
          bloodType: (v.bloodType || "").trim() || null,
          primaryDoctorId: pDoc
            ? Number.parseInt(pDoc, 10) || null
            : null,
        })
      );
    } else {
      const e = validateCreate();
      if (Object.keys(e).length) {
        setErr(e);
        return;
      }
      setErr({});
      const pDoc = (v.primaryDoctorId || "").trim();
      const withPortal = v.createPortalAccount !== false;
      onSubmit({
        createPortalAccount: withPortal,
        ...(withPortal
          ? {
              userName: v.userName.trim(),
              email: v.email.trim(),
              password: v.password,
            }
          : {}),
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        personalNumber: (v.personalNumber || "").trim() || null,
        dateOfBirth: v.dateOfBirth ? v.dateOfBirth : null,
        gender: (v.gender || "").trim() || null,
        phone: (v.phone || "").trim() || null,
        address: (v.address || "").trim() || null,
        city: (v.city || "").trim() || null,
        country: (v.country || "").trim() || null,
        insuranceNumber: (v.insuranceNumber || "").trim() || null,
        bloodType: (v.bloodType || "").trim() || null,
        primaryDoctorId: pDoc
          ? Number.parseInt(pDoc, 10) || null
          : null,
      });
    }
  };

  const setLinkF = (name, value) => {
    setLinkPortal((s) => ({ ...s, [name]: value }));
  };

  const validateLinkPortal = () => {
    const e = {};
    if (!linkPortal.userName?.trim()) e.userName = "Required";
    if (!linkPortal.email?.trim()) e.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(linkPortal.email.trim())) {
      e.email = "Invalid email";
    }
    if (!linkPortal.password?.length) e.password = "Required";
    if (linkPortal.password !== linkPortal.password2)
      e.password2 = "Passwords do not match";
    return e;
  };

  const handleAddPortal = async () => {
    if (!onAddPortal) return;
    const e = validateLinkPortal();
    if (Object.keys(e).length) {
      setLinkErr(e);
      return;
    }
    setLinkErr({});
    await onAddPortal({
      userName: linkPortal.userName.trim(),
      email: linkPortal.email.trim(),
      password: linkPortal.password,
    });
  };

  const inErr = (name) => errRing(name, err);
  const errId = (name) => (err[name] ? `${name}-err` : undefined);
  const inLink = (name) => errRing(name, linkErr);
  const linkErrId = (name) => (linkErr[name] ? `link-${name}-err` : undefined);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-5"
      noValidate
    >
      {isEdit && initial && (
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p>
            <span className="text-slate-500">Patient # </span>
            <span className="font-mono font-medium text-slate-900">
              {initial.patientNumber}
            </span>
          </p>
          {initial.userName ? (
            <p className="text-xs text-slate-600 sm:text-sm">
              <span className="text-slate-500">Account </span>
              {initial.userName}
              <span className="text-slate-400"> · </span>
              {initial.email}
            </p>
          ) : (
            <p className="text-xs text-slate-500 sm:text-sm">No patient portal account</p>
          )}
        </div>
      )}

      <div className="space-y-5">
        {isEdit && initial && !initial.userId && onAddPortal && (
          <FormSection
            icon={<IconAccount />}
            title="Add portal access"
            subtitle="Create a sign-in for this patient so they can use the hospital portal. This is separate from saving the profile — use the button below when the credentials are ready."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className={labelCls} htmlFor="ed-puser">
                  Username
                </label>
                <input
                  id="ed-puser"
                  className={inputField(inLink("userName"))}
                  value={linkPortal.userName}
                  onChange={(e) => setLinkF("userName", e.target.value)}
                  autoComplete="username"
                  disabled={formBusy}
                  aria-invalid={!!linkErr.userName}
                  aria-describedby={linkErrId("userName")}
                />
                <FieldErr
                  id="link-userName-err"
                  message={linkErr.userName}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="ed-pemail">
                  Email
                </label>
                <input
                  id="ed-pemail"
                  className={inputField(inLink("email"))}
                  type="email"
                  value={linkPortal.email}
                  onChange={(e) => setLinkF("email", e.target.value)}
                  autoComplete="email"
                  disabled={formBusy}
                  aria-invalid={!!linkErr.email}
                  aria-describedby={linkErrId("email")}
                />
                <FieldErr id="link-email-err" message={linkErr.email} />
              </div>
              <div>
                <label className={labelCls} htmlFor="ed-ppw">
                  Password
                </label>
                <div className={`relative ${fieldTop}`}>
                  <input
                    id="ed-ppw"
                    className={`${inputCore} pr-12 ${inLink("password")}`}
                    type={showPw ? "text" : "password"}
                    value={linkPortal.password}
                    onChange={(e) => setLinkF("password", e.target.value)}
                    autoComplete="new-password"
                    disabled={formBusy}
                    aria-invalid={!!linkErr.password}
                    aria-describedby={linkErrId("password")}
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    disabled={formBusy}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
                <FieldErr
                  id="link-password-err"
                  message={linkErr.password}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls} htmlFor="ed-ppw2">
                  Confirm password
                </label>
                <div className={`relative ${fieldTop}`}>
                  <input
                    id="ed-ppw2"
                    className={`${inputCore} pr-12 ${inLink("password2")}`}
                    type={showPw2 ? "text" : "password"}
                    value={linkPortal.password2}
                    onChange={(e) => setLinkF("password2", e.target.value)}
                    autoComplete="new-password"
                    disabled={formBusy}
                    aria-invalid={!!linkErr.password2}
                    aria-describedby={linkErrId("password2")}
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    onClick={() => setShowPw2((s) => !s)}
                    aria-label={
                      showPw2
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    disabled={formBusy}
                  >
                    {showPw2 ? "Hide" : "Show"}
                  </button>
                </div>
                <FieldErr
                  id="link-password2-err"
                  message={linkErr.password2}
                />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => void handleAddPortal()}
                disabled={formBusy}
                className="w-full rounded-xl border border-sky-200/90 bg-sky-50 px-5 py-2.5 text-sm font-semibold text-sky-900 shadow-sm transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {addPortalSubmitting ? "Adding access…" : "Add portal access"}
              </button>
            </div>
          </FormSection>
        )}
        {!isEdit && (
          <FormSection
            icon={<IconAccount />}
            title="Account Information"
            subtitle="Choose whether this patient can sign in to the hospital portal, or is registered as a record only."
          >
            <div className="mb-5 flex gap-3 rounded-xl border border-slate-200/80 bg-slate-50/90 p-4 sm:items-start">
              <input
                id="pf-portal"
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-2 focus:ring-sky-500/30"
                checked={v.createPortalAccount !== false}
                disabled={formBusy}
                onChange={(e) => {
                  const on = e.target.checked;
                  setF("createPortalAccount", on);
                  if (!on) {
                    setErr((prev) => {
                      const next = { ...prev };
                      delete next.userName;
                      delete next.email;
                      delete next.password;
                      delete next.password2;
                      return next;
                    });
                  }
                }}
              />
              <label
                htmlFor="pf-portal"
                className="min-w-0 cursor-pointer text-sm text-slate-800"
              >
                <span className="font-medium">Create patient portal account</span>
                <span className="mt-0.5 block text-xs font-normal text-slate-500">
                  When off, the patient is saved without username, email, or password. An account can
                  be added in a later workflow.
                </span>
              </label>
            </div>
            {v.createPortalAccount !== false ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className={labelCls} htmlFor="pf-username">
                    Username
                  </label>
                  <input
                    id="pf-username"
                    className={inputField(inErr("userName"))}
                    value={v.userName ?? ""}
                    onChange={(e) => setF("userName", e.target.value)}
                    autoComplete="username"
                    disabled={formBusy}
                    aria-invalid={!!err.userName}
                    aria-describedby={errId("userName")}
                  />
                  <FieldErr id="userName-err" message={err.userName} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="pf-email">
                    Email
                  </label>
                  <input
                    id="pf-email"
                    className={inputField(inErr("email"))}
                    type="email"
                    value={v.email ?? ""}
                    onChange={(e) => setF("email", e.target.value)}
                    autoComplete="email"
                    disabled={formBusy}
                    aria-invalid={!!err.email}
                    aria-describedby={errId("email")}
                  />
                  <FieldErr id="email-err" message={err.email} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="pf-password">
                    Password
                  </label>
                  <div className={`relative ${fieldTop}`}>
                    <input
                      id="pf-password"
                      className={`${inputCore} pr-12 ${inErr("password")}`}
                      type={showPw ? "text" : "password"}
                      value={v.password ?? ""}
                      onChange={(e) => setF("password", e.target.value)}
                      autoComplete="new-password"
                      disabled={formBusy}
                      aria-invalid={!!err.password}
                      aria-describedby={errId("password")}
                    />
                    <button
                      type="button"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      onClick={() => setShowPw((s) => !s)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? "Hide" : "Show"}
                    </button>
                  </div>
                  <FieldErr id="password-err" message={err.password} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls} htmlFor="pf-password2">
                    Confirm password
                  </label>
                  <div className={`relative ${fieldTop}`}>
                    <input
                      id="pf-password2"
                      className={`${inputCore} pr-12 ${inErr("password2")}`}
                      type={showPw2 ? "text" : "password"}
                      value={v.password2 ?? ""}
                      onChange={(e) => setF("password2", e.target.value)}
                      autoComplete="new-password"
                      disabled={formBusy}
                      aria-invalid={!!err.password2}
                      aria-describedby={errId("password2")}
                    />
                    <button
                      type="button"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      onClick={() => setShowPw2((s) => !s)}
                      aria-label={showPw2 ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showPw2 ? "Hide" : "Show"}
                    </button>
                  </div>
                  <FieldErr id="password2-err" message={err.password2} />
                </div>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-slate-600">
                Only the patient profile and demographics you enter below are stored; no system login is
                created.
              </p>
            )}
          </FormSection>
        )}

        <FormSection
          icon={<IconPerson />}
          title="Personal Information"
          subtitle="Identity details and contact information."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="pf-first">
                First name
              </label>
              <input
                id="pf-first"
                className={inputField(inErr("firstName"))}
                value={v.firstName ?? ""}
                onChange={(e) => setF("firstName", e.target.value)}
                autoComplete="given-name"
                disabled={formBusy}
                aria-invalid={!!err.firstName}
                aria-describedby={errId("firstName")}
              />
              <FieldErr id="firstName-err" message={err.firstName} />
            </div>
            <div>
              <label className={labelCls} htmlFor="pf-last">
                Last name
              </label>
              <input
                id="pf-last"
                className={inputField(inErr("lastName"))}
                value={v.lastName ?? ""}
                onChange={(e) => setF("lastName", e.target.value)}
                autoComplete="family-name"
                disabled={formBusy}
                aria-invalid={!!err.lastName}
                aria-describedby={errId("lastName")}
              />
              <FieldErr id="lastName-err" message={err.lastName} />
            </div>
            <div>
              <label className={labelCls} htmlFor="pf-pn">
                Personal number
              </label>
              <input
                id="pf-pn"
                className={inputField()}
                value={v.personalNumber ?? ""}
                onChange={(e) => setF("personalNumber", e.target.value)}
                autoComplete="off"
                disabled={formBusy}
              />
              <p className="mt-1 text-[0.7rem] text-slate-400">
                National ID or equivalent identifier, if applicable.
              </p>
            </div>
            <div>
              <label className={labelCls} htmlFor="pf-dob">
                Date of birth
              </label>
              <input
                id="pf-dob"
                className={inputField()}
                type="date"
                value={v.dateOfBirth ?? ""}
                onChange={(e) => setF("dateOfBirth", e.target.value)}
                disabled={formBusy}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="pf-gender">
                Gender
              </label>
              <select
                id="pf-gender"
                className={selectCls("gender", err)}
                value={v.gender ?? ""}
                onChange={(e) => setF("gender", e.target.value)}
                disabled={formBusy}
              >
                <option value="">Not specified</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="pf-phone">
                Phone
              </label>
              <input
                id="pf-phone"
                className={inputField()}
                value={v.phone ?? ""}
                onChange={(e) => setF("phone", e.target.value)}
                autoComplete="tel"
                disabled={formBusy}
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          icon={<IconMap />}
          title="Address Information"
          subtitle="Residence and location details."
        >
          <div className="space-y-4">
            <div>
              <label className={labelCls} htmlFor="pf-addr">
                Address
              </label>
              <input
                id="pf-addr"
                className={inputField()}
                value={v.address ?? ""}
                onChange={(e) => setF("address", e.target.value)}
                disabled={formBusy}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls} htmlFor="pf-city">
                  City
                </label>
                <input
                  id="pf-city"
                  className={inputField()}
                  value={v.city ?? ""}
                  onChange={(e) => setF("city", e.target.value)}
                  disabled={formBusy}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="pf-country">
                  Country
                </label>
                <input
                  id="pf-country"
                  className={inputField()}
                  value={v.country ?? ""}
                  onChange={(e) => setF("country", e.target.value)}
                  autoComplete="country-name"
                  disabled={formBusy}
                />
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection
          icon={<IconMedical />}
          title="Patient Medical Profile"
          subtitle="Insurance, blood type, and assigned primary doctor."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="pf-ins">
                Insurance number
              </label>
              <input
                id="pf-ins"
                className={inputField()}
                value={v.insuranceNumber ?? ""}
                onChange={(e) => setF("insuranceNumber", e.target.value)}
                disabled={formBusy}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="pf-blood">
                Blood type
              </label>
              <select
                id="pf-blood"
                className={selectCls("bloodType", err)}
                value={v.bloodType ?? ""}
                onChange={(e) => setF("bloodType", e.target.value)}
                disabled={formBusy}
              >
                <option value="">Not specified</option>
                {BLOOD_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <span className={labelCls}>Primary doctor</span>
              <PrimaryDoctorSelect
                hideLabel
                value={v.primaryDoctorId ?? ""}
                onValueChange={(s) => setF("primaryDoctorId", s)}
                disabled={formBusy}
              />
            </div>
          </div>
        </FormSection>
      </div>

      <div className="mt-1 flex flex-col gap-3 border-t border-slate-200/90 pt-5 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={formBusy}
          className="order-2 w-full rounded-xl border border-slate-200/90 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:order-1 sm:w-auto"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="order-1 w-full rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 sm:order-2 sm:min-w-[9rem] sm:w-auto"
        >
          {submitting
            ? "Saving…"
            : isEdit
              ? "Update patient"
              : "Register patient"}
        </button>
      </div>
    </form>
  );
}

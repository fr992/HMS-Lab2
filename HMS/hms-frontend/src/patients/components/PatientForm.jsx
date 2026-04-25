import { useState, useMemo } from "react";
import PrimaryDoctorSelect from "@/patients/components/PrimaryDoctorSelect";
import {
  normalizeGenderValue,
  normalizeBloodTypeValue,
  BLOOD_TYPES,
} from "@/patients/patientFieldOptions";

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

/**
 * @param {object} p
 * @param {"create"|"edit"} p.mode
 * @param {object} [p.initial] patient DTO for edit
 * @param {boolean} p.submitting
 * @param {function} p.onSubmit
 * @param {function} p.onCancel
 */
export default function PatientForm({
  mode,
  initial = null,
  submitting,
  onSubmit,
  onCancel,
}) {
  const isEdit = mode === "edit";

  const [v, setV] = useState(() => {
    if (mode === "create") return { ...initialCreate };
    if (initial) return patientToFormState(initial);
    return { ...initialCreate };
  });
  const [err, setErr] = useState({});

  const canSubmit = useMemo(() => !submitting, [submitting]);

  const setF = (name, value) => {
    setV((s) => ({ ...s, [name]: value }));
  };

  const validateCreate = () => {
    const e = {};
    if (!v.userName?.trim()) e.userName = "Required";
    if (!v.email?.trim()) e.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) {
      e.email = "Invalid email";
    }
    if (!v.password) e.password = "Required";
    else if (v.password.length < 6) e.password = "At least 6 characters";
    if (v.password !== v.password2) e.password2 = "Passwords do not match";
    if (!v.firstName?.trim()) e.firstName = "Required";
    if (!v.lastName?.trim()) e.lastName = "Required";
    return e;
  };

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
      onSubmit({
        userName: v.userName.trim(),
        email: v.email.trim(),
        password: v.password,
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

  const inErr = (name) =>
    err[name] ? "border-rose-500" : "border-slate-300";

  const selectClass = (name) =>
    `mt-1 w-full rounded border ${inErr(name)} bg-white px-2 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {isEdit && initial && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <p>
            <span className="text-slate-500">Patient number: </span>
            <span className="font-medium text-slate-800">
              {initial.patientNumber}
            </span>
          </p>
          {initial.userName && (
            <p className="mt-1">
              <span className="text-slate-500">Account: </span>
              {initial.userName} &middot; {initial.email}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-slate-600">
            First name
          </label>
          <input
            className={`mt-1 w-full rounded border ${inErr("firstName")} px-2 py-2 text-sm`}
            value={v.firstName ?? ""}
            onChange={(e) => setF("firstName", e.target.value)}
            autoComplete="given-name"
            disabled={submitting}
            required
          />
          {err.firstName && (
            <p className="mt-0.5 text-xs text-rose-600">{err.firstName}</p>
          )}
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Last name</label>
          <input
            className={`mt-1 w-full rounded border ${inErr("lastName")} px-2 py-2 text-sm`}
            value={v.lastName ?? ""}
            onChange={(e) => setF("lastName", e.target.value)}
            autoComplete="family-name"
            disabled={submitting}
            required
          />
          {err.lastName && (
            <p className="mt-0.5 text-xs text-rose-600">{err.lastName}</p>
          )}
        </div>
        {!isEdit && (
          <>
            <div>
              <label className="text-xs font-medium text-slate-600">
                Username
              </label>
              <input
                className={`mt-1 w-full rounded border ${inErr("userName")} px-2 py-2 text-sm`}
                value={v.userName ?? ""}
                onChange={(e) => setF("userName", e.target.value)}
                autoComplete="username"
                disabled={submitting}
              />
              {err.userName && (
                <p className="mt-0.5 text-xs text-rose-600">{err.userName}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Email</label>
              <input
                className={`mt-1 w-full rounded border ${inErr("email")} px-2 py-2 text-sm`}
                type="email"
                value={v.email ?? ""}
                onChange={(e) => setF("email", e.target.value)}
                autoComplete="email"
                disabled={submitting}
              />
              {err.email && (
                <p className="mt-0.5 text-xs text-rose-600">{err.email}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">
                Password
              </label>
              <input
                className={`mt-1 w-full rounded border ${inErr("password")} px-2 py-2 text-sm`}
                type="password"
                value={v.password ?? ""}
                onChange={(e) => setF("password", e.target.value)}
                autoComplete="new-password"
                disabled={submitting}
              />
              {err.password && (
                <p className="mt-0.5 text-xs text-rose-600">{err.password}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">
                Confirm password
              </label>
              <input
                className={`mt-1 w-full rounded border ${inErr("password2")} px-2 py-2 text-sm`}
                type="password"
                value={v.password2 ?? ""}
                onChange={(e) => setF("password2", e.target.value)}
                autoComplete="new-password"
                disabled={submitting}
              />
              {err.password2 && (
                <p className="mt-0.5 text-xs text-rose-600">{err.password2}</p>
              )}
            </div>
          </>
        )}

        <div>
          <label className="text-xs font-medium text-slate-600">
            Personal number
          </label>
          <input
            className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm"
            value={v.personalNumber ?? ""}
            onChange={(e) => setF("personalNumber", e.target.value)}
            disabled={submitting}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">
            Date of birth
          </label>
          <input
            className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm"
            type="date"
            value={v.dateOfBirth ?? ""}
            onChange={(e) => setF("dateOfBirth", e.target.value)}
            disabled={submitting}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600" htmlFor="pf-gender">
            Gender
          </label>
          <select
            id="pf-gender"
            className={selectClass("gender")}
            value={v.gender ?? ""}
            onChange={(e) => setF("gender", e.target.value)}
            disabled={submitting}
          >
            <option value="">Not specified</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Phone</label>
          <input
            className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm"
            value={v.phone ?? ""}
            onChange={(e) => setF("phone", e.target.value)}
            autoComplete="tel"
            disabled={submitting}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-slate-600">Address</label>
          <input
            className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm"
            value={v.address ?? ""}
            onChange={(e) => setF("address", e.target.value)}
            disabled={submitting}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">City</label>
          <input
            className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm"
            value={v.city ?? ""}
            onChange={(e) => setF("city", e.target.value)}
            disabled={submitting}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Country</label>
          <input
            className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm"
            value={v.country ?? ""}
            onChange={(e) => setF("country", e.target.value)}
            disabled={submitting}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">
            Insurance number
          </label>
          <input
            className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm"
            value={v.insuranceNumber ?? ""}
            onChange={(e) => setF("insuranceNumber", e.target.value)}
            disabled={submitting}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600" htmlFor="pf-blood">
            Blood type
          </label>
          <select
            id="pf-blood"
            className={selectClass("bloodType")}
            value={v.bloodType ?? ""}
            onChange={(e) => setF("bloodType", e.target.value)}
            disabled={submitting}
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
          <PrimaryDoctorSelect
            value={v.primaryDoctorId ?? ""}
            onValueChange={(s) => setF("primaryDoctorId", s)}
            disabled={submitting}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Create patient"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import {
  fetchPatientById,
  fetchPatientContacts,
  getApiErrorMessage,
} from "@/patients/patientsApi";

const labelCls =
  "text-xs font-semibold uppercase tracking-wide text-slate-500";

function toDisplayDate(v) {
  if (v == null) return "—";
  if (typeof v === "string") {
    if (v.length >= 10) return v.slice(0, 10);
    return v;
  }
  return String(v);
}

function voidStr(v) {
  if (v == null || v === "") return "—";
  return String(v);
}

function DetailSection({ icon, title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm sm:p-6">
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

function DetailField({ label, value }) {
  return (
    <div>
      <p className={labelCls}>{label}</p>
      <p className="mt-1.5 text-sm text-slate-900">{value}</p>
    </div>
  );
}

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
function IconPatientContact() {
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
        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a1.5 1.5 0 001.5-1.5v-3.75a1.125 1.125 0 00-1.12-1.12H17.1a1.06 1.06 0 00-.89.45l-1.8 2.1a9.1 9.1 0 01-3.3-1.5 9.1 9.1 0 01-1.5-3.3l2.1-1.8a1.05 1.05 0 00.45-.9V3.6a1.12 1.12 0 00-1.2-1.1H3.6a1.5 1.5 0 00-1.35 1.1z"
      />
    </svg>
  );
}

export default function PatientDetailPage() {
  const { id } = useParams();
  const patientId = Number.parseInt(id, 10);
  const navigate = useNavigate();
  const auth = useAuth();
  const canUpdate = auth.hasPermission("Patients.Update");

  const [patient, setPatient] = useState(null);
  const [error, setError] = useState(null);
  const [contactState, setContactState] = useState({
    status: "loading",
    list: [],
    error: null,
  });

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

  useEffect(() => {
    let cancel = false;
    setContactState({ status: "loading", list: [], error: null });
    (async () => {
      try {
        const list = await fetchPatientContacts(patientId);
        if (cancel) return;
        setContactState({
          status: "ready",
          list: Array.isArray(list) ? list : [],
          error: null,
        });
      } catch (e) {
        if (!cancel) {
          setContactState({
            status: "error",
            list: [],
            error: getApiErrorMessage(e),
          });
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, [patientId]);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <div
          className="rounded-xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm text-rose-900 shadow-sm"
          role="alert"
        >
          <p className="font-medium">Could not open patient</p>
          <p className="mt-1">{error}</p>
        </div>
        <Link
          to="/patients"
          className="mt-4 inline-flex rounded-xl border border-slate-200/90 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
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

  const hasPortal = Boolean(patient.userId);
  const primaryDoctorLabel =
    patient.primaryDoctorName && String(patient.primaryDoctorName).trim() !== ""
      ? patient.primaryDoctorName
      : patient.primaryDoctorId != null
        ? `#${patient.primaryDoctorId}`
        : "—";

  const contactsOrdered = [...(contactState.list || [])].sort(
    (a, b) =>
      (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {patient.lastName}, {patient.firstName}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            View registration and clinical summary for this record.
          </p>
        </div>
        {canUpdate && (
          <Link
            to={`/patients/${patient.id}/edit`}
            className="shrink-0 self-start rounded-xl bg-sky-600 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            Edit
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p>
          <span className="text-slate-500">Patient # </span>
          <span className="font-mono font-medium text-slate-900">
            {voidStr(patient.patientNumber)}
          </span>
        </p>
        {hasPortal ? (
          <p className="text-xs text-slate-600 sm:text-sm">
            <span className="text-slate-500">Account </span>
            {voidStr(patient.userName)}
            {patient.email ? (
              <>
                <span className="text-slate-400"> · </span>
                {patient.email}
              </>
            ) : null}
          </p>
        ) : (
          <p className="text-xs text-slate-500 sm:text-sm">
            No patient portal account
          </p>
        )}
      </div>

      <div className="space-y-5">
        <DetailSection
          icon={<IconAccount />}
          title="Account"
          subtitle={
            hasPortal
              ? "Portal sign-in linked to this patient record."
              : "This record has no system login; credentials can be added from Edit when needed."
          }
        >
          {hasPortal ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField label="Username" value={voidStr(patient.userName)} />
              <DetailField label="Email" value={voidStr(patient.email)} />
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-slate-600">
              No username or email on file.
            </p>
          )}
        </DetailSection>

        <DetailSection
          icon={<IconPerson />}
          title="Personal information"
          subtitle="Identity details and the patient's own phone number."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailField
              label="First name"
              value={voidStr(patient.firstName)}
            />
            <DetailField
              label="Last name"
              value={voidStr(patient.lastName)}
            />
            <DetailField
              label="Personal number"
              value={voidStr(patient.personalNumber)}
            />
            <DetailField
              label="Date of birth"
              value={toDisplayDate(patient.dateOfBirth)}
            />
            <DetailField label="Gender" value={voidStr(patient.gender)} />
            <DetailField label="Phone" value={voidStr(patient.phone)} />
          </div>
        </DetailSection>

        <DetailSection
          icon={<IconPatientContact />}
          title="Patient contact"
          subtitle="Emergency or next of kin. One may be marked as primary."
        >
          {contactState.status === "loading" && (
            <p className="text-sm text-slate-500" aria-live="polite">
              Loading contacts…
            </p>
          )}
          {contactState.status === "error" && (
            <p
              className="text-sm text-rose-700"
              role="alert"
            >
              {contactState.error}
            </p>
          )}
          {contactState.status === "ready" && contactsOrdered.length === 0 && (
            <p className="text-sm leading-relaxed text-slate-600">
              No emergency contacts on file.
            </p>
          )}
          {contactState.status === "ready" && contactsOrdered.length > 0 && (
            <div className="space-y-4">
              {contactsOrdered.map((c, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 shadow-sm sm:p-5"
                >
                  <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {voidStr(c.name)}
                    </p>
                    {c.isPrimary && (
                      <span className="shrink-0 rounded-lg bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <DetailField
                      label="Relationship"
                      value={voidStr(c.relationship)}
                    />
                    <DetailField label="Phone" value={voidStr(c.phone)} />
                    <div className="sm:col-span-2">
                      <DetailField
                        label="Email"
                        value={voidStr(c.email)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DetailSection>

        <DetailSection
          icon={<IconMap />}
          title="Address"
          subtitle="Residence and location."
        >
          <div className="space-y-4">
            <DetailField
              label="Address"
              value={voidStr(patient.address)}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField label="City" value={voidStr(patient.city)} />
              <DetailField label="Country" value={voidStr(patient.country)} />
            </div>
          </div>
        </DetailSection>

        <DetailSection
          icon={<IconMedical />}
          title="Patient medical profile"
          subtitle="Insurance, blood type, and primary doctor."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailField
              label="Insurance number"
              value={voidStr(patient.insuranceNumber)}
            />
            <DetailField
              label="Blood type"
              value={voidStr(patient.bloodType)}
            />
            <div className="sm:col-span-2">
              <DetailField label="Primary doctor" value={primaryDoctorLabel} />
            </div>
          </div>
        </DetailSection>
      </div>

      <div className="pt-1">
        <button
          type="button"
          onClick={() => navigate("/patients")}
          className="inline-flex rounded-xl border border-slate-200/90 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Back to patients
        </button>
      </div>
    </div>
  );
}

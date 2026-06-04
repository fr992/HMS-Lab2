import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthContext";
import { HOSPITAL_FULL_NAME, HOSPITAL_LOGO_PATH } from "@/config/branding";
import { encountersApi } from "./api/encountersApi";
import { fetchSettingsUntilKeys } from "@/features/settings/api/settingsApi";

const STAMP_IMAGE_PATH = "/1d28c6d0-e210-4069-bca0-3b8c31052794.png";
const HOSPITAL_SETTING_KEYS = [
  "hospital.name",
  "hospital.email",
  "hospital.phone",
  "hospital.address",
  "hospital.logoUrl",
];

function formatVisitDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString();
}

function valueOrDash(value) {
  const normalized = String(value ?? "").trim();
  return normalized || "-";
}

function settingValue(settingsByKey, key) {
  return settingsByKey.get(key)?.value?.trim() || "";
}

function patientName(patient, encounter) {
  const fullName = [patient?.firstName, patient?.lastName].filter(Boolean).join(" ").trim();
  return fullName || encounter?.patientName || "-";
}

function titleCase(value) {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "-";
}

function patientStatus(status) {
  return String(status ?? "").toLowerCase() === "completed" ? "Completed" : "Ongoing";
}

function resultSummary(result) {
  return [
    result?.resultData,
    result?.referenceRange ? `Reference range: ${result.referenceRange}` : "",
    result?.interpretation,
  ]
    .filter((part) => String(part ?? "").trim())
    .join(" | ");
}

export default function EncounterPrintPage() {
  const { encounterId } = useParams();
  const auth = useAuth();
  const [panel, setPanel] = useState(null);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPrintData() {
      setLoading(true);
      setError("");

      try {
        const panelRequest = auth.hasRole?.("Patient")
          ? encountersApi.getPatientEncounterPanel(encounterId)
          : encountersApi.getPanel(encounterId);

        const [panelResponse, settingsResponse] = await Promise.all([
          panelRequest,
          auth.hasPermission("Settings.Manage")
            ? fetchSettingsUntilKeys(HOSPITAL_SETTING_KEYS, { pageSize: 100 }).catch(() => ({ items: [] }))
            : Promise.resolve({ items: [] }),
        ]);

        if (!cancelled) {
          setPanel(panelResponse.data);
          setSettings(settingsResponse.items ?? []);
        }
      } catch (err) {
        console.error("Failed to load encounter print data", err);
        if (!cancelled) setError("Failed to load encounter print document.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPrintData();

    return () => {
      cancelled = true;
    };
  }, [auth, encounterId]);

  useEffect(() => {
    if (loading || error || !panel) return;

    const timeout = window.setTimeout(() => {
      window.print();
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [error, loading, panel]);

  const settingsByKey = useMemo(
    () => new Map(settings.map((setting) => [setting.key, setting])),
    [settings]
  );

  const hospital = {
    name: HOSPITAL_FULL_NAME,
    email: settingValue(settingsByKey, "hospital.email"),
    phone: settingValue(settingsByKey, "hospital.phone"),
    address: settingValue(settingsByKey, "hospital.address"),
    logoUrl: settingValue(settingsByKey, "hospital.logoUrl") || HOSPITAL_LOGO_PATH,
  };

  if (loading) {
    return (
      <div className="flex min-h-[18rem] items-center justify-center text-sm text-slate-500">
        Loading print document...
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-sm text-rose-600">{error}</div>;
  }

  if (!panel) {
    return <div className="p-6 text-sm text-slate-600">No encounter data found.</div>;
  }

  const {
    encounter,
    patient,
    diagnoses = [],
    prescriptions = [],
    labRequests = [],
  } = panel;

  const printedOn = new Date();
  const backPath = auth.hasRole?.("Patient")
    ? "/patient/encounters"
    : auth.hasRole?.("Doctor")
      ? `/doctor/encounters/${encounterId}`
      : `/admin/encounters/${encounterId}`;

  return (
    <div className="encounter-print-shell bg-slate-100 px-4 py-6 text-slate-950">
      <div className="encounter-print-toolbar mx-auto mb-4 flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline">
          <Link to={backPath}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            Back
          </Link>
        </Button>
        <Button type="button" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" aria-hidden />
          Print Patient Report
        </Button>
      </div>

      <article className="encounter-print-document mx-auto min-h-[297mm] max-w-5xl bg-white p-10 shadow-sm">
        <header className="encounter-print-header">
          <div className="flex items-start gap-4">
            {hospital.logoUrl && (
              <img
                className="encounter-print-logo"
                src={hospital.logoUrl}
                alt=""
              />
            )}
            <div>
              <p className="encounter-print-kicker">Patient Medical Summary Report</p>
              <h1>{hospital.name}</h1>
              <p className="encounter-print-contact">
                {[hospital.address, hospital.phone, hospital.email].filter(Boolean).join(" | ")}
              </p>
            </div>
          </div>
        </header>

        <section className="encounter-print-section">
          <h2>Patient Information</h2>
          <dl className="encounter-print-grid">
            <Field label="Full Name" value={patientName(patient, encounter)} />
            <Field label="Date of Birth" value={formatDate(patient?.dateOfBirth)} />
            <Field label="Gender" value={patient?.gender} />
            <Field label="Blood Type" value={patient?.bloodType} />
            <Field label="Phone" value={patient?.phone} />
            <Field
              label="Address"
              value={[patient?.address, patient?.city, patient?.country].filter(Boolean).join(", ")}
            />
          </dl>
        </section>

        <section className="encounter-print-section">
          <h2>Visit Summary</h2>
          <dl className="encounter-print-grid">
            <Field label="Doctor" value={encounter.doctorName} />
            <Field label="Department / Clinic" value={encounter.departmentName} />
            <Field label="Visit Date" value={formatVisitDate(encounter.startedAt)} />
            <Field label="Visit Type" value={titleCase(encounter.encounterType)} />
            <Field label="Visit Status" value={patientStatus(encounter.status)} />
          </dl>
          <TextBlock label="Doctor's Notes" value={encounter.notes} />
        </section>

        <section className="encounter-print-section">
          <h2>Diagnoses</h2>
          {diagnoses.length > 0 ? (
            <ul className="encounter-print-list">
              {diagnoses.map((diagnosis) => (
                <li key={diagnosis.id}>
                  <strong>{valueOrDash(diagnosis.description)}</strong>
                  {diagnosis.notes && <span>{diagnosis.notes}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyLine>No diagnoses were recorded for this visit.</EmptyLine>
          )}
        </section>

        <section className="encounter-print-section">
          <h2>Prescriptions</h2>
          {prescriptions.length > 0 ? (
            <div className="encounter-print-stack">
              {prescriptions.map((prescription) => (
                <div key={prescription.id} className="encounter-print-subsection">
                  {prescription.notes && <p>Notes: {prescription.notes}</p>}
                  {(prescription.items ?? []).length > 0 ? (
                    <table className="encounter-print-table">
                      <thead>
                        <tr>
                          <th>Medication</th>
                          <th>Dosage</th>
                          <th>Frequency</th>
                          <th>Duration</th>
                          <th>Instructions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prescription.items.map((item) => (
                          <tr key={item.id}>
                            <td>{valueOrDash(item.medicationName)}</td>
                            <td>{valueOrDash(item.dosage)}</td>
                            <td>{valueOrDash(item.frequency)}</td>
                            <td>{valueOrDash(item.duration)}</td>
                            <td>{valueOrDash(item.instructions)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <EmptyLine>No medication items were recorded.</EmptyLine>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyLine>No prescriptions were recorded for this visit.</EmptyLine>
          )}
        </section>

        <section className="encounter-print-section">
          <h2>Lab Results</h2>
          {labRequests.length > 0 ? (
            <div className="encounter-print-stack">
              {labRequests.map((request) => (
                <div key={request.id} className="encounter-print-subsection">
                  <TextBlock label="Clinical Notes" value={request.clinicalNotes} />
                  {(request.items ?? []).map((item) => (
                    <div key={item.id} className="encounter-print-lab-item">
                      <strong>{valueOrDash(item.testName)}</strong>
                      {(item.results ?? []).length > 0 ? (
                        <ul className="encounter-print-result-list">
                          {item.results.map((result) => (
                            <li key={result.id}>{valueOrDash(resultSummary(result))}</li>
                          ))}
                        </ul>
                      ) : (
                        <EmptyLine>Result summary is not available yet.</EmptyLine>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <EmptyLine>No lab results are available for this visit.</EmptyLine>
          )}
        </section>

        <footer className="encounter-print-footer">
          <div>
            <p>Printed on: {formatVisitDate(printedOn)}</p>
          </div>
          <img
            className="encounter-print-stamp"
            src={STAMP_IMAGE_PATH}
            alt="Nexora Hospital official seal"
          />
        </footer>
      </article>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="encounter-print-field">
      <dt>{label}</dt>
      <dd>{valueOrDash(value)}</dd>
    </div>
  );
}

function TextBlock({ label, value }) {
  if (!String(value ?? "").trim()) return null;

  return (
    <div className="encounter-print-text-block">
      <h3>{label}</h3>
      <p>{value}</p>
    </div>
  );
}

function EmptyLine({ children }) {
  return <p className="encounter-print-empty">{children}</p>;
}

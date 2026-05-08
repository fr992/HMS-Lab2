import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/auth/AuthContext";
import { encountersApi } from "./api/encountersApi";
import { useEncounterPanelStore } from "./encounterPanelStore";
import DiagnosesSection from "./components/DiagnosesSection";

const ENCOUNTER_TYPES = [
  { value: "outpatient", label: "Outpatient" },
  { value: "emergency", label: "Emergency" },
  { value: "follow_up", label: "Follow-up" },
];


const HISTORY_PAGE_SIZE = 5;

function toDateTimeLocalValue(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString();
}

function pageItems(items, page) {
  const totalPages = Math.max(1, Math.ceil(items.length / HISTORY_PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * HISTORY_PAGE_SIZE;

  return {
    totalPages,
    safePage,
    items: items.slice(start, start + HISTORY_PAGE_SIZE),
  };
}

function filterMedications(medications, searchTerm) {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return medications;

  return medications.filter((medication) =>
    [medication.name, medication.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(term)
  );
}

function filterLabTests(labTests, searchTerm) {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return labTests;

  return labTests.filter((test) =>
    [test.testCode, test.name, test.specimenType, test.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(term)
  );
}

export default function EncounterPanelPage() {
  const { encounterId } = useParams();
  const auth = useAuth();
  const {
    panel,
    loading,
    saving,
    error,
    loadPanel,
    updateEncounter,
    createDiagnosis,
    createPrescription,
    createLabRequest,
    closeEncounter,
  } = useEncounterPanelStore();

  
  const [prescriptionForm, setPrescriptionForm] = useState({
    notes: "",
    medicationId: "",
    dosage: "",
    frequency: "",
    duration: "",
    instructions: "",
  });
  const [editingEncounter, setEditingEncounter] = useState(false);
  const [encounterForm, setEncounterForm] = useState({
    encounterType: "outpatient",
    startedAt: "",
    endedAt: "",
    notes: "",
  });
  const [completingEncounter, setCompletingEncounter] = useState(false);
  const [completionNotice, setCompletionNotice] = useState(false);
  const [prescriptionPage, setPrescriptionPage] = useState(1);
  const [medications, setMedications] = useState([]);
  const [medicationSearch, setMedicationSearch] = useState("");
  const [medicationsLoading, setMedicationsLoading] = useState(false);
  const [medicationsError, setMedicationsError] = useState("");
  const [labRequestForm, setLabRequestForm] = useState({
    priority: "routine",
    clinicalNotes: "",
    selectedTestIds: [],
  });
  const [labRequestPage, setLabRequestPage] = useState(1);
  const [labTests, setLabTests] = useState([]);
  const [labTestSearch, setLabTestSearch] = useState("");
  const [labTestsLoading, setLabTestsLoading] = useState(false);
  const [labTestsError, setLabTestsError] = useState("");

  useEffect(() => {
    void loadPanel(encounterId);
  }, [encounterId, loadPanel]);

  useEffect(() => {
    if (!auth.hasPermission("Medications.Read")) return;

    let cancelled = false;

    async function loadMedications() {
      setMedicationsLoading(true);
      setMedicationsError("");

      try {
        const response = await encountersApi.getActiveMedications();
        if (!cancelled) {
          setMedications(Array.isArray(response.data) ? response.data : response.data?.items ?? []);
        }
      } catch (err) {
        console.error("Failed to load medications", err);
        if (!cancelled) {
          setMedications([]);
          setMedicationsError("Failed to load medications.");
        }
      } finally {
        if (!cancelled) {
          setMedicationsLoading(false);
        }
      }
    }

    void loadMedications();

    return () => {
      cancelled = true;
    };
  }, [auth]);

  useEffect(() => {
    if (!auth.hasPermission("LabTests.Read")) return;

    let cancelled = false;

    async function loadLabTests() {
      setLabTestsLoading(true);
      setLabTestsError("");

      try {
        const response = await encountersApi.getActiveLabTests();
        if (!cancelled) {
          setLabTests(Array.isArray(response.data) ? response.data : response.data?.items ?? []);
        }
      } catch (err) {
        console.error("Failed to load lab tests", err);
        if (!cancelled) {
          setLabTests([]);
          setLabTestsError("Failed to load lab tests.");
        }
      } finally {
        if (!cancelled) {
          setLabTestsLoading(false);
        }
      }
    }

    void loadLabTests();

    return () => {
      cancelled = true;
    };
  }, [auth]);

  if (loading) {
    return (
      <div className="flex min-h-[18rem] items-center justify-center text-sm text-slate-500">
        Loading encounter panel...
      </div>
    );
  }

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!panel) return <div className="p-6">No encounter data found.</div>;
  const { encounter, patient, diagnoses, prescriptions, labRequests = [] } = panel;

  const isOpen = String(encounter.status ?? "").toLowerCase() === "open";
  const canUpdateEncounter = auth.hasPermission("Encounters.Update");
  const canCloseEncounter = auth.hasPermission("Encounters.Close");
  const listPath =
    auth.userRole === "Admin" ? "/admin/encounters" : "/doctor/encounters";
  const prescriptionPaging = pageItems(prescriptions, prescriptionPage);
  const labRequestPaging = pageItems(labRequests, labRequestPage);
  const filteredMedications = filterMedications(medications, medicationSearch);
  const filteredLabTests = filterLabTests(labTests, labTestSearch);


  function beginEditEncounter() {
    setEncounterForm({
      encounterType: encounter.encounterType || "outpatient",
      startedAt: toDateTimeLocalValue(encounter.startedAt),
      endedAt: toDateTimeLocalValue(encounter.endedAt),
      notes: encounter.notes || "",
    });
    setEditingEncounter(true);
  }

  async function handleUpdateEncounter(e) {
    e.preventDefault();

    await updateEncounter(encounterId, {
      encounterType: encounterForm.encounterType,
      startedAt: fromDateTimeLocalValue(encounterForm.startedAt),
      endedAt: fromDateTimeLocalValue(encounterForm.endedAt),
      notes: encounterForm.notes || null,
    });

    setEditingEncounter(false);
  }

  async function handleCreatePrescription(e) {
    e.preventDefault();

    await createPrescription(encounterId, {
      encounterId: Number(encounterId),
      prescribedByDoctorId: encounter.doctorProfileId,
      notes: prescriptionForm.notes || null,
      items: [
        {
          medicationId: Number(prescriptionForm.medicationId),
          dosage: prescriptionForm.dosage,
          frequency: prescriptionForm.frequency,
          duration: prescriptionForm.duration,
          instructions: prescriptionForm.instructions || null,
        },
      ],
    });

    setPrescriptionForm({
      notes: "",
      medicationId: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
    });
    setMedicationSearch("");
    setPrescriptionPage(1);
  }

  async function handleCreateLabRequest(e) {
    e.preventDefault();

    const selectedTests = labTests.filter((test) =>
      labRequestForm.selectedTestIds.includes(String(test.id))
    );

    if (selectedTests.length === 0) return;

    await createLabRequest(encounterId, {
      priority: labRequestForm.priority,
      clinicalNotes: labRequestForm.clinicalNotes || null,
      items: selectedTests.map((test) => ({
        labTestId: test.id,
        notes: null,
      })),
    });

    setLabRequestForm({
      priority: "routine",
      clinicalNotes: "",
      selectedTestIds: [],
    });
    setLabTestSearch("");
    setLabRequestPage(1);
  }

  async function handleCompleteEncounter() {
    setCompletingEncounter(true);
    try {
      await closeEncounter(encounterId);
      setCompletionNotice(true);
      window.setTimeout(() => setCompletionNotice(false), 3000);
    } finally {
      setCompletingEncounter(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button asChild variant="outline" size="icon" className="mt-1">
            <Link to={listPath} aria-label="Back to encounters">
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Encounter
            </p>
            <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              {encounter.encounterNumber}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {encounter.patientName} with {encounter.doctorName}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-slate-200 bg-white">
            {encounter.status}
          </Badge>
          {isOpen && canCloseEncounter && (
            <Button
              type="button"
              disabled={saving || completingEncounter}
              onClick={handleCompleteEncounter}
              className="relative overflow-hidden bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-80"
            >
              {completingEncounter && (
                <span className="absolute inset-0 bg-white/20 animate-pulse" />
              )}
              <span className="relative inline-flex items-center gap-2">
                {completingEncounter ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                )}
                {completingEncounter ? "Completing..." : "Complete Encounter"}
              </span>
            </Button>
          )}
        </div>
      </div>

      {completionNotice && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-sm animate-in fade-in slide-in-from-top-1"
        >
          Encounter completed successfully.
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Encounter Info</CardTitle>
          {isOpen && canUpdateEncounter && !editingEncounter && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={beginEditEncounter}
            >
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingEncounter ? (
            <EncounterEditForm
              form={encounterForm}
              saving={saving}
              onChange={setEncounterForm}
              onSubmit={handleUpdateEncounter}
              onCancel={() => setEditingEncounter(false)}
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <Info label="Status" value={<Badge>{encounter.status}</Badge>} />
              <Info label="Patient" value={encounter.patientName} />
              <Info label="Doctor" value={encounter.doctorName} />
              <Info label="Type" value={encounter.encounterType} />
              <Info label="Started At" value={formatDate(encounter.startedAt)} />
              <Info label="Ended At" value={formatDate(encounter.endedAt)} />
              <Info label="Notes" value={encounter.notes || "-"} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Patient Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Info
            label="Full Name"
            value={`${patient.firstName} ${patient.lastName}`}
          />
          <Info label="Patient No." value={patient.patientNumber} />
          <Info label="Personal No." value={patient.personalNumber || "-"} />
          <Info label="Date of Birth" value={formatDate(patient.dateOfBirth)} />
          <Info label="Gender" value={patient.gender || "-"} />
          <Info label="Phone" value={patient.phone || "-"} />
          <Info label="Blood Type" value={patient.bloodType || "-"} />
          <Info label="Insurance" value={patient.insuranceNumber || "-"} />
        </CardContent>
      </Card>

      <DiagnosesSection
          encounterId={encounterId}
          diagnoses={diagnoses}
          isOpen={isOpen}
          saving={saving}
          onCreateDiagnosis={createDiagnosis}
      />

      <Card>
        <CardHeader>
          <CardTitle>Prescriptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOpen && (
            <PrescriptionForm
              form={prescriptionForm}
              saving={saving}
              medications={filteredMedications}
              medicationSearch={medicationSearch}
              medicationsLoading={medicationsLoading}
              medicationsError={medicationsError}
              onChange={setPrescriptionForm}
              onMedicationSearchChange={setMedicationSearch}
              onSubmit={handleCreatePrescription}
            />
          )}

          <PrescriptionHistory
            prescriptions={prescriptions}
            visiblePrescriptions={prescriptionPaging.items}
            page={prescriptionPaging.safePage}
            totalPages={prescriptionPaging.totalPages}
            onPageChange={setPrescriptionPage}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lab Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOpen && auth.hasPermission("LabRequests.Create") && (
            <LabRequestForm
              form={labRequestForm}
              saving={saving}
              labTests={filteredLabTests}
              labTestSearch={labTestSearch}
              labTestsLoading={labTestsLoading}
              labTestsError={labTestsError}
              onChange={setLabRequestForm}
              onLabTestSearchChange={setLabTestSearch}
              onSubmit={handleCreateLabRequest}
            />
          )}

          <LabRequestHistory
            labRequests={labRequests}
            visibleLabRequests={labRequestPaging.items}
            page={labRequestPaging.safePage}
            totalPages={labRequestPaging.totalPages}
            onPageChange={setLabRequestPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function EncounterEditForm({ form, saving, onChange, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Type
          </span>
          <select
            value={form.encounterType}
            onChange={(e) =>
              onChange({ ...form, encounterType: e.target.value })
            }
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            required
          >
            {ENCOUNTER_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Started At
          </span>
          <Input
            type="datetime-local"
            value={form.startedAt}
            onChange={(e) => onChange({ ...form, startedAt: e.target.value })}
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Ended At
          </span>
          <Input
            type="datetime-local"
            value={form.endedAt}
            onChange={(e) => onChange({ ...form, endedAt: e.target.value })}
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">
          Notes
        </span>
        <Textarea
          value={form.notes}
          onChange={(e) => onChange({ ...form, notes: e.target.value })}
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
        <Button type="button" variant="outline" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function PrescriptionForm({
  form,
  saving,
  medications,
  medicationSearch,
  medicationsLoading,
  medicationsError,
  onChange,
  onMedicationSearchChange,
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border p-4">
      <div className="grid gap-3 md:grid-cols-4">
      <SearchableMedicationSelect
        medications={medications}
        value={form.medicationId}
        searchValue={medicationSearch}
        loading={medicationsLoading}
        error={medicationsError}
        onSearchChange={(value) => {
          onMedicationSearchChange(value);

          if (form.medicationId) {
            onChange({ ...form, medicationId: "" });
          }
        }}
        onSelect={(medication) => {
          onChange({ ...form, medicationId: String(medication.id) });
          onMedicationSearchChange(medication.name);
        }}
      />
        <Input
          placeholder="Dosage *"
          value={form.dosage}
          onChange={(e) => onChange({ ...form, dosage: e.target.value })}
          required
        />
        <Input
          placeholder="Frequency *"
          value={form.frequency}
          onChange={(e) => onChange({ ...form, frequency: e.target.value })}
          required
        />
        <Input
          placeholder="Duration *"
          value={form.duration}
          onChange={(e) => onChange({ ...form, duration: e.target.value })}
          required
        />
      </div>
      <Textarea
        placeholder="Prescription notes"
        value={form.notes}
        onChange={(e) => onChange({ ...form, notes: e.target.value })}
      />
      <Textarea
        placeholder="Medication instructions"
        value={form.instructions}
        onChange={(e) => onChange({ ...form, instructions: e.target.value })}
      />
      <Button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Add Prescription"}
      </Button>
    </form>
  );
}

function SearchableMedicationSelect({
  medications,
  value,
  searchValue,
  loading,
  error,
  onSearchChange,
  onSelect,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedMedication = medications.find(
    (medication) => String(medication.id) === String(value)
  );

  function handleBlur(e) {
    if (!containerRef.current?.contains(e.relatedTarget)) {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} onBlur={handleBlur} className="relative space-y-2">
      <Input
        placeholder="Search medication *"
        value={searchValue}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onSearchChange(e.target.value);
          setOpen(true);
        }}
        required
      />

      {open && (
        <div className="scrollbar-none absolute z-50 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-sm text-slate-500">
              Loading medications...
            </div>
          )}

          {!loading &&
            medications.map((medication) => (
              <button
                key={medication.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(medication);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
              >
                <div className="font-medium text-slate-900">
                  {medication.name}
                </div>

                {medication.description && (
                  <div className="text-xs text-slate-500">
                    {medication.description}
                  </div>
                )}
              </button>
            ))}

          {!loading && medications.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">
              No medications match.
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-rose-600">{error}</p>}

      {selectedMedication && (
        <p className="text-xs text-slate-500">
          Selected: {selectedMedication.name}
        </p>
      )}
    </div>
  );
}

function LabRequestForm({
  form,
  saving,
  labTests,
  labTestSearch,
  labTestsLoading,
  labTestsError,
  onChange,
  onLabTestSearchChange,
  onSubmit,
}) {
  function toggleTest(testId) {
    const id = String(testId);
    const selected = form.selectedTestIds.includes(id);

    onChange({
      ...form,
      selectedTestIds: selected
        ? form.selectedTestIds.filter((value) => value !== id)
        : [...form.selectedTestIds, id],
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border p-4">
      <div className="grid gap-3 md:grid-cols-[12rem_1fr]">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Priority
          </span>
          <select
            value={form.priority}
            onChange={(e) => onChange({ ...form, priority: e.target.value })}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="routine">Routine</option>
            <option value="urgent">Urgent</option>
            <option value="stat">Stat</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Search tests
          </span>
          <Input
            placeholder="Search by code, name, specimen"
            value={labTestSearch}
            onChange={(e) => onLabTestSearchChange(e.target.value)}
          />
        </label>
      </div>

      <div className="max-h-64 overflow-auto rounded-md border border-slate-200">
        {labTestsLoading && (
          <div className="px-3 py-2 text-sm text-slate-500">Loading lab tests...</div>
        )}

        {!labTestsLoading &&
          labTests.map((test) => (
            <label
              key={test.id}
              className="flex cursor-pointer items-start gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={form.selectedTestIds.includes(String(test.id))}
                onChange={() => toggleTest(test.id)}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-950">
                  {test.testCode ? `${test.testCode} - ` : ""}
                  {test.name}
                </span>
                <span className="block text-xs text-slate-500">
                  {[test.specimenType, test.description].filter(Boolean).join(" | ") || "No details"}
                </span>
              </span>
            </label>
          ))}

        {!labTestsLoading && labTests.length === 0 && (
          <div className="px-3 py-2 text-sm text-slate-500">No active lab tests match.</div>
        )}
      </div>

      {labTestsError && <p className="text-xs text-rose-600">{labTestsError}</p>}

      <Textarea
        placeholder="Clinical notes"
        value={form.clinicalNotes}
        onChange={(e) => onChange({ ...form, clinicalNotes: e.target.value })}
      />

      <Button type="submit" disabled={saving || form.selectedTestIds.length === 0}>
        {saving ? "Saving..." : "Create Lab Request"}
      </Button>
    </form>
  );
}

function LabRequestHistory({
  labRequests,
  visibleLabRequests,
  page,
  totalPages,
  onPageChange,
}) {
  if (labRequests.length === 0) {
    return <p className="text-sm text-muted-foreground">No lab requests yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <HistoryHeader
        title="Lab request history"
        count={labRequests.length}
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
      <div className="divide-y divide-slate-100">
        {visibleLabRequests.map((request) => (
          <details key={request.id} className="group bg-white">
            <summary className="grid cursor-pointer list-none gap-3 px-4 py-3 hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_8rem_12rem] md:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-950">
                  {request.requestNumber}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {(request.items ?? []).map((item) => item.testName).join(", ")}
                </p>
              </div>
              <Badge>{request.status}</Badge>
              <p className="truncate text-xs text-slate-500 md:text-right">
                {request.priority}
              </p>
            </summary>
            <div className="space-y-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
              {request.clinicalNotes && (
                <p className="text-sm text-slate-700">{request.clinicalNotes}</p>
              )}
              {(request.items ?? []).map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-slate-200 bg-white p-3 text-sm"
                >
                  <p className="font-medium text-slate-950">
                    {item.testCode ? `${item.testCode} - ` : ""}
                    {item.testName}
                  </p>
                  <p className="mt-1 text-slate-600">
                    Specimen: {item.specimenType || "-"}
                  </p>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function PrescriptionHistory({
  prescriptions,
  visiblePrescriptions,
  page,
  totalPages,
  onPageChange,
}) {
  if (prescriptions.length === 0) {
    return <p className="text-sm text-muted-foreground">No prescriptions yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <HistoryHeader
        title="Prescription history"
        count={prescriptions.length}
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
      <div className="divide-y divide-slate-100">
        {visiblePrescriptions.map((prescription) => {
          const items = prescription.items ?? [];
          const firstItem = items[0];
          return (
            <details key={prescription.id} className="group bg-white">
              <summary className="grid cursor-pointer list-none gap-3 px-4 py-3 hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_8rem_12rem] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-950">
                    Prescription #{prescription.id}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {firstItem
                      ? `${firstItem.medicationName} - ${firstItem.dosage}, ${firstItem.frequency}`
                      : "No medication items"}
                    {items.length > 1 ? ` +${items.length - 1} more` : ""}
                  </p>
                </div>
                <Badge>{prescription.status}</Badge>
                <p className="truncate text-xs text-slate-500 md:text-right">
                  {prescription.doctorName}
                </p>
              </summary>
              <div className="space-y-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
                {prescription.notes && (
                  <p className="text-sm text-slate-700">{prescription.notes}</p>
                )}
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-md border border-slate-200 bg-white p-3 text-sm"
                  >
                    <p className="font-medium text-slate-950">
                      {item.medicationName}
                    </p>
                    <p className="mt-1 text-slate-600">
                      {item.dosage} | {item.frequency} | {item.duration}
                    </p>
                    {item.instructions && (
                      <p className="mt-1 text-slate-500">{item.instructions}</p>
                    )}
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

function HistoryHeader({ title, count, page, totalPages, onPageChange }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        <p className="text-xs text-slate-500">
          Showing {Math.min(HISTORY_PAGE_SIZE, count)} per page, {count} total
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
        <span className="min-w-16 text-center text-xs font-medium text-slate-600">
          {page} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

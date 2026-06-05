import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BedDouble,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  LoaderCircle,
  Plus,
  Printer,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/auth/AuthContext";
import { encountersApi } from "./api/encountersApi";
import { useEncounterPanelStore } from "./encounterPanelStore";
import DiagnosesSection from "./components/DiagnosesSection";
import {
  createNurseTask,
  fetchNurses,
  fetchNurseTasksByEncounter,
  getApiErrorMessage as getNurseTaskErrorMessage,
} from "@/features/nurseTasks/api/nurseTasksApi";
import {
  createBedAssignmentRequest,
  fetchBeds,
  getApiErrorMessage as getBedApiErrorMessage,
} from "@/features/beds/api/bedAssignmentsApi";
import InvoiceFormDialog from "@/features/invoices/components/InvoiceFormDialog";
import { formatMoney } from "@/features/invoices/invoiceFormat";

const ENCOUNTER_TYPES = [
  { value: "outpatient", label: "Outpatient" },
  { value: "emergency", label: "Emergency" },
  { value: "follow_up", label: "Follow-up" },
];


const HISTORY_PAGE_SIZE = 5;
const NURSE_TASK_TYPES = [
  "Medication administration",
  "Vital signs",
  "Wound care",
  "Patient monitoring",
  "Lab sample collection",
  "Discharge preparation",
];
const NURSE_TASK_PRIORITIES = ["routine", "urgent", "stat"];
const EMPTY_NURSE_TASK_FORM = {
  assignedToNurseId: "",
  type: "",
  priority: "routine",
  dueAt: "",
  notes: "",
};
const EMPTY_BED_REQUEST_FORM = {
  priority: "routine",
  preferredWard: "",
  notes: "",
};
const EMPTY_PRESCRIPTION_FORM = {
  notes: "",
  medicationId: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
};
const EMPTY_LAB_REQUEST_FORM = {
  priority: "routine",
  clinicalNotes: "",
  selectedTestIds: [],
};

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

function bedLocation(bed) {
  return [
    bed?.departmentName || bed?.ward,
    bed?.roomNumber ? `Room ${bed.roomNumber}` : null,
    bed?.bedNumber ? `Bed ${bed.bedNumber}` : null,
  ]
    .filter(Boolean)
    .join(" - ");
}

function bedRequestChangeNotes(bed, intent, reason) {
  const location = bedLocation(bed) || "the current bed";
  const base =
    intent === "release"
      ? `[Bed release request] Please review release for ${location}.`
      : `[Bed change request] Please review reassignment from ${location}.`;
  const trimmedReason = String(reason ?? "").trim();
  return trimmedReason ? `${base}\nReason: ${trimmedReason}` : base;
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

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function fullPatientName(patient) {
  return [patient?.firstName, patient?.lastName].filter(Boolean).join(" ").trim();
}

function initialsFromName(value) {
  return (
    String(value ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "P"
  );
}

function taskPriorityClasses(priority) {
  const value = normalize(priority);
  if (value === "stat") return "bg-rose-50 text-rose-800 ring-rose-200";
  if (value === "urgent") return "bg-orange-50 text-orange-800 ring-orange-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function taskStatusClasses(status) {
  return normalize(status) === "completed"
    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
    : "bg-amber-50 text-amber-800 ring-amber-200";
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

  
  const [prescriptionForm, setPrescriptionForm] = useState(EMPTY_PRESCRIPTION_FORM);
  const [editingEncounter, setEditingEncounter] = useState(false);
  const [encounterForm, setEncounterForm] = useState({
    encounterType: "outpatient",
    startedAt: "",
    endedAt: "",
    notes: "",
  });
  const [completingEncounter, setCompletingEncounter] = useState(false);
  const [prescriptionPage, setPrescriptionPage] = useState(1);
  const [medications, setMedications] = useState([]);
  const [medicationSearch, setMedicationSearch] = useState("");
  const [medicationsLoading, setMedicationsLoading] = useState(false);
  const [medicationsError, setMedicationsError] = useState("");
  const [labRequestForm, setLabRequestForm] = useState(EMPTY_LAB_REQUEST_FORM);
  const [labRequestPage, setLabRequestPage] = useState(1);
  const [labTests, setLabTests] = useState([]);
  const [labTestSearch, setLabTestSearch] = useState("");
  const [labTestsLoading, setLabTestsLoading] = useState(false);
  const [labTestsError, setLabTestsError] = useState("");
  const [actionDialog, setActionDialog] = useState(null);
  const [actionSaving, setActionSaving] = useState(false);
  const [nurseTasks, setNurseTasks] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [currentBed, setCurrentBed] = useState(null);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState("");
  const [nurseTaskForm, setNurseTaskForm] = useState(EMPTY_NURSE_TASK_FORM);
  const [bedRequestForm, setBedRequestForm] = useState(EMPTY_BED_REQUEST_FORM);
  const [currentBedRequest, setCurrentBedRequest] = useState({ intent: "change", reason: "" });
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  useEffect(() => {
    void loadPanel(encounterId);
  }, [encounterId, loadPanel]);

  const showToast = useCallback((message, type = "success") => {
    toast[type === "error" ? "error" : type === "warning" ? "warning" : "success"](message);
  }, []);

  const loadRelatedEncounterData = useCallback(
    async (currentPanel = panel) => {
      if (!currentPanel?.encounter) return;

      const canReadNurseTasks = auth.hasPermission("NurseTasks.Read");
      const canReadBeds = auth.hasPermission("Beds.Read");
      if (!canReadNurseTasks && !canReadBeds) return;

      setRelatedLoading(true);
      setRelatedError("");
      try {
        const patientProfileId = Number(
          currentPanel.encounter.patientProfileId ?? currentPanel.patient?.id
        );
        const [taskData, bedData] = await Promise.all([
          canReadNurseTasks ? fetchNurseTasksByEncounter(encounterId) : Promise.resolve([]),
          canReadBeds
            ? fetchBeds({
                encounterId,
                patientProfileId: Number.isFinite(patientProfileId) ? patientProfileId : undefined,
                page: 1,
                pageSize: 2,
              })
            : Promise.resolve({ items: [] }),
        ]);

        setNurseTasks(taskData);

        const bedItems = Array.isArray(bedData) ? bedData : bedData?.items ?? [];
        const activeBed =
          bedItems.find((bed) => Number(bed.currentAssignment?.encounterId) === Number(encounterId)) ??
          bedItems.find(
            (bed) =>
              Number(bed.currentAssignment?.patientProfileId) === patientProfileId &&
              !bed.currentAssignment?.releasedAt
          ) ??
          null;
        setCurrentBed(activeBed);
      } catch (err) {
        setRelatedError(getBedApiErrorMessage(err));
      } finally {
        setRelatedLoading(false);
      }
    },
    [auth, encounterId, panel]
  );

  useEffect(() => {
    if (panel) void loadRelatedEncounterData(panel);
  }, [panel, loadRelatedEncounterData]);

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
      <div className="flex min-h-72 items-center justify-center text-sm text-slate-500">
        Loading encounter panel...
      </div>
    );
  }

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!panel) return <div className="p-6">No encounter data found.</div>;
  const {
    encounter,
    patient,
    diagnoses,
    prescriptions,
    labRequests = [],
    bedAssignmentRequests = [],
  } = panel;

  const isOpen = String(encounter.status ?? "").toLowerCase() === "open";
  const canUpdateEncounter = auth.hasPermission("Encounters.Update");
  const canCloseEncounter = auth.hasPermission("Encounters.Close");
  const canAssignNurseTask = isOpen && auth.hasPermission("NurseTasks.Assign");
  const canRequestBed =
    isOpen &&
    auth.hasPermission("BedAssignmentRequests.Create") &&
    auth.hasPermission("BedAssignmentRequests.Read");
  const canReadNurseTasks = auth.hasPermission("NurseTasks.Read");
  const canReadBeds = auth.hasPermission("Beds.Read");
  const canReadNurses = auth.hasPermission("Nurses.Read");
  const canCreateInvoice = auth.hasPermission("Invoices.Create");
  const listPath =
    auth.userRole === "Admin" ? "/admin/encounters" : "/doctor/encounters";
  const printPath =
    auth.userRole === "Admin"
      ? `/admin/encounters/${encounterId}/print`
      : `/doctor/encounters/${encounterId}/print`;
  const prescriptionPaging = pageItems(prescriptions, prescriptionPage);
  const labRequestPaging = pageItems(labRequests, labRequestPage);
  const filteredMedications = filterMedications(medications, medicationSearch);
  const filteredLabTests = filterLabTests(labTests, labTestSearch);
  const pendingBedRequest = bedAssignmentRequests.find(
    (request) => normalize(request.status) === "pending"
  );
  const latestBedRequest = bedAssignmentRequests[0] ?? null;
  const labTestPriceById = new Map(
    labTests.map((test) => [Number(test.id), Number(test.price) || 0])
  );
  const invoiceInitialItems = buildEncounterInvoiceItems(
    encounter,
    labRequests,
    labTestPriceById
  );


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
    setActionDialog(null);
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
    setActionDialog(null);
  }

  async function handleCompleteEncounter() {
    setCompletingEncounter(true);
    try {
      await closeEncounter(encounterId);
      showToast("Encounter completed successfully.");
    } finally {
      setCompletingEncounter(false);
    }
  }

  async function openNurseTaskDialog() {
    setNurseTaskForm(EMPTY_NURSE_TASK_FORM);
    setActionDialog("nurseTask");
    if (canReadNurses && nurses.length === 0) {
      try {
        setNurses(await fetchNurses());
      } catch (err) {
        showToast(getNurseTaskErrorMessage(err), "error");
      }
    }
  }

  function openBedRequestDialog() {
    setBedRequestForm(EMPTY_BED_REQUEST_FORM);
    setActionDialog("bedRequest");
  }

  function closeActionDialog() {
    setActionDialog(null);
    setNurseTaskForm(EMPTY_NURSE_TASK_FORM);
    setBedRequestForm(EMPTY_BED_REQUEST_FORM);
    setCurrentBedRequest({ intent: "change", reason: "" });
    setPrescriptionForm(EMPTY_PRESCRIPTION_FORM);
    setMedicationSearch("");
    setLabRequestForm(EMPTY_LAB_REQUEST_FORM);
    setLabTestSearch("");
  }

  async function handleAssignNurseTask(event) {
    event.preventDefault();
    if (actionSaving) return;
    if (!nurseTaskForm.type.trim()) {
      showToast("Task type is required.", "error");
      return;
    }

    const payload = {
      encounterId: Number(encounterId),
      assignedToNurseId: nurseTaskForm.assignedToNurseId
        ? Number.parseInt(nurseTaskForm.assignedToNurseId, 10)
        : null,
      type: nurseTaskForm.type.trim(),
      priority: nurseTaskForm.priority || null,
      dueAt: fromDateTimeLocalValue(nurseTaskForm.dueAt),
      notes: nurseTaskForm.notes.trim() || null,
    };

    setActionSaving(true);
    try {
      await createNurseTask(payload);
      showToast("Nurse task assigned.");
      closeActionDialog();
      await loadRelatedEncounterData();
    } catch (err) {
      showToast(getNurseTaskErrorMessage(err), "error");
    } finally {
      setActionSaving(false);
    }
  }

  async function handleRequestBed(event) {
    event.preventDefault();
    if (actionSaving) return;

    setActionSaving(true);
    try {
      await createBedAssignmentRequest(encounterId, {
        priority: bedRequestForm.priority,
        preferredWard: bedRequestForm.preferredWard.trim() || null,
        notes: bedRequestForm.notes.trim() || null,
      });
      showToast("Bed request submitted.");
      closeActionDialog();
      await loadPanel(encounterId);
      await loadRelatedEncounterData();
    } catch (err) {
      showToast(getBedApiErrorMessage(err), "error");
    } finally {
      setActionSaving(false);
    }
  }

  function openCurrentBedRequest(intent) {
    setCurrentBedRequest({ intent, reason: "" });
    setActionDialog("currentBedRequest");
  }

  async function handleCurrentBedRequest(event) {
    event.preventDefault();
    if (actionSaving || !currentBed) return;

    const intent = currentBedRequest.intent || "change";
    setActionSaving(true);
    try {
      await createBedAssignmentRequest(encounterId, {
        priority: "routine",
        preferredWard: currentBed.departmentName || currentBed.ward || null,
        notes: bedRequestChangeNotes(currentBed, intent, currentBedRequest.reason),
      });
      showToast(intent === "release" ? "Bed release request submitted." : "Bed change request submitted.");
      closeActionDialog();
      await loadPanel(encounterId);
      await loadRelatedEncounterData();
    } catch (err) {
      showToast(getBedApiErrorMessage(err), "error");
    } finally {
      setActionSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
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

        <div className="flex flex-wrap items-center gap-2 md:flex-nowrap lg:justify-end">
          <Button asChild type="button" variant="outline" className="h-9 whitespace-nowrap px-3">
            <Link to={printPath} target="_blank" rel="noreferrer">
              <Printer className="mr-2 h-4 w-4" aria-hidden />
              Print Patient Report
            </Link>
          </Button>
          {canAssignNurseTask && (
            <Button type="button" variant="outline" onClick={openNurseTaskDialog} className="h-9 whitespace-nowrap px-3">
              <ClipboardCheck className="mr-2 h-4 w-4" aria-hidden />
              Assign Nurse Task
            </Button>
          )}
          {canRequestBed && !currentBed && !pendingBedRequest && (
            <Button type="button" variant="outline" onClick={openBedRequestDialog} className="h-9 whitespace-nowrap px-3">
              <BedDouble className="mr-2 h-4 w-4" aria-hidden />
              Request Bed
            </Button>
          )}
          {pendingBedRequest && !currentBed && (
            <Button type="button" variant="outline" disabled className="h-9 whitespace-nowrap px-3">
              <BedDouble className="mr-2 h-4 w-4" aria-hidden />
              Bed Request Pending
            </Button>
          )}
          {isOpen && canCloseEncounter && (
            <Button
              type="button"
              disabled={saving || completingEncounter}
              onClick={handleCompleteEncounter}
              className="relative h-9 overflow-hidden whitespace-nowrap bg-emerald-600 px-3 text-white transition hover:bg-emerald-700 disabled:opacity-80"
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
          <Badge variant="outline" className="h-9 shrink-0 border-slate-200 bg-white px-3">
            {encounter.status}
          </Badge>
        </div>
      </div>

      {(canReadBeds || canReadNurseTasks) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {canReadBeds && (
            <CurrentBedCard
              bed={currentBed}
              latestRequest={latestBedRequest}
              loading={relatedLoading}
              error={relatedError}
              canRequest={canRequestBed && !currentBed && !pendingBedRequest}
              canRequestChange={canRequestBed && Boolean(currentBed) && !pendingBedRequest}
              actionSaving={actionSaving}
              requestPending={Boolean(pendingBedRequest)}
              onRequest={openBedRequestDialog}
              onCurrentBedRequest={openCurrentBedRequest}
            />
          )}
          {canReadNurseTasks && (
            <NurseTasksCard
              tasks={nurseTasks}
              loading={relatedLoading}
              error={relatedError}
              canAssign={canAssignNurseTask}
              onAssign={openNurseTaskDialog}
            />
          )}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
            <div>
              <CardTitle>Encounter Overview</CardTitle>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge>{encounter.status}</Badge>
                <Badge variant="outline" className="border-slate-200 bg-slate-50">
                  {encounter.encounterType || "-"}
                </Badge>
              </div>
            </div>
            {isOpen && canUpdateEncounter && !editingEncounter && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={beginEditEncounter}
                className="shrink-0"
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
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  <DetailTile label="Doctor" value={encounter.doctorName || "-"} />
                  <DetailTile label="Patient" value={encounter.patientName || "-"} />
                  <DetailTile label="Started At" value={formatDate(encounter.startedAt)} />
                  <DetailTile label="Ended At" value={formatDate(encounter.endedAt)} />
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
                  <p className="mt-1 text-sm leading-6 text-slate-800">{encounter.notes || "-"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                {initialsFromName(fullPatientName(patient))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Patient Summary
                </p>
                <h2 className="mt-1 truncate text-lg font-semibold text-slate-950">
                  {fullPatientName(patient) || "-"}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {patient.patientNumber || "-"}
                  </span>
                  {patient.gender && (
                    <Badge variant="outline" className="border-slate-200 bg-slate-50">
                      {patient.gender}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailTile label="Personal No." value={patient.personalNumber || "-"} />
              <DetailTile label="Date of Birth" value={formatDate(patient.dateOfBirth)} />
              <DetailTile label="Phone" value={patient.phone || "-"} />
              <DetailTile label="Blood Type" value={patient.bloodType || "-"} />
              <DetailTile label="Insurance" value={patient.insuranceNumber || "-"} />
            </div>
          </CardContent>
        </Card>
      </div>

      <DiagnosesSection
          encounterId={encounterId}
          diagnoses={diagnoses}
          isOpen={isOpen}
          saving={saving}
          onCreateDiagnosis={createDiagnosis}
      />

      {canCreateInvoice && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Invoices</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={() => setInvoiceDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Generate Invoice
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Generate an invoice for this encounter. Lab request items with catalog prices are prefilled automatically.
            </p>
            {invoiceInitialItems.length > 0 && (
              <p className="mt-2 text-sm font-medium text-slate-700">
                Estimated billable items: {invoiceInitialItems.length} - {formatMoney(
                  invoiceInitialItems.reduce((sum, item) => sum + Number(item.unitPrice || 0), 0),
                  "EUR"
                )}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Prescriptions</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Medications prescribed during this encounter.
            </p>
          </div>
          {isOpen && (
            <Button
              type="button"
              size="sm"
              className="bg-sky-600 text-white hover:bg-sky-700"
              onClick={() => setActionDialog("prescription")}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Add Prescription
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <PrescriptionHistory
            prescriptions={prescriptions}
            visiblePrescriptions={prescriptionPaging.items}
            page={prescriptionPaging.safePage}
            totalPages={prescriptionPaging.totalPages}
            onPageChange={setPrescriptionPage}
          />
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Lab Requests</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Laboratory tests requested for this encounter.
            </p>
          </div>
          {isOpen && auth.hasPermission("LabRequests.Create") && (
            <Button
              type="button"
              size="sm"
              className="bg-sky-600 text-white hover:bg-sky-700"
              onClick={() => setActionDialog("labRequest")}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Create Lab Request
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <LabRequestHistory
            labRequests={labRequests}
            visibleLabRequests={labRequestPaging.items}
            page={labRequestPaging.safePage}
            totalPages={labRequestPaging.totalPages}
            onPageChange={setLabRequestPage}
          />
        </CardContent>
      </Card>

      {actionDialog === "nurseTask" && (
        <AssignNurseTaskDialog
          form={nurseTaskForm}
          nurses={nurses}
          saving={actionSaving}
          onClose={closeActionDialog}
          onSubmit={handleAssignNurseTask}
          onChange={(patch) => setNurseTaskForm((current) => ({ ...current, ...patch }))}
        />
      )}

      {actionDialog === "bedRequest" && (
        <RequestBedDialog
          form={bedRequestForm}
          encounter={encounter}
          patient={patient}
          saving={actionSaving}
          onClose={closeActionDialog}
          onSubmit={handleRequestBed}
          onChange={(patch) => setBedRequestForm((current) => ({ ...current, ...patch }))}
        />
      )}

      {actionDialog === "currentBedRequest" && (
        <CurrentBedRequestDialog
          bed={currentBed}
          intent={currentBedRequest.intent}
          reason={currentBedRequest.reason}
          saving={actionSaving}
          onReason={(reason) => setCurrentBedRequest((current) => ({ ...current, reason }))}
          onClose={closeActionDialog}
          onSubmit={handleCurrentBedRequest}
        />
      )}

      {actionDialog === "prescription" && (
        <PrescriptionDialog
          form={prescriptionForm}
          saving={saving}
          medications={filteredMedications}
          medicationSearch={medicationSearch}
          medicationsLoading={medicationsLoading}
          medicationsError={medicationsError}
          onClose={closeActionDialog}
          onChange={setPrescriptionForm}
          onMedicationSearchChange={setMedicationSearch}
          onSubmit={handleCreatePrescription}
        />
      )}

      {actionDialog === "labRequest" && (
        <LabRequestDialog
          form={labRequestForm}
          saving={saving}
          labTests={labTests}
          visibleLabTests={filteredLabTests}
          labTestSearch={labTestSearch}
          labTestsLoading={labTestsLoading}
          labTestsError={labTestsError}
          onClose={closeActionDialog}
          onChange={setLabRequestForm}
          onLabTestSearchChange={setLabTestSearch}
          onSubmit={handleCreateLabRequest}
        />
      )}

      <InvoiceFormDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        initialPatient={patient}
        initialEncounter={encounter}
        initialItems={invoiceInitialItems}
      />
    </div>
  );
}

function buildEncounterInvoiceItems(encounter, labRequests, labTestPriceById) {
  const items = [
    {
      description: `Encounter: ${encounter.encounterNumber || encounter.encounterType || "Visit"}`,
      category: "consultation",
      quantity: 1,
      unitPrice: 0,
      sourceType: "encounter",
      sourceId: encounter.id,
    },
  ];

  for (const request of labRequests ?? []) {
    for (const item of request.items ?? []) {
      const price = labTestPriceById.get(Number(item.labTestId)) || 0;
      items.push({
        description: `Lab: ${item.testName || item.testCode || `Test #${item.labTestId}`}`,
        category: "lab",
        quantity: 1,
        unitPrice: price,
        sourceType: "lab_test",
        sourceId: item.labTestId,
      });
    }
  }

  return items;
}

function CurrentBedCard({
  bed,
  latestRequest,
  loading,
  error,
  canRequest,
  canRequestChange,
  actionSaving,
  requestPending,
  onRequest,
  onCurrentBedRequest,
}) {
  const assignment = bed?.currentAssignment;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>Current Bed Assignment</CardTitle>
        <div className="flex flex-wrap justify-end gap-2">
          {canRequest && (
            <Button type="button" size="sm" variant="outline" onClick={onRequest}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Request Bed
            </Button>
          )}
          {canRequestChange && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={actionSaving}
                onClick={() => onCurrentBedRequest("change")}
              >
                Request bed change
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={actionSaving}
                onClick={() => onCurrentBedRequest("release")}
              >
                Request release
              </Button>
            </>
          )}
          {requestPending && (
            <Button type="button" size="sm" variant="outline" disabled>
              Bed Request Pending
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading bed assignment...</p>
        ) : error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : bed ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Info label="Department/Ward" value={bed.departmentName || bed.ward || "-"} />
            <Info label="Room" value={bed.roomNumber || "-"} />
            <Info label="Bed" value={bed.bedNumber || "-"} />
            <Info label="Status" value={<Badge>{bed.status || "Assigned"}</Badge>} />
            <Info label="Assigned At" value={formatDate(assignment?.assignedAt)} />
            <Info label="Patient" value={assignment?.patientName || "-"} />
          </div>
        ) : latestRequest ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">Bed request #{latestRequest.id}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Requested {formatDate(latestRequest.requestedAt)}
                </p>
              </div>
              <BedRequestStatusBadge status={latestRequest.status} />
            </div>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <Info label="Priority" value={latestRequest.priority || "-"} />
              <Info label="Preferred Ward" value={latestRequest.preferredWard || "-"} />
              {latestRequest.assignedBedLabel && (
                <Info label="Assigned Bed" value={latestRequest.assignedBedLabel} />
              )}
              {latestRequest.resolvedAt && (
                <Info label="Resolved At" value={formatDate(latestRequest.resolvedAt)} />
              )}
            </div>
            {latestRequest.notes && (
              <p className="mt-3 rounded-lg bg-white p-3 text-sm text-slate-600">
                {latestRequest.notes}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No active bed assignment for this encounter.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NurseTasksCard({ tasks, loading, error, canAssign, onAssign }) {
  const visibleTasks = tasks.slice(0, 4);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Nurse Tasks</CardTitle>
        {canAssign && (
          <Button type="button" size="sm" variant="outline" onClick={onAssign}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Assign Task
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading nurse tasks...</p>
        ) : error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : visibleTasks.length > 0 ? (
          <div className="space-y-3">
            {visibleTasks.map((task) => (
              <div key={task.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-950">{task.type}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {task.assignedToNurseName || "Unassigned nurse"}
                      {task.dueAt ? ` - Due ${formatDate(task.dueAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${taskPriorityClasses(task.priority)}`}>
                      {task.priority || "routine"}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${taskStatusClasses(task.status)}`}>
                      {task.status || "pending"}
                    </span>
                  </div>
                </div>
                {task.notes && <p className="mt-2 line-clamp-2 text-xs text-slate-600">{task.notes}</p>}
              </div>
            ))}
            {tasks.length > visibleTasks.length && (
              <p className="text-xs text-slate-500">Showing {visibleTasks.length} of {tasks.length} tasks.</p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No nurse tasks assigned to this encounter yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AssignNurseTaskDialog({ form, nurses, saving, onClose, onSubmit, onChange }) {
  const [nurseSearch, setNurseSearch] = useState("");
  const selectedNurse = nurses.find((nurse) => String(nurse.id) === String(form.assignedToNurseId));
  const visibleNurses = nurses
    .filter((nurse) => {
      const term = normalize(nurseSearch);
      const name = String(nurse.fullName ?? nurse.FullName ?? "").toLowerCase();
      return !term || name.includes(term);
    })
    .slice(0, 8);

  return (
    <div className="hms-modal-overlay" role="dialog" aria-modal="true">
      <section className="hms-modal-panel max-w-4xl">
        <DialogHeader
          icon={ClipboardCheck}
          title="Assign Nurse Task"
          subtitle="Create a nursing task linked to this encounter."
          onClose={onClose}
        />
        <form onSubmit={onSubmit} className="hms-modal-body">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Nurse">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={selectedNurse ? selectedNurse.fullName : nurseSearch}
                  onChange={(event) => {
                    setNurseSearch(event.target.value);
                    onChange({ assignedToNurseId: "" });
                  }}
                  disabled={saving}
                  placeholder="Search nurse"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
                {nurseSearch && !form.assignedToNurseId && visibleNurses.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    {visibleNurses.map((nurse) => (
                      <button
                        key={nurse.id}
                        type="button"
                        onClick={() => {
                          onChange({ assignedToNurseId: String(nurse.id) });
                          setNurseSearch("");
                        }}
                        className="block w-full px-3 py-2 text-left text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                      >
                        {nurse.fullName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </FormField>
            <FormField label="Priority">
              <select
                value={form.priority}
                onChange={(event) => onChange({ priority: event.target.value })}
                disabled={saving}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              >
                {NURSE_TASK_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Task type" required>
              <input
                list="encounter-nurse-task-types"
                value={form.type}
                onChange={(event) => onChange({ type: event.target.value })}
                disabled={saving}
                placeholder="Vital signs"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                required
              />
              <datalist id="encounter-nurse-task-types">
                {NURSE_TASK_TYPES.map((type) => <option key={type} value={type} />)}
              </datalist>
            </FormField>
            <FormField label="Due at">
              <input
                type="datetime-local"
                value={form.dueAt}
                onChange={(event) => onChange({ dueAt: event.target.value })}
                disabled={saving}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </FormField>
          </div>
          <FormField label="Notes">
            <textarea
              value={form.notes}
              onChange={(event) => onChange({ notes: event.target.value })}
              disabled={saving}
              rows={4}
              placeholder="Instructions or clinical context"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </FormField>
          <DialogActions onClose={onClose} saving={saving} submitLabel="Assign Task" savingLabel="Assigning..." />
        </form>
      </section>
    </div>
  );
}

function RequestBedDialog({
  form,
  encounter,
  patient,
  saving,
  onClose,
  onSubmit,
  onChange,
}) {
  const patientName = fullPatientName(patient) || encounter.patientName || "Patient";

  return (
    <div className="hms-modal-overlay" role="dialog" aria-modal="true">
      <section className="hms-modal-panel-scroll max-w-2xl">
        <DialogHeader
          icon={BedDouble}
          title="Request Bed"
          subtitle="Request a bed assignment for this patient."
          onClose={onClose}
        />

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="scrollbar-none min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 px-6 py-5">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                  {initialsFromName(patientName)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-950">{patientName}</p>
                  <p className="mt-1 truncate text-xs font-medium uppercase tracking-wide text-slate-500">
                    {[patient.patientNumber, encounter.encounterNumber || `Encounter #${encounter.id}`]
                      .filter(Boolean)
                      .join(" - ")}
                  </p>
                  <div className="mt-2">
                    <Badge>{encounter.status}</Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Priority">
                <select
                  value={form.priority}
                  onChange={(event) => onChange({ priority: event.target.value })}
                  disabled={saving}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">Stat</option>
                </select>
              </FormField>
              <FormField label="Preferred ward">
                <input
                  type="text"
                  value={form.preferredWard}
                  onChange={(event) => onChange({ preferredWard: event.target.value })}
                  disabled={saving}
                  placeholder="Optional"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </FormField>
            </div>

            <FormField label="Reason / notes">
              <textarea
                value={form.notes}
                onChange={(event) => onChange({ notes: event.target.value })}
                disabled={saving}
                rows={5}
                placeholder="Clinical reason or placement notes"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50"
            >
              {saving ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function CurrentBedRequestDialog({ bed, intent, reason, saving, onReason, onClose, onSubmit }) {
  const release = intent === "release";
  return (
    <div className="hms-modal-overlay" role="dialog" aria-modal="true">
      <section className="hms-modal-panel max-w-xl">
        <DialogHeader
          icon={BedDouble}
          title={release ? "Request Bed Release" : "Request Bed Change"}
          subtitle={bedLocation(bed) || "Current bed assignment"}
          onClose={onClose}
        />
        <form onSubmit={onSubmit} className="hms-modal-body">
          <FormField label="Reason">
            <Textarea
              value={reason}
              onChange={(event) => onReason(event.target.value)}
              disabled={saving}
              rows={5}
              placeholder={release ? "Why should this bed be released?" : "Why does this patient need a bed change?"}
              className="resize-none bg-white"
            />
          </FormField>
          <div className="hms-modal-footer -mx-6 -mb-5">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Submitting..." : release ? "Send Release Request" : "Send Change Request"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DialogHeader({ icon, title, subtitle, onClose }) {
  const HeaderIcon = icon;
  return (
    <div className="hms-modal-header">
      <div className="flex items-start gap-4">
        <div className="hms-modal-header-icon">
          <HeaderIcon className="size-6" aria-hidden />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="hms-modal-close"
        aria-label="Close"
      >
        <X className="size-5" aria-hidden />
      </button>
    </div>
  );
}

function DialogActions({ onClose, saving, submitLabel, savingLabel }) {
  return (
    <div className="hms-modal-footer">
      <button
        type="button"
        onClick={onClose}
        disabled={saving}
        className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50"
      >
        {saving ? savingLabel : submitLabel}
      </button>
    </div>
  );
}

function FormField({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function DetailTile({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-slate-900">{value}</p>
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

function PrescriptionDialog({
  form,
  saving,
  medications,
  medicationSearch,
  medicationsLoading,
  medicationsError,
  onClose,
  onChange,
  onMedicationSearchChange,
  onSubmit,
}) {
  return (
    <div className="hms-modal-overlay" role="dialog" aria-modal="true">
      <section className="hms-modal-panel-scroll max-w-3xl">
        <DialogHeader
          icon={ClipboardCheck}
          title="Add Prescription"
          subtitle="Record medication and dosage instructions for this encounter."
          onClose={onClose}
        />

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="scrollbar-none min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 px-6 py-5">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 md:grid-cols-3">
                <FormField label="Dosage" required>
                  <Input
                    placeholder="e.g. 500 mg"
                    value={form.dosage}
                    onChange={(e) => onChange({ ...form, dosage: e.target.value })}
                    required
                  />
                </FormField>
                <FormField label="Frequency" required>
                  <Input
                    placeholder="e.g. Twice daily"
                    value={form.frequency}
                    onChange={(e) => onChange({ ...form, frequency: e.target.value })}
                    required
                  />
                </FormField>
                <FormField label="Duration" required>
                  <Input
                    placeholder="e.g. 7 days"
                    value={form.duration}
                    onChange={(e) => onChange({ ...form, duration: e.target.value })}
                    required
                  />
                </FormField>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Prescription notes">
                <Textarea
                  placeholder="Clinical context for this prescription"
                  value={form.notes}
                  onChange={(e) => onChange({ ...form, notes: e.target.value })}
                />
              </FormField>

              <FormField label="Medication instructions">
                <Textarea
                  placeholder="Administration instructions for the patient"
                  value={form.instructions}
                  onChange={(e) => onChange({ ...form, instructions: e.target.value })}
                />
              </FormField>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add Prescription"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function BedRequestStatusBadge({ status }) {
  const value = normalize(status);
  const classes =
    value === "assigned"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : value === "rejected" || value === "cancelled"
        ? "bg-rose-50 text-rose-800 ring-rose-200"
        : "bg-amber-50 text-amber-800 ring-amber-200";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${classes}`}>
      {status || "Pending"}
    </span>
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
    <FormField label="Medication search" required>
      <div ref={containerRef} onBlur={handleBlur} className="relative space-y-2">
        <Input
          placeholder="Search by medication name"
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
    </FormField>
  );
}

function LabRequestDialog({
  form,
  saving,
  labTests,
  visibleLabTests,
  labTestSearch,
  labTestsLoading,
  labTestsError,
  onClose,
  onChange,
  onLabTestSearchChange,
  onSubmit,
}) {
  const selectedTests = labTests.filter((test) =>
    form.selectedTestIds.includes(String(test.id))
  );
  const selectedTotal = labTests
    .filter((test) => form.selectedTestIds.includes(String(test.id)))
    .reduce((sum, test) => sum + (Number(test.price) || 0), 0);

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
    <div className="hms-modal-overlay" role="dialog" aria-modal="true">
      <section className="hms-modal-panel-scroll max-w-5xl">
        <DialogHeader
          icon={Search}
          title="Create Lab Request"
          subtitle="Select tests and add clinical notes for this encounter."
          onClose={onClose}
        />

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-slate-50 px-6 py-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.9fr)]">
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-950">Available Lab Tests</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Search and select tests for this encounter.
                  </p>
                </div>
                <div className="space-y-4 p-4">
                  <div className="grid gap-3 md:grid-cols-[12rem_1fr]">
                    <FormField label="Priority">
                      <select
                        value={form.priority}
                        onChange={(e) => onChange({ ...form, priority: e.target.value })}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                      >
                        <option value="routine">Routine</option>
                        <option value="urgent">Urgent</option>
                        <option value="stat">Stat</option>
                      </select>
                    </FormField>

                    <FormField label="Search tests">
                      <Input
                        placeholder="Search by code, name, specimen"
                        value={labTestSearch}
                        onChange={(e) => onLabTestSearchChange(e.target.value)}
                      />
                    </FormField>
                  </div>

                  <div className="grid max-h-112 gap-2 overflow-auto pr-1">
                    {labTestsLoading && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                        Loading lab tests...
                      </div>
                    )}

                    {!labTestsLoading &&
                      visibleLabTests.map((test) => {
                        const selected = form.selectedTestIds.includes(String(test.id));
                        return (
                          <button
                            key={test.id}
                            type="button"
                            onClick={() => toggleTest(test.id)}
                            className={[
                              "flex w-full items-start gap-3 rounded-lg border p-3 text-left shadow-sm transition",
                              selected
                                ? "border-sky-300 bg-sky-50/70 ring-1 ring-sky-200"
                                : "border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border",
                                selected
                                  ? "border-sky-500 bg-sky-600 text-white"
                                  : "border-slate-300 bg-white text-transparent",
                              ].join(" ")}
                              aria-hidden
                            >
                              <CheckCircle2 className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-slate-950">
                                {test.name}
                              </span>
                              <span className="mt-1 block text-xs text-slate-500">
                                {[test.testCode, test.specimenType].filter(Boolean).join(" / ") || "Catalog test"}
                              </span>
                              {test.description && (
                                <span className="mt-1 line-clamp-2 block text-xs text-slate-500">
                                  {test.description}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 text-sm font-semibold text-slate-700">
                              {formatMoney(test.price || 0, "EUR")}
                            </span>
                          </button>
                        );
                      })}

                    {!labTestsLoading && visibleLabTests.length === 0 && (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                        No active lab tests match.
                      </div>
                    )}
                  </div>

                  {labTestsError && <p className="text-xs text-rose-600">{labTestsError}</p>}
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h3 className="text-sm font-semibold text-slate-950">Selected Tests</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {form.selectedTestIds.length} selected for this request
                  </p>
                </div>
                <div className="space-y-4 p-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-600">Total price</span>
                      <span className="text-base font-semibold text-slate-950">
                        {formatMoney(selectedTotal, "EUR")}
                      </span>
                    </div>
                  </div>

                  {selectedTests.length > 0 ? (
                    <div className="max-h-56 space-y-2 overflow-auto pr-1">
                      {selectedTests.map((test) => (
                        <div key={test.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                          <p className="font-medium text-slate-950">{test.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {[test.testCode, test.specimenType].filter(Boolean).join(" / ") || "Selected lab test"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                      <p className="text-sm font-semibold text-slate-900">No tests selected</p>
                      <p className="mt-1 text-sm text-slate-500">Selected tests will appear here.</p>
                    </div>
                  )}

                  <FormField label="Clinical notes">
                    <Textarea
                      placeholder="Clinical notes"
                      value={form.clinicalNotes}
                      onChange={(e) => onChange({ ...form, clinicalNotes: e.target.value })}
                    />
                  </FormField>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || form.selectedTestIds.length === 0}
              className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Create Lab Request"}
            </button>
          </div>
        </form>
      </section>
    </div>
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
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <HistoryHeader
          title="Lab Request History"
          count={0}
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
        <div className="flex min-h-40 items-center justify-center p-6 text-center">
          <div>
            <p className="text-sm font-semibold text-slate-900">No lab requests yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Created lab requests for this encounter will appear here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <HistoryHeader
        title="Lab Request History"
        count={labRequests.length}
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
      <div className="space-y-3 bg-slate-50 p-3">
        {visibleLabRequests.map((request) => (
          <details key={request.id} className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <summary className="cursor-pointer list-none p-4 transition hover:bg-slate-50">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {request.requestNumber || `Lab request #${request.id}`}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {(request.items ?? []).map((item) => item.testName).join(", ") || "No tests listed"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${taskPriorityClasses(request.priority)}`}>
                    {request.priority || "routine"}
                  </span>
                  <Badge>{request.status}</Badge>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>{request.items?.length ?? 0} tests</span>
                <span>Requested {formatDate(request.requestedAt || request.createdAt)}</span>
                {request.requestedByDoctorName && (
                  <span>{request.requestedByDoctorName}</span>
                )}
              </div>
            </summary>
            <div className="space-y-2 border-t border-slate-100 bg-white px-4 py-3">
              {request.clinicalNotes && (
                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{request.clinicalNotes}</p>
              )}
              {(request.items ?? []).map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                >
                  <p className="font-medium text-slate-950">
                    {item.testName}
                  </p>
                  <p className="mt-1 text-slate-600">
                    {[item.testCode, item.specimenType].filter(Boolean).join(" / ") || "Specimen details unavailable"}
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
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <HistoryHeader
          title="Prescription History"
          count={0}
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
        <div className="flex min-h-40 items-center justify-center p-6 text-center">
          <div>
            <p className="text-sm font-semibold text-slate-900">No prescriptions yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Prescriptions added for this encounter will appear here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <HistoryHeader
        title="Prescription History"
        count={prescriptions.length}
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
      <div className="space-y-3 bg-slate-50 p-3">
        {visiblePrescriptions.map((prescription) => {
          const items = prescription.items ?? [];
          const firstItem = items[0];
          return (
            <details key={prescription.id} className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <summary className="cursor-pointer list-none p-4 transition hover:bg-slate-50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      Prescription #{prescription.id}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {firstItem?.medicationName || "No medication items"}
                      {items.length > 1 ? ` +${items.length - 1} more` : ""}
                    </p>
                  </div>
                  <Badge>{prescription.status}</Badge>
                </div>
                {firstItem && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    <span className="font-medium text-slate-950">{firstItem.dosage}</span>
                    <span className="mx-2 text-slate-300">/</span>
                    {firstItem.frequency}
                    <span className="mx-2 text-slate-300">/</span>
                    {firstItem.duration}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  {prescription.doctorName && <span>{prescription.doctorName}</span>}
                  {prescription.createdAt && <span>{formatDate(prescription.createdAt)}</span>}
                </div>
              </summary>
              <div className="space-y-2 border-t border-slate-100 bg-white px-4 py-3">
                {prescription.notes && (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{prescription.notes}</p>
                )}
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                  >
                    <p className="font-medium text-slate-950">
                      {item.medicationName}
                    </p>
                    <p className="mt-1 text-slate-600">
                      {item.dosage} / {item.frequency} / {item.duration}
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
  const showPagination = count > HISTORY_PAGE_SIZE;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        <p className="text-xs text-slate-500">
          Showing {count} {count === 1 ? "record" : "records"}
        </p>
      </div>
      {showPagination && (
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
      )}
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

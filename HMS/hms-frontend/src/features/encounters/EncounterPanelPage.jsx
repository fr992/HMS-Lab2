import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Search,
  X,
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
import {
  createNurseTask,
  fetchNurses,
  fetchNurseTasksByEncounter,
  getApiErrorMessage as getNurseTaskErrorMessage,
} from "@/features/nurseTasks/api/nurseTasksApi";
import {
  assignBed,
  fetchBeds,
  getApiErrorMessage as getBedApiErrorMessage,
} from "@/features/bedAssignments/api/bedAssignmentsApi";

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
const EMPTY_BED_ASSIGN_FORM = {
  ward: "all",
  roomNumber: "all",
  bedId: "",
  notes: "",
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

function bedLocation(bed) {
  return [bed.departmentName || bed.ward, bed.roomNumber, bed.bedNumber]
    .filter(Boolean)
    .join(" / ");
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
  const [toast, setToast] = useState(null);
  const [actionDialog, setActionDialog] = useState(null);
  const [actionSaving, setActionSaving] = useState(false);
  const [nurseTasks, setNurseTasks] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [currentBed, setCurrentBed] = useState(null);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState("");
  const [nurseTaskForm, setNurseTaskForm] = useState(EMPTY_NURSE_TASK_FORM);
  const [bedAssignForm, setBedAssignForm] = useState(EMPTY_BED_ASSIGN_FORM);
  const [bedDialogError, setBedDialogError] = useState("");

  useEffect(() => {
    void loadPanel(encounterId);
  }, [encounterId, loadPanel]);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4200);
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
        const [taskData, bedData] = await Promise.all([
          canReadNurseTasks ? fetchNurseTasksByEncounter(encounterId) : Promise.resolve([]),
          canReadBeds ? fetchBeds({}) : Promise.resolve([]),
        ]);

        setNurseTasks(taskData);

        const patientProfileId = Number(
          currentPanel.encounter.patientProfileId ?? currentPanel.patient?.id
        );
        const activeBed =
          bedData.find((bed) => Number(bed.currentAssignment?.encounterId) === Number(encounterId)) ??
          bedData.find(
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

  const availableWardOptions = useMemo(
    () => [...new Set(availableBeds.map((bed) => bed.ward).filter(Boolean))].sort(),
    [availableBeds]
  );
  const availableRoomOptions = useMemo(
    () =>
      [
        ...new Set(
          availableBeds
            .filter((bed) => bedAssignForm.ward === "all" || bed.ward === bedAssignForm.ward)
            .map((bed) => bed.roomNumber)
            .filter(Boolean)
        ),
      ].sort(),
    [availableBeds, bedAssignForm.ward]
  );
  const filteredAvailableBeds = useMemo(
    () =>
      availableBeds.filter((bed) => {
        const matchesWard = bedAssignForm.ward === "all" || bed.ward === bedAssignForm.ward;
        const matchesRoom =
          bedAssignForm.roomNumber === "all" || bed.roomNumber === bedAssignForm.roomNumber;
        return normalize(bed.status) === "available" && bed.isActive !== false && matchesWard && matchesRoom;
      }),
    [availableBeds, bedAssignForm.roomNumber, bedAssignForm.ward]
  );

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
  const canAssignNurseTask = isOpen && auth.hasPermission("NurseTasks.Assign");
  const canAssignBed = isOpen && auth.hasPermission("Beds.Assign") && auth.hasPermission("Beds.Read");
  const canReadNurseTasks = auth.hasPermission("NurseTasks.Read");
  const canReadBeds = auth.hasPermission("Beds.Read");
  const canReadNurses = auth.hasPermission("Nurses.Read");
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

  async function openBedAssignDialog() {
    setBedAssignForm(EMPTY_BED_ASSIGN_FORM);
    setBedDialogError("");
    setActionDialog("bed");
    try {
      setAvailableBeds(await fetchBeds({ status: "Available" }));
    } catch (err) {
      const message = getBedApiErrorMessage(err);
      setBedDialogError(message);
      showToast(message, "error");
      setAvailableBeds([]);
    }
  }

  function closeActionDialog() {
    setActionDialog(null);
    setNurseTaskForm(EMPTY_NURSE_TASK_FORM);
    setBedAssignForm(EMPTY_BED_ASSIGN_FORM);
    setBedDialogError("");
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

  async function handleAssignBed(event) {
    event.preventDefault();
    if (actionSaving) return;

    const bedId = Number.parseInt(bedAssignForm.bedId, 10);
    const patientProfileId = Number(encounter.patientProfileId ?? patient.id);
    if (!bedId || !patientProfileId) {
      showToast("An available bed is required.", "error");
      return;
    }

    setActionSaving(true);
    try {
      await assignBed(bedId, {
        patientProfileId,
        encounterId: Number(encounterId),
        notes: bedAssignForm.notes.trim() || null,
      });
      showToast("Bed assigned.");
      closeActionDialog();
      await loadPanel(encounterId);
      await loadRelatedEncounterData();
    } catch (err) {
      const message = getBedApiErrorMessage(err);
      setBedDialogError(message);
      showToast(message, "error");
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
          {canAssignNurseTask && (
            <Button type="button" variant="outline" onClick={openNurseTaskDialog} className="h-9 whitespace-nowrap px-3">
              <ClipboardCheck className="mr-2 h-4 w-4" aria-hidden />
              Assign Nurse Task
            </Button>
          )}
          {canAssignBed && !currentBed && (
            <Button type="button" variant="outline" onClick={openBedAssignDialog} className="h-9 whitespace-nowrap px-3">
              <BedDouble className="mr-2 h-4 w-4" aria-hidden />
              Assign Bed
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

      {completionNotice && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-sm animate-in fade-in slide-in-from-top-1"
        >
          Encounter completed successfully.
        </div>
      )}

      {toast && (
        <div
          role={toast.type === "error" ? "alert" : "status"}
          className={
            toast.type === "error"
              ? "rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
              : "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          }
        >
          {toast.message}
        </div>
      )}

      {(canReadBeds || canReadNurseTasks) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {canReadBeds && (
            <CurrentBedCard
              bed={currentBed}
              loading={relatedLoading}
              error={relatedError}
              canAssign={canAssignBed && !currentBed}
              onAssign={openBedAssignDialog}
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

      {actionDialog === "bed" && (
        <AssignBedDialog
          form={bedAssignForm}
          encounter={encounter}
          patient={patient}
          saving={actionSaving}
          availableBeds={filteredAvailableBeds}
          wardOptions={availableWardOptions}
          roomOptions={availableRoomOptions}
          error={bedDialogError}
          onClose={closeActionDialog}
          onSubmit={handleAssignBed}
          onChange={(patch) => setBedAssignForm((current) => ({ ...current, ...patch }))}
        />
      )}
    </div>
  );
}

function CurrentBedCard({ bed, loading, error, canAssign, onAssign }) {
  const assignment = bed?.currentAssignment;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Current Bed Assignment</CardTitle>
        {canAssign && (
          <Button type="button" size="sm" variant="outline" onClick={onAssign}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Assign Bed
          </Button>
        )}
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
                      {task.dueAt ? ` · Due ${formatDate(task.dueAt)}` : ""}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
      <section className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <DialogHeader
          icon={ClipboardCheck}
          title="Assign Nurse Task"
          subtitle="Create a nursing task linked to this encounter."
          onClose={onClose}
        />
        <form onSubmit={onSubmit} className="space-y-4 bg-slate-50 px-6 py-5">
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

function AssignBedDialog({
  form,
  encounter,
  patient,
  saving,
  availableBeds,
  wardOptions,
  roomOptions,
  error,
  onClose,
  onSubmit,
  onChange,
}) {
  const patientName = fullPatientName(patient) || encounter.patientName || "Patient";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
      <section className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <BedDouble className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold leading-6 text-slate-950">Assign Bed</h2>
              <p className="truncate text-sm text-slate-600">Select an available bed for this encounter.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="scrollbar-none min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 px-5 py-4">
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
                      .join(" · ")}
                  </p>
                  <div className="mt-2">
                    <Badge>{encounter.status}</Badge>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert">
                {error}
              </div>
            )}

            <div className="grid gap-3 lg:grid-cols-3">
            <FormField label="Ward filter">
              <select
                value={form.ward}
                onChange={(event) => onChange({ ward: event.target.value, roomNumber: "all", bedId: "" })}
                disabled={saving}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="all">All wards</option>
                {wardOptions.map((ward) => <option key={ward} value={ward}>{ward}</option>)}
              </select>
            </FormField>
            <FormField label="Room filter">
              <select
                value={form.roomNumber}
                onChange={(event) => onChange({ roomNumber: event.target.value, bedId: "" })}
                disabled={saving}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="all">All rooms</option>
                {roomOptions.map((room) => <option key={room} value={room}>{room}</option>)}
              </select>
            </FormField>
            <FormField label="Available bed" required>
              <select
                value={form.bedId}
                onChange={(event) => onChange({ bedId: event.target.value })}
                disabled={saving || availableBeds.length === 0}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:bg-slate-100"
                required
              >
                <option value="">Select bed</option>
                {availableBeds.map((bed) => (
                  <option key={bed.id} value={bed.id}>{bedLocation(bed)}</option>
                ))}
              </select>
              {availableBeds.length === 0 && (
                <p className="mt-1.5 text-xs text-slate-500">No available beds match the current filters.</p>
              )}
            </FormField>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">Available beds</h3>
                  <p className="mt-1 text-xs text-slate-500">Choose a bed card or use the selector above.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {availableBeds.length} open
                </span>
              </div>
              {availableBeds.length === 0 ? (
                <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <div>
                    <BedDouble className="mx-auto size-7 text-slate-300" aria-hidden />
                    <p className="mt-3 text-sm font-semibold text-slate-900">No available beds found</p>
                    <p className="mt-1 text-sm text-slate-500">Try changing the ward or room filter.</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {availableBeds.map((bed) => {
                    const selected = String(form.bedId) === String(bed.id);
                    return (
                      <button
                        key={bed.id}
                        type="button"
                        onClick={() => onChange({ bedId: String(bed.id) })}
                        disabled={saving}
                        className={[
                          "rounded-lg border bg-white p-3 text-left shadow-sm transition hover:border-sky-300 hover:bg-sky-50/40 disabled:opacity-60",
                          selected
                            ? "border-sky-500 bg-sky-50 ring-2 ring-sky-500/20"
                            : "border-slate-200",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">{bed.bedNumber}</p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              Room {bed.roomNumber || "-"}
                            </p>
                          </div>
                          <span className="mt-1 size-2.5 rounded-full bg-emerald-500" title="Available" />
                        </div>
                        <p className="mt-2 truncate text-xs text-slate-600">
                          {bed.departmentName || bed.ward || "Unassigned ward"}
                        </p>
                        <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
                          {bed.status || "Available"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          <FormField label="Notes">
            <textarea
              value={form.notes}
              onChange={(event) => onChange({ notes: event.target.value })}
              disabled={saving}
              rows={2}
              placeholder="Assignment notes"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </FormField>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
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
              disabled={saving || !form.bedId}
              className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50"
            >
              {saving ? "Assigning..." : "Assign Bed"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DialogHeader({ icon, title, subtitle, onClose }) {
  const HeaderIcon = icon;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
      <div className="flex items-start gap-4">
        <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
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
        className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        aria-label="Close"
      >
        <X className="size-5" aria-hidden />
      </button>
    </div>
  );
}

function DialogActions({ onClose, saving, submitLabel, savingLabel }) {
  return (
    <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
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

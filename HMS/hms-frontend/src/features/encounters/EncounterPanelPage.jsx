import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEncounterPanelStore } from "./encounterPanelStore";

export default function EncounterPanelPage() {
  const { encounterId } = useParams();

const {
  panel,
  loading,
  saving,
  error,
  loadPanel,
  createDiagnosis,
  createPrescription,
  closeEncounter,
} = useEncounterPanelStore();

  const [diagnosisForm, setDiagnosisForm] = useState({
    icdCode: "",
    description: "",
    type: "",
    notes: "",
  });

  const [prescriptionForm, setPrescriptionForm] = useState({
    notes: "",
    medicationId: "",
    dosage: "",
    frequency: "",
    duration: "",
    instructions: "",
  });

  useEffect(() => {
    loadPanel(encounterId);
  }, [encounterId, loadPanel]);

  async function handleCreateDiagnosis(e) {
    e.preventDefault();

    await createDiagnosis(encounterId, {
      icdCode: diagnosisForm.icdCode || null,
      description: diagnosisForm.description,
      type: diagnosisForm.type || null,
      notes: diagnosisForm.notes || null,
      diagnosedAt: new Date().toISOString(),
    });

    setDiagnosisForm({
      icdCode: "",
      description: "",
      type: "",
      notes: "",
    });
  }

  async function handleCreatePrescription(e) {
    e.preventDefault();

    await createPrescription(encounterId, {
      encounterId: Number(encounterId),
      prescribedByDoctorId: panel.encounter.doctorProfileId,
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
  }

  if (loading) return <div className="p-6">Loading encounter panel...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!panel) return <div className="p-6">No encounter data found.</div>;

  const { encounter, patient, diagnoses, prescriptions } = panel;
  const isOpen = encounter.status === "Open";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold">Encounter Panel</h1>
    <p className="text-sm text-muted-foreground">
      Manage the patient visit from one place.
    </p>
  </div>

    {isOpen ? (
        <Button
        type="button"
        disabled={saving}
        onClick={() => closeEncounter(encounterId)}
        >
            {saving ? "Saving..." : "Complete Encounter"}
            </Button>
        ) : (
         <Badge>{encounter.status}</Badge>
        )}
    </div>

      <Card>
        <CardHeader>
          <CardTitle>Encounter Info</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Info label="Encounter No." value={encounter.encounterNumber} />
          <Info label="Status" value={<Badge>{encounter.status}</Badge>} />
          <Info label="Patient" value={encounter.patientName} />
          <Info label="Doctor" value={encounter.doctorName} />
          <Info label="Type" value={encounter.encounterType} />
          <Info label="Started At" value={formatDate(encounter.startedAt)} />
          <Info label="Notes" value={encounter.notes || "-"} />
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

      <Card>
        <CardHeader>
          <CardTitle>Diagnoses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {isOpen && (
          <form onSubmit={handleCreateDiagnosis} className="space-y-3 rounded-lg border p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="ICD Code"
                value={diagnosisForm.icdCode}
                onChange={(e) =>
                  setDiagnosisForm({ ...diagnosisForm, icdCode: e.target.value })
                }
              />

              <Input
                placeholder="Type"
                value={diagnosisForm.type}
                onChange={(e) =>
                  setDiagnosisForm({ ...diagnosisForm, type: e.target.value })
                }
              />

              <Input
                placeholder="Description *"
                value={diagnosisForm.description}
                onChange={(e) =>
                  setDiagnosisForm({
                    ...diagnosisForm,
                    description: e.target.value,
                  })
                }
                required
              />
            </div>

            <Textarea
              placeholder="Notes"
              value={diagnosisForm.notes}
              onChange={(e) =>
                setDiagnosisForm({ ...diagnosisForm, notes: e.target.value })
              }
            />

            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Add Diagnosis"}
            </Button>
          </form>
            )}

          {diagnoses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No diagnoses yet.</p>
          ) : (
            <div className="space-y-3">
              {diagnoses.map((d) => (
                <div key={d.id} className="rounded-lg border p-3">
                  <div className="font-medium">{d.description}</div>
                  <div className="text-sm text-muted-foreground">
                    ICD: {d.icdCode || "-"} · Type: {d.type || "-"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Doctor: {d.createdByDoctorName}
                  </div>
                  {d.notes && <p className="mt-2 text-sm">{d.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prescriptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {isOpen && (
          <form onSubmit={handleCreatePrescription} className="space-y-3 rounded-lg border p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Input
                placeholder="Medication ID *"
                type="number"
                value={prescriptionForm.medicationId}
                onChange={(e) =>
                  setPrescriptionForm({
                    ...prescriptionForm,
                    medicationId: e.target.value,
                  })
                }
                required
              />

              <Input
                placeholder="Dosage *"
                value={prescriptionForm.dosage}
                onChange={(e) =>
                  setPrescriptionForm({
                    ...prescriptionForm,
                    dosage: e.target.value,
                  })
                }
                required
              />

              <Input
                placeholder="Frequency *"
                value={prescriptionForm.frequency}
                onChange={(e) =>
                  setPrescriptionForm({
                    ...prescriptionForm,
                    frequency: e.target.value,
                  })
                }
                required
              />

              <Input
                placeholder="Duration *"
                value={prescriptionForm.duration}
                onChange={(e) =>
                  setPrescriptionForm({
                    ...prescriptionForm,
                    duration: e.target.value,
                  })
                }
                required
              />
            </div>

            <Textarea
              placeholder="Prescription notes"
              value={prescriptionForm.notes}
              onChange={(e) =>
                setPrescriptionForm({
                  ...prescriptionForm,
                  notes: e.target.value,
                })
              }
            />

            <Textarea
              placeholder="Medication instructions"
              value={prescriptionForm.instructions}
              onChange={(e) =>
                setPrescriptionForm({
                  ...prescriptionForm,
                  instructions: e.target.value,
                })
              }
            />

            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Add Prescription"}
            </Button>
          </form>
            )}

          {prescriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No prescriptions yet.
            </p>
          ) : (
            <div className="space-y-3">
              {prescriptions.map((p) => (
                <div key={p.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Prescription #{p.id}</div>
                    <Badge>{p.status}</Badge>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Doctor: {p.doctorName}
                  </div>

                  {p.notes && <p className="mt-2 text-sm">{p.notes}</p>}

                  <div className="mt-3 space-y-2">
                    {p.items?.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-md bg-muted p-2 text-sm"
                      >
                        <div className="font-medium">{item.medicationName}</div>
                        <div>
                          {item.dosage} · {item.frequency} · {item.duration}
                        </div>
                        {item.instructions && (
                          <div className="text-muted-foreground">
                            {item.instructions}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}
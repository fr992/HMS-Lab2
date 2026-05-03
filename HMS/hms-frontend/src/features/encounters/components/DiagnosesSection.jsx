import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const DIAGNOSIS_TYPES = [
  { value: "", label: "Select diagnosis type (optional)" },
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "provisional", label: "Provisional" },
];

export default function DiagnosesSection({
  encounterId,
  diagnoses,
  isOpen,
  saving,
  onCreateDiagnosis,
}) {
  const [form, setForm] = useState({
    icdCode: "",
    description: "",
    type: "",
    notes: "",
  });

  async function handleSubmit(e) {
    e.preventDefault();

    if (!onCreateDiagnosis) return;
    
    await onCreateDiagnosis(encounterId, {
      icdCode: form.icdCode || null,
      description: form.description,
      type: form.type || null,
      notes: form.notes || null,
      diagnosedAt: new Date().toISOString(),
    });

    setForm({
      icdCode: "",
      description: "",
      type: "",
      notes: "",
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Diagnoses</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {isOpen && onCreateDiagnosis && (
          <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="ICD Code"
                value={form.icdCode}
                onChange={(e) => setForm({ ...form, icdCode: e.target.value })}
              />

              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-slate-900"
              >
                {DIAGNOSIS_TYPES.map((type) => (
                  <option key={type.value || "none"} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              <Input
                placeholder="Description *"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                required
              />
            </div>

            <Textarea
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{d.description}</div>
                  {d.type && <Badge variant="secondary">{d.type}</Badge>}
                </div>

                <div className="text-sm text-muted-foreground">
                  ICD: {d.icdCode || "-"}
                </div>

                <div className="text-sm text-muted-foreground">
                  Doctor: {d.createdByDoctorName || "Unknown"}
                </div>

                <div className="text-sm text-muted-foreground">
                  Diagnosed: {formatDate(d.diagnosedAt)}
                </div>

                {d.notes && <p className="mt-2 text-sm">{d.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}
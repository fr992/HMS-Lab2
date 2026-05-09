import { useState } from "react";
import { ClipboardPlus, FileText, Plus, X } from "lucide-react";
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
  const diagnosisItems = Array.isArray(diagnoses) ? diagnoses : [];
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    icdCode: "",
    description: "",
    type: "",
    notes: "",
  });

  async function handleSubmit(e) {
    e.preventDefault();

    if (!onCreateDiagnosis) return;

    setFormError("");
    if (!form.description.trim()) {
      setFormError("Description is required.");
      return;
    }

    try {
      await onCreateDiagnosis(encounterId, {
        icdCode: form.icdCode.trim() || null,
        description: form.description.trim(),
        type: form.type || null,
        notes: form.notes.trim() || null,
        diagnosedAt: new Date().toISOString(),
      });

      resetForm();
      setOpen(false);
    } catch (error) {
      setFormError(apiError(error));
    }
  }

  function resetForm() {
    setForm({
      icdCode: "",
      description: "",
      type: "",
      notes: "",
    });
    setFormError("");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Diagnoses</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            Clinical findings recorded for this encounter.
          </p>
        </div>
        {isOpen && onCreateDiagnosis && (
          <Button type="button" size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Add Diagnosis
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {diagnosisItems.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <div>
              <ClipboardPlus className="mx-auto size-8 text-slate-300" aria-hidden />
              <p className="mt-3 text-sm font-semibold text-slate-900">No diagnoses added yet</p>
              <p className="mt-1 text-sm text-slate-500">Add the first diagnosis for this encounter.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {diagnosisItems.map((d) => (
              <article key={d.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                        ICD {d.icdCode || "-"}
                      </span>
                      {d.type && <Badge variant="secondary">{formatDiagnosisType(d.type)}</Badge>}
                    </div>
                    <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-slate-950">
                      {d.description || "-"}
                    </h3>
                  </div>
                  <FileText className="mt-1 size-4 shrink-0 text-slate-400" aria-hidden />
                </div>
                {d.notes && (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{d.notes}</p>
                )}
                <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                  <span>Doctor: {d.createdByDoctorName || "Unknown"}</span>
                  <span>Diagnosed: {formatDate(d.diagnosedAt)}</span>
                  <span>Created: {formatDate(d.createdAt)}</span>
                  <span>Updated: {formatDate(d.updatedAt)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>

      {open && (
        <DiagnosisDialog
          form={form}
          saving={saving}
          error={formError}
          onSubmit={handleSubmit}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          onClose={() => {
            if (saving) return;
            resetForm();
            setOpen(false);
          }}
        />
      )}
    </Card>
  );
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function apiError(error) {
  const data = error?.response?.data;
  if (data?.error) return String(data.error);
  if (data?.title) return String(data.title);
  if (data?.message) return String(data.message);
  if (data?.errors) {
    const messages = Object.values(data.errors).flat().filter(Boolean);
    if (messages.length > 0) return messages.join(" ");
  }
  return error?.message || "Failed to add diagnosis.";
}

function formatDiagnosisType(value) {
  if (!value) return "-";
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function DiagnosisDialog({ form, saving, error, onSubmit, onChange, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
      <section className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ClipboardPlus className="size-6" aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Add Diagnosis</h2>
              <p className="mt-1 text-sm text-slate-600">Record diagnosis details for this encounter.</p>
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

        <form onSubmit={onSubmit} className="space-y-4 bg-slate-50 px-6 py-5">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert">
              {error}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              placeholder="ICD Code"
              value={form.icdCode}
              onChange={(e) => onChange({ icdCode: e.target.value })}
            />

            <select
              value={form.type}
              onChange={(e) => onChange({ type: e.target.value })}
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
              onChange={(e) => onChange({ description: e.target.value })}
              required
            />
          </div>

          <Textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            rows={4}
          />

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Add Diagnosis"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

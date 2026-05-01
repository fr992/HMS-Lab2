import { useState, useEffect, useId } from "react";
import {
  fetchPatientContacts,
  putPatientContacts,
  getApiErrorMessage,
} from "@/features/patients/patientsApi";

const emptyRow = () => ({
  name: "",
  relationship: "",
  phone: "",
  email: "",
  isPrimary: false,
});

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {number} props.patientId
 * @param {(msg: string) => void} props.onSuccess
 * @param {(msg: string) => void} props.onError
 */
export default function PatientContactModal({
  open,
  onClose,
  patientId,
  onSuccess,
  onError,
}) {
  const [rows, setRows] = useState([emptyRow()]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const baseId = useId();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchPatientContacts(patientId);
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          setRows(
            data.map((c) => ({
              name: c.name ?? "",
              relationship: c.relationship ?? "",
              phone: c.phone ?? "",
              email: c.email ?? "",
              isPrimary: !!c.isPrimary,
            }))
          );
        } else {
          setRows([emptyRow()]);
        }
      } catch (e) {
        if (!cancelled) setLoadError(getApiErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, patientId]);

  const setPrimary = (index) => {
    setRows((r) => r.map((row, i) => ({ ...row, isPrimary: i === index })));
  };

  const updateRow = (index, field, value) => {
    setRows((r) => {
      const n = [...r];
      n[index] = { ...n[index], [field]: value };
      return n;
    });
  };

  const addRow = () => setRows((r) => [...r, emptyRow()]);

  const removeRow = (index) => {
    setRows((r) => {
      const n = r.filter((_, i) => i !== index);
      if (n.length === 0) return [emptyRow()];
      if (!n.some((x) => x.isPrimary)) n[0] = { ...n[0], isPrimary: true };
      return n;
    });
  };

  const handleSave = async () => {
    const primaryCount = rows.filter((x) => x.isPrimary).length;
    if (primaryCount > 1) {
      onError("Select only one primary contact.");
      return;
    }
    const raw = rows
      .map((x) => ({
        name: (x.name || "").trim() || "—",
        relationship: (x.relationship || "").trim() || "—",
        phone: (x.phone || "").trim() || "—",
        email: (x.email || "").trim() || null,
        isPrimary: x.isPrimary,
      }))
      .filter(
        (x) =>
          x.name !== "—" ||
          x.relationship !== "—" ||
          x.phone !== "—" ||
          (x.email && x.email.length > 0)
      );
    if (raw.length > 0 && !raw.some((p) => p.isPrimary)) {
      raw[0] = { ...raw[0], isPrimary: true };
    }
    const payload = raw;
    setSaving(true);
    try {
      await putPatientContacts(patientId, payload);
      onSuccess("Contact information updated.");
      onClose();
    } catch (e) {
      onError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-slate-900/40"
        aria-label="Close"
        onClick={saving ? undefined : onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900">
          Emergency contacts
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Add or update contacts. One may be marked as primary.
        </p>
        {loadError && (
          <p className="mt-3 text-sm text-rose-600" role="alert">
            {loadError}
          </p>
        )}
        {loading && (
          <p className="mt-3 text-sm text-slate-500" aria-live="polite">
            Loading…
          </p>
        )}
        <div className="mt-4 space-y-4">
          {rows.map((row, i) => (
            <div
              key={`${baseId}-row-${i}`}
              className="rounded-md border border-slate-200 p-3"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="primary"
                    checked={row.isPrimary}
                    onChange={() => setPrimary(i)}
                  />
                  Primary
                </label>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="text-sm text-rose-600 hover:underline"
                    disabled={saving}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                  placeholder="Name"
                  value={row.name}
                  onChange={(e) => updateRow(i, "name", e.target.value)}
                />
                <input
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                  placeholder="Relationship"
                  value={row.relationship}
                  onChange={(e) => updateRow(i, "relationship", e.target.value)}
                />
                <input
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                  placeholder="Phone"
                  value={row.phone}
                  onChange={(e) => updateRow(i, "phone", e.target.value)}
                />
                <input
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                  type="email"
                  placeholder="Email (optional)"
                  value={row.email}
                  onChange={(e) => updateRow(i, "email", e.target.value)}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addRow}
            className="text-sm font-medium text-sky-700 hover:underline"
            disabled={saving || loading}
          >
            + Add another contact
          </button>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-md bg-sky-600 px-3 py-2 text-sm text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save contacts"}
          </button>
        </div>
      </div>
    </div>
  );
}

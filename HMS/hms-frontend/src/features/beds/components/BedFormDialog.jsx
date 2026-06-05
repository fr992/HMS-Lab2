import { BedDouble, X } from "lucide-react";
import { EMPTY_BED_FORM } from "./bedUtils";

export default function BedFormDialog({
  bed,
  departments,
  form,
  saving,
  onChange,
  onClose,
  onSubmit,
}) {
  const editing = Boolean(bed);

  return (
    <div className="hms-modal-overlay" role="dialog" aria-modal="true">
      <section className="hms-modal-panel-scroll max-w-4xl">
        <div className="hms-modal-header">
          <div className="flex items-start gap-4">
            <div className="hms-modal-header-icon">
              <BedDouble className="size-6" aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">{editing ? "Edit bed" : "Create bed"}</h2>
              <p className="mt-1 text-sm text-slate-600">Beds require a ward, room, and bed number.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="hms-modal-close" aria-label="Close">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col bg-slate-50">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Ward" required>
                <TextInput value={form.ward} onChange={(ward) => onChange({ ward })} disabled={saving} required />
              </Field>
              <Field label="Room number" required>
                <TextInput value={form.roomNumber} onChange={(roomNumber) => onChange({ roomNumber })} disabled={saving} required />
              </Field>
              <Field label="Bed number" required>
                <TextInput value={form.bedNumber} onChange={(bedNumber) => onChange({ bedNumber })} disabled={saving} required />
              </Field>
              <Field label="Floor">
                <TextInput value={form.floor} onChange={(floor) => onChange({ floor })} disabled={saving} placeholder="Optional" />
              </Field>
              <Field label="Department">
                <select
                  value={form.departmentId}
                  onChange={(event) => onChange({ departmentId: event.target.value })}
                  disabled={saving}
                  required
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value={EMPTY_BED_FORM.departmentId}>Select department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </Field>
              {editing && (
                <Field label="Active">
                  <label className="flex h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) => onChange({ isActive: event.target.checked })}
                      disabled={saving || bed?.currentAssignment}
                      className="size-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    Available for use
                  </label>
                </Field>
              )}
            </div>

            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(event) => onChange({ notes: event.target.value })}
                disabled={saving}
                rows={4}
                placeholder="Optional notes"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </Field>
          </div>

          <div className="hms-modal-footer bg-white px-6 py-4">
            <button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50">
              {saving ? "Saving..." : editing ? "Save bed" : "Create bed"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({ label, required, children }) {
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

function TextInput({ value, onChange, ...props }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
      {...props}
    />
  );
}

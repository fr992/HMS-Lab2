import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  DollarSign,
  Loader2,
  Plus,
  Receipt,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createInvoice, getApiErrorMessage } from "@/features/invoices/api/invoicesApi";
import { formatMoney } from "@/features/invoices/invoiceFormat";
import { fetchLabTests } from "@/features/labtests/api/labTests";
import { fetchPatients } from "@/features/patients/patientsApi";
import { getPagedItems } from "@/lib/pagination.jsx";

const CATEGORIES = [
  { value: "consultation", label: "Consultation" },
  { value: "procedure", label: "Procedure" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "lab", label: "Lab" },
  { value: "room", label: "Room" },
  { value: "other", label: "Other" },
];

function blankItem() {
  return {
    id: crypto.randomUUID?.() || `item-${Date.now()}-${Math.random()}`,
    description: "",
    category: "consultation",
    quantity: 1,
    unitPrice: 0,
    sourceType: null,
    sourceId: null,
  };
}

function patientName(patient) {
  return [patient?.firstName, patient?.lastName].filter(Boolean).join(" ").trim();
}

function defaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

export default function InvoiceFormDialog({
  open,
  onOpenChange,
  initialPatient,
  initialEncounter,
  initialItems,
  onCreated,
}) {
  const [patients, setPatients] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [labSearchByItem, setLabSearchByItem] = useState({});
  const [openLabPickerId, setOpenLabPickerId] = useState(null);
  const [form, setForm] = useState(() => buildInitialForm(initialPatient, initialEncounter, initialItems));

  useEffect(() => {
    if (!open) return;
    setForm(buildInitialForm(initialPatient, initialEncounter, initialItems));
    setPatientSearch("");
    setPatientPickerOpen(false);
    setLabSearchByItem({});
    setOpenLabPickerId(null);
    setError("");
  }, [initialEncounter, initialItems, initialPatient, open]);

  useEffect(() => {
    if (!open) return;
    let active = true;

    async function loadOptions() {
      setLoadingOptions(true);
      try {
        const [patientData, labTestData] = await Promise.all([
          fetchPatients(),
          fetchLabTests({ isActive: true, pageSize: 100 }),
        ]);
      if (!active) return;
      setPatients(Array.isArray(patientData) ? patientData : getPagedItems(patientData));
      setLabTests(getPagedItems(labTestData));
      } catch {
        if (active) {
          setPatients([]);
          setLabTests([]);
        }
      } finally {
        if (active) setLoadingOptions(false);
      }
    }

    void loadOptions();
    return () => {
      active = false;
    };
  }, [open]);

  const filteredPatients = useMemo(() => {
    const search = patientSearch.trim().toLowerCase();
    if (!search) return patients.slice(0, 30);
    return patients
      .filter((patient) =>
        [
          patientName(patient),
          patient.patientNumber,
          patient.personalNumber,
          patient.phone,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search))
      )
      .slice(0, 30);
  }, [patientSearch, patients]);

  const selectedPatient =
    initialPatient?.id && Number(form.patientProfileId) === Number(initialPatient.id)
      ? initialPatient
      : patients.find((patient) => Number(patient.id) === Number(form.patientProfileId));
  const selectedPatientLabel = selectedPatient
    ? `${patientName(selectedPatient) || `Patient #${selectedPatient.id}`} - ${selectedPatient.patientNumber || selectedPatient.personalNumber || selectedPatient.id}`
    : "";

  const subtotal = form.items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );
  const discount = Number(form.discountAmount) || 0;
  const tax = Number(form.taxAmount) || 0;
  const total = Math.max(0, subtotal - discount + tax);

  function patchItem(id, patch) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  function removeItem(id) {
    setForm((current) => ({
      ...current,
      items: current.items.length === 1
        ? current.items
        : current.items.filter((item) => item.id !== id),
    }));
  }

  function chooseLabTest(itemId, labTestId) {
    const test = labTests.find((candidate) => Number(candidate.id) === Number(labTestId));
    if (!test) return;
    patchItem(itemId, {
      category: "lab",
      description: `Lab: ${test.name}`,
      unitPrice: Number(test.price) || 0,
      sourceType: "lab_test",
      sourceId: test.id,
    });
    setLabSearchByItem((current) => ({
      ...current,
      [itemId]: labTestLabel(test, form.currency),
    }));
    setOpenLabPickerId(null);
  }

  function choosePatient(patient) {
    setForm((current) => ({ ...current, patientProfileId: String(patient.id) }));
    setPatientSearch(
      `${patientName(patient) || `Patient #${patient.id}`} - ${patient.patientNumber || patient.personalNumber || patient.id}`
    );
    setPatientPickerOpen(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!Number(form.patientProfileId)) {
      setError("Patient is required.");
      return;
    }

    const items = form.items
      .map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        sourceType: item.sourceType || item.category || null,
        sourceId: item.sourceId ? Number(item.sourceId) : null,
      }))
      .filter((item) => item.description);

    if (items.length === 0) {
      setError("Add at least one invoice item with a description.");
      return;
    }

    if (items.some((item) => item.quantity <= 0 || item.unitPrice < 0)) {
      setError("Quantity must be greater than zero and prices cannot be negative.");
      return;
    }

    setSaving(true);
    try {
      const created = await createInvoice({
        patientProfileId: Number(form.patientProfileId),
        encounterId: form.encounterId ? Number(form.encounterId) : null,
        currency: form.currency || "EUR",
        discountAmount: Number(form.discountAmount) || 0,
        taxAmount: Number(form.taxAmount) || 0,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
        items,
      });
      toast.success(`Invoice ${created.invoiceNumber || `#${created.id}`} issued.`);
      onCreated?.(created);
      onOpenChange(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3">
      <section className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3.5 sm:px-6">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
              <DollarSign className="size-5 text-blue-600" />
              Create Invoice
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Generate a new invoice for a patient or encounter.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close create invoice"
          >
            <X className="size-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Patient">
                {initialPatient ? (
                  <div className="flex h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900">
                    {patientName(initialPatient) || initialPatient.patientName || `Patient #${initialPatient.id}`}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={patientSearch || selectedPatientLabel}
                        onChange={(event) => {
                          setPatientSearch(event.target.value);
                          setForm((current) => ({ ...current, patientProfileId: "" }));
                          setPatientPickerOpen(true);
                        }}
                        onFocus={() => setPatientPickerOpen(true)}
                        onBlur={() => window.setTimeout(() => setPatientPickerOpen(false), 140)}
                        placeholder="Search patient"
                        className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                      />
                      {patientPickerOpen && (
                        <div className="absolute left-0 right-0 top-full z-[80] mt-1 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-2xl">
                          {loadingOptions ? (
                            <p className="px-3 py-2 text-sm text-slate-500">Loading patients...</p>
                          ) : filteredPatients.length > 0 ? (
                            filteredPatients.map((patient) => (
                              <button
                                key={patient.id}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => choosePatient(patient)}
                                className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate font-medium text-slate-900">
                                    {patientName(patient) || `Patient #${patient.id}`}
                                  </span>
                                  <span className="block truncate text-xs text-slate-500">
                                    {[patient.patientNumber, patient.personalNumber, patient.phone]
                                      .filter(Boolean)
                                      .join(" | ") || `Profile #${patient.id}`}
                                  </span>
                                </span>
                              </button>
                            ))
                          ) : (
                            <p className="px-3 py-2 text-sm text-slate-500">No patients match.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Field>

              <Field label="Type">
                <select
                  value={form.encounterId ? "encounter" : "general"}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      encounterId:
                        event.target.value === "encounter"
                          ? current.encounterId || initialEncounter?.id || ""
                          : "",
                    }))
                  }
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                >
                  <option value="general">General</option>
                  <option value="encounter">Encounter</option>
                </select>
              </Field>

              <Field label="Due date">
                <input
                  type="date"
                  value={form.dueAt}
                  onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </Field>

              <Field label="Encounter ID">
                <input
                  type="number"
                  min="1"
                  value={form.encounterId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, encounterId: event.target.value }))
                  }
                  placeholder="Optional"
                  disabled={Boolean(initialEncounter)}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:bg-slate-50"
                />
              </Field>
            </div>

            {selectedPatient?.insuranceNumber && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Insurance reference: <span className="font-semibold text-slate-900">{selectedPatient.insuranceNumber}</span>
              </div>
            )}

            <div className="border-t border-slate-200 pt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-950">Line items</h3>
                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({ ...current, items: [...current.items, blankItem()] }))
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  <Plus className="size-4" />
                  Add item
                </button>
              </div>

              <div className="rounded-lg border border-slate-200">
                {form.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-2 border-b border-slate-100 p-3 last:border-b-0 lg:grid-cols-[minmax(15rem,1fr)_10rem_5rem_8rem_7rem_2.5rem] lg:items-center"
                  >
                    <input
                      value={item.description}
                      onChange={(event) => patchItem(item.id, { description: event.target.value })}
                      placeholder="Description"
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                    <select
                      value={item.category}
                      onChange={(event) => {
                        const category = event.target.value;
                        patchItem(item.id, {
                          category,
                          sourceType: category,
                          sourceId: null,
                        });
                      }}
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(event) => patchItem(item.id, { quantity: event.target.value })}
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-center text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(event) => patchItem(item.id, { unitPrice: event.target.value })}
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                    <div className="text-right text-sm font-semibold text-slate-950">
                      {formatMoney((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), form.currency)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={form.items.length === 1}
                      className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                      aria-label="Remove invoice item"
                    >
                      <Trash2 className="size-4" />
                    </button>

                    {labTests.length > 0 && (
                      <LabTestPicker
                        item={item}
                        labTests={labTests}
                        currency={form.currency}
                        open={openLabPickerId === item.id}
                        search={labSearchByItem[item.id] ?? ""}
                        onOpenChange={(nextOpen) => setOpenLabPickerId(nextOpen ? item.id : null)}
                        onSearchChange={(value) =>
                          setLabSearchByItem((current) => ({ ...current, [item.id]: value }))
                        }
                        onChoose={(labTestId) => chooseLabTest(item.id, labTestId)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Notes">
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Internal notes, payment instructions..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Notes are for this screen only until backend support is added.
                </p>
              </Field>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <TotalRow label="Subtotal" value={formatMoney(subtotal, form.currency)} />
                <TotalInput
                  label="Discount"
                  value={form.discountAmount}
                  onChange={(value) => setForm((current) => ({ ...current, discountAmount: value }))}
                />
                <TotalInput
                  label="Tax"
                  value={form.taxAmount}
                  onChange={(value) => setForm((current) => ({ ...current, taxAmount: value }))}
                />
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <TotalRow label="Total due" value={formatMoney(total, form.currency)} bold />
                </div>
              </div>
            </div>
          </div>

          <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="h-11 rounded-lg px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Issue invoice
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function LabTestPicker({
  item,
  labTests,
  currency,
  open,
  search,
  onOpenChange,
  onSearchChange,
  onChoose,
}) {
  const selectedTest = labTests.find((test) => Number(test.id) === Number(item.sourceId));
  const displayValue =
    search || (selectedTest ? labTestLabel(selectedTest, currency) : "");
  const normalized = displayValue.trim().toLowerCase();
  const visibleTests = labTests
    .filter((test) =>
      !normalized ||
      [test.testCode, test.name, test.specimenType, test.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    )
    .slice(0, 12);

  return (
    <div className="relative lg:col-span-6">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400" />
      <input
        value={displayValue}
        onChange={(event) => {
          onSearchChange(event.target.value);
          onOpenChange(true);
        }}
        onFocus={() => onOpenChange(true)}
        onBlur={() => window.setTimeout(() => onOpenChange(false), 130)}
        placeholder="Search lab test catalog price..."
        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
      />
      {open && (
        <div className="absolute z-[90] mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-2xl">
          {visibleTests.length > 0 ? (
            visibleTests.map((test) => (
              <button
                key={test.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onChoose(test.id)}
                className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-slate-50"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-900">
                    {test.testCode ? `${test.testCode} - ` : ""}
                    {test.name}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {[test.specimenType, test.description].filter(Boolean).join(" | ") || "Lab catalog item"}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-slate-700">
                  {formatMoney(test.price || 0, currency)}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-slate-500">No lab tests match.</p>
          )}
        </div>
      )}
    </div>
  );
}

function labTestLabel(test, currency) {
  return `${test.testCode ? `${test.testCode} - ` : ""}${test.name} (${formatMoney(test.price || 0, currency)})`;
}

function buildInitialForm(initialPatient, initialEncounter, initialItems) {
  const items = Array.isArray(initialItems) && initialItems.length > 0
    ? initialItems.map((item) => ({ ...blankItem(), ...item }))
    : [blankItem()];

  return {
    patientProfileId: initialPatient?.id || initialEncounter?.patientProfileId || "",
    encounterId: initialEncounter?.id || "",
    currency: "EUR",
    dueAt: defaultDueDate(),
    discountAmount: 0,
    taxAmount: 0,
    notes: "",
    items,
  };
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function TotalRow({ label, value, bold = false }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className={bold ? "font-semibold text-slate-950" : "text-slate-600"}>{label}</span>
      <span className={bold ? "text-lg font-bold text-slate-950" : "font-medium text-slate-900"}>{value}</span>
    </div>
  );
}

function TotalInput({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1">
      <span className="text-slate-600">{label}</span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-32 rounded-lg border border-slate-200 bg-white px-3 text-right text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
      />
    </label>
  );
}

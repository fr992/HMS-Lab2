import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Download,
  FlaskConical,
  Loader2,
  Paperclip,
  Plus,
  Printer,
  ShieldCheck,
  Stethoscope,
  TestTube2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import apiClient from "@/api/apiClient";
import {
  createLabResult,
  fetchLabRequestDetails,
  getApiErrorMessage,
  publishLabResult,
  updateLabResult,
} from "@/features/labRequests/api/labRequestsApi";
import { printLabResultPdf } from "@/lib/pdfPrint";

const STATUS_META = {
  requested: "bg-amber-50 text-amber-900 ring-amber-200",
  sample_collected: "bg-sky-50 text-sky-900 ring-sky-200",
  in_progress: "bg-indigo-50 text-indigo-900 ring-indigo-200",
  completed: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-900 ring-rose-200",
};

const PRIORITY_META = {
  routine: "bg-slate-100 text-slate-700 ring-slate-200",
  urgent: "bg-orange-50 text-orange-900 ring-orange-200",
  stat: "bg-rose-50 text-rose-900 ring-rose-200",
};

const REQUEST_ACCENT_META = {
  requested: "border-l-amber-400",
  sample_collected: "border-l-sky-400",
  in_progress: "border-l-indigo-400",
  completed: "border-l-emerald-500",
  cancelled: "border-l-rose-500",
};

const EMPTY_FORM = {
  labRequestItemId: "",
  resultData: "",
  referenceRange: "",
  interpretation: "",
  attachment: null,
  removeAttachment: false,
};

const compactInputClass =
  "mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:opacity-60";

const compactTextareaClass =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:opacity-60";

function keyOf(value) {
  return String(value ?? "").trim().toLowerCase();
}

function titleCase(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDateParts(value) {
  if (!value) return { date: "-", time: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "-", time: "" };

  return {
    date: date.toLocaleDateString(undefined, { dateStyle: "medium" }),
    time: date.toLocaleTimeString(undefined, { timeStyle: "short" }),
  };
}

function formatBytes(value) {
  if (!Number.isFinite(Number(value))) return "";
  const bytes = Number(value);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function hasLabResult(item) {
  return Array.isArray(item?.results) && item.results.length > 0;
}

function Badge({ value, kind = "status" }) {
  const key = keyOf(value);
  const classes =
    kind === "priority"
      ? PRIORITY_META[key] ?? "bg-slate-100 text-slate-700 ring-slate-200"
      : STATUS_META[key] ?? "bg-slate-50 text-slate-700 ring-slate-200";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${classes}`}>
      {titleCase(value) || "-"}
    </span>
  );
}

function ResultStatusBadge({ result }) {
  if (result.verifiedAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
        Published
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
      Draft
    </span>
  );
}

function ResultMetric({ label, value, emphasis = false }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={
          emphasis
            ? "mt-1 truncate text-base font-semibold text-slate-950"
            : "mt-1 truncate text-sm font-medium text-slate-800"
        }
        title={typeof value === "string" ? value : undefined}
      >
        {value || "-"}
      </p>
    </div>
  );
}

function SummaryMetaCard({ icon, label, value }) {
  const parts = formatDateParts(value);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
            {parts.date}
          </p>
          {parts.time && <p className="text-xs text-slate-500">{parts.time}</p>}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value, subValue }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-950">
            {value || "-"}
          </p>
          {subValue && <p className="mt-1 text-xs text-slate-500">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function ResultModal({
  request,
  selectedItemId,
  editingResult,
  saving,
  error,
  onClose,
  onSubmit,
}) {
  const isEditing = Boolean(editingResult);
  const activeItemId = editingResult?.labRequestItemId ?? selectedItemId;
  const resultableItems = useMemo(
    () => {
      if (isEditing) {
        return (request?.items ?? []).filter(
          (item) => Number(item.id) === Number(activeItemId)
        );
      }

      return (request?.items ?? []).filter((item) => !hasLabResult(item));
    },
    [activeItemId, isEditing, request]
  );

  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    labRequestItemId: activeItemId ? String(activeItemId) : "",
    resultData: editingResult?.resultData ?? "",
    referenceRange: editingResult?.referenceRange ?? "",
    interpretation: editingResult?.interpretation ?? "",
    removeAttachment: false,
  }));

  useEffect(() => {
    setForm({
      ...EMPTY_FORM,
      labRequestItemId: activeItemId ? String(activeItemId) : "",
      resultData: editingResult?.resultData ?? "",
      referenceRange: editingResult?.referenceRange ?? "",
      interpretation: editingResult?.interpretation ?? "",
      removeAttachment: false,
    });
  }, [activeItemId, editingResult]);

  const selectedItem = (request?.items ?? []).find(
    (item) => String(item.id) === String(form.labRequestItemId)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lab-result-modal-title"
    >
      <section className="flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Lab result
            </p>
            <h2 id="lab-result-modal-title" className="mt-0.5 text-base font-semibold text-slate-950">
              {isEditing ? "Edit result" : "Add result"}
            </h2>
            {selectedItem && (
              <p className="mt-0.5 truncate text-sm text-slate-600">
                {selectedItem.testName}
                {selectedItem.testCode ? ` (${selectedItem.testCode})` : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
            aria-label="Close add result form"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(form, editingResult);
          }}
        >
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                {error}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Requested test">
                <select
                  value={form.labRequestItemId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, labRequestItemId: event.target.value }))
                  }
                  disabled={saving || isEditing}
                  className={compactInputClass}
                  required
                >
                  <option value="">Select test</option>
                  {resultableItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.testName}
                      {item.testCode ? ` (${item.testCode})` : ""}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Reference range">
                <input
                  type="text"
                  value={form.referenceRange}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, referenceRange: event.target.value }))
                  }
                  disabled={saving}
                  className={compactInputClass}
                  placeholder="Optional"
                />
              </Field>
            </div>

            <Field label="Result data">
              <textarea
                value={form.resultData}
                onChange={(event) =>
                  setForm((current) => ({ ...current, resultData: event.target.value }))
                }
                disabled={saving}
                className={`${compactTextareaClass} min-h-24`}
                placeholder="Enter the result exactly as reported by the lab instrument or reviewer"
                required
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Interpretation">
                <textarea
                  value={form.interpretation}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, interpretation: event.target.value }))
                  }
                  disabled={saving}
                  className={`${compactTextareaClass} min-h-20`}
                  placeholder="Optional"
                />
              </Field>

              <Field label={isEditing ? "Attachment" : "Attachment"}>
                <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  {isEditing && editingResult?.hasAttachment && (
                    <label className="mb-2 flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200">
                      <span className="min-w-0 truncate">
                        {editingResult.attachmentFileName || "Current attachment"}
                      </span>
                      <span className="inline-flex items-center gap-2 font-medium text-rose-700">
                        Remove
                        <input
                          type="checkbox"
                          checked={form.removeAttachment}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              removeAttachment: event.target.checked,
                              attachment: event.target.checked ? null : current.attachment,
                            }))
                          }
                          disabled={saving}
                          className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                      </span>
                    </label>
                  )}
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        attachment: event.target.files?.[0] ?? null,
                        removeAttachment: false,
                      }))
                    }
                    disabled={saving || form.removeAttachment}
                    className="block w-full text-xs text-slate-600 file:mr-3 file:h-8 file:rounded-md file:border-0 file:bg-white file:px-3 file:text-xs file:font-medium file:text-slate-700 file:shadow-sm hover:file:bg-slate-100 disabled:opacity-60"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    PDF, JPG, PNG, or WebP up to 10 MB.
                  </p>
                </div>
              </Field>
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-white px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {saving
                ? "Saving..."
                : isEditing
                  ? "Update result"
                  : "Save result"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function LabRequestDetailPage() {
  const auth = useAuth();
  const { id, requestNumber } = useParams();
  const location = useLocation();
  const initialRequest = location.state?.request ?? null;
  const decodedRequestNumber = decodeURIComponent(requestNumber ?? initialRequest?.requestNumber ?? "");

  const canCreateResult = auth.hasPermission("LabResults.Create");
  const canUpdateResult = auth.hasPermission("LabResults.Update");
  const canPublishResult = auth.hasPermission("LabResults.Publish");
  const canReadResults = auth.hasPermission("LabResults.Read");

  const [request, setRequest] = useState(initialRequest);
  const [loading, setLoading] = useState(!initialRequest);
  const [error, setError] = useState("");
  const [modalItemId, setModalItemId] = useState(null);
  const [editingResult, setEditingResult] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const results = useMemo(
    () => (request?.items ?? []).flatMap((item) => item.results ?? []),
    [request]
  );
  const resultableItems = useMemo(
    () => (request?.items ?? []).filter((item) => !hasLabResult(item)),
    [request]
  );
  const firstResultableItemId = resultableItems[0]?.id ?? "";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchLabRequestDetails(decodedRequestNumber, id);
      if (!data) {
        setError("Lab request was not found.");
        setRequest(null);
      } else {
        setRequest(data);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [decodedRequestNumber, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const showToast = useCallback((message, type = "success") => {
    toast[type === "error" ? "error" : type === "warning" ? "warning" : "success"](message);
  }, []);

  useEffect(() => {
    if (error) showToast(error, "error");
  }, [error, showToast]);

  async function handleSaveResult(form, result) {
    setFormError("");
    if (!form.labRequestItemId) {
      setFormError("Requested test is required.");
      return;
    }
    if (!form.resultData.trim()) {
      setFormError("Result data is required.");
      return;
    }

    setSaving(true);
    try {
      if (result) {
        await updateLabResult(result.id, {
          resultData: form.resultData.trim(),
          referenceRange: form.referenceRange,
          interpretation: form.interpretation,
          removeAttachment: form.removeAttachment,
          attachment: form.attachment,
        });
      } else {
        await createLabResult({
          labRequestItemId: Number(form.labRequestItemId),
          resultData: form.resultData.trim(),
          referenceRange: form.referenceRange,
          interpretation: form.interpretation,
          attachment: form.attachment,
        });
      }
      setModalItemId(null);
      setEditingResult(null);
      showToast(result ? "Lab result updated." : "Lab result added.");
      await load();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(result) {
    if (publishingId != null) return;
    setPublishingId(result.id);
    try {
      await publishLabResult(result.id);
      showToast("Lab result published.");
      await load();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setPublishingId(null);
    }
  }

  async function downloadAttachment(result) {
    if (downloadingId != null) return;
    setDownloadingId(result.id);
    try {
      const response = await apiClient.get(`/lab-results/${result.id}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.attachmentFileName || `lab-result-${result.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setDownloadingId(null);
    }
  }

  if (loading && !request) {
    return (
      <div className="flex min-h-96 items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        Loading lab request...
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link
            to="/lab-requests"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to lab requests
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              {request?.requestNumber || `Lab request #${id}`}
            </h1>
            {request?.status && <Badge value={request.status} />}
          </div>
          <p className="mt-1.5 text-sm text-slate-600">
            Request details, ordered tests, and connected lab results.
          </p>
        </div>
        {canCreateResult && request && resultableItems.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setFormError("");
              setEditingResult(null);
              setModalItemId(firstResultableItemId);
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add result
          </button>
        )}
      </div>

      {request && (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard icon={<UserRound className="h-4 w-4" aria-hidden />} label="Patient" value={request.patientName} subValue={`Profile #${request.patientProfileId}`} />
            <InfoCard icon={<Stethoscope className="h-4 w-4" aria-hidden />} label="Requested by" value={request.requestedByDoctorName} subValue={`Doctor #${request.requestedByDoctorId}`} />
            <InfoCard icon={<CalendarClock className="h-4 w-4" aria-hidden />} label="Encounter" value={`Encounter #${request.encounterId}`} subValue={formatDateTime(request.requestedAt)} />
            <InfoCard icon={<FlaskConical className="h-4 w-4" aria-hidden />} label="Priority" value={titleCase(request.priority)} subValue={request.completedAt ? `Completed ${formatDateTime(request.completedAt)}` : "Active lab workflow"} />
          </div>

          <section className="grid gap-5 xl:grid-cols-[1fr_20rem]">
            <div
              className={`rounded-lg border border-l-4 border-slate-200 bg-white shadow-sm ${
                REQUEST_ACCENT_META[keyOf(request.status)] ??
                (keyOf(request.priority) === "urgent" || keyOf(request.priority) === "stat"
                  ? "border-l-orange-400"
                  : "border-l-slate-300")
              }`}
            >
              <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">
                    Request #{request.id}
                  </p>
                  <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-slate-950">
                    {request.requestNumber}
                  </h2>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Badge value={request.status} />
                  <Badge value={request.priority} kind="priority" />
                </div>
              </div>

              <div className="grid gap-2.5 p-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryMetaCard
                  icon={<CalendarClock className="h-4 w-4" aria-hidden />}
                  label="Requested"
                  value={request.requestedAt}
                />
                <SummaryMetaCard
                  icon={<TestTube2 className="h-4 w-4" aria-hidden />}
                  label="Collected"
                  value={request.collectedAt}
                />
                <SummaryMetaCard
                  icon={<Plus className="h-4 w-4" aria-hidden />}
                  label="Created"
                  value={request.createdAt}
                />
                <SummaryMetaCard
                  icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
                  label="Updated"
                  value={request.updatedAt}
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Clinical notes</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {request.clinicalNotes || "No clinical notes were provided for this request."}
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Requested tests</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {(request.items ?? []).length} item{(request.items ?? []).length === 1 ? "" : "s"} ordered.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Test</th>
                    <th className="px-4 py-3">Specimen</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(request.items ?? []).map((item) => {
                    const itemResult = item.results?.[0] ?? null;

                    return (
                      <tr key={item.id} className="align-top">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{item.testName}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.testCode || `Item #${item.id}`}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item.specimenType || "-"}</td>
                        <td className="px-4 py-3"><Badge value={item.status} /></td>
                        <td className="max-w-md px-4 py-3 text-slate-600">{item.notes || "-"}</td>
                        <td className="px-4 py-3 text-right">
                          {itemResult && canUpdateResult ? (
                            <button
                              type="button"
                              onClick={() => {
                                setFormError("");
                                setModalItemId(item.id);
                                setEditingResult(itemResult);
                              }}
                              className="inline-flex h-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-800 shadow-sm transition hover:bg-emerald-100"
                            >
                              Edit result
                            </button>
                          ) : itemResult ? (
                            <span className="inline-flex h-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-800">
                              Result added
                            </span>
                          ) : canCreateResult ? (
                            <button
                              type="button"
                              onClick={() => {
                                setFormError("");
                                setEditingResult(null);
                                setModalItemId(item.id);
                              }}
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
                            >
                              <Plus className="h-4 w-4" aria-hidden />
                              Add result
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Results</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {results.length} result{results.length === 1 ? "" : "s"} connected to this request.
                </p>
              </div>
              {canCreateResult && resultableItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFormError("");
                    setEditingResult(null);
                    setModalItemId(firstResultableItemId);
                  }}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Add result
                </button>
              )}
            </div>

            {results.length === 0 ? (
              <div className="flex min-h-32 items-center justify-center p-6 text-center">
                <div>
                  <TestTube2 className="mx-auto h-7 w-7 text-slate-300" aria-hidden />
                  <p className="mt-2 text-sm font-medium text-slate-900">No lab results yet</p>
                  <p className="mt-1 text-sm text-slate-500">Add results when analysis data is ready.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 bg-slate-50/70 p-3">
                {results.map((result) => (
                  <article
                    key={result.id}
                    className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-slate-950 sm:text-base">
                            {result.testName}
                          </h3>
                          {result.testCode && (
                            <span className="inline-flex shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                              {result.testCode}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Request {result.requestNumber || request.requestNumber} · Result #{result.id}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                        <ResultStatusBadge result={result} />
                        {canUpdateResult && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormError("");
                              setModalItemId(result.labRequestItemId);
                              setEditingResult(result);
                            }}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                          >
                            Edit
                          </button>
                        )}
                        {canReadResults && result.hasAttachment && (
                          <button
                            type="button"
                            onClick={() => downloadAttachment(result)}
                            disabled={downloadingId != null}
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                            title="Download attachment"
                          >
                            {downloadingId === result.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            ) : (
                              <Download className="h-4 w-4" aria-hidden />
                            )}
                            Download
                          </button>
                        )}
                        {canReadResults && (
                          <button
                            type="button"
                            onClick={() => {
                              const ok = printLabResultPdf(result, request);
                              if (!ok) {
                                showToast("Your browser blocked the PDF window. Please allow pop-ups for this app and try again.", "error");
                              }
                            }}
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                            title="View lab result PDF"
                          >
                            <Printer className="h-4 w-4" aria-hidden />
                            PDF
                          </button>
                        )}
                        {canPublishResult && !result.verifiedAt && (
                          <button
                            type="button"
                            onClick={() => handlePublish(result)}
                            disabled={publishingId != null}
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {publishingId === result.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" aria-hidden />
                            )}
                            Publish
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                      <ResultMetric
                        label="Result value"
                        value={result.resultData}
                        emphasis
                      />
                      <ResultMetric
                        label="Reference range"
                        value={result.referenceRange}
                      />
                      <ResultMetric
                        label="Interpretation"
                        value={result.interpretation}
                      />
                    </div>

                    {canReadResults && result.hasAttachment && (
                      <button
                        type="button"
                        onClick={() => downloadAttachment(result)}
                        disabled={downloadingId != null}
                        className="mt-2.5 inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        <Paperclip className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                        <span className="min-w-0 truncate text-xs font-medium text-slate-700">
                          {result.attachmentFileName || "Lab result attachment"}
                          {result.attachmentSizeBytes
                            ? ` - ${formatBytes(result.attachmentSizeBytes)}`
                            : ""}
                        </span>
                        {downloadingId === result.id ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-500" aria-hidden />
                        ) : (
                          <Download className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                        )}
                      </button>
                    )}

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                      <span>Created {formatDateTime(result.createdAt)}</span>
                      <span>Updated {formatDateTime(result.updatedAt)}</span>
                      {result.verifiedAt && (
                        <span>
                          Published by {result.verifiedByUserName || `user #${result.verifiedByUserId}`} on {formatDateTime(result.verifiedAt)}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {!canReadResults && (
              <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                Result download links require LabResults.Read permission.
              </div>
            )}
          </section>
        </>
      )}

      {modalItemId !== null && (
        <ResultModal
          request={request}
          selectedItemId={modalItemId}
          editingResult={editingResult}
          saving={saving}
          error={formError}
          onClose={() => {
            if (!saving) {
              setModalItemId(null);
              setEditingResult(null);
            }
          }}
          onSubmit={handleSaveResult}
        />
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Download, FileCheck2, FlaskConical } from "lucide-react";
import {
  downloadMyLabResultAttachment,
  fetchMyLabResults,
} from "@/features/patientPortal/patientPortalApi";
import {
  formatDateTime,
  getApiErrorMessage,
  titleCase,
} from "@/features/dashboard/dashboardUtils";
import { EmptyBox, ErrorBox, LoadingBox, PageHeader, StatusPill } from "@/features/patientPortal/PatientAppointmentsPage";

export default function PatientLabResultsPage() {
  const [state, setState] = useState({ status: "loading", items: [], error: "" });
  const [downloadingId, setDownloadingId] = useState(null);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, status: "loading", error: "" }));
    try {
      const items = await fetchMyLabResults();
      setState({ status: "ready", items: Array.isArray(items) ? items : [], error: "" });
    } catch (error) {
      setState({ status: "error", items: [], error: getApiErrorMessage(error) });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDownload(result) {
    if (downloadingId) return;

    setDownloadingId(result.id);
    setState((current) => ({ ...current, error: "" }));
    try {
      const response = await downloadMyLabResultAttachment(result.id);
      const fileName = getDownloadFileName(response, result.attachmentFileName || `lab-result-${result.id}`);
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setState((current) => ({ ...current, status: "ready", error: getApiErrorMessage(error) }));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <PageHeader
        title="My lab results"
        subtitle="Published laboratory results and downloadable attachments."
        onRefresh={load}
        refreshing={state.status === "loading"}
      />
      {state.error && <ErrorBox message={state.error} />}
      {state.status === "loading" && <LoadingBox label="Loading lab results..." />}
      {state.status === "ready" && (
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          {state.items.length === 0 ? (
            <EmptyBox>No published lab results yet.</EmptyBox>
          ) : (
            <div className="divide-y divide-slate-100">
              {state.items.map((result) => (
                <article key={result.id} className="grid gap-4 px-4 py-4 lg:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <FlaskConical className="size-4 text-slate-400" aria-hidden />
                      <h2 className="font-semibold text-slate-950">
                        {result.testName || result.requestNumber || "Lab result"}
                      </h2>
                      {result.interpretation && <StatusPill>{result.interpretation}</StatusPill>}
                    </div>
                    <dl className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <Info label="Request" value={result.requestNumber} />
                      <Info label="Verified" value={formatDateTime(result.verifiedAt || result.updatedAt)} />
                      <Info label="Result" value={result.resultData} />
                      <Info label="Reference" value={result.referenceRange || "-"} />
                    </dl>
                  </div>
                  <div className="flex items-start gap-2 lg:justify-end">
                    {result.hasAttachment ? (
                      <button
                        type="button"
                        onClick={() => handleDownload(result)}
                        disabled={downloadingId === result.id}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        <Download className="size-4" aria-hidden />
                        {downloadingId === result.id ? "Downloading..." : "Download"}
                      </button>
                    ) : (
                      <span className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-100 px-3 text-sm font-medium text-slate-500">
                        <FileCheck2 className="size-4" aria-hidden />
                        No attachment
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-800">{titleCase(value) || "-"}</dd>
    </div>
  );
}

function getDownloadFileName(response, fallback) {
  const disposition = response.headers?.["content-disposition"];
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition || "");
  return match ? decodeURIComponent(match[1].replaceAll('"', "")) : fallback;
}

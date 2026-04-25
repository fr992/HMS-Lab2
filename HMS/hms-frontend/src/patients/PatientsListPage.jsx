import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { usePatientsStore } from "@/patients/patientsStore";
import PatientTable from "@/patients/components/PatientTable";
import { PatientTableSkeleton } from "@/patients/components/PatientSkeletonLoader";
import EmptyState from "@/patients/components/EmptyState";
import ErrorState from "@/patients/components/ErrorState";
import ConfirmDeleteModal from "@/patients/components/ConfirmDeleteModal";
import PatientContactModal from "@/patients/components/PatientContactModal";

export default function PatientsListPage() {
  const auth = useAuth();
  const canRegister = auth.hasPermission("Patients.Register");
  const canUpdate = auth.hasPermission("Patients.Update");
  const canDelete = auth.hasPermission("Patients.Delete");

  const loadList = usePatientsStore((s) => s.loadList);
  const clearFeedback = usePatientsStore((s) => s.clearFeedback);
  const items = usePatientsStore((s) => s.items);
  const listStatus = usePatientsStore((s) => s.listStatus);
  const listError = usePatientsStore((s) => s.listError);
  const lastActionError = usePatientsStore((s) => s.lastActionError);
  const lastActionSuccess = usePatientsStore((s) => s.lastActionSuccess);
  const removePatient = usePatientsStore((s) => s.removePatient);

  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [contactId, setContactId] = useState(null);

  useEffect(() => {
    clearFeedback();
    loadList();
  }, [loadList, clearFeedback]);

  const showDelete = useCallback((id) => setDeleteId(id), []);
  const row = deleteId != null ? items.find((p) => p.id === deleteId) : null;

  const doDelete = async () => {
    if (deleteId == null) return;
    setDeleting(true);
    const ok = await removePatient(deleteId);
    setDeleting(false);
    if (ok) setDeleteId(null);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Patients</h1>
          <p className="mt-1 text-sm text-slate-600">
            Search, view, and manage patient records.
          </p>
        </div>
        {canRegister && (
          <Link
            to="/patients/new"
            className="inline-flex items-center justify-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            New patient
          </Link>
        )}
      </div>

      {lastActionSuccess && (
        <div
          className="mb-4 flex items-start justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          role="status"
        >
          <span>{lastActionSuccess}</span>
          <button
            type="button"
            onClick={clearFeedback}
            className="shrink-0 text-emerald-800 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}
      {lastActionError && (
        <div
          className="mb-4 flex items-start justify-between gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
          role="alert"
        >
          <span>{lastActionError}</span>
          <button
            type="button"
            onClick={clearFeedback}
            className="shrink-0 text-rose-800 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {listStatus === "loading" && <PatientTableSkeleton />}

      {listStatus === "error" && (
        <ErrorState
          message={listError}
          onRetry={() => {
            loadList();
          }}
        />
      )}

      {listStatus === "ready" && items.length === 0 && (
        <EmptyState
          title="No patients yet"
          description="Register a patient to see them here."
          action={
            canRegister && (
              <Link
                to="/patients/new"
                className="inline-block rounded-md bg-sky-600 px-3 py-2 text-sm text-white"
              >
                New patient
              </Link>
            )
          }
        />
      )}

      {listStatus === "ready" && items.length > 0 && (
        <PatientTable
          patients={items}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onDelete={canDelete ? showDelete : undefined}
          onOpenContacts={canUpdate ? (id) => setContactId(id) : undefined}
        />
      )}

      <ConfirmDeleteModal
        open={deleteId != null}
        title="Delete patient"
        message={
          row
            ? `This will remove ${row.firstName} ${row.lastName} (${row.patientNumber}) from the registry. This action cannot be undone.`
            : undefined
        }
        loading={deleting}
        onClose={() => !deleting && setDeleteId(null)}
        onConfirm={doDelete}
      />

      {contactId != null && canUpdate && (
        <PatientContactModal
          open
          patientId={contactId}
          onClose={() => setContactId(null)}
          onSuccess={(msg) => {
            usePatientsStore.setState({
              lastActionError: null,
              lastActionSuccess: msg,
            });
          }}
          onError={(msg) => {
            usePatientsStore.setState({
              lastActionSuccess: null,
              lastActionError: msg,
            });
          }}
        />
      )}
    </div>
  );
}

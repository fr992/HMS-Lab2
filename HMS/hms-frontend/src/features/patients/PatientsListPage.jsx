import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { usePatientsStore } from "@/features/patients/patientsStore";
import { applyPatientListFilters } from "@/features/patients/patientListQuery";
import PatientTable from "@/features/patients/components/PatientTable";
import PatientListToolbar from "@/features/patients/components/PatientListToolbar";
import { PatientTableSkeleton } from "@/features/patients/components/PatientSkeletonLoader";
import EmptyState from "@/features/patients/components/EmptyState";
import ErrorState from "@/features/patients/components/ErrorState";
import ConfirmDeleteModal from "@/features/patients/components/ConfirmDeleteModal";
import PatientContactModal from "@/features/patients/components/PatientContactModal";

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
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterGender, setFilterGender] = useState("all");
  const [filterHasPortal, setFilterHasPortal] = useState("all");

  useEffect(() => {
    clearFeedback();
    loadList();
  }, [loadList, clearFeedback]);

  const showDelete = useCallback((id) => setDeleteId(id), []);
  const row = deleteId != null ? items.find((p) => p.id === deleteId) : null;

  const filteredPatients = useMemo(
    () =>
      applyPatientListFilters(items, {
        search,
        gender: filterGender,
        hasPortal: filterHasPortal,
      }),
    [items, search, filterGender, filterHasPortal]
  );

  const hasActiveFilters = useMemo(
    () =>
      search.trim() !== "" ||
      filterGender !== "all" ||
      filterHasPortal !== "all",
    [search, filterGender, filterHasPortal]
  );

  const clearListFilters = useCallback(() => {
    setSearch("");
    setFilterGender("all");
    setFilterHasPortal("all");
  }, []);

  const doDelete = async () => {
    if (deleteId == null) return;
    setDeleting(true);
    const ok = await removePatient(deleteId);
    setDeleting(false);
    if (ok) setDeleteId(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col space-y-4 sm:space-y-5">
      <div className="shrink-0 space-y-4 sm:space-y-5">
        <PatientListToolbar
          search={search}
          onSearchChange={setSearch}
          gender={filterGender}
          onGenderChange={setFilterGender}
          hasPortal={filterHasPortal}
          onHasPortalChange={setFilterHasPortal}
          filterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((o) => !o)}
          onCloseFilter={() => setFilterOpen(false)}
          onClearFilters={() => {
            clearListFilters();
            setFilterOpen(false);
          }}
          hasActiveFilters={hasActiveFilters}
          canRegister={canRegister}
        />

        {lastActionSuccess && (
          <div
            className="flex items-start justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
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
            className="flex items-start justify-between gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
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
      </div>

      <div className="min-h-0 flex-1">
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
          <div className="flex min-h-[12rem] items-center">
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
          </div>
        )}

        {listStatus === "ready" && items.length > 0 && filteredPatients.length > 0 && (
          <PatientTable
            patients={filteredPatients}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onDelete={canDelete ? showDelete : undefined}
            onOpenContacts={canUpdate ? (id) => setContactId(id) : undefined}
          />
        )}
        {listStatus === "ready" && items.length > 0 && filteredPatients.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-900">No matches</p>
            <p className="mt-1 text-sm text-slate-600">
              Try a different search or clear filters to see all patients.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  clearListFilters();
                  setFilterOpen(false);
                }}
                className="mt-4 text-sm font-medium text-sky-700 hover:underline"
              >
                Clear search and filters
              </button>
            )}
          </div>
        )}
      </div>

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

import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { RegisterPatientModal } from "@/features/patients/PatientCreatePage";
import { usePatientsStore } from "@/features/patients/patientsStore";
import { applyPatientListFilters } from "@/features/patients/patientListQuery";
import PatientTable from "@/features/patients/components/PatientTable";
import PatientListToolbar from "@/features/patients/components/PatientListToolbar";
import { PatientTableSkeleton } from "@/features/patients/components/PatientSkeletonLoader";
import EmptyState from "@/features/patients/components/EmptyState";
import ErrorState from "@/features/patients/components/ErrorState";
import ConfirmDeleteModal from "@/features/patients/components/ConfirmDeleteModal";
import PatientContactModal from "@/features/patients/components/PatientContactModal";
import { MAX_LIST_PAGE_SIZE, PaginationBar, paginateArray } from "@/lib/pagination.jsx";
import DataTransferMenu from "@/features/dataTransfer/DataTransferMenu";

function DoctorPatientSection({
  title,
  patients,
  emptyMessage,
  canUpdate,
  canDelete,
  onDelete,
  onOpenContacts,
  totalCount,
  pagination,
  onPageChange,
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {totalCount}
        </span>
      </div>

      {patients.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <PatientTable
            patients={patients}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onDelete={canDelete ? onDelete : undefined}
            onOpenContacts={canUpdate ? onOpenContacts : undefined}
          />
          <PaginationBar pagination={pagination} loading={false} onPageChange={onPageChange} />
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-600">{emptyMessage}</p>
        </div>
      )}
    </section>
  );
}

export default function PatientsListPage() {
  const auth = useAuth();
  const canRegister = auth.hasPermission("Patients.Register");
  const canUpdate = auth.hasPermission("Patients.Update");
  const canDelete = auth.hasPermission("Patients.Delete");
  const isDoctor = auth.userRole === "Doctor";

  const loadList = usePatientsStore((s) => s.loadList);
  const clearFeedback = usePatientsStore((s) => s.clearFeedback);
  const items = usePatientsStore((s) => s.items);
  const pagination = usePatientsStore((s) => s.pagination);
  const doctorGroups = usePatientsStore((s) => s.doctorGroups);
  const listStatus = usePatientsStore((s) => s.listStatus);
  const listError = usePatientsStore((s) => s.listError);
  const lastActionError = usePatientsStore((s) => s.lastActionError);
  const lastActionSuccess = usePatientsStore((s) => s.lastActionSuccess);
  const removePatient = usePatientsStore((s) => s.removePatient);

  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [contactId, setContactId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterGender, setFilterGender] = useState("all");
  const [filterHasPortal, setFilterHasPortal] = useState("all");
  const [page, setPage] = useState(1);
  const [primaryPage, setPrimaryPage] = useState(1);
  const [interactedPage, setInteractedPage] = useState(1);

  useEffect(() => {
    clearFeedback();
    loadList(
      isDoctor ? "doctor" : "all",
      isDoctor
        ? {}
        : {
            page,
            pageSize: MAX_LIST_PAGE_SIZE,
            search: search.trim() || undefined,
            gender: filterGender === "all" ? undefined : filterGender,
            hasPortal: filterHasPortal === "all" ? undefined : filterHasPortal === "yes",
          }
    );
  }, [loadList, clearFeedback, isDoctor, page, search, filterGender, filterHasPortal]);

  const showDelete = useCallback((id) => setDeleteId(id), []);
  const row = deleteId != null ? items.find((p) => p.id === deleteId) : null;

  const filteredPatients = useMemo(
    () =>
      isDoctor
        ? applyPatientListFilters(items, {
            search,
            gender: filterGender,
            hasPortal: filterHasPortal,
          })
        : items,
    [items, isDoctor, search, filterGender, filterHasPortal]
  );

  const filteredPrimaryPatients = useMemo(
    () =>
      applyPatientListFilters(doctorGroups.primaryPatients, {
        search,
        gender: filterGender,
        hasPortal: filterHasPortal,
      }),
    [doctorGroups.primaryPatients, search, filterGender, filterHasPortal]
  );

  const filteredInteractedPatients = useMemo(
    () =>
      applyPatientListFilters(doctorGroups.interactedPatients, {
        search,
        gender: filterGender,
        hasPortal: filterHasPortal,
      }),
    [doctorGroups.interactedPatients, search, filterGender, filterHasPortal]
  );

  const hasActiveFilters = useMemo(
    () =>
      search.trim() !== "" ||
      filterGender !== "all" ||
      filterHasPortal !== "all",
    [search, filterGender, filterHasPortal]
  );

  useEffect(() => {
    setPrimaryPage(1);
    setInteractedPage(1);
  }, [search, filterGender, filterHasPortal, isDoctor]);

  useEffect(() => {
    if (!isDoctor) setPage(1);
  }, [search, filterGender, filterHasPortal, isDoctor]);

  const primaryPatientPage = useMemo(
    () => paginateArray(filteredPrimaryPatients, primaryPage, MAX_LIST_PAGE_SIZE),
    [filteredPrimaryPatients, primaryPage]
  );
  const interactedPatientPage = useMemo(
    () => paginateArray(filteredInteractedPatients, interactedPage, MAX_LIST_PAGE_SIZE),
    [filteredInteractedPatients, interactedPage]
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
          onAddPatient={() => setCreateOpen(true)}
          dataAction={
            !isDoctor ? (
              <DataTransferMenu
                endpoint="/data-transfer/patients"
                exportParams={{
                  search: search.trim() || undefined,
                  gender: filterGender === "all" ? undefined : filterGender,
                  hasPortal: filterHasPortal === "all" ? undefined : filterHasPortal === "yes",
                }}
                canImport={canRegister}
                onImported={() => loadList("all", {
                  page,
                  pageSize: MAX_LIST_PAGE_SIZE,
                  search: search.trim() || undefined,
                  gender: filterGender === "all" ? undefined : filterGender,
                  hasPortal: filterHasPortal === "all" ? undefined : filterHasPortal === "yes",
                })}
              />
            ) : null
          }
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
              loadList(isDoctor ? "doctor" : "all");
            }}
          />
        )}

        {listStatus === "ready" && isDoctor && (
          <div className="space-y-6">
            <DoctorPatientSection
              title="My Primary Patients"
              patients={primaryPatientPage.items}
              emptyMessage="No primary patients assigned yet."
              canUpdate={canUpdate}
              canDelete={canDelete}
              onDelete={showDelete}
              onOpenContacts={(id) => setContactId(id)}
              totalCount={filteredPrimaryPatients.length}
              pagination={primaryPatientPage.pagination}
              onPageChange={setPrimaryPage}
            />

            <DoctorPatientSection
              title="Interacted Patients"
              patients={interactedPatientPage.items}
              emptyMessage="No interacted patients found yet."
              canUpdate={canUpdate}
              canDelete={canDelete}
              onDelete={showDelete}
              onOpenContacts={(id) => setContactId(id)}
              totalCount={filteredInteractedPatients.length}
              pagination={interactedPatientPage.pagination}
              onPageChange={setInteractedPage}
            />
          </div>
        )}

        {listStatus === "ready" && !isDoctor && items.length === 0 && (
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

        {listStatus === "ready" && !isDoctor && items.length > 0 && filteredPatients.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <PatientTable
              patients={items}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onDelete={canDelete ? showDelete : undefined}
              onOpenContacts={canUpdate ? (id) => setContactId(id) : undefined}
            />
            <PaginationBar pagination={pagination} loading={listStatus === "loading"} onPageChange={setPage} />
          </div>
        )}
        {listStatus === "ready" && !isDoctor && items.length > 0 && filteredPatients.length === 0 && (
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

      {createOpen && canRegister && (
        <RegisterPatientModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            void loadList(isDoctor ? "doctor" : "all");
          }}
        />
      )}
    </div>
  );
}

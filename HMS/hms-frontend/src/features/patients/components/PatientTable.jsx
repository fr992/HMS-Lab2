import { useState, useMemo, useCallback } from "react";
import PatientActionsMenu from "./PatientActionsMenu";
import { useNavigate } from "react-router-dom";
import { sortPatientsList } from "@/features/patients/patientListQuery";

const EM_DASH = "—";

function SortArrows({ active, dir }) {
  if (!active) {
    return (
      <span className="inline-block text-slate-300" aria-hidden>
        <span className="text-[0.5rem] leading-[0.4] sm:text-[0.55rem]">▲</span>
        <span className="ml-0.5 text-[0.5rem] leading-[0.4] sm:text-[0.55rem]">▼</span>
      </span>
    );
  }
  return (
    <span
      className="min-w-[0.6rem] text-center text-xs font-bold leading-none text-sky-600"
      aria-hidden
    >
      {dir === "asc" ? "▲" : "▼"}
    </span>
  );
}

function SortTh({ label, sortKey, current, onSort, className = "" }) {
  const active = current.key === sortKey;
  return (
    <th scope="col" className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex max-w-full min-w-0 items-center gap-1.5 text-left -mx-1 -my-0.5 rounded px-1 py-0.5 hover:bg-slate-200/80"
        aria-pressed={active}
      >
        <span className="truncate text-xs font-semibold uppercase">
          {label}
        </span>
        <SortArrows active={active} dir={current.dir} />
      </button>
    </th>
  );
}

/**
 * @param {string|undefined} text
 * @param {string} [className]
 */
function TipText({ text, className = "" }) {
  const s = (text && String(text).trim()) || "";
  const show = s.length > 0;
  const display = show ? s : EM_DASH;
  return (
    <span
      className={`block truncate ${className}`.trim()}
      title={show && s.length > 28 ? s : undefined}
    >
      {display}
    </span>
  );
}

/**
 * @param {object} props
 * @param {object[]} props.patients
 * @param {boolean} [props.canRegister]
 * @param {boolean} [props.canUpdate]
 * @param {boolean} [props.canDelete]
 * @param {(id: number) => void} [props.onDelete]
 * @param {(id: number) => void} [props.onOpenContacts]
 */
export default function PatientTable({
  patients,
  canUpdate,
  canDelete,
  onDelete,
  onOpenContacts,
}) {
  const navigate = useNavigate();
  const [sort, setSort] = useState(
    () => /** @type {{ key: 'patientNumber' | 'lastName' | 'email', dir: 'asc' | 'desc' }} */ ({
      key: "patientNumber",
      dir: "asc",
    })
  );

  const rows = useMemo(
    () => sortPatientsList(patients, sort),
    [patients, sort]
  );

  const toggleSort = useCallback(
    (/** @type {'patientNumber' | 'lastName' | 'email'} */ k) => {
      setSort((s) => {
        if (s.key !== k) return { key: k, dir: "asc" };
        return { key: k, dir: s.dir === "asc" ? "desc" : "asc" };
      });
    },
    []
  );

  const fullName = (p) => {
    const a = p.firstName?.trim() ?? "";
    const b = p.lastName?.trim() ?? "";
    const t = [a, b].filter(Boolean).join(" ");
    return t || EM_DASH;
  };

  /** @param {object} p - patient row; `primaryDoctorName` comes from API (PatientProfileDto). */
  const primaryDoctorDisplay = (p) => {
    if (p.primaryDoctorName) return p.primaryDoctorName;
    if (p.primaryDoctorId != null) return `Doctor #${p.primaryDoctorId}`;
    return "";
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scrollbar-none min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[70rem] w-full table-auto border-collapse text-left sm:min-w-[76rem]">
          <caption className="sr-only">Patient directory</caption>
          <thead className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-600">
            <tr>
              <SortTh
                label="Patient #"
                sortKey="patientNumber"
                current={sort}
                onSort={toggleSort}
                className="w-[6.5rem] px-2 py-2.5 pl-3 sm:px-3"
              />
              <SortTh
                label="Full name"
                sortKey="lastName"
                current={sort}
                onSort={toggleSort}
                className="w-[9rem] px-2 py-2.5 sm:px-3"
              />
              <SortTh
                label="Email"
                sortKey="email"
                current={sort}
                onSort={toggleSort}
                className="w-[11rem] min-w-0 px-2 py-2.5 sm:px-3"
              />
              <th
                scope="col"
                className="w-[6.5rem] px-2 py-2.5 text-xs font-semibold uppercase sm:px-3"
              >
                Phone
              </th>
              <th
                scope="col"
                className="w-[4.5rem] px-2 py-2.5 text-xs font-semibold uppercase sm:px-3"
              >
                Gender
              </th>
              <th
                scope="col"
                className="w-[5.5rem] px-2 py-2.5 text-xs font-semibold uppercase sm:px-3"
              >
                City
              </th>
              <th
                scope="col"
                className="w-[5.5rem] px-2 py-2.5 text-xs font-semibold uppercase sm:px-3"
              >
                Country
              </th>
              <th
                scope="col"
                className="w-[4.5rem] px-2 py-2.5 text-xs font-semibold uppercase sm:px-3"
              >
                Blood type
              </th>
              <th
                scope="col"
                className="w-[8.5rem] min-w-0 px-2 py-2.5 text-xs font-semibold uppercase sm:px-3"
              >
                Primary doctor
              </th>
              <th
                scope="col"
                className="w-12 py-2.5 pr-3 pl-0 text-right text-xs font-semibold uppercase sm:pr-4"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm text-slate-800">
            {rows.map((p) => {
              const name = fullName(p);
              return (
              <tr
                key={p.id}
                className="group transition-colors hover:bg-slate-50/90"
              >
                <td className="px-2 py-2.5 pl-3 font-mono text-xs sm:px-3 sm:text-sm">
                  <TipText text={p.patientNumber} />
                </td>
                <td className="px-2 py-2.5 sm:px-3">
                  <span
                    className="block truncate font-medium text-slate-900"
                    title={name !== EM_DASH ? name : undefined}
                  >
                    {name}
                  </span>
                </td>
                <td className="max-w-0 px-2 py-2.5 text-slate-600 sm:px-3">
                  <TipText text={p.email} className="text-slate-600" />
                </td>
                <td className="px-2 py-2.5 sm:px-3">
                  <TipText text={p.phone} />
                </td>
                <td className="px-2 py-2.5 sm:px-3">
                  <TipText text={p.gender} />
                </td>
                <td className="px-2 py-2.5 sm:px-3">
                  <TipText text={p.city} />
                </td>
                <td className="px-2 py-2.5 sm:px-3">
                  <TipText text={p.country} />
                </td>
                <td className="px-2 py-2.5 sm:px-3">
                  <TipText text={p.bloodType} />
                </td>
                <td className="max-w-0 px-2 py-2.5 sm:px-3">
                  <TipText text={primaryDoctorDisplay(p)} />
                </td>
                <td className="w-0 whitespace-nowrap py-1 pr-2 pl-0 text-right align-middle sm:pr-2">
                  <PatientActionsMenu
                    onView={() => navigate(`/patients/${p.id}`)}
                    onEdit={
                      canUpdate
                        ? () => navigate(`/patients/${p.id}/edit`)
                        : undefined
                    }
                    onDelete={canDelete ? () => onDelete(p.id) : undefined}
                    onModifyContact={
                      canUpdate && onOpenContacts
                        ? () => onOpenContacts(p.id)
                        : undefined
                    }
                  />
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

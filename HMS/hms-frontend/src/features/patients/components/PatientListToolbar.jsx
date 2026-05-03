import { useRef, useEffect, useId } from "react";
import { Link } from "react-router-dom";
import { NATIVE_SELECT_CHEVRON } from "@/features/patients/selectFieldStyles";

function IconSearch({ className = "h-5 w-5" }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

function IconFilter({ className = "h-5 w-5" }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 7h15M6 12h12M7.5 17h9"
      />
    </svg>
  );
}

const label =
  "text-xs font-medium uppercase tracking-wide text-slate-500";
const selectField = `mt-1.5 w-full rounded-xl border border-slate-200/90 bg-white py-2 pl-3 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${NATIVE_SELECT_CHEVRON}`.trim();

/**
 * @param {object} p
 * @param {string} p.search
 * @param {(v: string) => void} p.onSearchChange
 * @param {string} p.gender
 * @param {(v: string) => void} p.onGenderChange
 * @param {string} p.hasPortal
 * @param {(v: string) => void} p.onHasPortalChange
 * @param {boolean} p.filterOpen
 * @param {() => void} p.onToggleFilter
 * @param {() => void} p.onCloseFilter
 * @param {() => void} p.onClearFilters
 * @param {boolean} p.hasActiveFilters
 * @param {boolean} p.canRegister
 */
export default function PatientListToolbar({
  search,
  onSearchChange,
  gender,
  onGenderChange,
  hasPortal,
  onHasPortalChange,
  filterOpen,
  onToggleFilter,
  onCloseFilter,
  onClearFilters,
  hasActiveFilters,
  canRegister,
}) {
  const idBase = useId();
  const filterWrapRef = useRef(null);

  useEffect(() => {
    if (!filterOpen) return;
    const close = (e) => {
      if (
        filterWrapRef.current &&
        !filterWrapRef.current.contains(e.target)
      ) {
        onCloseFilter();
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [filterOpen, onCloseFilter]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Patients
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Manage registered patients
        </p>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <IconSearch />
          </span>
          <input
            id={`${idBase}-search`}
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search patients…"
            className="w-full rounded-full border-0 bg-slate-100 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 ring-1 ring-slate-200/90 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            autoComplete="off"
            spellCheck="false"
          />
        </div>
        <div
          className="flex flex-wrap items-stretch gap-2 sm:shrink-0 sm:gap-3"
        >
          <div className="relative" ref={filterWrapRef}>
            <button
              type="button"
              onClick={onToggleFilter}
              className="inline-flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 sm:h-auto sm:w-auto sm:py-2.5"
              aria-expanded={filterOpen}
            >
              <IconFilter className="h-4 w-4 shrink-0 text-slate-500" />
              <span>Filter</span>
              {hasActiveFilters && !filterOpen && (
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-sky-500"
                  title="Filters active"
                />
              )}
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 w-[min(100vw-2rem,20rem)] rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
                <div>
                  <label
                    className={label}
                    htmlFor={`${idBase}-gender`}
                  >
                    Gender
                  </label>
                  <select
                    id={`${idBase}-gender`}
                    className={selectField}
                    value={gender}
                    onChange={(e) => onGenderChange(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="">Not specified</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="mt-4">
                  <label
                    className={label}
                    htmlFor={`${idBase}-portal`}
                  >
                    Portal account
                  </label>
                  <select
                    id={`${idBase}-portal`}
                    className={selectField}
                    value={hasPortal}
                    onChange={(e) => onHasPortalChange(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="yes">With account</option>
                    <option value="no">Without account</option>
                  </select>
                </div>
                {hasActiveFilters && (
                  <div className="mt-4 border-t border-slate-100 pt-3 text-right">
                    <button
                      type="button"
                      onClick={onClearFilters}
                      className="text-sm font-medium text-sky-700 hover:underline"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {canRegister && (
            <Link
              to="/patients/new"
              className="inline-flex h-10 min-h-0 items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 sm:h-auto sm:py-2.5"
            >
              <span className="text-base leading-none">+</span> Add patient
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

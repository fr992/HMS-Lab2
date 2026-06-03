import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Search, Stethoscope, X } from "lucide-react";
import { fetchDoctorsList, getApiErrorMessage } from "@/features/patients/patientsApi";
import { normalizeDoctorsResponse } from "@/features/patients/doctorOptionsStore";

const inputBaseClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-10 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:opacity-60";

function doctorLabel(doctor) {
  if (!doctor) return "";
  return [doctor.fullName, doctor.specializationName].filter(Boolean).join(" - ");
}

function parseId(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function DoctorSearchSelect({
  value,
  onValueChange,
  fetchDoctors = fetchDoctorsList,
  queryKey = "doctor-search",
  selectedDoctor = null,
  placeholder = "Search doctor",
  emptyLabel = "No doctor selected",
  disabled = false,
  minSearchLength = 2,
  inputClassName = "",
}) {
  const id = useId();
  const wrapRef = useRef(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [open, setOpen] = useState(false);
  const selectedId = parseId(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const shouldSearch = debouncedSearch.length >= minSearchLength;
  const doctorsQuery = useQuery({
    queryKey: [queryKey, debouncedSearch],
    queryFn: async () =>
      normalizeDoctorsResponse(
        await fetchDoctors({ search: debouncedSearch, limit: 20 })
      ),
    enabled: shouldSearch,
    staleTime: 60 * 1000,
  });

  const doctors = Array.isArray(doctorsQuery.data) ? doctorsQuery.data : [];
  const isSearching = shouldSearch && doctorsQuery.isLoading;
  const selectedLabel = useMemo(() => doctorLabel(selectedDoctor), [selectedDoctor]);
  const helpText = !search.trim()
    ? selectedId
      ? ""
      : "Type to search doctors."
    : search.trim().length < minSearchLength
      ? minSearchLength === 1
        ? "Enter a doctor name or specialty."
        : `Enter at least ${minSearchLength} characters.`
      : isSearching
        ? "Searching doctors..."
        : doctorsQuery.isError
          ? getApiErrorMessage(doctorsQuery.error)
          : doctors.length === 0
            ? "No matching doctors."
            : `${doctors.length} matching doctor${doctors.length === 1 ? "" : "s"}`;

  return (
    <div ref={wrapRef} className="relative">
      {selectedId && selectedLabel ? (
        <div className="mb-1.5 flex items-center justify-between gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-950 shadow-sm">
          <span className="flex min-w-0 items-center gap-2">
            <Check className="h-3.5 w-3.5 shrink-0 text-sky-700" aria-hidden />
            <span className="truncate">{selectedLabel}</span>
          </span>
          <button
            type="button"
            className="shrink-0 rounded p-0.5 text-sky-700 transition hover:bg-sky-100"
            onClick={() => {
              onValueChange("");
              setSearch("");
              setOpen(false);
            }}
            disabled={disabled}
            aria-label="Clear selected doctor"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ) : null}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          id={id}
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={selectedId ? "Search to change doctor" : placeholder}
          disabled={disabled}
          className={`${inputBaseClass} ${inputClassName}`.trim()}
          autoComplete="off"
          role="combobox"
          aria-expanded={open && shouldSearch}
          aria-controls={`${id}-options`}
        />
        {isSearching ? (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-sky-500" aria-hidden />
        ) : search ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={() => {
              setSearch("");
              setOpen(false);
            }}
            disabled={disabled}
            aria-label="Clear doctor search"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
      {!selectedId && !search ? (
        <p className="mt-1 text-xs text-slate-500">{emptyLabel}</p>
      ) : null}
      {helpText ? <p className="mt-1 text-xs text-slate-500">{helpText}</p> : null}
      {open && shouldSearch && doctors.length > 0 ? (
        <div
          id={`${id}-options`}
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 text-sm shadow-xl shadow-slate-950/10"
        >
          {doctors.map((doctor) => (
            <button
              key={doctor.id}
              type="button"
              className="flex w-full items-start gap-2 rounded-md px-2.5 py-2.5 text-left text-slate-800 transition hover:bg-sky-50 hover:text-sky-950"
              onClick={() => {
                onValueChange(String(doctor.id), doctor);
                setSearch("");
                setOpen(false);
              }}
            >
              <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                <Stethoscope className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{doctor.fullName}</span>
                {[doctor.specializationName, doctor.departmentName].filter(Boolean).length > 0 ? (
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {[doctor.specializationName, doctor.departmentName].filter(Boolean).join(" | ")}
                  </span>
                ) : null}
              </span>
              {selectedId === doctor.id ? (
                <span className="mt-1 shrink-0 rounded-full bg-sky-100 p-1 text-sky-700">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

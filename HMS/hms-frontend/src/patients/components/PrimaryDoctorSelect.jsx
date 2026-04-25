import { useEffect, useId, useMemo } from "react";
import { useDoctorOptionsStore } from "@/patients/doctorOptionsStore";

const selectClass = (err) =>
  `mt-1 w-full rounded border ${err ? "border-rose-500" : "border-slate-300"} bg-white px-2 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50`;

function parseId(value) {
  const t = (value ?? "").trim();
  if (t === "") return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {object} props
 * @param {string} props.value
 * @param {function(string): void} props.onValueChange
 * @param {boolean} props.disabled
 * @param {boolean} [props.hasError]
 */
export default function PrimaryDoctorSelect({ value, onValueChange, disabled, hasError = false }) {
  const helpId = useId();
  const load = useDoctorOptionsStore((s) => s.load);
  const status = useDoctorOptionsStore((s) => s.status);
  const loadError = useDoctorOptionsStore((s) => s.error);
  const items = useDoctorOptionsStore((s) => s.items);

  useEffect(() => {
    load();
  }, [load]);

  const currentId = parseId(value);
  const inList = currentId != null && items.some((d) => d.id === currentId);
  const showOrphan = currentId != null && !inList && status === "ready";
  const isLoading = status === "loading";
  const showEmptyInfo = status === "ready" && items.length === 0 && !loadError;

  const helpTextId = helpId + "-msg";

  const { selectValue, optionEls } = useMemo(() => {
    const v = currentId == null ? "" : String(currentId);
    const opts = [
      <option key="e" value="">
        No primary doctor
      </option>,
    ];
    if (isLoading && currentId != null) {
      opts.push(
        <option key="keep" value={String(currentId)}>
          Doctor ID {currentId} (loading list…)
        </option>
      );
    } else {
      for (const d of items) {
        opts.push(
          <option key={d.id} value={String(d.id)}>
            {d.fullName}
          </option>
        );
      }
    }
    if (showOrphan) {
      opts.push(
        <option key="orphan" value={String(currentId)}>
          Doctor ID {currentId} (not in list)
        </option>
      );
    }
    return { selectValue: v, optionEls: opts };
  }, [currentId, items, isLoading, showOrphan]);

  return (
    <div>
      <label className="text-xs font-medium text-slate-600" htmlFor={helpId}>
        Primary doctor
      </label>
      {isLoading && (
        <p className="mb-0.5 text-xs text-slate-500" aria-live="polite">
          Loading…
        </p>
      )}
      <select
        id={helpId}
        className={selectClass(!!hasError)}
        value={selectValue}
        onChange={(e) => onValueChange(e.target.value)}
        disabled={disabled || isLoading}
        aria-describedby={
          loadError || showEmptyInfo ? helpTextId : undefined
        }
        aria-busy={isLoading}
      >
        {optionEls}
      </select>
      {loadError && (
        <p id={helpTextId} className="mt-1 text-xs text-amber-800" role="status">
          {loadError} — you can still clear the doctor.
        </p>
      )}
      {showEmptyInfo && (
        <p id={helpTextId} className="mt-1 text-xs text-slate-500" role="status">
          No doctors in list. Use your doctor list API (e.g. `GET /api/doctors`)
          when ready.
        </p>
      )}
    </div>
  );
}

import { Search } from "lucide-react";
import { BED_STATUS_OPTIONS } from "./bedUtils";

export default function BedFilters({
  departments,
  filters,
  roomOptions,
  wardOptions,
  onChange,
  onClear,
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[1fr_12rem_10rem_12rem_auto] lg:items-end">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</span>
          <span className="relative mt-1.5 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={filters.search}
              onChange={(event) => onChange({ search: event.target.value })}
              placeholder="Bed, room, ward, department"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </span>
        </label>

        <SelectField label="Department/Ward" value={filters.departmentId} onChange={(departmentId) => onChange({ departmentId })}>
          <option value="all">All wards</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
          {departments.length === 0 &&
            wardOptions.map((ward) => (
              <option key={ward} value={`ward:${ward}`}>
                {ward}
              </option>
            ))}
        </SelectField>

        <SelectField label="Room" value={filters.roomNumber} onChange={(roomNumber) => onChange({ roomNumber })}>
          <option value="all">All rooms</option>
          {roomOptions.map((room) => (
            <option key={room} value={room}>
              {room}
            </option>
          ))}
        </SelectField>

        <SelectField label="Status" value={filters.status} onChange={(status) => onChange({ status })}>
          {BED_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>

        <button
          type="button"
          onClick={onClear}
          className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          Clear
        </button>
      </div>
    </section>
  );
}

function SelectField({ label, value, onChange, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
      >
        {children}
      </select>
    </label>
  );
}

import { useMemo } from "react";
import { CalendarPlus, Clock3, Stethoscope, UserRound } from "lucide-react";
import { APPOINTMENT_STATUS } from "@/features/appointments/appointmentConstants";

const STATUS_META = {
  [APPOINTMENT_STATUS.SCHEDULED]: {
    label: "Scheduled",
    dot: "bg-slate-400",
    border: "border-slate-200",
    bg: "bg-white",
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  [APPOINTMENT_STATUS.CONFIRMED]: {
    label: "Confirmed",
    dot: "bg-sky-500",
    border: "border-sky-200",
    bg: "bg-sky-50/60",
    badge: "bg-sky-100 text-sky-800 ring-sky-200",
  },
  [APPOINTMENT_STATUS.COMPLETED]: {
    label: "Completed",
    dot: "bg-emerald-500",
    border: "border-emerald-200",
    bg: "bg-emerald-50/60",
    badge: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  },
  [APPOINTMENT_STATUS.CANCELLED]: {
    label: "Cancelled",
    dot: "bg-rose-400",
    border: "border-rose-200",
    bg: "bg-rose-50/60",
    badge: "bg-rose-100 text-rose-800 ring-rose-200",
  },
  [APPOINTMENT_STATUS.NO_SHOW]: {
    label: "No show",
    dot: "bg-amber-400",
    border: "border-amber-200",
    bg: "bg-amber-50/70",
    badge: "bg-amber-100 text-amber-900 ring-amber-200",
  },
};

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDay(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
  });
}

function formatDayNumber(date) {
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
  });
}

function formatMonth(date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
  });
}

function formatTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeRange(startIso, endIso) {
  const start = formatTime(startIso);
  const end = formatTime(endIso);
  if (!start || !end) return start || "";
  return `${start} - ${end}`;
}

function statusMeta(status) {
  const key = String(status ?? "").trim().toLowerCase();
  return (
    STATUS_META[key] ?? {
      label: status || "Unknown",
      dot: "bg-slate-400",
      border: "border-slate-200",
      bg: "bg-white",
      badge: "bg-slate-100 text-slate-700 ring-slate-200",
    }
  );
}

function CompactStatusBadge({ status }) {
  const meta = statusMeta(status);
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 ring-1 ring-inset ${meta.badge}`}
    >
      <span className="truncate">{meta.label}</span>
    </span>
  );
}

export default function AppointmentCalendar({
  appointments,
  weekStart,
  onDayClick,
  onAppointmentClick,
  canCreate,
  onCreate,
}) {
  const today = new Date();

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  const appointmentsByDay = useMemo(() => {
    const map = new Map();
    for (const appointment of appointments) {
      const start = new Date(appointment.scheduledStart);
      if (Number.isNaN(start.getTime())) continue;
      const key = dateKey(start);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(appointment);
    }

    for (const dayAppointments of map.values()) {
      dayAppointments.sort(
        (a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart)
      );
    }

    return map;
  }, [appointments]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <div className="grid min-w-[980px] grid-cols-7 divide-x divide-slate-200 border-b border-slate-200 bg-slate-50">
          {days.map((day) => {
            const items = appointmentsByDay.get(dateKey(day)) ?? [];
            const isToday = isSameDay(day, today);

            return (
            <button
              key={dateKey(day)}
              type="button"
              onClick={() => onDayClick(day)}
              className={[
                "min-w-0 px-3 py-3 text-left transition hover:bg-white",
                isToday ? "bg-sky-50" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {formatDay(day)}
                  </span>
                  <span className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-semibold leading-none text-slate-950">
                      {formatDayNumber(day)}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {formatMonth(day)}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {items.length} {items.length === 1 ? "visit" : "visits"}
                  </span>
                </span>
                {isToday && (
                  <span className="shrink-0 rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                    Today
                  </span>
                )}
              </span>
            </button>
            );
          })}
        </div>

        <div className="grid min-w-[980px] grid-cols-7 divide-x divide-slate-200">
          {days.map((day) => {
            const items = appointmentsByDay.get(dateKey(day)) ?? [];
            const isToday = isSameDay(day, today);

            return (
              <section
                key={dateKey(day)}
                className={[
                  "flex min-h-[26rem] min-w-0 flex-col",
                  isToday ? "bg-sky-50/20" : "bg-white",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="flex min-h-0 flex-1 flex-col gap-2 p-2.5">
                  {items.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => onDayClick(day)}
                      className="flex min-h-[11rem] flex-1 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/50 text-sm font-medium text-slate-400 transition hover:border-sky-200 hover:bg-sky-50/70 hover:text-sky-700"
                    >
                      No visits
                    </button>
                  ) : (
                    items.map((appointment) => {
                      const meta = statusMeta(appointment.status);
                      return (
                        <button
                          key={appointment.id}
                          type="button"
                          onClick={() => onAppointmentClick(appointment)}
                          className={`group relative min-w-0 overflow-hidden rounded-md border ${meta.border} ${meta.bg} p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white hover:shadow-md`}
                        >
                          <span
                            className={`absolute inset-y-0 left-0 w-1 ${meta.dot}`}
                          />
                          <span className="block min-w-0 pl-2">
                            <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                              <Clock3
                                className="h-3.5 w-3.5 shrink-0 text-slate-400"
                                aria-hidden
                              />
                              <span className="truncate">
                                {formatTimeRange(
                                  appointment.scheduledStart,
                                  appointment.scheduledEnd
                                )}
                              </span>
                            </span>
                            <span className="mt-1.5 block">
                              <CompactStatusBadge status={appointment.status} />
                            </span>
                            <span className="mt-2 flex min-w-0 items-center gap-1.5 text-sm font-semibold text-slate-950">
                              <UserRound
                                className="h-3.5 w-3.5 shrink-0 text-slate-400"
                                aria-hidden
                              />
                              <span className="truncate">
                                {appointment.patientName}
                              </span>
                            </span>
                            <span className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-600">
                              <Stethoscope
                                className="h-3.5 w-3.5 shrink-0 text-slate-400"
                                aria-hidden
                              />
                              <span className="truncate">
                                Dr. {appointment.doctorName}
                              </span>
                            </span>
                            {appointment.appointmentType && (
                              <span className="mt-2 inline-flex max-w-full rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                                <span className="truncate">
                                  {appointment.appointmentType}
                                </span>
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                {canCreate && (
                  <div className="border-t border-slate-100 p-2">
                    <button
                      type="button"
                      onClick={() => onCreate(day)}
                      className="flex h-9 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
                    >
                      <CalendarPlus className="h-4 w-4" aria-hidden />
                      Add visit
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

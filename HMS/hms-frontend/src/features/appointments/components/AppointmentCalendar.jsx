import { useMemo } from "react";
import { CalendarPlus } from "lucide-react";
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

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const WORK_START_HOUR = 8;
const WORK_END_HOUR = 18;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT_REM = 3.25;
const TIME_SLOTS = Array.from(
  { length: ((WORK_END_HOUR - WORK_START_HOUR) * 60) / SLOT_MINUTES + 1 },
  (_, index) => {
    const total = WORK_START_HOUR * 60 + index * SLOT_MINUTES;
    const hour = Math.floor(total / 60);
    const minute = total % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
);
const SCHEDULE_SLOT_COUNT = TIME_SLOTS.length - 1;

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function startOfMonth(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
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

function appointmentGridPosition(appointment) {
  const start = new Date(appointment.scheduledStart);
  const end = new Date(appointment.scheduledEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const dayStartMinutes = WORK_START_HOUR * 60;
  const dayEndMinutes = WORK_END_HOUR * 60;
  const startMinutes =
    start.getHours() * 60 + start.getMinutes() - dayStartMinutes;
  const durationMinutes = Math.max(0, (end.getTime() - start.getTime()) / 60000);
  const absoluteStart = start.getHours() * 60 + start.getMinutes();
  const absoluteEnd = absoluteStart + durationMinutes;

  if (absoluteEnd <= dayStartMinutes || absoluteStart >= dayEndMinutes) {
    return null;
  }

  const clampedStart = Math.max(0, startMinutes);
  const clampedEnd = Math.min(
    dayEndMinutes - dayStartMinutes,
    startMinutes + durationMinutes
  );
  const rowStart = Math.floor(clampedStart / SLOT_MINUTES) + 1;
  const rowSpan = Math.max(1, Math.ceil((clampedEnd - clampedStart) / SLOT_MINUTES));

  return { rowStart, rowSpan };
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

function useAppointmentsByDay(appointments) {
  return useMemo(() => {
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
}

function ScheduleAppointmentCard({ appointment, onAppointmentClick, showTime }) {
  const meta = statusMeta(appointment.status);

  return (
    <button
      type="button"
      onClick={() => onAppointmentClick(appointment)}
      className={`group relative z-10 h-full min-h-0 w-full max-w-full overflow-hidden rounded-lg border ${meta.border} ${meta.bg} px-2.5 py-2 text-left shadow-sm transition hover:z-20 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white hover:shadow-md`}
    >
      <span className={`absolute inset-y-2 left-0 w-1 rounded-r-full ${meta.dot}`} />
      <span className="block min-w-0 max-w-full pl-2">
        <span
          className={[
            "flex min-w-0 max-w-full gap-2",
            showTime ? "items-center justify-between" : "items-start",
          ].join(" ")}
        >
          {showTime && (
            <span className="min-w-0 truncate text-[11px] font-semibold tabular-nums text-slate-700">
              {formatTimeRange(appointment.scheduledStart, appointment.scheduledEnd)}
            </span>
          )}
          <span className={showTime ? "shrink-0" : "min-w-0 max-w-full"}>
            <CompactStatusBadge status={appointment.status} />
          </span>
        </span>
        <span className="mt-1 block min-w-0 max-w-full truncate text-sm font-semibold leading-5 text-slate-950">
          {appointment.patientName}
        </span>
        <span className="block min-w-0 max-w-full truncate text-xs leading-5 text-slate-600">
          Dr. {appointment.doctorName}
        </span>
        {(appointment.appointmentType || appointment.reason) && (
          <span className="mt-1 block min-w-0 max-w-full truncate text-[11px] font-medium leading-4 text-slate-500">
            {appointment.appointmentType || appointment.reason}
          </span>
        )}
      </span>
    </button>
  );
}

function AppointmentDayColumn({
  day,
  items,
  today,
  onDayClick,
  onAppointmentClick,
  canCreate,
  onCreate,
  calendarView,
}) {
  const isToday = isSameDay(day, today);
  const isDayView = calendarView === "day";
  const positionedItems = items
    .map((appointment) => ({
      appointment,
      position: appointmentGridPosition(appointment),
    }))
    .filter((item) => item.position);

  return (
    <section
      className={[
        "relative min-w-0 border-r border-slate-100 last:border-r-0",
        isToday ? "bg-sky-50 border-sky-200" : "bg-white",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="grid"
        style={{
          gridTemplateRows: `repeat(${SCHEDULE_SLOT_COUNT}, minmax(${SLOT_HEIGHT_REM}rem, ${SLOT_HEIGHT_REM}rem))`,
        }}
      >
        {Array.from({ length: SCHEDULE_SLOT_COUNT }, (_, index) => (
          <button
            key={`${dateKey(day)}-${index}`}
            type="button"
            onClick={() => onDayClick(day)}
            className="min-h-0 border border-slate-100 bg-transparent transition hover:bg-sky-50/60"
            aria-label={`Open ${formatDay(day)} at ${TIME_SLOTS[index]}`}
          />
        ))}
      </div>

      <div
        className="pointer-events-none absolute inset-0 grid py-1.5"
        style={{
          gridTemplateRows: `repeat(${SCHEDULE_SLOT_COUNT}, minmax(${SLOT_HEIGHT_REM}rem, ${SLOT_HEIGHT_REM}rem))`,
        }}
      >
        {positionedItems.map(({ appointment, position }) => (
          <div
            key={appointment.id}
            className={[
              "pointer-events-auto min-h-0 min-w-0 max-w-full",
              isDayView ? "px-3" : "px-2",
            ].join(" ")}
            style={{
              gridRow: `${position.rowStart} / span ${position.rowSpan}`,
            }}
          >
            <ScheduleAppointmentCard
              appointment={appointment}
              onAppointmentClick={onAppointmentClick}
              showTime={isDayView}
            />
          </div>
        ))}
      </div>

      {canCreate && (
        <div className="absolute bottom-2 right-2 z-20">
          <button
            type="button"
            onClick={() => onCreate(day)}
            className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-white/95 px-2.5 text-xs font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50"
          >
            <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
            Add
          </button>
        </div>
      )}
    </section>
  );
}

function MonthCalendar({ focusDate, onDayClick, appointmentsByDay, today }) {
  const monthStart = startOfMonth(focusDate);
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const dim = new Date(year, month + 1, 0).getDate();
  const firstDow = (monthStart.getDay() + 6) % 7;

  const cells = [];
  for (let i = 0; i < firstDow; i++) {
    cells.push({ kind: "empty" });
  }
  for (let d = 1; d <= dim; d++) {
    cells.push({
      kind: "day",
      date: new Date(year, month, d),
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ kind: "empty" });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-1 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-slate-200">
        {cells.map((cell, idx) => {
          if (cell.kind === "empty") {
            return (
              <div
                key={`e-${idx}`}
                className="min-h-[5.5rem] bg-slate-50/80"
              />
            );
          }

          const { date } = cell;
          const key = dateKey(date);
          const items = appointmentsByDay.get(key) ?? [];
          const isToday = isSameDay(date, today);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onDayClick(date)}
              className={[
                "flex min-h-[5.5rem] min-w-0 flex-col items-stretch border-0 p-1.5 text-left transition hover:bg-sky-50/80",
                isToday ? "bg-sky-50" : "bg-white",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                  isToday
                    ? "bg-sky-600 text-white"
                    : "text-slate-800",
                ].join(" ")}
              >
                {date.getDate()}
              </span>
              <span className="mt-1 line-clamp-2 text-[10px] font-medium text-slate-500">
                {items.length === 0
                  ? " "
                  : `${items.length} ${items.length === 1 ? "visit" : "visits"}`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * @param {"day" | "week" | "month"} props.calendarView
 */
export default function AppointmentCalendar({
  appointments,
  calendarView,
  focusDate,
  weekStart,
  onDayClick,
  onAppointmentClick,
  canCreate,
  onCreate,
  onMutated,
  onToast,
}) {
  const today = new Date();
  const appointmentsByDay = useAppointmentsByDay(appointments);
  void onMutated;
  void onToast;

  const days = useMemo(() => {
    const baseDate = focusDate ?? weekStart ?? new Date();
    if (calendarView === "day") {
      const d = new Date(baseDate);
      d.setHours(0, 0, 0, 0);
      return [d];
    }
    if (calendarView === "week") {
      const from = weekStart ? new Date(weekStart) : startOfWeek(baseDate);
      from.setHours(0, 0, 0, 0);
      return Array.from({ length: 7 }, (_, index) => addDays(from, index));
    }
    return [];
  }, [calendarView, focusDate, weekStart]);

  if (calendarView === "month") {
    return (
      <MonthCalendar
        focusDate={focusDate}
        onDayClick={onDayClick}
        appointmentsByDay={appointmentsByDay}
        today={today}
      />
    );
  }

  const colCount = days.length;
  const minWidth = calendarView === "day" ? "min-w-[900px]" : "min-w-[900px]";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <div
          className={`grid ${minWidth} sticky top-0 z-30 border-b border-slate-200 bg-white`}
          style={{
            gridTemplateColumns: `5rem repeat(${colCount}, minmax(0, 1fr))`,
          }}
        >
          <div className="sticky left-0 z-40 border-r border-slate-200 bg-white px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Time
          </div>
          {days.map((day) => {
            const items = appointmentsByDay.get(dateKey(day)) ?? [];
            const isToday = isSameDay(day, today);

            return (
              <button
                key={dateKey(day)}
                type="button"
                onClick={() => onDayClick(day)}
                className={[
                  "min-w-0 border-r border-slate-200 bg-white px-3 py-3 text-left transition last:border-r-0 hover:bg-slate-50",
                  isToday ? "bg-sky-50 border-sky-200" : "",
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

        <div
          className={`grid ${minWidth}`}
          style={{
            gridTemplateColumns: `5rem repeat(${colCount}, minmax(0, 1fr))`,
          }}
        >
          <div className="sticky left-0 z-20 border-r border-slate-200 bg-white">
            <div
              className="relative grid"
              style={{
                gridTemplateRows: `repeat(${SCHEDULE_SLOT_COUNT}, minmax(${SLOT_HEIGHT_REM}rem, ${SLOT_HEIGHT_REM}rem))`,
              }}
            >
              {TIME_SLOTS.slice(0, -1).map((slot) => (
                <div
                  key={slot}
                  className="border-b border-slate-100 px-3 pt-1.5 text-xs font-medium tabular-nums text-slate-500"
                >
                  {slot}
                </div>
              ))}
              <div className="absolute bottom-1 left-3 text-xs font-medium tabular-nums text-slate-500">
                {TIME_SLOTS[TIME_SLOTS.length - 1]}
              </div>
            </div>
          </div>
          {days.map((day) => {
            const items = appointmentsByDay.get(dateKey(day)) ?? [];

            return (
              <AppointmentDayColumn
                key={dateKey(day)}
                day={day}
                items={items}
                today={today}
                onDayClick={onDayClick}
                onAppointmentClick={onAppointmentClick}
                canCreate={canCreate}
                onCreate={onCreate}
                calendarView={calendarView}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

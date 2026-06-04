import { memo, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ChevronUp,
  Clock3,
  Eye,
  Pencil,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { APPOINTMENT_STATUS } from "@/features/appointments/appointmentConstants";
import { cn } from "@/lib/utils";

const STATUS_META = {
  [APPOINTMENT_STATUS.SCHEDULED]: {
    label: "Scheduled",
    dot: "bg-sky-500",
    border: "border-sky-200",
    bg: "bg-sky-50/70",
    badge: "bg-sky-100 text-sky-800 ring-sky-200",
    line: "bg-sky-500",
    accentColor: "#0ea5e9",
  },
  [APPOINTMENT_STATUS.CONFIRMED]: {
    label: "Confirmed",
    dot: "bg-emerald-500",
    border: "border-emerald-200",
    bg: "bg-emerald-50/70",
    badge: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    line: "bg-emerald-500",
    accentColor: "#10b981",
  },
  [APPOINTMENT_STATUS.COMPLETED]: {
    label: "Completed",
    dot: "bg-slate-400",
    border: "border-slate-200",
    bg: "bg-slate-50/80",
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    line: "bg-slate-400",
    accentColor: "#94a3b8",
  },
  [APPOINTMENT_STATUS.CANCELLED]: {
    label: "Cancelled",
    dot: "bg-rose-400",
    border: "border-rose-200",
    bg: "bg-rose-50/60",
    badge: "bg-rose-100 text-rose-800 ring-rose-200",
    line: "bg-rose-500",
    accentColor: "#f43f5e",
  },
  [APPOINTMENT_STATUS.NO_SHOW]: {
    label: "No show",
    dot: "bg-amber-400",
    border: "border-amber-200",
    bg: "bg-amber-50/70",
    badge: "bg-amber-100 text-amber-900 ring-amber-200",
    line: "bg-amber-500",
    accentColor: "#f59e0b",
  },
};

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const WORK_START_HOUR = 0;
const WORK_END_HOUR = 24;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT_REM = 2.75;
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
const LANE_GAP_REM = 0.375;
const DAY_APPOINTMENT_PAGE_SIZE = 4;

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

function dateInputValue(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
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

function formatWeekDayHeading(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function formatTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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

  return {
    rowStart,
    rowSpan,
    startMinutes: absoluteStart,
    endMinutes: absoluteEnd,
    heightRem: Math.max(2.45, (clampedEnd - clampedStart) / SLOT_MINUTES * SLOT_HEIGHT_REM),
  };
}

function layoutPositionedAppointments(items) {
  const sorted = items
    .map((appointment) => ({
      appointment,
      position: appointmentGridPosition(appointment),
    }))
    .filter((item) => item.position)
    .sort((a, b) => {
      const startDiff = a.position.startMinutes - b.position.startMinutes;
      if (startDiff !== 0) return startDiff;
      return b.position.endMinutes - a.position.endMinutes;
    });

  const groups = [];
  let currentGroup = [];
  let groupEnd = -1;

  for (const item of sorted) {
    if (currentGroup.length === 0 || item.position.startMinutes < groupEnd) {
      currentGroup.push(item);
      groupEnd = Math.max(groupEnd, item.position.endMinutes);
      continue;
    }

    groups.push(currentGroup);
    currentGroup = [item];
    groupEnd = item.position.endMinutes;
  }

  if (currentGroup.length > 0) groups.push(currentGroup);

  return groups.flatMap((group) => {
    const laneEnds = [];
    const placed = group.map((item) => {
      let laneIndex = laneEnds.findIndex((end) => end <= item.position.startMinutes);
      if (laneIndex === -1) {
        laneIndex = laneEnds.length;
        laneEnds.push(item.position.endMinutes);
      } else {
        laneEnds[laneIndex] = item.position.endMinutes;
      }
      return { ...item, laneIndex };
    });
    const laneCount = Math.max(1, laneEnds.length);
    return placed.map((item) => ({ ...item, laneCount }));
  });
}

function nowOffsetPercent(today) {
  const currentMinutes = today.getHours() * 60 + today.getMinutes();
  const startMinutes = WORK_START_HOUR * 60;
  const endMinutes = WORK_END_HOUR * 60;
  if (currentMinutes < startMinutes || currentMinutes > endMinutes) return null;
  return ((currentMinutes - startMinutes) / (endMinutes - startMinutes)) * 100;
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
      line: "bg-slate-400",
      accentColor: "#94a3b8",
    }
  );
}

function CompactStatusBadge({ status }) {
  const meta = statusMeta(status);
  return (
    <Badge
      variant="outline"
      className={cn("h-5 max-w-full rounded-full px-2 text-[11px] font-semibold leading-4", meta.badge)}
    >
      <span className="truncate">{meta.label}</span>
    </Badge>
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

const ScheduleAppointmentCard = memo(function ScheduleAppointmentCard({
  appointment,
  onAppointmentClick,
  onView,
  onEdit,
  canEdit,
  showTime,
}) {
  const meta = statusMeta(appointment.status);

  return (
    <article
      onClick={() => onAppointmentClick(appointment)}
      className={cn(
        "group relative z-10 h-full min-h-[2.45rem] w-full max-w-full cursor-pointer overflow-hidden rounded-lg border px-2.5 py-2 text-left shadow-sm transition will-change-transform hover:z-20 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white hover:shadow-md",
        meta.border,
        meta.bg
      )}
    >
      <span className={`absolute inset-y-1.5 left-0 w-1 rounded-r-full ${meta.line}`} />
      <div className="block min-w-0 max-w-full pl-2">
        <div
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
        </div>
        <h3 className="mt-1 block min-w-0 max-w-full truncate text-[13px] font-semibold leading-5 text-slate-950">
          {appointment.patientName}
        </h3>
        <p className="block min-w-0 max-w-full truncate text-xs leading-5 text-slate-600">
          Dr. {appointment.doctorName}
        </p>
        {!showTime && (
          <p className="mt-0.5 block min-w-0 max-w-full truncate text-[11px] font-semibold tabular-nums text-slate-700">
            {formatTimeRange(appointment.scheduledStart, appointment.scheduledEnd)}
          </p>
        )}
        {(appointment.appointmentType || appointment.reason) && (
          <p className="mt-1 block min-w-0 max-w-full truncate text-[11px] font-medium leading-4 text-slate-500">
            {appointment.appointmentType || appointment.reason}
          </p>
        )}
      </div>

      <div className="absolute right-1.5 top-1.5 hidden items-center gap-1 rounded-md bg-white/95 p-1 shadow-sm ring-1 ring-slate-200 group-hover:flex">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={(event) => {
            event.stopPropagation();
            onView(appointment);
          }}
          className="text-slate-500 hover:text-slate-900"
          aria-label={`View appointment for ${appointment.patientName}`}
        >
          <Eye className="h-3.5 w-3.5" aria-hidden />
        </Button>
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(appointment);
            }}
            className="text-slate-500 hover:text-slate-900"
            aria-label={`Edit appointment for ${appointment.patientName}`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </Button>
        )}
      </div>
    </article>
  );
});

const AppointmentDayColumn = memo(function AppointmentDayColumn({
  day,
  items,
  today,
  onSlotClick,
  onAppointmentClick,
  onAppointmentView,
  onAppointmentEdit,
  canCreate,
  canEdit,
  calendarView,
}) {
  const isToday = isSameDay(day, today);
  const isDayView = calendarView === "day";
  const nowTop = isToday ? nowOffsetPercent(today) : null;
  const positionedItems = layoutPositionedAppointments(items);

  return (
    <section
      className={[
        "relative min-w-0 border-r border-slate-100 [contain:layout_paint] last:border-r-0",
        isToday ? "border-sky-200 bg-sky-50/50" : "bg-white",
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
            onClick={() => canCreate && onSlotClick(day, TIME_SLOTS[index])}
            disabled={!canCreate}
            className="group relative min-h-0 border-b border-slate-100 bg-transparent transition hover:bg-sky-50/80 disabled:cursor-default"
            aria-label={`Create appointment on ${formatDay(day)} at ${TIME_SLOTS[index]}`}
          >
            {canCreate && (
              <span className="pointer-events-none absolute right-2 top-1.5 hidden rounded-md border border-sky-200 bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-sky-700 shadow-sm group-hover:inline-flex">
                + Add
              </span>
            )}
          </button>
        ))}
      </div>

      <div
        className="pointer-events-none absolute inset-x-1.5 inset-y-0 grid py-1.5"
        style={{
          gridTemplateRows: `repeat(${SCHEDULE_SLOT_COUNT}, minmax(${SLOT_HEIGHT_REM}rem, ${SLOT_HEIGHT_REM}rem))`,
        }}
      >
        {positionedItems.map(({ appointment, position, laneIndex, laneCount }) => (
          <div
            key={appointment.id}
            className={[
              "pointer-events-auto min-h-0 min-w-0 max-w-full",
              isDayView ? "px-1" : "px-0.5",
            ].join(" ")}
            style={{
              gridRow: `${position.rowStart} / span ${position.rowSpan}`,
              minHeight: `${position.heightRem}rem`,
              width: `calc((100% - ${(laneCount - 1) * LANE_GAP_REM}rem) / ${laneCount})`,
              marginLeft: `calc(${laneIndex} * ((100% - ${(laneCount - 1) * LANE_GAP_REM}rem) / ${laneCount} + ${LANE_GAP_REM}rem))`,
            }}
          >
            <ScheduleAppointmentCard
              appointment={appointment}
              onAppointmentClick={onAppointmentClick}
              onView={onAppointmentView}
              onEdit={onAppointmentEdit}
              canEdit={canEdit}
              showTime={isDayView}
            />
          </div>
        ))}
      </div>

      {nowTop != null && (
        <div
          className="pointer-events-none absolute left-0 right-0 z-30"
          style={{ top: `${nowTop}%` }}
        >
          <div className="relative h-px bg-rose-500/70">
            <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-rose-500" />
          </div>
        </div>
      )}
    </section>
  );
});

const WeekAppointmentCard = memo(function WeekAppointmentCard({
  appointment,
  onAppointmentClick,
  onView,
  onEdit,
  canEdit,
}) {
  const meta = statusMeta(appointment.status);

  return (
    <article
      onClick={() => onAppointmentClick(appointment)}
      className={cn(
        "group flex w-full cursor-pointer flex-col gap-2 rounded-lg border border-l-4 p-3 text-left shadow-sm transition will-change-transform hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white hover:shadow-md",
        meta.border,
        meta.bg
      )}
      style={{ borderLeftColor: meta.accentColor }}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold tabular-nums text-slate-700">
          <Clock3 className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          <span className="truncate">
            {formatTimeRange(appointment.scheduledStart, appointment.scheduledEnd)}
          </span>
        </p>
        <CompactStatusBadge status={appointment.status} />
      </div>

      <div className="min-w-0">
        <h3 className="text-sm font-semibold leading-5 text-slate-950 [overflow-wrap:anywhere]">
          {appointment.patientName}
        </h3>
        <p className="mt-0.5 text-xs leading-5 text-slate-600 [overflow-wrap:anywhere]">
          Dr. {appointment.doctorName}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1 pt-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onView(appointment);
          }}
          className="h-7 text-xs"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden />
          View
        </Button>
        {canEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(appointment);
            }}
            className="h-7 text-xs"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Edit
          </Button>
        )}
      </div>
    </article>
  );
});

const WeekDayCard = memo(function WeekDayCard({
  day,
  items,
  today,
  canCreate,
  canEdit,
  onCreate,
  onDayClick,
  onAppointmentClick,
  onAppointmentView,
  onAppointmentEdit,
}) {
  const isToday = isSameDay(day, today);
  const [expanded, setExpanded] = useState(false);
  const createForDay = () =>
    onCreate?.({
      date: dateInputValue(day),
      durationMinutes: SLOT_MINUTES,
    });
  const hasOverflow = items.length > DAY_APPOINTMENT_PAGE_SIZE;
  const visibleItems = hasOverflow && !expanded
    ? items.slice(0, DAY_APPOINTMENT_PAGE_SIZE)
    : items;
  const hiddenCount = Math.max(0, items.length - DAY_APPOINTMENT_PAGE_SIZE);

  return (
    <Card
      size="sm"
      className={cn(
        "flex min-w-[16.25rem] flex-col gap-0 rounded-lg py-0 shadow-sm",
        isToday ? "ring-sky-200 bg-sky-50/50" : "bg-white"
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 border-b border-slate-100 px-3 py-3">
        <button
          type="button"
          onClick={() => onDayClick(day)}
          className="min-w-0 text-left"
        >
          <p className="truncate text-sm font-semibold text-slate-950">
            {formatDay(day)}
          </p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            {formatDayNumber(day)} {formatMonth(day)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {items.length} {items.length === 1 ? "appointment" : "appointments"}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          {isToday && (
            <Badge className="rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-semibold text-white">
              Today
            </Badge>
          )}
          {canCreate && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={createForDay}
              className="border-sky-200 bg-white text-sky-700 shadow-sm hover:bg-sky-50"
              aria-label={`Add appointment on ${formatWeekDayHeading(day)}`}
            >
              <CalendarPlus className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 p-3">
        {items.length === 0 ? (
          <button
            type="button"
            onClick={canCreate ? createForDay : undefined}
            disabled={!canCreate}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-3 text-center text-sm font-medium text-slate-500 transition hover:border-sky-200 hover:bg-sky-50 disabled:cursor-default disabled:hover:border-slate-200 disabled:hover:bg-slate-50/70"
          >
            <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden />
            No appointments
          </button>
        ) : (
          <>
            {visibleItems.map((appointment) => (
              <WeekAppointmentCard
                key={appointment.id}
                appointment={appointment}
                onAppointmentClick={onAppointmentClick}
                onView={onAppointmentView}
                onEdit={onAppointmentEdit}
                canEdit={canEdit}
              />
            ))}
            {hasOverflow && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setExpanded((current) => !current)}
                className="h-8 justify-center gap-2 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                aria-expanded={expanded}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                    View less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                    Load {hiddenCount} more
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});

function WeekCalendar({
  days,
  today,
  appointmentsByDay,
  canCreate,
  canEdit,
  onCreate,
  onDayClick,
  onAppointmentClick,
  onAppointmentView,
  onAppointmentEdit,
}) {
  return (
    <Card className="rounded-lg bg-white p-0 shadow-sm">
      <div className="grid grid-cols-[repeat(7,minmax(260px,1fr))] gap-3 overflow-x-auto pb-1">
        {days.map((day) => (
          <WeekDayCard
            key={dateKey(day)}
            day={day}
            items={appointmentsByDay.get(dateKey(day)) ?? []}
            today={today}
            canCreate={canCreate}
            canEdit={canEdit}
            onCreate={onCreate}
            onDayClick={onDayClick}
            onAppointmentClick={onAppointmentClick}
            onAppointmentView={onAppointmentView}
            onAppointmentEdit={onAppointmentEdit}
          />
        ))}
      </div>
    </Card>
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
    <Card className="overflow-hidden rounded-lg bg-white p-0 shadow-sm">
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
                "flex min-h-[6.25rem] min-w-0 flex-col items-stretch border-0 p-2 text-left transition hover:bg-sky-50/80",
                isToday ? "bg-sky-50" : "bg-white",
              ].join(" ")}
            >
              <span className="flex items-center justify-between gap-1">
                <span
                  className={[
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                    isToday ? "bg-sky-600 text-white" : "text-slate-800",
                  ].join(" ")}
                >
                  {date.getDate()}
                </span>
                {items.length > 0 && (
                  <Badge variant="outline" className="h-5 rounded-full bg-white/80 px-1.5 text-[10px] text-slate-600">
                    {items.length}
                  </Badge>
                )}
              </span>
              <span className="mt-2 flex min-w-0 flex-col gap-1">
                {items.slice(0, 2).map((appointment) => {
                  const meta = statusMeta(appointment.status);
                  return (
                    <span
                      key={appointment.id}
                      className={cn("block truncate rounded-md px-1.5 py-1 text-[10px] font-semibold leading-none text-slate-700", meta.bg)}
                    >
                      {formatTime(appointment.scheduledStart)} {appointment.patientName}
                    </span>
                  );
                })}
                {items.length > 2 && (
                  <span className="text-[10px] font-semibold text-slate-500">
                    +{items.length - 2} more
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
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
  onAppointmentView,
  onAppointmentEdit,
  canCreate,
  canEdit,
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

  if (calendarView === "week") {
    return (
      <WeekCalendar
        days={days}
        today={today}
        appointmentsByDay={appointmentsByDay}
        canCreate={canCreate}
        canEdit={canEdit}
        onCreate={onCreate}
        onDayClick={onDayClick}
        onAppointmentClick={onAppointmentClick}
        onAppointmentView={onAppointmentView}
        onAppointmentEdit={onAppointmentEdit}
      />
    );
  }

  const colCount = days.length;
  const minWidth = "min-w-[760px]";

  const handleSlotClick = (day, startTime) => {
    onCreate?.({
      date: dateInputValue(day),
      startTime,
      durationMinutes: SLOT_MINUTES,
    });
  };

  return (
    <Card className="overflow-hidden rounded-lg bg-white p-0 shadow-sm">
      <div className="scrollbar-none overflow-x-auto">
        <div
          className={`sticky top-0 z-30 grid ${minWidth} border-b border-slate-200 bg-white`}
          style={{
            gridTemplateColumns: `4.25rem repeat(${colCount}, minmax(8.75rem, 1fr))`,
          }}
        >
          <div className="sticky left-0 z-40 border-r border-slate-200 bg-white px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
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
                  isToday ? "border-sky-200 bg-sky-50/70" : "",
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
                    <Badge className="shrink-0 rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                      Today
                    </Badge>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className={`grid ${minWidth}`}
          style={{
            gridTemplateColumns: `4.25rem repeat(${colCount}, minmax(8.75rem, 1fr))`,
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
                  className="border-b border-slate-100 px-3 pt-1.5 text-[11px] font-medium tabular-nums text-slate-400"
              >
                  {slot}
                </div>
              ))}
              <div className="absolute bottom-1 left-3 text-[11px] font-medium tabular-nums text-slate-400">
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
                onSlotClick={handleSlotClick}
                onAppointmentClick={onAppointmentClick}
                onAppointmentView={onAppointmentView}
                onAppointmentEdit={onAppointmentEdit}
                canCreate={canCreate}
                canEdit={canEdit}
                calendarView={calendarView}
              />
            );
          })}
        </div>
      </div>
    </Card>
  );
}

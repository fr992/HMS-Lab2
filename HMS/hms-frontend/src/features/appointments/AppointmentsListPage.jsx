import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  List,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { CountUpValue } from "@/features/dashboard/DashboardPrimitives";
import { getPagedItems, getPagination, MAX_LIST_PAGE_SIZE, PaginationBar, paginateArray } from "@/lib/pagination.jsx";
import {
  fetchAppointments,
  getApiErrorMessage,
} from "@/features/appointments/api/appointmentsApi";
import AppointmentCalendar from "@/features/appointments/components/AppointmentCalendar";
import AppointmentRowActions from "@/features/appointments/components/AppointmentRowActions";
import CalendarDayModal from "@/features/appointments/components/CalendarDayModal";
import { APPOINTMENT_STATUS } from "@/features/appointments/appointmentConstants";
import DataTransferMenu from "@/features/dataTransfer/DataTransferMenu";

const LIST_SEGMENT_TABS = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function startOfWeek(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatWeekLabel(weekStart) {
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  if (sameMonth) {
    return `${weekStart.toLocaleDateString(undefined, {
      month: "long",
    })} ${weekStart.getDate()}-${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
  }
  return `${weekStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} - ${weekEnd.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function startOfMonth(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

function addMonths(date, delta) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + delta);
  return d;
}

/**
 * @param {"day" | "week" | "month"} mode
 * @param {Date} focusDate
 */
function getScheduleFetchRange(mode, focusDate) {
  const t = new Date(focusDate);
  t.setHours(0, 0, 0, 0);
  if (mode === "day") {
    return { from: new Date(t), to: addDays(t, 1) };
  }
  if (mode === "week") {
    const from = startOfWeek(t);
    return { from, to: addDays(from, 7) };
  }
  const from = startOfMonth(t);
  return { from, to: addMonths(from, 1) };
}

/**
 * @param {"day" | "week" | "month"} mode
 * @param {Date} focusDate
 */
function formatScheduleNavLabel(mode, focusDate) {
  if (mode === "day") {
    return focusDate.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  if (mode === "week") {
    return formatWeekLabel(startOfWeek(focusDate));
  }
  return focusDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function normalizeScheduleFocus(mode, value) {
  if (mode === "month") return startOfMonth(value);
  if (mode === "week") return startOfWeek(value);
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function statusKey(status) {
  return String(status ?? "").trim().toLowerCase();
}

function formatListTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function durationMinutes(startIso, endIso) {
  const a = new Date(startIso).getTime();
  const b = new Date(endIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.round((b - a) / 60000));
}

/** @returns {{ label: string, className: string } | null} */
function appointmentTypePill(raw) {
  const label = raw?.trim();
  if (!label) return null;
  const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const styles = {
    follow_up: "bg-slate-100 text-slate-800 ring-slate-200/80",
    followup: "bg-slate-100 text-slate-800 ring-slate-200/80",
    consultation: "bg-teal-50 text-teal-800 ring-teal-200/80",
    check_up: "bg-sky-50 text-sky-800 ring-sky-200/80",
    checkup: "bg-sky-50 text-sky-800 ring-sky-200/80",
    emergency: "bg-rose-50 text-rose-800 ring-rose-200/80",
    surgery_prep: "bg-orange-50 text-orange-900 ring-orange-200/80",
  };
  return {
    label,
    className: styles[key] ?? "bg-slate-100 text-slate-700 ring-slate-200/80",
  };
}

function approvalPillForList(status) {
  const k = statusKey(status);
  if (
    k === APPOINTMENT_STATUS.CONFIRMED ||
    k === APPOINTMENT_STATUS.CHECKED_IN ||
    k === APPOINTMENT_STATUS.IN_PROGRESS ||
    k === APPOINTMENT_STATUS.COMPLETED
  ) {
    return { label: "Approved", className: "bg-sky-50 text-sky-800 ring-sky-200/80" };
  }
  if (k === APPOINTMENT_STATUS.SCHEDULED) {
    return { label: "Pending", className: "bg-amber-50 text-amber-900 ring-amber-200/80" };
  }
  if (k === APPOINTMENT_STATUS.CANCELLED) {
    return { label: "Cancelled", className: "bg-rose-50 text-rose-800 ring-rose-200/80" };
  }
  if (k === APPOINTMENT_STATUS.NO_SHOW) {
    return { label: "No show", className: "bg-slate-100 text-slate-700 ring-slate-200/80" };
  }
  return null;
}

function visitStatusPillForList(appointment) {
  const k = statusKey(appointment.status);
  const now = Date.now();
  const start = new Date(appointment.scheduledStart).getTime();
  const end = new Date(appointment.scheduledEnd).getTime();

  if (k === APPOINTMENT_STATUS.COMPLETED) {
    return {
      label: "Completed",
      Icon: CheckCircle2,
      className: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
    };
  }
  if (k === APPOINTMENT_STATUS.CANCELLED) {
    return {
      label: "Cancelled",
      Icon: XCircle,
      className: "bg-rose-50 text-rose-800 ring-rose-200/80",
    };
  }
  if (k === APPOINTMENT_STATUS.NO_SHOW) {
    return {
      label: "No show",
      Icon: XCircle,
      className: "bg-slate-100 text-slate-700 ring-slate-200/80",
    };
  }
  if (k === APPOINTMENT_STATUS.CONFIRMED) {
    if (now < start) {
      return {
        label: "Upcoming",
        Icon: CalendarDays,
        className: "bg-sky-50 text-sky-800 ring-sky-200/80",
      };
    }
    if (now <= end) {
      return {
        label: "In progress",
        Icon: Clock3,
        className: "bg-sky-50 text-sky-900 ring-sky-200/80",
      };
    }
    return {
      label: "Visited",
      Icon: CheckCircle2,
      className: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
    };
  }
  if (k === APPOINTMENT_STATUS.SCHEDULED) {
    if (now < start) {
      return {
        label: "Upcoming",
        Icon: CalendarDays,
        className: "bg-sky-50 text-sky-800 ring-sky-200/80",
      };
    }
    return {
      label: "Pending",
      Icon: Clock3,
      className: "bg-amber-50 text-amber-900 ring-amber-200/80",
    };
  }
  return {
    label: "Upcoming",
    Icon: CalendarDays,
    className: "bg-slate-100 text-slate-700 ring-slate-200/80",
  };
}

function isUpcomingAppointment(appointment) {
  const k = statusKey(appointment.status);
  const start = new Date(appointment.scheduledStart).getTime();
  return (
    Number.isFinite(start) &&
    start >= Date.now() &&
    (k === APPOINTMENT_STATUS.SCHEDULED || k === APPOINTMENT_STATUS.CONFIRMED)
  );
}

function matchesListSegment(appointment, segment) {
  const k = statusKey(appointment.status);
  if (segment === "all") return true;
  if (segment === "completed") return k === APPOINTMENT_STATUS.COMPLETED;
  if (segment === "cancelled") {
    return k === APPOINTMENT_STATUS.CANCELLED || k === APPOINTMENT_STATUS.NO_SHOW;
  }
  if (k === APPOINTMENT_STATUS.CHECKED_IN) {
    return {
      label: "Ready for doctor",
      Icon: Clock3,
      className: "bg-violet-50 text-violet-800 ring-violet-200/80",
    };
  }
  if (k === APPOINTMENT_STATUS.IN_PROGRESS) {
    return {
      label: "Encounter in progress",
      Icon: Clock3,
      className: "bg-teal-50 text-teal-800 ring-teal-200/80",
    };
  }
  if (segment === "upcoming") {
    return isUpcomingAppointment(appointment);
  }
  return true;
}

const SUMMARY_TONES = {
  slate: "border-slate-200 bg-white text-slate-500",
  sky: "border-sky-200 bg-sky-50/60 text-sky-600",
  emerald: "border-emerald-200 bg-emerald-50/70 text-emerald-600",
  rose: "border-rose-200 bg-rose-50/60 text-rose-500",
};

function SummaryTile({ label, value, icon, tone = "slate" }) {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold leading-none text-slate-950">
            <CountUpValue value={value} />
          </p>
        </div>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${SUMMARY_TONES[tone]}`}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

function ViewToggle({ view, onChange }) {
  const optionClass = (value) =>
    [
      "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition",
      view === value
        ? "bg-sky-700 text-white shadow-sm"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
    ].join(" ");

  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => onChange("schedule")}
        className={optionClass("schedule")}
        aria-pressed={view === "schedule"}
      >
        <CalendarDays className="h-4 w-4" aria-hidden />
        Schedule
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        className={optionClass("list")}
        aria-pressed={view === "list"}
      >
        <List className="h-4 w-4" aria-hidden />
        List
      </button>
    </div>
  );
}

const CALENDAR_VIEW_OPTIONS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

function StatusSegment({ value, onChange }) {
  return (
    <div className="scrollbar-none inline-flex max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-slate-100/80 p-1 shadow-sm">
      {LIST_SEGMENT_TABS.map((tab) => {
        const on = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={[
              "shrink-0 rounded-lg text-sm font-medium transition",
              "px-4 py-2",
              on
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                : "text-slate-600 hover:text-slate-900",
            ].join(" ")}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function ScheduleNav({
  calendarView,
  focusDate,
  onFocusChange,
  onClear,
}) {
  function goPrev() {
    const d = new Date(focusDate);
    if (calendarView === "day") {
      onFocusChange(addDays(d, -1));
      return;
    }
    if (calendarView === "week") {
      onFocusChange(addDays(startOfWeek(d), -7));
      return;
    }
    onFocusChange(addMonths(startOfMonth(d), -1));
  }

  function goNext() {
    const d = new Date(focusDate);
    if (calendarView === "day") {
      onFocusChange(addDays(d, 1));
      return;
    }
    if (calendarView === "week") {
      onFocusChange(addDays(startOfWeek(d), 7));
      return;
    }
    onFocusChange(addMonths(startOfMonth(d), 1));
  }

  function goToday() {
    const now = new Date();
    if (calendarView === "month") {
      onFocusChange(startOfMonth(now));
      return;
    }
    if (calendarView === "week") {
      onFocusChange(startOfWeek(now));
      return;
    }
    onFocusChange(now);
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
      <div className="inline-flex w-fit min-w-0 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={goPrev}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center border-r border-slate-200 text-slate-600 transition hover:bg-slate-50"
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <div className="flex h-10 w-fit min-w-[11.5rem] shrink-0 items-center justify-center gap-2 bg-slate-50 px-3 text-center text-sm font-semibold leading-snug text-slate-900 sm:min-w-[14rem]">
          <CalendarDays className="h-4 w-4 text-sky-600" aria-hidden />
          <span className="truncate">{formatScheduleNavLabel(calendarView, focusDate)}</span>
        </div>
        <button
          type="button"
          onClick={goNext}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center border-l border-slate-200 text-slate-600 transition hover:bg-slate-50"
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <button
        type="button"
        onClick={goToday}
        className="h-10 shrink-0 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
      >
        Today
      </button>
      <button
        type="button"
        onClick={onClear}
        className="h-10 shrink-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
      >
        Clear
      </button>
    </div>
  );
}

function CalendarViewSegment({ value, onChange }) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1 shadow-sm">
      {CALENDAR_VIEW_OPTIONS.map((opt) => {
        const on = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              "rounded-lg px-4 py-2 text-sm font-medium transition",
              on
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                : "text-slate-600 hover:text-slate-900",
            ].join(" ")}
            aria-pressed={on}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SearchField({ value, onChange }) {
  return (
    <label className="block w-full">
      <span className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search patient, doctor, department..."
          className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
        />
      </span>
    </label>
  );
}

function AppointmentStatsRow({ view, calendarView, counts }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <SummaryTile
        label={
          view === "schedule"
            ? calendarView === "day"
              ? "Day total"
              : calendarView === "week"
                ? "Week total"
                : "Month total"
            : "Showing"
        }
        value={counts.total}
        tone="slate"
        icon={<CalendarClock className="h-4 w-4" aria-hidden />}
      />
      <SummaryTile
        label="Scheduled"
        value={counts.scheduled}
        tone="sky"
        icon={<CalendarDays className="h-4 w-4" aria-hidden />}
      />
      <SummaryTile
        label="Confirmed"
        value={counts.confirmed}
        tone="emerald"
        icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
      />
      <SummaryTile
        label="Closed"
        value={counts.completed + counts.cancelled + counts.no_show}
        tone="rose"
        icon={<XCircle className="h-4 w-4" aria-hidden />}
      />
    </div>
  );
}

function AppointmentScheduleToolbar({
  search,
  onSearchChange,
  calendarView,
  scheduleFocus,
  onFocusChange,
  onClear,
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-[18rem] flex-1">
          <SearchField value={search} onChange={onSearchChange} />
        </div>
        <ScheduleNav
          calendarView={calendarView}
          focusDate={scheduleFocus}
          onFocusChange={onFocusChange}
          onClear={onClear}
        />
      </div>
    </section>
  );
}

function AppointmentListToolbar({
  search,
  onSearchChange,
  filterDate,
  onFilterDateChange,
  onClear,
  onShowAll,
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[18rem] flex-1">
          <SearchField value={search} onChange={onSearchChange} />
        </div>
        <label className="block w-full min-w-[12rem] sm:w-auto sm:flex-none">
          <span className="sr-only">
            Day
          </span>
          <input
            type="date"
            value={filterDate}
            onChange={(event) => onFilterDateChange(event.target.value)}
            className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
        </label>
        <div className="grid w-full max-w-[15rem] shrink-0 grid-cols-2 gap-2 sm:w-[15rem]">
          <button
            type="button"
            onClick={onClear}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onShowAll}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Show all
          </button>
        </div>
      </div>
    </section>
  );
}

function AppointmentFilterBar({
  view,
  listSegment,
  onListSegmentChange,
  calendarView,
  onCalendarViewChange,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Status
        </span>
        <StatusSegment value={listSegment} onChange={onListSegmentChange} />
      </div>
      {view === "schedule" && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            View
          </span>
          <CalendarViewSegment
            value={calendarView}
            onChange={onCalendarViewChange}
          />
        </div>
      )}
    </div>
  );
}

export default function AppointmentsListPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const canManageStatus = auth.hasPermission("Appointments.ManageStatus");
  const canEdit = auth.hasPermission("Appointments.Create");
  const canVisit =
    auth.hasPermission("Encounters.Create") && auth.hasPermission("Encounters.Read");
  const encounterBasePath =
    auth.userRole === "Doctor" ? "/doctor/encounters" : "/admin/encounters";

  const [view, setView] = useState("schedule");
  const [calendarView, setCalendarView] = useState("week");
  const [scheduleFocus, setScheduleFocus] = useState(() => new Date());
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [listSegment, setListSegment] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters =
        view === "schedule"
          ? (() => {
              const { from, to } = getScheduleFetchRange(
                calendarView,
                scheduleFocus
              );
              return { from: from.toISOString(), to: to.toISOString() };
            })()
          : {
              ...(filterDate ? { date: filterDate } : {}),
              search: search.trim() || undefined,
              status: listSegment,
              page,
              pageSize: MAX_LIST_PAGE_SIZE,
            };

      const data = await fetchAppointments(filters);
      setItems(getPagedItems(data));
      setPagination(view === "list" ? getPagination(data) : null);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setItems([]);
      setPagination(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterDate, view, scheduleFocus, calendarView, search, listSegment, page]);

  const handleCalendarViewChange = useCallback((nextView) => {
    setCalendarView(nextView);
    setScheduleFocus((previous) => normalizeScheduleFocus(nextView, previous));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const showToast = useCallback((message, type = "success") => {
    toast[type === "error" ? "error" : type === "warning" ? "warning" : "success"](message);
  }, []);

  useEffect(() => {
    if (error) showToast(error, "error");
  }, [error, showToast]);

  const filteredItems = useMemo(() => {
    if (view === "list") return items;
    const term = search.trim().toLowerCase();
    return items.filter((appointment) => {
      if (!matchesListSegment(appointment, listSegment)) return false;

      if (!term) return true;
      const haystack = [
        appointment.patientName,
        appointment.doctorName,
        appointment.departmentName,
        appointment.appointmentType,
        appointment.reason,
        appointment.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [items, search, listSegment, view]);

  const counts = useMemo(() => {
    const next = {
      total: filteredItems.length,
      scheduled: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
    };
    for (const item of filteredItems) {
      const key = statusKey(item.status);
      if (key in next) next[key] += 1;
    }
    return next;
  }, [filteredItems]);

  const selectedDayAppointments = useMemo(() => {
    if (!selectedDay) return [];
    return filteredItems.filter((appointment) =>
      isSameDay(new Date(appointment.scheduledStart), selectedDay)
    );
  }, [filteredItems, selectedDay]);

  const sortedListItems = useMemo(() => {
    if (view !== "list") return [];
    if (pagination) return items;
    return [...filteredItems].sort(
      (a, b) =>
        new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
    );
  }, [filteredItems, items, pagination, view]);

  useEffect(() => {
    setPage(1);
  }, [search, listSegment, filterDate, view]);

  const listPage = useMemo(
    () => pagination ? { items: sortedListItems, pagination } : paginateArray(sortedListItems, page, MAX_LIST_PAGE_SIZE),
    [sortedListItems, page, pagination]
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Reception schedule
          </p>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            Visits booked by reception for registered patients.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <ViewToggle view={view} onChange={setView} />
          <DataTransferMenu
            endpoint="/data-transfer/appointments"
            exportParams={{
              status: listSegment === "all" ? undefined : listSegment,
            }}
            canImport={canEdit}
            onImported={load}
          />
          {canEdit && (
            <Link
              to="/appointments/new"
              state={{ returnTo: `${location.pathname}${location.search}` }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" aria-hidden />
              New appointment
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              void load();
            }}
            disabled={refreshing || loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden
            />
            Refresh
          </button>
        </div>
      </div>

      <AppointmentStatsRow view={view} calendarView={calendarView} counts={counts} />

      {view === "list" ? (
        <AppointmentListToolbar
          search={search}
          onSearchChange={setSearch}
          filterDate={filterDate}
          onFilterDateChange={setFilterDate}
          onClear={() => {
            setSearch("");
            setListSegment("all");
            setFilterDate("");
          }}
          onShowAll={() => {
            setFilterDate("");
            setListSegment("all");
          }}
        />
      ) : (
        <AppointmentScheduleToolbar
          search={search}
          onSearchChange={setSearch}
          calendarView={calendarView}
          scheduleFocus={scheduleFocus}
          onFocusChange={setScheduleFocus}
          onClear={() => {
            setSearch("");
            setListSegment("all");
            setFilterDate("");
          }}
        />
      )}

      <AppointmentFilterBar
        view={view}
        listSegment={listSegment}
        onListSegmentChange={setListSegment}
        calendarView={calendarView}
        onCalendarViewChange={handleCalendarViewChange}
      />

      <div className="min-h-0 flex-1">
        {loading ? (
          <div className="flex min-h-[18rem] items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500 shadow-sm">
            Loading appointments...
          </div>
        ) : view === "schedule" ? (
          <AppointmentCalendar
            appointments={filteredItems}
            calendarView={calendarView}
            focusDate={scheduleFocus}
            canCreate={canEdit}
            canEdit={canEdit}
            onCreate={(initialSlot) =>
              navigate("/appointments/new", {
                state: {
                  returnTo: `${location.pathname}${location.search}`,
                  initialSlot,
                },
              })
            }
            onDayClick={(date) => setSelectedDay(date)}
            onAppointmentClick={(appointment) =>
              setSelectedDay(new Date(appointment.scheduledStart))
            }
            onAppointmentView={(appointment) =>
              navigate(`/appointments/${appointment.id}`)
            }
            onAppointmentEdit={(appointment) =>
              navigate(`/appointments/${appointment.id}/edit`)
            }
            onMutated={load}
            onToast={showToast}
          />
        ) : sortedListItems.length === 0 ? (
          <div className="flex min-h-[18rem] items-center justify-center rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div>
              <CalendarClock className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
              <p className="mt-3 text-sm font-medium text-slate-900">
                No appointments found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Adjust filters or create a new appointment.
              </p>
            </div>
          </div>
        ) : (
          <>
          <ul className="flex flex-col gap-3">
            {listPage.items.map((appointment) => {
              const typePill = appointmentTypePill(appointment.appointmentType);
              const approval = approvalPillForList(appointment.status);
              const visitPill = visitStatusPillForList(appointment);
              const VisitIcon = visitPill.Icon;
              const mins = durationMinutes(
                appointment.scheduledStart,
                appointment.scheduledEnd
              );
              return (
                <li key={appointment.id}>
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-0 lg:divide-x lg:divide-slate-200">
                      <div className="flex shrink-0 flex-col justify-center lg:pr-6">
                        <span className="text-base font-semibold tabular-nums text-slate-900">
                          {formatListTime(appointment.scheduledStart)}
                        </span>
                        <span className="mt-1 text-sm text-slate-500">
                          {mins != null ? `${mins} min` : "—"}
                        </span>
                      </div>

                      <div className="flex min-w-0 flex-col justify-center lg:px-6">
                        <Link
                          to={`/patients/${appointment.patientProfileId}`}
                          className="truncate text-base font-semibold text-slate-900 hover:text-sky-800 hover:underline"
                        >
                          {appointment.patientName}
                        </Link>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {appointment.doctorName}
                        </p>
                      </div>

                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:px-6 lg:justify-end">
                        {typePill && (
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${typePill.className}`}
                          >
                            {typePill.label}
                          </span>
                        )}
                        {approval && (
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${approval.className}`}
                          >
                            {approval.label}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${visitPill.className}`}
                        >
                          <VisitIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {visitPill.label}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center justify-start border-t border-slate-100 pt-4 lg:border-t-0 lg:pt-0 lg:pl-6">
                        <AppointmentRowActions
                          appointment={appointment}
                          canManageStatus={canManageStatus}
                          canEdit={canEdit}
                          canVisit={canVisit}
                          encounterBasePath={encounterBasePath}
                          variant="card"
                          onMutated={load}
                          onToast={showToast}
                        />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <PaginationBar pagination={listPage.pagination} loading={loading} onPageChange={setPage} />
          </>
        )}
      </div>

      <CalendarDayModal
        date={selectedDay}
        appointments={selectedDayAppointments}
        canManageStatus={canManageStatus}
        canEdit={canEdit}
        canVisit={canVisit}
        encounterBasePath={encounterBasePath}
        canCreate={canEdit}
        onMutated={load}
        onToast={showToast}
        onClose={() => setSelectedDay(null)}
      />
    </div>
  );
}

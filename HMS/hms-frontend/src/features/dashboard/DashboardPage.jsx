import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BedDouble,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  DollarSign,
  FlaskConical,
  GripVertical,
  LayoutDashboard,
  Search,
  Stethoscope,
  Users,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import QuickAddMenu from "@/features/dashboard/QuickAddMenu";

const METRIC_ORDER_KEY = "hms.dashboard.metricOrder";
const WIDGET_ORDER_KEY = "hms.dashboard.widgetOrder";

const metricCards = [
  {
    id: "patients",
    label: "Total Patients",
    value: "2,847",
    helper: "+12.5% vs last",
    tone: "bg-blue-50 text-blue-700",
    trend: "up",
    icon: Users,
  },
  {
    id: "appointments",
    label: "Today's Appointments",
    value: "64",
    helper: "+4.2% vs last",
    tone: "bg-teal-50 text-teal-700",
    trend: "up",
    icon: CalendarDays,
  },
  {
    id: "doctors",
    label: "Active Doctors",
    value: "38",
    helper: "On duty today",
    tone: "bg-emerald-50 text-emerald-700",
    trend: "up",
    icon: Stethoscope,
  },
  {
    id: "labs",
    label: "Pending Lab Results",
    value: "23",
    helper: "+5 vs last",
    tone: "bg-amber-50 text-amber-700",
    trend: "down",
    icon: FlaskConical,
  },
  {
    id: "revenue",
    label: "Revenue MTD",
    value: "$284.5k",
    helper: "+18.2% vs last",
    tone: "bg-sky-50 text-sky-700",
    trend: "up",
    icon: DollarSign,
  },
  {
    id: "tasks",
    label: "Open Nurse Tasks",
    value: "17",
    helper: "-3 vs last",
    tone: "bg-rose-50 text-rose-700",
    trend: "up",
    icon: ClipboardList,
  },
];

const widgetDefinitions = [
  { id: "patientTrends", span: "lg:col-span-8", component: PatientTrends },
  { id: "revenueTrend", span: "lg:col-span-4", component: RevenueTrend },
  { id: "patientsByDepartment", span: "lg:col-span-4", component: PatientsByDepartment },
  { id: "bedOccupancy", span: "lg:col-span-4", component: BedOccupancy },
  { id: "liveAlerts", span: "lg:col-span-4", component: LiveAlerts },
  { id: "recentPatients", span: "lg:col-span-8", component: RecentPatients },
  { id: "todaysSchedule", span: "lg:col-span-4", component: TodaysSchedule },
  { id: "bedAvailability", span: "lg:col-span-12", component: BedAvailability },
];

const defaultMetricOrder = metricCards.map((card) => card.id);
const defaultWidgetOrder = widgetDefinitions.map((widget) => widget.id);

function readOrder(key, fallback) {
  if (typeof window === "undefined") return fallback;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "null");
    if (!Array.isArray(parsed)) return fallback;
    const valid = parsed.filter((id) => fallback.includes(id));
    const missing = fallback.filter((id) => !valid.includes(id));
    return [...valid, ...missing];
  } catch {
    return fallback;
  }
}

function swapItems(list, fromId, toId) {
  const fromIndex = list.indexOf(fromId);
  const toIndex = list.indexOf(toId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return list;

  const next = [...list];
  next[fromIndex] = toId;
  next[toIndex] = fromId;
  return next;
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function useChartLoadProgress(duration = 950) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frameId;
    const startedAt = performance.now();

    const tick = (now) => {
      const next = Math.min(1, (now - startedAt) / duration);
      setProgress(next);
      if (next < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [duration]);

  return progress;
}

export default function AdminDashboard() {
  const auth = useAuth();
  const [search, setSearch] = useState("");
  const [metricOrder, setMetricOrder] = useState(() =>
    readOrder(METRIC_ORDER_KEY, defaultMetricOrder)
  );
  const [widgetOrder, setWidgetOrder] = useState(() =>
    readOrder(WIDGET_ORDER_KEY, defaultWidgetOrder)
  );
  const [draggedMetric, setDraggedMetric] = useState(null);
  const [draggedWidget, setDraggedWidget] = useState(null);
  const [metricDropTarget, setMetricDropTarget] = useState(null);
  const [widgetDropTarget, setWidgetDropTarget] = useState(null);

  useEffect(() => {
    window.localStorage.setItem(METRIC_ORDER_KEY, JSON.stringify(metricOrder));
  }, [metricOrder]);

  useEffect(() => {
    window.localStorage.setItem(WIDGET_ORDER_KEY, JSON.stringify(widgetOrder));
  }, [widgetOrder]);

  const metricsById = useMemo(
    () => Object.fromEntries(metricCards.map((card) => [card.id, card])),
    []
  );
  const widgetsById = useMemo(
    () => Object.fromEntries(widgetDefinitions.map((widget) => [widget.id, widget])),
    []
  );

  const finishMetricDrag = () => {
    setDraggedMetric(null);
    setMetricDropTarget(null);
  };

  const finishWidgetDrag = () => {
    setDraggedWidget(null);
    setWidgetDropTarget(null);
  };

  const dropMetric = (targetId) => {
    if (draggedMetric && draggedMetric !== targetId) {
      setMetricOrder((order) => swapItems(order, draggedMetric, targetId));
    }
    finishMetricDrag();
  };

  const dropWidget = (targetId) => {
    if (draggedWidget && draggedWidget !== targetId) {
      setWidgetOrder((order) => swapItems(order, draggedWidget, targetId));
    }
    finishWidgetDrag();
  };

  return (
    <div className="min-h-full bg-slate-50">
      <DashboardHeader
        userName={auth.userName}
        userRole={auth.userRole}
        search={search}
        onSearchChange={setSearch}
      />

      <div className="space-y-6 p-4 sm:p-5 lg:p-6">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metricOrder.map((id) => (
            <MetricCard
              key={id}
              card={metricsById[id]}
              dragging={draggedMetric === id}
              dropTarget={metricDropTarget === id && draggedMetric !== id}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", id);
                setDraggedMetric(id);
              }}
              onDragEnter={() => setMetricDropTarget(id)}
              onDragEnd={finishMetricDrag}
              onDrop={() => dropMetric(id)}
            />
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-12">
          {widgetOrder.map((id) => {
            const widget = widgetsById[id];
            const WidgetComponent = widget.component;

            return (
              <DraggablePanel
                key={id}
                id={id}
                span={widget.span}
                dragging={draggedWidget === id}
                dropTarget={widgetDropTarget === id && draggedWidget !== id}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", id);
                  setDraggedWidget(id);
                }}
                onDragEnter={() => setWidgetDropTarget(id)}
                onDragEnd={finishWidgetDrag}
                onDrop={() => dropWidget(id)}
              >
                <WidgetComponent search={search} />
              </DraggablePanel>
            );
          })}
        </section>
      </div>
    </div>
  );
}

function DashboardHeader({ userName, search, onSearchChange }) {
  const displayName = userName ?? "Administrator";

  return (
    <header className="sticky top-0 z-30 rounded-t-lg border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex flex-col gap-4 px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="flex items-center gap-4">
          <div className="hidden size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 lg:flex">
            <LayoutDashboard className="size-4" />
          </div>
          <div>
            <p className="mt-1 text-sm text-slate-500">
              Welcome back, {displayName}.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block sm:w-100">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search patients, doctors..."
              className="h-11 w-full rounded-lg border border-slate-200 bg-slate-100 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </label>

          <QuickAddMenu
            actions={[
              { label: "Register Patient", to: "/patients/new", kind: "patient" },
              { label: "New Appointment", to: "/appointments/new", kind: "appointment" },
            ]}
          />

        </div>
      </div>
    </header>
  );
}

function MetricCard({
  card,
  dragging,
  dropTarget,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
}) {
  const Icon = card.icon;
  const TrendIcon = card.trend === "down" ? ArrowDownRight : ArrowUpRight;
  const trendClass = card.trend === "down" ? "text-rose-600" : "text-emerald-600";

  return (
    <article
      onDragEnter={(event) => {
        event.preventDefault();
        onDragEnter();
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      className={[
        "group rounded-lg border bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md",
        dropTarget
          ? "border-blue-400 bg-blue-50/40 ring-4 ring-blue-100"
          : "border-slate-200",
        dragging ? "scale-[0.98] opacity-55 shadow-none" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
            {card.label}
          </p>
          <p className="mt-3 text-3xl font-semibold leading-none text-slate-950">
            {card.value}
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-2">
          <div className={`inline-flex size-10 items-center justify-center rounded-lg ${card.tone}`}>
            <Icon className="size-5" />
          </div>
          <DragHandle
            label={`Move ${card.label}`}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2 text-sm">
        <TrendIcon className={`size-4 ${trendClass}`} />
        <span className={trendClass}>{card.helper.split(" ")[0]}</span>
        <span className="text-slate-500">{card.helper.split(" ").slice(1).join(" ")}</span>
      </div>
    </article>
  );
}

function DraggablePanel({
  id,
  span,
  dragging,
  dropTarget,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDrop,
  children,
}) {
  return (
    <article
      onDragEnter={(event) => {
        event.preventDefault();
        onDragEnter();
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      className={[
        span,
        "group relative rounded-lg border bg-white p-5 shadow-sm transition duration-200 hover:shadow-md",
        dropTarget
          ? "border-blue-400 bg-blue-50/40 ring-4 ring-blue-100"
          : "border-slate-200",
        dragging ? "scale-[0.99] opacity-55 shadow-none" : "",
      ].join(" ")}
      data-widget-id={id}
    >
      <DragHandle
        label="Move dashboard panel"
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className="absolute right-3 top-3"
      />
      {children}
    </article>
  );
}

function DragHandle({ label, onDragStart, onDragEnd, className = "" }) {
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={[
        "inline-flex size-8 cursor-grab items-center justify-center rounded-lg border border-transparent text-slate-300 opacity-70 transition hover:border-slate-200 hover:bg-white hover:text-slate-600 active:cursor-grabbing group-hover:opacity-100",
        className,
      ].join(" ")}
      aria-label={label}
      title={label}
    >
      <GripVertical className="size-4" />
    </button>
  );
}

function CardTitle({ title, action }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4 pr-10">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      {action}
    </div>
  );
}

function PatientTrends() {
  const inpatient = [120, 132, 144, 128, 154, 140, 160];
  const outpatient = [310, 290, 340, 380, 410, 395, 430];

  return (
    <div>
      <CardTitle
        title="Patient Trends"
        action={
          <div className="flex items-center gap-5 text-sm text-slate-500">
            <Legend color="bg-blue-600" label="Inpatient" />
            <Legend color="bg-teal-500" label="Outpatient" />
          </div>
        }
      />
      <LineChart
        series={[
          { label: "Inpatient", data: inpatient, color: "#1476d9" },
          { label: "Outpatient", data: outpatient, color: "#23aaa3" },
        ]}
        max={600}
      />
    </div>
  );
}

function RevenueTrend() {
  return (
    <div>
      <CardTitle
        title="Revenue Trend"
        action={
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            +18.2%
          </span>
        }
      />
      <LineChart
        compact
        max={300}
        valueFormatter={(value) => `$${value}k`}
        series={[
          {
            label: "Revenue",
            data: [180, 200, 218, 235, 252, 270, 288],
            color: "#159fe0",
          },
        ]}
      />
    </div>
  );
}

function PatientsByDepartment() {
  const [hoveredDepartment, setHoveredDepartment] = useState(null);
  const progress = useChartLoadProgress();
  const easedProgress = easeOutCubic(progress);
  const departments = [
    ["Cardiology", 85],
    ["Neurology", 62],
    ["Orthopedics", 74],
    ["Pediatrics", 98],
    ["Emergency", 120],
    ["Surgery", 45],
  ];

  return (
    <div>
      <CardTitle title="Patients by Department" />
      <div className="space-y-4">
        {departments.map(([label, value]) => {
          const width = Math.min(100, (value / 125) * 100) * easedProgress;
          return (
            <div
              key={label}
              className="grid grid-cols-[6.5rem_1fr] items-center gap-2"
              onMouseEnter={() => setHoveredDepartment(label)}
              onMouseLeave={() => setHoveredDepartment(null)}
              title={`${label}: ${value} patients`}
            >
              <span className="text-sm text-slate-500">{label}</span>
              <div className="relative h-7 rounded-r-lg bg-slate-50">
                <div
                  className="h-7 rounded-r-lg bg-blue-600 transition-all duration-300"
                  style={{ width: `${width}%` }}
                />
                <span
                  className={[
                    "absolute -top-8 rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold text-white shadow-sm transition",
                    hoveredDepartment === label ? "opacity-100" : "opacity-0",
                  ].join(" ")}
                  style={{ left: `min(calc(${width}% - 1.5rem), calc(100% - 3rem))` }}
                >
                  {Math.round(value * easedProgress)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {progress < 1 && (
        <p className="mt-3 text-right text-xs font-semibold text-slate-400">
          Loading {Math.round(progress * 100)}%
        </p>
      )}
      <div className="mt-3 ml-28 flex justify-between border-t border-slate-200 pt-2 text-xs text-slate-500">
        <span>0</span>
        <span>30</span>
        <span>60</span>
        <span>90</span>
        <span>120</span>
      </div>
    </div>
  );
}

function BedOccupancy() {
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const progress = useChartLoadProgress();
  const easedProgress = easeOutCubic(progress);
  const total = 120;
  const segments = [
    { label: "Occupied", value: 78, color: "#1576d8" },
    { label: "Available", value: 42, color: "#2eb07b" },
  ];
  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  const occupiedLength = circumference * (segments[0].value / total) * easedProgress;
  const availableLength = circumference * (segments[1].value / total) * easedProgress;
  const activeSegment = hoveredSegment ?? { label: "Beds", value: total };
  const activeValue = Math.round(activeSegment.value * easedProgress);

  return (
    <div>
      <CardTitle title="Bed Occupancy" />
      <div className="flex flex-col items-center justify-center">
        <svg viewBox="0 0 220 220" className="h-56 w-56">
          <circle cx="110" cy="110" r={radius} fill="none" stroke="#e8eef6" strokeWidth="24" />
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke={segments[0].color}
            strokeWidth="24"
            strokeDasharray={`${occupiedLength} ${circumference}`}
            strokeLinecap="butt"
            transform="rotate(-90 110 110)"
            className="cursor-pointer transition-opacity hover:opacity-80"
            onMouseEnter={() => setHoveredSegment(segments[0])}
            onMouseLeave={() => setHoveredSegment(null)}
          >
            <title>Occupied: 78 beds</title>
          </circle>
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke={segments[1].color}
            strokeWidth="24"
            strokeDasharray={`${availableLength} ${circumference}`}
            strokeDashoffset={-occupiedLength}
            strokeLinecap="butt"
            transform="rotate(-90 110 110)"
            className="cursor-pointer transition-opacity hover:opacity-80"
            onMouseEnter={() => setHoveredSegment(segments[1])}
            onMouseLeave={() => setHoveredSegment(null)}
          >
            <title>Available: 42 beds</title>
          </circle>
          <text x="110" y="104" textAnchor="middle" fontSize="30" fontWeight="700" fill="#0f172a">
            {activeValue}
          </text>
          <text x="110" y="128" textAnchor="middle" fontSize="13" fill="#64748b">
            {progress < 1 ? `Loading ${Math.round(progress * 100)}%` : activeSegment.label}
          </text>
        </svg>
        <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-600">
          <Legend color="bg-blue-600" label={<span>Occupied: <b className="text-slate-950">78</b></span>} />
          <Legend color="bg-emerald-500" label={<span>Available: <b className="text-slate-950">42</b></span>} />
        </div>
      </div>
    </div>
  );
}

function LiveAlerts() {
  const alerts = [
    {
      icon: AlertTriangle,
      tone: "bg-amber-50 text-amber-600",
      title: "Low pharmacy stock",
      detail: "Amoxicillin 500mg below reorder threshold",
      time: "5m ago",
    },
    {
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-600",
      title: "Lab results approved",
      detail: "Dr. Patel verified 8 results for review",
      time: "22m ago",
    },
    {
      icon: Bell,
      tone: "bg-blue-50 text-blue-600",
      title: "New patient admitted",
      detail: "Sarah Chen - Emergency Ward, Bed E-12",
      time: "1h ago",
    },
    {
      icon: AlertTriangle,
      tone: "bg-rose-50 text-rose-600",
      title: "ICU capacity at 92%",
      detail: "Only 2 beds remain available",
      time: "2h ago",
    },
  ];

  return (
    <div>
      <CardTitle
        title="Live Alerts"
        action={<button className="text-sm font-semibold text-blue-600">View all</button>}
      />
      <div className="space-y-4">
        {alerts.map((alert) => {
          const Icon = alert.icon;
          return (
            <div key={alert.title} className="flex gap-3 rounded-lg p-1 transition hover:bg-slate-50">
              <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg ${alert.tone}`}>
                <Icon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-950">{alert.title}</p>
                <p className="mt-1 text-sm text-slate-500">{alert.detail}</p>
                <p className="mt-1 text-xs text-slate-500">{alert.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function matchesDashboardSearch(values, search) {
  const normalized = String(search ?? "").trim().toLowerCase();
  if (!normalized) return true;

  return values
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function NoDashboardMatches({ message = "No matches found." }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  );
}

function RecentPatients({ search }) {
  const patients = [
    ["MG", "Maria Garcia", "Cardiology", "Age 34", "Admitted", "2h ago"],
    ["JW", "James Wilson", "Neurology", "Age 56", "Discharged", "3h ago"],
    ["SC", "Sarah Chen", "Emergency", "Age 28", "In Treatment", "45m ago"],
    ["RK", "Robert Kim", "Orthopedics", "Age 71", "Admitted", "5h ago"],
    ["ED", "Emily Davis", "Pediatrics", "Age 42", "Waiting", "15m ago"],
  ];
  const filteredPatients = patients.filter((patient) =>
    matchesDashboardSearch(patient, search)
  );

  return (
    <div>
      <CardTitle
        title="Recent Patients"
        action={<button className="text-sm font-semibold text-blue-600">View all</button>}
      />
      {filteredPatients.length === 0 ? (
        <NoDashboardMatches message="No recent patients match your search." />
      ) : (
      <div className="divide-y divide-slate-200">
        {filteredPatients.map(([initials, name, department, age, status, time]) => (
          <div key={name} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <div className="flex items-center gap-4">
              <span className="flex size-10 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                {initials}
              </span>
              <div>
                <p className="font-semibold text-slate-950">{name}</p>
                <p className="text-sm text-slate-500">{department} - {age}</p>
              </div>
            </div>
            <StatusPill status={status} />
            <span className="flex items-center gap-1.5 text-sm text-slate-500">
              <Clock3 className="size-4" />
              {time}
            </span>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

function TodaysSchedule({ search }) {
  const schedule = [
    ["Follow-up", "Anna Thompson", "Dr. Patel", "09:00 AM"],
    ["Consultation", "Michael Brown", "Dr. Lee", "09:30 AM"],
    ["Check-up", "Lisa Wang", "Dr. Moreno", "10:00 AM"],
    ["Surgery Prep", "David Johnson", "Dr. Patel", "10:30 AM"],
  ];
  const filteredSchedule = schedule.filter((item) =>
    matchesDashboardSearch(item, search)
  );

  return (
    <div>
      <CardTitle
        title="Today's Schedule"
        action={<button className="text-sm font-semibold text-blue-600">View</button>}
      />
      {filteredSchedule.length === 0 ? (
        <NoDashboardMatches message="No appointments match your search." />
      ) : (
      <div className="space-y-3">
        {filteredSchedule.map(([type, name, doctor, time]) => (
          <div key={`${name}-${time}`} className="rounded-lg border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/30">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {type}
                </span>
                <p className="mt-3 font-semibold text-slate-950">{name}</p>
                <p className="mt-1 text-sm text-slate-500">{doctor}</p>
              </div>
              <p className="font-semibold text-blue-600">{time}</p>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

function BedAvailability() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <span className="inline-flex size-14 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <BedDouble className="size-6" />
        </span>
        <div>
          <p className="text-lg font-semibold text-slate-950">
            Bed availability - 42 of 120
          </p>
          <p className="mt-1 text-sm text-slate-500">
            ICU at 92% - Emergency at 78% - General Ward at 64%
          </p>
        </div>
      </div>
      <button className="self-start text-sm font-semibold text-blue-600 sm:self-auto">
        Manage beds
      </button>
    </div>
  );
}

function LineChart({ series, max, compact = false, valueFormatter = (value) => value.toLocaleString() }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const progress = useChartLoadProgress();
  const easedProgress = easeOutCubic(progress);
  const width = compact ? 420 : 860;
  const height = compact ? 270 : 300;
  const padding = { top: 14, right: 18, bottom: 32, left: 44 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const ticks = compact ? [0, 75, 150, 225, 300] : [0, 150, 300, 450, 600];
  const count = series[0]?.data.length ?? months.length;

  const pointFor = (value, index) => {
    const divisor = Math.max(count - 1, 1);
    const x = padding.left + (innerWidth / divisor) * index;
    const y = padding.top + innerHeight - (value / max) * innerHeight;
    return [x, y];
  };

  const hoverX = hoverIndex === null ? null : pointFor(0, hoverIndex)[0];
  const tooltipWidth = series.length > 1 ? 170 : 140;
  const tooltipHeight = 30 + series.length * 18;
  const tooltipX =
    hoverX === null
      ? 0
      : Math.min(
          Math.max(hoverX + 12, padding.left),
          width - padding.right - tooltipWidth
        );
  const tooltipY = padding.top + 8;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" onMouseLeave={() => setHoverIndex(null)}>
      {ticks.map((tick) => {
        const y = padding.top + innerHeight - (tick / max) * innerHeight;
        return (
          <g key={tick}>
            <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#dbe5f0" strokeDasharray="4 4" />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="13" fill="#64748b">
              {tick}
            </text>
          </g>
        );
      })}
      {months.map((month, index) => {
        const x = padding.left + (innerWidth / (months.length - 1)) * index;
        return (
          <g key={month}>
            <line x1={x} x2={x} y1={padding.top} y2={height - padding.bottom} stroke="#dbe5f0" strokeDasharray="4 4" />
            <text x={x} y={height - 10} textAnchor="middle" fontSize="13" fill="#64748b">
              {month}
            </text>
          </g>
        );
      })}
      <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} stroke="#64748b" />
      <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} stroke="#64748b" />
      {series.map((line) => {
        const points = line.data.map((value, index) => pointFor(value * easedProgress, index));
        const path = points.map(([x, y]) => `${x},${y}`).join(" ");
        return (
          <g key={line.color}>
            <polyline points={path} fill="none" stroke={line.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {points.map(([x, y], index) => (
              <circle
                key={`${line.color}-${index}`}
                cx={x}
                cy={y}
                r={hoverIndex === index ? 5 : compact ? 4 : 0}
                fill={line.color}
                className="transition-all"
              />
            ))}
          </g>
        );
      })}
      {months.map((month, index) => {
        const [x] = pointFor(0, index);
        const band = innerWidth / Math.max(months.length - 1, 1);
        const rectX = index === 0 ? padding.left : x - band / 2;
        const rectWidth = index === 0 || index === months.length - 1 ? band / 2 : band;
        return (
          <rect
            key={`hit-${month}`}
            x={rectX}
            y={padding.top}
            width={rectWidth}
            height={innerHeight}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(index)}
            onMouseMove={() => setHoverIndex(index)}
          />
        );
      })}
      {hoverIndex !== null && (
        <g pointerEvents="none">
          <line x1={hoverX} x2={hoverX} y1={padding.top} y2={height - padding.bottom} stroke="#0f172a" strokeOpacity="0.2" />
          {series.map((line) => {
            const [x, y] = pointFor(line.data[hoverIndex] * easedProgress, hoverIndex);
            return (
              <circle key={`hover-${line.color}`} cx={x} cy={y} r="6" fill="#fff" stroke={line.color} strokeWidth="3" />
            );
          })}
          <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx="8" fill="#0f172a" opacity="0.95" />
          <text x={tooltipX + 12} y={tooltipY + 20} fontSize="12" fontWeight="700" fill="#fff">
            {months[hoverIndex]}
          </text>
          {series.map((line, index) => (
            <text
              key={`tooltip-${line.color}`}
              x={tooltipX + 12}
              y={tooltipY + 40 + index * 18}
              fontSize="12"
              fill="#e2e8f0"
            >
              {line.label}: {valueFormatter(line.data[hoverIndex], line)}
            </text>
          ))}
        </g>
      )}
      {progress < 1 && (
        <g pointerEvents="none">
          <rect
            x={width - padding.right - 106}
            y={padding.top + 2}
            width="96"
            height="26"
            rx="8"
            fill="#f8fafc"
            stroke="#dbe5f0"
          />
          <text
            x={width - padding.right - 58}
            y={padding.top + 19}
            textAnchor="middle"
            fontSize="12"
            fontWeight="700"
            fill="#64748b"
          >
            Loading {Math.round(progress * 100)}%
          </text>
        </g>
      )}
    </svg>
  );
}

function Legend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`size-3 rounded-full ${color}`} />
      <span>{label}</span>
    </span>
  );
}

function StatusPill({ status }) {
  const classes = {
    Admitted: "border-blue-200 bg-blue-50 text-blue-700",
    Discharged: "border-emerald-200 bg-emerald-50 text-emerald-700",
    "In Treatment": "border-amber-200 bg-amber-50 text-amber-700",
    Waiting: "border-slate-200 bg-slate-100 text-slate-600",
  };

  return (
    <span className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${classes[status]}`}>
      {status}
    </span>
  );
}

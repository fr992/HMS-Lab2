import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Activity,
  ArrowUpRight,
  BedDouble,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  DollarSign,
  FlaskConical,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "@/api/apiClient";
import { useAuth } from "@/auth/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPagedItems, getTotalCount, keyOf } from "@/features/dashboard/dashboardUtils";
import { useDashboardRealtime } from "@/features/dashboard/useDashboardRealtime";
import { useTopBarSearch } from "@/layouts/TopBarSearchContext";
import { useNavigate } from "react-router-dom";

const tooltipStyle = {
  borderRadius: "8px",
  border: "1px solid rgb(226 232 240)",
  background: "white",
  boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
  fontSize: "12px",
};

const statusColor = {
  Admitted: "bg-blue-50 text-blue-700 border-blue-200",
  Discharged: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "In Treatment": "bg-amber-50 text-amber-700 border-amber-200",
  Waiting: "bg-slate-100 text-slate-600 border-slate-200",
};

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

function EmptyChart({ label = "No chart data available yet." }) {
  return (
    <div className="flex h-60 w-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm font-medium text-slate-500">
      {label}
    </div>
  );
}

function EmptyPanel({ label }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-500">
      {label}
    </div>
  );
}

function hasAnyValue(items, keys) {
  return items.some((item) =>
    keys.some((key) => Number(item?.[key] ?? 0) > 0)
  );
}

function normalizeSearch(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function dashboardMatches(search, values) {
  const term = normalizeSearch(search);
  if (!term) return true;

  return values
    .filter((value) => value !== null && value !== undefined && value !== "")
    .some((value) => normalizeSearch(value).includes(term));
}

function StatCard({ stat, loading }) {
  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
        </div>
        <Skeleton className="mt-2 h-3 w-2/3" />
      </div>
    );
  }

  const Icon = stat.icon;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-500">
            {stat.label}
          </p>
          <p className="mt-1 truncate text-xl font-bold text-slate-950">{stat.value}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${stat.color}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1">
        {stat.trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-600" />}
        {stat.trend === "down" && <TrendingDown className="h-3 w-3 text-rose-600" />}
        {stat.trend === "neutral" && <Activity className="h-3 w-3 text-emerald-600" />}
        <span
          className={`text-[11px] font-medium ${
            stat.trend === "down" ? "text-rose-600" : "text-emerald-600"
          }`}
        >
          {stat.change}
        </span>
        {stat.trend !== "neutral" && (
          <span className="truncate text-[11px] text-slate-500">vs last</span>
        )}
      </div>
    </div>
  );
}

async function getData(url, fallback, options = {}) {
  if (options.enabled === false) return fallback;

  try {
    const { data } = await api.get(url, {
      timeout: 8000,
      ...(options.config ?? {}),
    });
    return data ?? fallback;
  } catch {
    return fallback;
  }
}

function getList(data) {
  if (Array.isArray(data)) return data;
  return getPagedItems(data);
}

function numberOr(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatCompactCurrency(value) {
  const amount = numberOr(value);
  if (amount >= 1000) return `$${Math.round(amount / 1000)}k`;
  return `$${Math.round(amount).toLocaleString()}`;
}

function formatDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

function lastSixMonths() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
    return {
      key: `${date.getUTCFullYear()}-${date.getUTCMonth()}`,
      month: date.toLocaleString(undefined, { month: "short" }),
    };
  });
}

function buildPatientTrendFallback(patients) {
  const months = lastSixMonths();
  return months.map((month) => ({
    month: month.month,
    inpatient: 0,
    outpatient: patients.filter((patient) => formatDateKey(patient.createdAt) === month.key).length,
  }));
}

function buildRevenueFallback(invoices, payments = []) {
  const months = lastSixMonths();
  const paidPayments = payments.filter((payment) => keyOf(payment.status) === "paid");
  const hasPaidPayments = paidPayments.length > 0;

  return months.map((month) => ({
    month: month.month,
    revenue: Math.round(
      (hasPaidPayments
        ? paidPayments
            .filter((payment) => formatDateKey(payment.paidAt ?? payment.updatedAt ?? payment.createdAt) === month.key)
            .reduce((sum, payment) => sum + numberOr(payment.amount), 0)
        : invoices
            .filter((invoice) => formatDateKey(invoice.issuedAt ?? invoice.createdAt) === month.key)
            .reduce((sum, invoice) => sum + numberOr(invoice.totalAmount), 0)) / 1000
    ),
  }));
}

function buildDepartmentFallback(appointments) {
  const counts = appointments.reduce((map, appointment) => {
    const name = appointment.departmentName || "Unassigned";
    map.set(name, (map.get(name) ?? 0) + 1);
    return map;
  }, new Map());

  return Array.from(counts, ([name, patients]) => ({ name, patients }))
    .sort((a, b) => b.patients - a.patients)
    .slice(0, 8);
}

function buildBedOccupancyFallback(beds) {
  const activeBeds = beds.filter((bed) => bed.isActive !== false);
  const occupied = activeBeds.filter((bed) =>
    keyOf(bed.status || bed.occupancyStatus) === "occupied" || Boolean(bed.currentAssignment)
  ).length;
  const total = activeBeds.length;

  return {
    occupied,
    available: Math.max(total - occupied, 0),
    total,
    icu: wardOccupancy(activeBeds, "icu"),
    emergency: wardOccupancy(activeBeds, "emergency"),
    general: wardOccupancy(activeBeds, "general"),
  };
}

function wardOccupancy(beds, ward) {
  const matching = beds.filter((bed) =>
    String(bed.ward ?? "").toLowerCase().includes(ward)
  );
  if (matching.length === 0) return 0;

  const occupied = matching.filter((bed) =>
    keyOf(bed.status || bed.occupancyStatus) === "occupied" || Boolean(bed.currentAssignment)
  ).length;
  return Math.round((occupied / matching.length) * 100);
}

function getPatientName(patient) {
  return patient.name || [patient.firstName, patient.lastName].filter(Boolean).join(" ") || "Patient";
}

function getInitials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
}

function getAge(value) {
  if (!value) return null;
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age;
}

function relativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function appointmentIsUpcoming(appointment) {
  const date = new Date(appointment.scheduledStart);
  if (Number.isNaN(date.getTime()) || date < new Date()) return false;
  return keyOf(appointment.status) !== "cancelled";
}

export default function AdminOverviewDashboard() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { search: topBarSearch } = useTopBarSearch();
  const [stats, setStats] = useState([]);
  const [patientData, setPatientData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [bedOccupancy, setBedOccupancy] = useState({
    occupied: 0,
    available: 0,
    total: 0,
    icu: 0,
    emergency: 0,
    general: 0,
  });
  const [recentPatients, setRecentPatients] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingApts, setLoadingApts] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [liveRefreshTick, setLiveRefreshTick] = useState(0);

  useDashboardRealtime(() => {
    setLiveRefreshTick((tick) => tick + 1);
  });

  const canReadPatients = auth.hasPermission("Patients.Read");
  const canReadAppointments = auth.hasPermission("Appointments.Read");
  const canReadUsers = auth.hasPermission("Users.Read");
  const canReadLabRequests = auth.hasPermission("LabRequests.Read");
  const canReadInvoices = auth.hasPermission("Invoices.Read");
  const canReadPayments = auth.hasPermission("Payments.Read");
  const canReadRevenue = canReadPayments || canReadInvoices;
  const canReadNurseTasks = auth.hasPermission("NurseTasks.Read");
  const canReadBeds = auth.hasPermission("Beds.Read");

  const loadStats = useCallback(async () => {
    setLoadingStats(true);

    try {
      const [
        patientStats,
        appointmentStats,
        doctorStats,
        labStats,
        revenueStats,
        taskStats,
        patientListRaw,
        appointmentListRaw,
        doctorListRaw,
        labListRaw,
        invoiceListRaw,
        taskListRaw,
      ] = await Promise.all([
        getData("/dashboard/stats/patients", {}, { enabled: canReadPatients }),
        getData("/dashboard/stats/appointments/today", {}, { enabled: canReadAppointments }),
        getData("/dashboard/stats/doctors/active", {}, { enabled: canReadUsers }),
        getData("/dashboard/stats/lab/pending", {}, { enabled: canReadLabRequests }),
        getData("/dashboard/stats/revenue/mtd", {}, { enabled: canReadPayments }),
        getData("/dashboard/stats/nurse-tasks/open", {}, { enabled: canReadNurseTasks }),
        getData("/patients", [], {
          enabled: canReadPatients,
          config: { params: { page: 1, pageSize: 25 } },
        }),
        getData("/receptionist/appointments", [], {
          enabled: canReadAppointments,
          config: { params: { from: new Date().toISOString(), page: 1, pageSize: 25 } },
        }),
        getData("/doctors", [], { enabled: canReadUsers }),
        getData("/lab/requests", [], {
          enabled: canReadLabRequests,
          config: { params: { page: 1, pageSize: 100 } },
        }),
        getData("/invoices", [], {
          enabled: canReadInvoices,
          config: { params: { page: 1, pageSize: 100 } },
        }),
        getData("/nurse-tasks/my", [], { enabled: canReadNurseTasks }),
      ]);

      const patients = getList(patientListRaw);
      const appointments = getList(appointmentListRaw);
      const doctors = getList(doctorListRaw);
      const labRequests = getList(labListRaw);
      const invoices = getList(invoiceListRaw);
      const tasks = getList(taskListRaw);
      const today = new Date().toDateString();
      const todayAppointments = appointments.filter((appointment) => {
        const date = new Date(appointment.scheduledStart);
        return !Number.isNaN(date.getTime()) && date.toDateString() === today;
      });
      const pendingLabItems = labRequests.filter((item) =>
        !["completed", "cancelled"].includes(keyOf(item.status))
      );
      const paidStatuses = new Set(["paid", "partiallypaid", "partially_paid"]);
      const revenueMtd = invoices
        .filter((invoice) => paidStatuses.has(keyOf(invoice.status)))
        .reduce((sum, invoice) => sum + numberOr(invoice.totalAmount), 0);
      const openTasks = tasks.filter((task) =>
        !["completed", "cancelled"].includes(keyOf(task.status))
      );

      setStats([
        canReadPatients && {
          label: "Total Patients",
          value: numberOr(patientStats.total, getTotalCount(patientListRaw) || patients.length).toLocaleString(),
          change: patientStats.change ?? "Current",
          trend: patientStats.trend ?? "neutral",
          icon: Users,
          color: "bg-blue-50 text-blue-700",
        },
        canReadAppointments && {
          label: "Today's Appointments",
          value: numberOr(appointmentStats.count, todayAppointments.length).toString(),
          change: appointmentStats.change ?? "Scheduled",
          trend: appointmentStats.trend ?? "neutral",
          icon: CalendarDays,
          color: "bg-cyan-50 text-cyan-700",
        },
        canReadUsers && {
          label: "Active Doctors",
          value: numberOr(doctorStats.count, doctors.filter((doctor) => doctor.isActive !== false).length).toString(),
          change: doctorStats.label ?? "On duty",
          trend: "neutral",
          icon: UserCheck,
          color: "bg-emerald-50 text-emerald-700",
        },
        canReadLabRequests && {
          label: "Pending Lab Results",
          value: numberOr(labStats.count, pendingLabItems.length).toString(),
          change: labStats.change ?? "Open",
          trend: labStats.trend ?? "neutral",
          icon: FlaskConical,
          color: "bg-amber-50 text-amber-700",
        },
        canReadRevenue && {
          label: "Revenue (MTD)",
          value: revenueStats.formatted ?? formatCompactCurrency(revenueMtd),
          change: revenueStats.change ?? "Current",
          trend: revenueStats.trend ?? "neutral",
          icon: DollarSign,
          color: "bg-sky-50 text-sky-700",
        },
        canReadNurseTasks && {
          label: "Open Nurse Tasks",
          value: numberOr(taskStats.count, openTasks.length).toString(),
          change: taskStats.change ?? "Open",
          trend: taskStats.trend ?? "neutral",
          icon: ClipboardList,
          color: "bg-rose-50 text-rose-700",
        },
      ].filter(Boolean));
    } catch {
      setStats([]);
    } finally {
      setLoadingStats(false);
    }
  }, [
    canReadAppointments,
    canReadInvoices,
    canReadPayments,
    canReadRevenue,
    canReadLabRequests,
    canReadNurseTasks,
    canReadPatients,
    canReadUsers,
  ]);

  useEffect(() => {
    void loadStats();
  }, [loadStats, liveRefreshTick]);

  useEffect(() => {
    async function fetchCharts() {
      const [patChart, revChart, deptChart, beds, patientListRaw, invoiceListRaw, paymentListRaw, appointmentListRaw, bedListRaw] = await Promise.all([
        getData("/dashboard/charts/patient-trends", [], { enabled: canReadPatients }),
        getData("/dashboard/charts/revenue", [], { enabled: canReadPayments }),
        getData("/dashboard/charts/departments", [], { enabled: canReadPatients }),
        getData("/dashboard/beds/occupancy", {}, { enabled: canReadBeds }),
        getData("/patients", [], {
          enabled: canReadPatients,
          config: { params: { page: 1, pageSize: 100 } },
        }),
        getData("/invoices", [], {
          enabled: canReadInvoices,
          config: { params: { page: 1, pageSize: 100 } },
        }),
        getData("/payments", [], {
          enabled: canReadPayments,
          config: { params: { page: 1, pageSize: 100 } },
        }),
        getData("/receptionist/appointments", [], {
          enabled: canReadAppointments,
          config: { params: { from: new Date().toISOString(), page: 1, pageSize: 100 } },
        }),
        getData("/beds", [], { enabled: canReadBeds }),
      ]);

      const patients = getList(patientListRaw);
      const invoices = getList(invoiceListRaw);
      const payments = getList(paymentListRaw);
      const appointments = getList(appointmentListRaw);
      const bedList = getList(bedListRaw);
      const primaryPatientChart = Array.isArray(patChart) ? patChart : [];
      const primaryRevenueChart = Array.isArray(revChart) ? revChart : [];
      const primaryDepartmentChart = Array.isArray(deptChart) ? deptChart : [];
      const fallbackBeds = buildBedOccupancyFallback(bedList);
      const primaryBeds = {
        occupied: beds.occupied ?? 0,
        available: beds.available ?? 0,
        total: beds.total ?? 0,
        icu: beds.icu_pct ?? beds.icuPct ?? 0,
        emergency: beds.emergency_pct ?? beds.emergencyPct ?? 0,
        general: beds.general_pct ?? beds.generalPct ?? 0,
      };

      setPatientData(
        hasAnyValue(primaryPatientChart, ["inpatient", "outpatient"])
          ? primaryPatientChart
          : buildPatientTrendFallback(patients)
      );
      setRevenueData(
        hasAnyValue(primaryRevenueChart, ["revenue"])
          ? primaryRevenueChart
          : buildRevenueFallback(invoices, payments)
      );
      setDepartmentData(
        hasAnyValue(primaryDepartmentChart, ["patients"])
          ? primaryDepartmentChart
          : buildDepartmentFallback(appointments)
      );
      setBedOccupancy(primaryBeds.total > 0 ? primaryBeds : fallbackBeds);
      setLoadingCharts(false);
    }

    void fetchCharts();
  }, [canReadAppointments, canReadBeds, canReadInvoices, canReadPatients, canReadPayments, liveRefreshTick]);

  useEffect(() => {
    async function fetchPatients() {
      const [data, patientListRaw] = await Promise.all([
        getData("/dashboard/patients/recent?limit=5", [], { enabled: canReadPatients }),
        getData("/patients", [], {
          enabled: canReadPatients,
          config: { params: { page: 1, pageSize: 5 } },
        }),
      ]);
      const recent = Array.isArray(data) ? data : [];
      const fallback = getList(patientListRaw)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map((patient) => ({
          name: getPatientName(patient),
          age: getAge(patient.dateOfBirth),
          department: patient.departmentName || patient.primaryDoctorName || "Unassigned",
          status: "Waiting",
          time: relativeTime(patient.createdAt),
        }));

      setRecentPatients(recent.length > 0 ? recent : fallback);
      setLoadingPatients(false);
    }

    void fetchPatients();
  }, [canReadPatients, liveRefreshTick]);

  useEffect(() => {
    async function fetchAppointments() {
      const [data, appointmentListRaw] = await Promise.all([
        getData("/dashboard/appointments/upcoming?limit=4", [], { enabled: canReadAppointments }),
        getData("/receptionist/appointments", [], {
          enabled: canReadAppointments,
          config: { params: { from: new Date().toISOString(), page: 1, pageSize: 4 } },
        }),
      ]);
      const upcoming = Array.isArray(data) ? data : [];
      const fallback = getList(appointmentListRaw)
        .filter(appointmentIsUpcoming)
        .sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart))
        .slice(0, 4)
        .map((appointment) => ({
          patient: appointment.patientName || "Patient",
          doctor: appointment.doctorName || "Doctor",
          time: formatTime(appointment.scheduledStart),
          type: appointment.appointmentType || "Appointment",
        }));

      setUpcomingAppointments(upcoming.length > 0 ? upcoming : fallback);
      setLoadingApts(false);
    }

    void fetchAppointments();
  }, [canReadAppointments, liveRefreshTick]);

  useEffect(() => {
    async function fetchAlerts() {
      const iconMap = {
        warning: { icon: AlertTriangle, color: "text-amber-700 bg-amber-50" },
        success: { icon: CheckCircle2, color: "text-emerald-700 bg-emerald-50" },
        error: { icon: AlertTriangle, color: "text-rose-700 bg-rose-50" },
        info: { icon: Bell, color: "text-blue-700 bg-blue-50" },
      };
      const raw = await getData("/dashboard/alerts?limit=4", []);
      setNotifications(
        (Array.isArray(raw) ? raw : []).map((n) => ({
          ...n,
          ...(iconMap[n.type] ?? iconMap.info),
        }))
      );
      setLoadingAlerts(false);
    }

    void fetchAlerts();
  }, [liveRefreshTick]);

  const pieData = [
    { name: "Occupied", value: bedOccupancy.occupied, color: "#2563eb" },
    { name: "Available", value: bedOccupancy.available, color: "#10b981" },
  ];
  const revenueStart = revenueData[0]?.revenue || 0;
  const revenueEnd = revenueData.at(-1)?.revenue || 0;
  const revenueChange = revenueStart > 0 ? (((revenueEnd - revenueStart) / revenueStart) * 100).toFixed(1) : "-";
  const isSearching = normalizeSearch(topBarSearch).length > 0;
  const filteredStats = useMemo(
    () =>
      stats.filter((stat) =>
        dashboardMatches(topBarSearch, [stat.label, stat.value, stat.change])
      ),
    [stats, topBarSearch]
  );
  const filteredDepartmentData = useMemo(
    () => departmentData.filter((item) => dashboardMatches(topBarSearch, [item.name, item.patients])),
    [departmentData, topBarSearch]
  );
  const filteredRecentPatients = useMemo(
    () =>
      recentPatients.filter((patient) =>
        dashboardMatches(topBarSearch, [
          patient.name,
          patient.department,
          patient.status,
          patient.age,
          patient.time,
        ])
      ),
    [recentPatients, topBarSearch]
  );
  const filteredUpcomingAppointments = useMemo(
    () =>
      upcomingAppointments.filter((appointment) =>
        dashboardMatches(topBarSearch, [
          appointment.patient,
          appointment.doctor,
          appointment.type,
          appointment.time,
        ])
      ),
    [topBarSearch, upcomingAppointments]
  );
  const filteredNotifications = useMemo(
    () =>
      notifications.filter((notification) =>
        dashboardMatches(topBarSearch, [
          notification.title,
          notification.desc,
          notification.message,
          notification.type,
          notification.time,
        ])
      ),
    [notifications, topBarSearch]
  );
  const hasPatientTrendData = hasAnyValue(patientData, ["inpatient", "outpatient"]);
  const hasRevenueData = hasAnyValue(revenueData, ["revenue"]);
  const hasDepartmentData = hasAnyValue(filteredDepartmentData, ["patients"]);
  const hasBedData = bedOccupancy.total > 0 || pieData.some((item) => item.value > 0);

  return (
    <div className="scrollbar-none flex-1 space-y-6 overflow-visible p-4 sm:p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {loadingStats
          ? Array.from({ length: 6 }).map((_, i) => <StatCard key={i} loading />)
          : filteredStats.length > 0
            ? filteredStats.map((stat) => <StatCard key={stat.label} stat={stat} />)
            : (
                <div className="col-span-full">
                  <EmptyPanel label={isSearching ? "No dashboard metrics match your search." : "No dashboard metrics are available for this role."} />
                </div>
              )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="animate-fade-in lg:col-span-2 rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-sm font-semibold">Patient Trends</CardTitle>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Inpatient
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" /> Outpatient
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingCharts ? (
              <Skeleton className="h-60 w-full" />
            ) : !hasPatientTrendData ? (
              <EmptyChart label="No patient trend data yet." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={patientData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="outpatient" stroke="#06b6d4" fill="#cffafe" strokeWidth={2} />
                  <Area type="monotone" dataKey="inpatient" stroke="#2563eb" fill="#dbeafe" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-in rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Revenue Trend</CardTitle>
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <TrendingUp className="h-2.5 w-2.5" />
                {revenueChange === "-" ? "-" : `${Number(revenueChange) >= 0 ? "+" : ""}${revenueChange}%`}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loadingCharts ? (
              <Skeleton className="h-60 w-full" />
            ) : !hasRevenueData ? (
              <EmptyChart label="No revenue trend data yet." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`$${v}k`, "Revenue"]} />
                  <Line type="monotone" dataKey="revenue" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3, fill: "#0284c7" }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="animate-fade-in rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Patients by Department</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCharts ? (
              <Skeleton className="h-60 w-full" />
            ) : !hasDepartmentData ? (
              <EmptyChart label={isSearching ? "No departments match your search." : "No department patient data yet."} />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={filteredDepartmentData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#64748b" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="#64748b" width={75} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="patients" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-in rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Bed Occupancy</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {loadingCharts ? (
              <>
                <Skeleton className="h-45 w-full rounded-full" />
                <Skeleton className="mt-4 h-4 w-48" />
              </>
            ) : !hasBedData ? (
              <EmptyChart label="No bed occupancy data yet." />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                      {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-2">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-500">
                        {item.name}: <strong className="text-slate-950">{item.value}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-in rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Live Alerts</CardTitle>
              <button
                type="button"
                onClick={() => navigate("/admin/staff-overview")}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                View all
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingAlerts
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-2.5 w-1/3" />
                    </div>
                  </div>
                ))
              : filteredNotifications.length === 0 ? (
                  <EmptyPanel label={isSearching ? "No live alerts match your search." : "No live alerts right now."} />
                ) : filteredNotifications.map((n, i) => {
                  const Icon = n.icon;
                  return (
                    <div key={`${n.title}-${i}`} className="flex gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${n.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-950">{n.title}</p>
                        <p className="line-clamp-1 text-[11px] text-slate-500">{n.desc}</p>
                        <p className="mt-0.5 text-[10px] text-slate-500">{n.time}</p>
                      </div>
                    </div>
                  );
                })}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="animate-fade-in rounded-lg border-slate-200 bg-white shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Patients</CardTitle>
              <button  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-900 hover:cursor-pointer" onClick={() => navigate("/patients")}>
                View All <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loadingPatients
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-slate-200 py-2 last:border-0">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                  ))
                : filteredRecentPatients.length === 0 ? (
                    <EmptyPanel label={isSearching ? "No recent patients match your search." : "No recent patients found."} />
                  ) : filteredRecentPatients.map((p, i) => (
                    <div key={`${p.name}-${i}`} className="grid gap-3 border-b border-slate-200 py-2 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                          {getInitials(p.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-950">{p.name}</p>
                          <p className="truncate text-xs text-slate-500">{p.department} - Age {p.age ?? "-"}</p>
                        </div>
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
                        <Badge variant="outline" className={`text-[10px] font-medium ${statusColor[p.status] ?? ""}`}>{p.status}</Badge>
                        <span className="hidden items-center gap-1 text-xs text-slate-500 sm:flex">
                          <Clock className="h-3 w-3" /> {p.time}
                        </span>
                      </div>
                    </div>
                  ))}
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Today's Schedule</CardTitle>
              <button  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-900 hover:cursor-pointer" onClick={() => navigate("/appointments")}>
                View <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingApts
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2 rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-20 rounded-full" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              : filteredUpcomingAppointments.length === 0 ? (
                  <EmptyPanel label={isSearching ? "No upcoming appointments match your search." : "No upcoming appointments found."} />
                ) : filteredUpcomingAppointments.map((apt, i) => (
                  <div key={`${apt.patient}-${i}`} className="rounded-lg border border-slate-200 p-3 transition-shadow hover:shadow-sm">
                    <div className="mb-1.5 flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px]">{apt.type}</Badge>
                      <span className="text-xs font-semibold text-blue-600">{apt.time}</span>
                    </div>
                    <p className="truncate text-sm font-medium text-slate-950">{apt.patient}</p>
                    <p className="truncate text-[11px] text-slate-500">{apt.doctor}</p>
                  </div>
                ))}
          </CardContent>
        </Card>
      </div>

      <Card className="animate-fade-in rounded-lg border-slate-200 bg-white shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-50">
              <BedDouble className="h-5 w-5 text-amber-700" />
            </div>
            <div className="min-w-0">
              {loadingCharts ? (
                <>
                  <Skeleton className="mb-1 h-4 w-48" />
                  <Skeleton className="h-3 w-72" />
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-950">
                    Bed availability - {bedOccupancy.available} of {bedOccupancy.total}
                  </p>
                  <p className="text-xs text-slate-500">
                    ICU at {bedOccupancy.icu}% - Emergency at {bedOccupancy.emergency}% - General Ward at {bedOccupancy.general}%
                  </p>
                </>
              )}
            </div>
          </div>
          <button className="flex shrink-0 items-center gap-1 self-start text-xs font-medium text-blue-600 hover:cursor-pointer hover:text-blue-900 sm:self-auto" onClick={() => navigate("/bed-management")}>
            Manage Beds <ArrowUpRight className="h-3 w-3" />
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

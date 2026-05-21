import { BedDouble, CheckCircle2, UserRound, Wrench } from "lucide-react";

export const BED_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "Available", label: "Available" },
  { value: "Occupied", label: "Occupied" },
  { value: "Inactive", label: "Maintenance" },
];

export const EMPTY_BED_FORM = {
  ward: "",
  roomNumber: "",
  bedNumber: "",
  floor: "",
  departmentId: "none",
  isActive: true,
  notes: "",
};

export function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function titleCase(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function bedLocation(bed) {
  return [bed?.departmentName || bed?.ward, bed?.roomNumber, bed?.bedNumber]
    .filter(Boolean)
    .join(" / ");
}

export function statusMeta(status, isActive = true) {
  const key = isActive === false ? "inactive" : normalize(status);

  if (key === "available") {
    return {
      label: "Available",
      icon: CheckCircle2,
      badge: "bg-emerald-50 text-emerald-800 ring-emerald-200",
      tone: "bg-emerald-50 text-emerald-600",
    };
  }

  if (key === "occupied") {
    return {
      label: "Occupied",
      icon: UserRound,
      badge: "bg-blue-50 text-blue-800 ring-blue-200",
      tone: "bg-blue-50 text-blue-600",
    };
  }

  if (key === "inactive" || key === "maintenance") {
    return {
      label: "Maintenance",
      icon: Wrench,
      badge: "bg-amber-50 text-amber-900 ring-amber-200",
      tone: "bg-amber-50 text-amber-600",
    };
  }

  return {
    label: titleCase(status) || "Unknown",
    icon: BedDouble,
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    tone: "bg-slate-100 text-slate-600",
  };
}

export function mapBedToForm(bed) {
  return {
    ward: bed?.ward || "",
    roomNumber: bed?.roomNumber || "",
    bedNumber: bed?.bedNumber || "",
    floor: bed?.floor || "",
    departmentId: bed?.departmentId ? String(bed.departmentId) : "none",
    isActive: bed?.isActive ?? true,
    notes: bed?.notes || "",
  };
}

export function buildBedPayload(form, includeActive = false) {
  const payload = {
    ward: form.ward.trim(),
    roomNumber: form.roomNumber.trim(),
    bedNumber: form.bedNumber.trim(),
    floor: form.floor.trim() || null,
    departmentId: form.departmentId === "none" ? null : Number(form.departmentId),
    notes: form.notes.trim() || null,
  };

  if (includeActive) payload.isActive = Boolean(form.isActive);

  return payload;
}

export function getBedStats(beds) {
  const occupied = beds.filter((bed) => normalize(bed.status) === "occupied").length;
  const available = beds.filter((bed) => normalize(bed.status) === "available").length;
  const maintenance = beds.filter((bed) =>
    ["inactive", "maintenance"].includes(normalize(bed.status)) || bed.isActive === false
  ).length;

  return [
    { label: "Total Beds", value: beds.length, icon: BedDouble, tone: "bg-blue-50 text-blue-600" },
    { label: "Occupied", value: occupied, icon: UserRound, tone: "bg-sky-50 text-sky-600" },
    { label: "Available", value: available, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" },
    { label: "Maintenance", value: maintenance, icon: Wrench, tone: "bg-amber-50 text-amber-600" },
  ];
}

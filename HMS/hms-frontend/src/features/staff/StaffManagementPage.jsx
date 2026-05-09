import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Beaker,
  BriefcaseMedical,
  Eye,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  UserCheck,
  UserRound,
  UserX,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import {
  createDoctorStaff,
  createNurseStaff,
  createStaffUser,
  fetchDepartments,
  fetchDoctors,
  fetchNurses,
  fetchStaffRoles,
  fetchStaffUsers,
  getApiErrorMessage,
  setStaffUserActive,
  updateStaffUser,
} from "@/features/staff/api/staffApi";

const STAFF_TABS = [
  { value: "all", label: "All Staff" },
  { value: "Doctor", label: "Doctors" },
  { value: "Nurse", label: "Nurses" },
  { value: "Laboratorant", label: "Lab Staff" },
  { value: "Receptionist", label: "Receptionists" },
];

const STAFF_TYPES = [
  { value: "Doctor", label: "Doctor" },
  { value: "Nurse", label: "Nurse" },
  { value: "Laboratorant", label: "Lab staff" },
  { value: "Receptionist", label: "Receptionist" },
];

const STAFF_CREATE_STEPS = [
  { id: "account", label: "Account", fields: ["staffType", "userName", "email", "password"] },
  { id: "personal", label: "Personal", fields: ["firstName", "lastName", "phoneNumber"] },
  { id: "profile", label: "Profile", fields: ["staffNumber", "licenseNumber"] },
];

const EMPTY_FORM = {
  staffType: "Doctor",
  userName: "",
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  phoneNumber: "",
  staffNumber: "",
  licenseNumber: "",
  departmentId: "",
  employmentStatus: "Active",
  hireDate: "",
  isActive: true,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function apiError(error) {
  const data = error?.response?.data;
  if (data && typeof data === "object") {
    if (data.error) return String(data.error);
    if (data.title && data.errors && typeof data.errors === "object") {
      const messages = Object.values(data.errors).flat().filter(Boolean);
      if (messages.length > 0) return messages.join(" ");
      return String(data.title);
    }
    if (data.errors && typeof data.errors === "object") {
      const messages = Object.values(data.errors).flat().filter(Boolean);
      if (messages.length > 0) return messages.join(" ");
    }
  }
  return getApiErrorMessage(error);
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function roleKey(role) {
  return String(role ?? "").replace(/\s+/g, "").toLowerCase();
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function primaryStaffRole(user) {
  const roles = user.roleNames ?? user.roles ?? [];
  const keys = roles.map(roleKey);
  if (keys.includes("doctor")) return "Doctor";
  if (keys.includes("nurse") || keys.includes("infermier")) return "Nurse";
  if (keys.some((role) => ["laboratorant", "lab", "labstaff", "laboratory"].includes(role))) {
    return "Laboratorant";
  }
  if (keys.includes("receptionist") || keys.includes("reception")) return "Receptionist";
  if (keys.includes("admin")) return "Admin";
  if (keys.includes("superadmin")) return "SuperAdmin";
  return roles[0] ?? "Staff";
}

function staffTypeLabel(type) {
  if (type === "Laboratorant") return "Lab Staff";
  if (type === "SuperAdmin") return "Super Admin";
  return type;
}

function createdUserId(created) {
  return Number(created?.id ?? created?.Id);
}

function needsClinicalProfile(staffType) {
  return staffType === "Doctor" || staffType === "Nurse";
}

function numberOrNull(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function fullName(staff) {
  const name = [staff.firstName, staff.lastName].filter(Boolean).join(" ").trim();
  return staff.fullName || name || staff.userName || staff.email || "Staff member";
}

function initials(staff) {
  return (
    fullName(staff)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "S"
  );
}

function enrichStaff(user, doctorByUserId, nurseByUserId) {
  const role = primaryStaffRole(user);
  const profile =
    role === "Doctor"
      ? doctorByUserId.get(Number(user.id))
      : role === "Nurse"
        ? nurseByUserId.get(Number(user.id))
        : null;

  return {
    ...user,
    staffType: role,
    fullName: profile?.fullName ?? profile?.FullName,
    departmentName: profile?.departmentName ?? profile?.DepartmentName ?? user.departmentName,
    licenseNumber: profile?.licenseNumber ?? profile?.LicenseNumber,
    specializationName: profile?.specializationName ?? profile?.SpecializationName,
    profileIsActive: profile?.isActive ?? profile?.IsActive,
    profileId: profile?.id ?? profile?.Id,
  };
}

export default function StaffManagementPage() {
  const auth = useAuth();
  const canCreate = auth.hasPermission("Users.Create");
  const canUpdate = auth.hasPermission("Users.Update");
  const canSetActive = auth.hasPermission("Users.SetActive");
  const canReadDoctors = auth.hasPermission("Patients.Read");
  const canReadNurses = auth.hasPermission("Nurses.Read");

  const [staffUsers, setStaffUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialog, setDialog] = useState({ type: null, staff: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [createStep, setCreateStep] = useState(0);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [usersResult, roleData, doctorData, nurseData] = await Promise.all([
        fetchStaffUsers(),
        fetchStaffRoles().catch(() => []),
        canReadDoctors ? fetchDoctors().catch(() => []) : Promise.resolve([]),
        canReadNurses ? fetchNurses().catch(() => []) : Promise.resolve([]),
      ]);
      setStaffUsers(usersResult.items);
      setRoles(roleData);
      setDoctors(doctorData);
      setNurses(nurseData);
      setDepartments(await fetchDepartments().catch(() => []));
    } catch (e) {
      setError(apiError(e));
      setStaffUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canReadDoctors, canReadNurses]);

  useEffect(() => {
    void load();
  }, [load]);

  const staff = useMemo(() => {
    const doctorByUserId = new Map(
      doctors
        .filter((doctor) => doctor.userId ?? doctor.UserId)
        .map((doctor) => [Number(doctor.userId ?? doctor.UserId), doctor])
    );
    const nurseByUserId = new Map(
      nurses
        .filter((nurse) => nurse.userId ?? nurse.UserId)
        .map((nurse) => [Number(nurse.userId ?? nurse.UserId), nurse])
    );
    return staffUsers.map((user) => enrichStaff(user, doctorByUserId, nurseByUserId));
  }, [doctors, nurses, staffUsers]);

  const filteredStaff = useMemo(() => {
    const term = normalize(search);
    return staff.filter((member) => {
      const type = member.staffType;
      const matchesTab =
        activeTab === "all" ||
        type === activeTab ||
        (activeTab === "Nurse" && ["Nurse", "Infermier"].includes(type)) ||
        (activeTab === "Laboratorant" &&
          ["Laboratorant", "Lab", "LabStaff", "Laboratory"].includes(type)) ||
        (activeTab === "Receptionist" && ["Receptionist", "Reception"].includes(type));
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? member.isActive : !member.isActive);
      const haystack = [
        fullName(member),
        member.email,
        member.userName,
        member.phoneNumber,
        staffTypeLabel(type),
        member.departmentName,
        member.licenseNumber,
        member.specializationName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesTab && matchesStatus && (!term || haystack.includes(term));
    });
  }, [activeTab, search, staff, statusFilter]);

  const stats = useMemo(() => {
    const doctorsCount = staff.filter((member) => member.staffType === "Doctor").length;
    const nursesCount = staff.filter((member) => member.staffType === "Nurse").length;
    const labCount = staff.filter((member) => member.staffType === "Laboratorant").length;
    const receptionCount = staff.filter((member) => member.staffType === "Receptionist").length;
    return [
      { label: "Total Staff", value: staff.length, icon: Users, tone: "blue" },
      { label: "Doctors", value: doctorsCount, icon: Stethoscope, tone: "sky" },
      { label: "Nurses", value: nursesCount, icon: BriefcaseMedical, tone: "emerald" },
      { label: "Lab Staff", value: labCount, icon: Beaker, tone: "amber" },
      { label: "Receptionists", value: receptionCount, icon: UserRound, tone: "teal" },
    ];
  }, [staff]);

  function openCreate() {
    setDialog({ type: "create", staff: null });
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setCreateStep(0);
  }

  function openEdit(member) {
    setDialog({ type: "edit", staff: member });
    setForm({
      ...EMPTY_FORM,
      staffType: primaryStaffRole(member),
      userName: member.userName ?? "",
      email: member.email ?? "",
      password: "",
      firstName: member.firstName ?? "",
      lastName: member.lastName ?? "",
      phoneNumber: member.phoneNumber ?? "",
      staffNumber: member.staffNumber ?? "",
      licenseNumber: member.licenseNumber ?? "",
      departmentId: member.departmentId ? String(member.departmentId) : "",
      employmentStatus: member.employmentStatus ?? "Active",
      hireDate: member.hireDate ? String(member.hireDate).slice(0, 10) : "",
      isActive: Boolean(member.isActive),
    });
    setFieldErrors({});
    setCreateStep(0);
  }

  function openView(member) {
    setDialog({ type: "view", staff: member });
  }

  function closeDialog() {
    setDialog({ type: null, staff: null });
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setCreateStep(0);
  }

  function updateForm(patch) {
    setForm((current) => ({ ...current, ...patch }));
    setFieldErrors((current) => {
      const keys = Object.keys(patch);
      if (!keys.some((key) => current[key])) return current;
      const next = { ...current };
      for (const key of keys) delete next[key];
      return next;
    });
  }

  function validateStaffForm(isCreate) {
    const next = {};
    const email = form.email.trim();
    if (!form.staffType) next.staffType = "Required";
    if (isCreate && !form.userName.trim()) next.userName = "Required";
    if (!email) next.email = "Required";
    else if (!EMAIL_PATTERN.test(email)) next.email = "Invalid email";
    if (isCreate && !form.password) next.password = "Required";
    else if ((isCreate || form.password) && form.password.length < 8) {
      next.password = "Minimum 8 characters";
    }
    if (!form.firstName.trim()) next.firstName = "Required";
    if (!form.lastName.trim()) next.lastName = "Required";
    if (!form.phoneNumber.trim()) next.phoneNumber = "Required";
    if (isCreate && needsClinicalProfile(form.staffType)) {
      if (!form.staffNumber.trim()) next.staffNumber = "Required";
      if (!form.licenseNumber.trim()) next.licenseNumber = "Required";
    }
    return next;
  }

  function validateCreateStep() {
    const step = STAFF_CREATE_STEPS[createStep];
    const allErrors = validateStaffForm(true);
    return Object.fromEntries(
      Object.entries(allErrors).filter(([key]) => step.fields.includes(key))
    );
  }

  function nextCreateStep() {
    const nextErrors = validateCreateStep();
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      showToast("Complete this step before continuing.", "error");
      return;
    }
    setFieldErrors({});
    setCreateStep((step) => Math.min(step + 1, STAFF_CREATE_STEPS.length - 1));
  }

  async function submitForm(event) {
    event.preventDefault();
    if (saving) return;

    const isCreate = dialog.type === "create";
    const email = form.email.trim();
    const userName = form.userName.trim();
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const phoneNumber = form.phoneNumber.trim();
    const staffNumber = form.staffNumber.trim();
    const licenseNumber = form.licenseNumber.trim();

    const nextErrors = validateStaffForm(isCreate);
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      showToast("Complete the required staff details before saving.", "error");
      return;
    }

    setSaving(true);
    try {
      if (isCreate) {
        if (form.staffType === "Doctor") {
          await createDoctorStaff({
            UserName: userName,
            Email: email,
            Password: form.password,
            IsActive: form.isActive,
            FirstName: firstName,
            LastName: lastName,
            Phone: phoneNumber,
            StaffNumber: staffNumber,
            DepartmentId: numberOrNull(form.departmentId),
            EmploymentStatus: form.employmentStatus,
            HireDate: form.hireDate || null,
            LicenseNumber: licenseNumber,
          });
        } else if (form.staffType === "Nurse") {
          await createNurseStaff({
            UserName: userName,
            Email: email,
            Password: form.password,
            IsActive: form.isActive,
            FirstName: firstName,
            LastName: lastName,
            Phone: phoneNumber,
            StaffNumber: staffNumber,
            DepartmentId: numberOrNull(form.departmentId),
            EmploymentStatus: form.employmentStatus,
            HireDate: form.hireDate || null,
            LicenseNumber: licenseNumber,
          });
        } else {
          const created = await createStaffUser({
            UserName: userName,
            Email: email,
            Password: form.password,
            RoleNames: [form.staffType],
          });
          const id = createdUserId(created);
          if (!id) throw new Error("Staff account was created, but the response did not include a user id.");
          await updateStaffUser(id, {
            Email: email,
            FirstName: firstName,
            LastName: lastName,
            PhoneNumber: phoneNumber,
            IsActive: form.isActive,
            RoleNames: [form.staffType],
          });
        }
        showToast("Staff account created.");
      } else {
        const payload = {
          Email: email,
          FirstName: firstName,
          LastName: lastName,
          PhoneNumber: phoneNumber,
          IsActive: form.isActive,
          RoleNames: [form.staffType],
        };
        if (form.password) payload.NewPassword = form.password;
        await updateStaffUser(dialog.staff.id, payload);
        showToast("Staff account updated.");
      }
      closeDialog();
      await load();
    } catch (e) {
      showToast(apiError(e), "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(member) {
    if (saving) return;
    setSaving(true);
    try {
      await setStaffUserActive(member.id, !member.isActive);
      showToast(member.isActive ? "Staff account deactivated." : "Staff account activated.");
      await load();
    } catch (e) {
      showToast(apiError(e), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Administration
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Staff Management
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
            Manage hospital staff accounts and review clinical, laboratory, and front desk teams.
          </p>
        </div>

        <div className="flex gap-2">
          {canCreate && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add Staff
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              void load();
            }}
            disabled={loading || refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {STAFF_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={[
                  "h-10 rounded-lg px-3 text-sm font-medium transition",
                  activeTab === tab.value
                    ? "bg-sky-600 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(16rem,24rem)_12rem_auto] md:items-end">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Search
              </span>
              <span className="relative mt-1.5 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name, email, role, department"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </span>
            </label>
            <SelectField label="Status" value={statusFilter} onChange={setStatusFilter}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </SelectField>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setActiveTab("all");
              }}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </div>
      </section>

      {toast && (
        <div
          role={toast.type === "error" ? "alert" : "status"}
          className={
            toast.type === "error"
              ? "rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
              : "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          }
        >
          {toast.message}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900" role="alert">
          {error}
        </div>
      )}

      <div className="scrollbar-none min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <LoadingState label="Loading staff..." />
        ) : filteredStaff.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Staff</th>
                <th className="px-4 py-4">Role/Type</th>
                <th className="px-4 py-4">Department</th>
                <th className="px-4 py-4">License</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Created</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredStaff.map((member) => (
                <StaffRow
                  key={member.id}
                  member={member}
                  canUpdate={canUpdate}
                  canSetActive={canSetActive}
                  saving={saving}
                  onView={openView}
                  onEdit={openEdit}
                  onToggleActive={toggleActive}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(dialog.type === "create" || dialog.type === "edit") && (
        <StaffDialog
          mode={dialog.type}
          staff={dialog.staff}
          form={form}
          roles={roles}
          saving={saving}
          onClose={closeDialog}
          onSubmit={submitForm}
          onChange={updateForm}
          departments={departments}
          fieldErrors={fieldErrors}
          createStep={createStep}
          onStepChange={setCreateStep}
          onNextStep={nextCreateStep}
        />
      )}

      {dialog.type === "view" && (
        <ViewStaffDialog staff={dialog.staff} onClose={closeDialog} />
      )}
    </div>
  );
}

function StatCard({ stat }) {
  const Icon = stat.icon;
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    sky: "bg-sky-50 text-sky-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    teal: "bg-teal-50 text-teal-600",
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-600">{stat.label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{stat.value}</p>
        </div>
        <div className={`flex size-12 items-center justify-center rounded-xl ${tones[stat.tone]}`}>
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
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

function StaffRow({ member, canUpdate, canSetActive, saving, onView, onEdit, onToggleActive }) {
  return (
    <tr className="align-middle transition hover:bg-slate-50/70">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
            {initials(member)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-950">{fullName(member)}</p>
            <p className="truncate text-sm text-slate-600">{member.email}</p>
            {member.phoneNumber && (
              <p className="truncate text-xs text-slate-500">{member.phoneNumber}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <RoleBadge role={member.staffType} />
        {member.specializationName && (
          <p className="mt-1 text-xs text-slate-500">{member.specializationName}</p>
        )}
      </td>
      <td className="px-4 py-4 text-slate-600">{member.departmentName || "-"}</td>
      <td className="px-4 py-4 text-slate-600">{member.licenseNumber || "-"}</td>
      <td className="px-4 py-4">
        <StatusBadge active={member.isActive} />
      </td>
      <td className="px-4 py-4 text-slate-600">{formatDate(member.createdAt)}</td>
      <td className="px-5 py-4">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onView(member)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Eye className="size-3.5" aria-hidden />
            View
          </button>
          {canUpdate && (
            <button
              type="button"
              onClick={() => onEdit(member)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <MoreHorizontal className="size-3.5" aria-hidden />
              Edit
            </button>
          )}
          {canSetActive && (
            <button
              type="button"
              onClick={() => onToggleActive(member)}
              disabled={saving}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {member.isActive ? <UserX className="size-3.5" aria-hidden /> : <UserCheck className="size-3.5" aria-hidden />}
              {member.isActive ? "Deactivate" : "Activate"}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function RoleBadge({ role }) {
  const classes =
    role === "Doctor"
      ? "bg-blue-50 text-blue-800 ring-blue-200"
      : role === "Nurse"
        ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
        : role === "Laboratorant"
          ? "bg-amber-50 text-amber-900 ring-amber-200"
          : "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${classes}`}>
      {staffTypeLabel(role)}
    </span>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={
        active
          ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200"
          : "inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200"
      }
    >
      <span className={active ? "size-1.5 rounded-full bg-emerald-500" : "size-1.5 rounded-full bg-slate-400"} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function StaffDialog({
  mode,
  staff,
  form,
  roles,
  saving,
  fieldErrors,
  createStep,
  onClose,
  onSubmit,
  onChange,
  departments,
  onStepChange,
  onNextStep,
}) {
  const availableRoles = roles.length > 0 ? roles : STAFF_TYPES.map((type) => ({ id: type.value, name: type.value }));
  const isCreate = mode === "create";
  const isLastCreateStep = createStep === STAFF_CREATE_STEPS.length - 1;
  const currentStep = STAFF_CREATE_STEPS[createStep];
  const showProfileFields = needsClinicalProfile(form.staffType);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
      <section className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <DialogHeader
          title={mode === "create" ? "Add Staff" : `Edit ${fullName(staff)}`}
          subtitle={mode === "create" ? "Create a staff account and linked person record." : "Update account details and access."}
          onClose={onClose}
        />
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          {isCreate && (
            <div className="border-b border-slate-100 bg-white px-6 pt-5">
              <div className="rounded-lg bg-slate-100 p-1">
                <div className="grid grid-cols-3 gap-1">
                  {STAFF_CREATE_STEPS.map((step, index) => {
                    const active = createStep === index;
                    const available = index <= createStep;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => available && onStepChange(index)}
                        disabled={!available || saving}
                        className={[
                          "h-9 rounded-md px-2 text-sm font-medium transition",
                          active
                            ? "bg-white text-slate-950 shadow-sm"
                            : available
                              ? "text-slate-500 hover:bg-white/70 hover:text-slate-800"
                              : "cursor-not-allowed text-slate-400",
                        ].join(" ")}
                      >
                        {step.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-slate-50 px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              {(!isCreate || currentStep.id === "account") && (
                <>
              <Field label="Staff type" required>
                <select
                  value={form.staffType}
                  onChange={(event) => onChange({ staffType: event.target.value })}
                  disabled={saving}
                  className={`h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 ${
                    fieldErrors.staffType ? "border-rose-300" : "border-slate-200"
                  }`}
                  required
                >
                  {availableRoles
                    .filter((role) => STAFF_TYPES.some((type) => type.value === role.name))
                    .map((role) => (
                      <option key={role.id ?? role.name} value={role.name}>
                        {staffTypeLabel(role.name)}
                      </option>
                    ))}
                </select>
                <FieldError message={fieldErrors.staffType} />
              </Field>
              {mode === "create" && (
                <Field label="Username" required>
                  <input
                    value={form.userName}
                    onChange={(event) => onChange({ userName: event.target.value })}
                    disabled={saving}
                    className={`h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 ${
                      fieldErrors.userName ? "border-rose-300" : "border-slate-200"
                    }`}
                    required
                  />
                  <FieldError message={fieldErrors.userName} />
                </Field>
              )}
              <Field label="Email" required>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => onChange({ email: event.target.value })}
                  disabled={saving}
                  className={`h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 ${
                    fieldErrors.email ? "border-rose-300" : "border-slate-200"
                  }`}
                  required
                />
                <FieldError message={fieldErrors.email} />
              </Field>
              <Field label={mode === "create" ? "Password" : "New password"} required={mode === "create"}>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => onChange({ password: event.target.value })}
                  disabled={saving}
                  placeholder={mode === "create" ? "Minimum 8 characters" : "Leave blank to keep current password"}
                  className={`h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 ${
                    fieldErrors.password ? "border-rose-300" : "border-slate-200"
                  }`}
                  required={mode === "create"}
                  minLength={mode === "create" || form.password ? 8 : undefined}
                />
                <FieldError message={fieldErrors.password} />
              </Field>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Account status
                </p>
                <label className="mt-3 flex items-center justify-between gap-4 text-sm font-medium text-slate-800">
                  <span>{form.isActive ? "Active" : "Inactive"}</span>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => onChange({ isActive: event.target.checked })}
                    disabled={saving}
                    className="peer sr-only"
                  />
                  <span className="relative h-8 w-14 shrink-0 rounded-full bg-slate-200 after:absolute after:left-1 after:top-1 after:size-6 after:rounded-full after:bg-white after:shadow-sm after:transition peer-checked:bg-sky-600 peer-checked:after:translate-x-6" />
                </label>
              </div>
                </>
              )}
              {(!isCreate || currentStep.id === "personal") && (
                <>
                  <Field label="First name" required>
                    <input
                      value={form.firstName}
                      onChange={(event) => onChange({ firstName: event.target.value })}
                      disabled={saving}
                      className={`h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 ${
                        fieldErrors.firstName ? "border-rose-300" : "border-slate-200"
                      }`}
                      required
                    />
                    <FieldError message={fieldErrors.firstName} />
                  </Field>
                  <Field label="Last name" required>
                    <input
                      value={form.lastName}
                      onChange={(event) => onChange({ lastName: event.target.value })}
                      disabled={saving}
                      className={`h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 ${
                        fieldErrors.lastName ? "border-rose-300" : "border-slate-200"
                      }`}
                      required
                    />
                    <FieldError message={fieldErrors.lastName} />
                  </Field>
                  <Field label="Phone" required>
                    <input
                      value={form.phoneNumber}
                      onChange={(event) => onChange({ phoneNumber: event.target.value })}
                      disabled={saving}
                      className={`h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 ${
                        fieldErrors.phoneNumber ? "border-rose-300" : "border-slate-200"
                      }`}
                      required
                    />
                    <FieldError message={fieldErrors.phoneNumber} />
                  </Field>
                </>
              )}
              {isCreate && currentStep.id === "profile" && showProfileFields && (
                <>
                  <Field label="Staff number" required>
                    <input
                      value={form.staffNumber}
                      onChange={(event) => onChange({ staffNumber: event.target.value })}
                      disabled={saving}
                      className={`h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 ${
                        fieldErrors.staffNumber ? "border-rose-300" : "border-slate-200"
                      }`}
                      required
                    />
                    <FieldError message={fieldErrors.staffNumber} />
                  </Field>
                  <Field label="License number" required>
                    <input
                      value={form.licenseNumber}
                      onChange={(event) => onChange({ licenseNumber: event.target.value })}
                      disabled={saving}
                      className={`h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 ${
                        fieldErrors.licenseNumber ? "border-rose-300" : "border-slate-200"
                      }`}
                      required
                    />
                    <FieldError message={fieldErrors.licenseNumber} />
                  </Field>
                  <Field label="Department">
                    <select
                      value={form.departmentId}
                      onChange={(event) => onChange({ departmentId: event.target.value })}
                      disabled={saving}
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    >
                      <option value="">No department</option>
                      {departments.map((department) => (
                        <option key={department.id ?? department.Id} value={department.id ?? department.Id}>
                          {department.name ?? department.Name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Employment status">
                    <select
                      value={form.employmentStatus}
                      onChange={(event) => onChange({ employmentStatus: event.target.value })}
                      disabled={saving}
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    >
                      <option value="Active">Active</option>
                      <option value="Probation">Probation</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </Field>
                  <Field label="Hire date">
                    <input
                      type="date"
                      value={form.hireDate}
                      onChange={(event) => onChange({ hireDate: event.target.value })}
                      disabled={saving}
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    />
                  </Field>
                </>
              )}
              {isCreate && currentStep.id === "profile" && !showProfileFields && (
                <div className="md:col-span-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  This role only needs an account and person record.
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 bg-white px-6 py-5">
            <button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            {isCreate && createStep > 0 && (
              <button
                type="button"
                onClick={() => onStepChange(Math.max(createStep - 1, 0))}
                disabled={saving}
                className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Back
              </button>
            )}
            {isCreate && !isLastCreateStep ? (
              <button type="button" onClick={onNextStep} disabled={saving} className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50">
                Next
              </button>
            ) : (
              <button type="submit" disabled={saving} className="h-10 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50">
                {saving ? "Saving..." : mode === "create" ? "Add Staff" : "Save changes"}
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

function ViewStaffDialog({ staff, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
      <section className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <DialogHeader title="Staff Profile" subtitle="Staff account and available profile details." onClose={onClose} />
        <div className="space-y-4 bg-slate-50 px-6 py-5">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <DetailGrid
              items={[
                ["Full name", fullName(staff)],
                ["Email", staff.email || "-"],
                ["Phone", staff.phoneNumber || "-"],
                ["Username", staff.userName || "-"],
                ["Role/type", staffTypeLabel(staff.staffType)],
                ["Department", staff.departmentName || "-"],
                ["License number", staff.licenseNumber || "-"],
                ["Specialization", staff.specializationName || "-"],
                ["Account status", staff.isActive ? "Active" : "Inactive"],
                ["Created", formatDate(staff.createdAt)],
              ]}
            />
          </div>
          <div className="flex justify-end border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              Close
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function DialogHeader({ title, subtitle, onClose }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
      <div className="flex items-start gap-4">
        <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Users className="size-6" aria-hidden />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
      </div>
      <button type="button" onClick={onClose} className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Close">
        <X className="size-5" aria-hidden />
      </button>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return <span className="mt-1 block text-xs text-rose-600">{message}</span>;
}

function DetailGrid({ items }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function LoadingState({ label }) {
  return (
    <div className="flex min-h-[16rem] items-center justify-center text-sm text-slate-500">
      {label}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[16rem] items-center justify-center p-8 text-center">
      <div>
        <Users className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
        <p className="mt-3 text-sm font-medium text-slate-900">No staff found</p>
        <p className="mt-1 text-sm text-slate-500">Adjust filters or add a staff account.</p>
      </div>
    </div>
  );
}

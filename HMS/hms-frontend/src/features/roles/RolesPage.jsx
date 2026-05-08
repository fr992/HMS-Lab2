import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Crown,
  Eye,
  KeyRound,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  Stethoscope,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import apiClient from "@/api/apiClient";

const SYSTEM_ROLES = new Set([
  "SuperAdmin",
  "Admin",
  "Doctor",
  "Nurse",
  "Patient",
  "Receptionist",
  "Laboratorant",
]);

const emptyForm = {
  name: "",
  description: "",
  permissionNames: [],
};

function apiError(error) {
  return error?.response?.data?.error ?? error?.message ?? "Something went wrong.";
}

function RoleIcon({ roleName, className }) {
  const normalized = roleName.toLowerCase().replace(/\s+/g, "");
  if (normalized === "superadmin") return <Crown className={className} aria-hidden />;
  if (normalized === "admin") return <Shield className={className} aria-hidden />;
  if (normalized === "doctor") return <Stethoscope className={className} aria-hidden />;
  return <User className={className} aria-hidden />;
}

function permissionGroup(permissionName) {
  const [prefix] = permissionName.split(".");
  if (prefix === "Own") return "Patient Portal";
  return prefix || "General";
}

function permissionLabel(permissionName) {
  const parts = permissionName.split(".");
  const action = parts.at(-1) ?? permissionName;
  const subject = parts.length > 1 ? parts.slice(0, -1).join(" ") : permissionName;
  return `${action.replace(/([A-Z])/g, " $1").trim()} ${subject}`.trim();
}

function roleSummary(role) {
  return role.description || "Custom access profile";
}

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [dialogMode, setDialogMode] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [rolesResponse, permissionsResponse, usersResponse] = await Promise.all([
        apiClient.get("/admin/roles"),
        apiClient.get("/admin/permissions"),
        apiClient.get("/admin/users"),
      ]);
      setRoles(Array.isArray(rolesResponse.data) ? rolesResponse.data : []);
      setPermissions(Array.isArray(permissionsResponse.data) ? permissionsResponse.data : []);
      setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : []);
    } catch (e) {
      setError(apiError(e));
      setRoles([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const userCounts = useMemo(() => {
    return users.reduce((counts, user) => {
      for (const roleName of user.roleNames ?? []) {
        counts[roleName] = (counts[roleName] ?? 0) + 1;
      }
      return counts;
    }, {});
  }, [users]);

  const permissionGroups = useMemo(() => {
    return permissions.reduce((groups, permission) => {
      const group = permissionGroup(permission.name);
      groups[group] ??= [];
      groups[group].push(permission);
      return groups;
    }, {});
  }, [permissions]);

  const stats = useMemo(
    () => [
      { label: "Total Roles", value: roles.length, icon: Shield, tone: "blue" },
      { label: "Total Permissions", value: permissions.length, icon: KeyRound, tone: "teal" },
      {
        label: "System Roles",
        value: roles.filter((role) => SYSTEM_ROLES.has(role.name)).length,
        icon: ShieldCheck,
        tone: "emerald",
      },
      {
        label: "Custom Roles",
        value: roles.filter((role) => !SYSTEM_ROLES.has(role.name)).length,
        icon: Layers,
        tone: "amber",
      },
    ],
    [roles, permissions]
  );

  function openCreate() {
    setDeleteId(null);
    setActiveRole(null);
    setDialogMode("edit");
    setForm(emptyForm);
  }

  function openRole(role, mode) {
    setDeleteId(null);
    setActiveRole(role);
    setDialogMode(mode);
    setForm({
      name: role.name ?? "",
      description: role.description ?? "",
      permissionNames: role.permissionNames ?? [],
    });
  }

  function closeDialog() {
    if (saving) return;
    setDialogMode(null);
    setActiveRole(null);
    setForm(emptyForm);
  }

  function togglePermission(permissionName) {
    if (dialogMode !== "edit") return;
    setForm((current) => {
      const set = new Set(current.permissionNames);
      if (set.has(permissionName)) set.delete(permissionName);
      else set.add(permissionName);
      return { ...current, permissionNames: Array.from(set).sort() };
    });
  }

  async function submitForm(event) {
    event.preventDefault();
    if (saving || dialogMode !== "edit") return;

    if (!form.name.trim()) {
      showToast("Role name is required.", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description,
        permissionNames: form.permissionNames,
      };
      if (activeRole) {
        await apiClient.put(`/admin/roles/${activeRole.id}`, payload);
        showToast("Role updated.");
      } else {
        await apiClient.post("/admin/roles", payload);
        showToast("Role created.");
      }
      closeDialog();
      await load();
    } catch (e) {
      showToast(apiError(e), "error");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(role) {
    if (saving) return;
    setSaving(true);
    try {
      await apiClient.delete(`/admin/roles/${role.id}`);
      showToast("Role deleted.");
      setDeleteId(null);
      if (activeRole?.id === role.id) closeDialog();
      await load();
    } catch (e) {
      showToast(apiError(e), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Administration
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Role Management
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Control access and permissions across the hospital system.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" aria-hidden />
            New Role
          </button>
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

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
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      <section className="min-h-0 flex-1">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">All Roles</h2>
            <p className="text-sm text-slate-600">
              Click a role to view or assign permissions.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[18rem] items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500 shadow-sm">
            Loading roles...
          </div>
        ) : roles.length === 0 ? (
          <div className="flex min-h-[18rem] items-center justify-center rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            No roles found.
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-3">
            {roles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                userCount={userCounts[role.name] ?? 0}
                deleteActive={deleteId === role.id}
                saving={saving}
                onView={() => openRole(role, "view")}
                onEdit={() => openRole(role, "edit")}
                onAskDelete={() => setDeleteId(role.id)}
                onCancelDelete={() => setDeleteId(null)}
                onConfirmDelete={() => void confirmDelete(role)}
              />
            ))}
          </div>
        )}
      </section>

      {dialogMode && (
        <RoleDialog
          mode={dialogMode}
          role={activeRole}
          form={form}
          permissionGroups={permissionGroups}
          saving={saving}
          onClose={closeDialog}
          onSubmit={submitForm}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          onTogglePermission={togglePermission}
        />
      )}
    </div>
  );
}

function StatCard({ stat }) {
  const Icon = stat.icon;
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    teal: "bg-teal-50 text-teal-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-600">{stat.label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {stat.value}
          </p>
        </div>
        <div className={`flex size-14 items-center justify-center rounded-xl ${tones[stat.tone]}`}>
          <Icon className="size-6" aria-hidden />
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  role,
  userCount,
  deleteActive,
  saving,
  onView,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}) {
  const isSystem = SYSTEM_ROLES.has(role.name);
  const isSuperAdmin = role.name === "SuperAdmin";

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <RoleIcon roleName={role.name} className="size-6" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-950">{role.name}</h3>
            <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">
              {roleSummary(role)}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
          {isSystem ? "System" : "Custom"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 border-y border-slate-200 py-4">
        <div>
          <p className="text-sm text-slate-500">Users</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{userCount}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Permissions</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {role.permissionNames?.length ?? 0}
            {isSuperAdmin && " (all)"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onView}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
        >
          <Eye className="size-4" aria-hidden />
          View
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 text-sm font-medium text-white transition hover:bg-sky-700"
        >
          <Pencil className="size-4" aria-hidden />
          Assign
        </button>
      </div>

      {!isSuperAdmin && (
        <div className="mt-2">
          {deleteActive ? (
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2">
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={saving}
                className="h-9 rounded-md bg-rose-600 px-3 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={onCancelDelete}
                className="h-9 rounded-md border border-rose-200 bg-white px-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAskDelete}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
            >
              <Trash2 className="size-4" aria-hidden />
              Delete role
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function RoleDialog({
  mode,
  role,
  form,
  permissionGroups,
  saving,
  onClose,
  onSubmit,
  onChange,
  onTogglePermission,
}) {
  const readonly = mode === "view";
  const isCreate = !role;
  const title = readonly
    ? `${form.name || "Role"} Permissions`
    : isCreate
      ? "Create Role"
      : `${form.name} - Assign Permissions`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
      role="dialog"
      aria-modal="true"
    >
      <section className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-7 py-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <RoleIcon roleName={form.name || "Role"} className="size-6" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-slate-950">{title}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {form.description || "Control access by enabling the permissions this role needs."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-slate-50 px-7 py-6">
            {!readonly && (
              <div className="mb-5 grid gap-3 md:grid-cols-[16rem_1fr]">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Role name
                  </span>
                  <input
                    value={form.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Description
                  </span>
                  <input
                    value={form.description}
                    onChange={(e) => onChange({ description: e.target.value })}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  />
                </label>
              </div>
            )}

            {form.name === "SuperAdmin" && (
              <div className="mb-5 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-hidden />
                <div>
                  <p className="font-semibold">All permissions enabled</p>
                  <p className="text-sm text-emerald-800">
                    SuperAdmin has unrestricted access to every module.
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
              {Object.entries(permissionGroups).map(([groupName, items]) => (
                <fieldset key={groupName} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <legend className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {groupName}
                  </legend>
                  <div className="mt-4 space-y-3">
                    {items.map((permission) => (
                      <label
                        key={permission.id}
                        className="flex min-h-8 items-center justify-between gap-4 text-sm text-slate-800"
                      >
                        <span className="min-w-0">
                          <span className="block font-medium">{permissionLabel(permission.name)}</span>
                          {permission.description && (
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {permission.description}
                            </span>
                          )}
                        </span>
                        <input
                          type="checkbox"
                          checked={form.permissionNames.includes(permission.name)}
                          onChange={() => onTogglePermission(permission.name)}
                          disabled={readonly || form.name === "SuperAdmin"}
                          className="peer sr-only"
                        />
                        <span className="relative h-8 w-14 shrink-0 rounded-full bg-slate-200 transition after:absolute after:left-1 after:top-1 after:size-6 after:rounded-full after:bg-white after:shadow-sm after:transition peer-checked:bg-sky-600 peer-checked:after:translate-x-6 peer-disabled:opacity-70" />
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 bg-white px-7 py-5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
            {!readonly && (
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-sky-600 px-5 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : isCreate ? "Create role" : "Save changes"}
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

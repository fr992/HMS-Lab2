import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import apiClient from "@/api/apiClient";
import { CountUpValue } from "@/features/dashboard/DashboardPrimitives";
import { getPagedItems, getPagination, PaginationBar } from "@/lib/pagination.jsx";

const emptyForm = {
  userName: "",
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  phoneNumber: "",
  roleName: "",
  isActive: true,
};

function apiError(error) {
  return error?.response?.data?.error ?? error?.message ?? "Something went wrong.";
}

function fullName(user) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.userName || user.email;
}

function initials(user) {
  const source = fullName(user);
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";
}

function RoleLabel({ roleName }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-200">
      {roleName}
    </span>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingUser, setEditingUser] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        apiClient.get("/admin/users", {
          params: {
            page,
            pageSize: 25,
            q: search.trim() || undefined,
            role: roleFilter !== "all" ? roleFilter : undefined,
            isActive:
              statusFilter === "all" ? undefined : statusFilter === "active",
          },
        }),
        apiClient.get("/admin/roles", { params: { pageSize: 100 } }),
      ]);
      setUsers(getPagedItems(usersResponse.data));
      setPagination(getPagination(usersResponse.data));
      setRoles(getPagedItems(rolesResponse.data));
    } catch (e) {
      setError(apiError(e));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredUsers = users;

  const stats = useMemo(
    () => [
      { label: "Total Users", value: pagination?.totalCount ?? users.length, icon: Users, tone: "blue" },
      {
        label: "Active Users",
        value: users.filter((user) => user.isActive).length,
        icon: UserCheck,
        tone: "emerald",
      },
      {
        label: "Inactive Users",
        value: users.filter((user) => !user.isActive).length,
        icon: UserX,
        tone: "slate",
      },
      {
        label: "Super Admins",
        value: users.filter((user) => (user.roleNames ?? []).includes("SuperAdmin")).length,
        icon: ShieldCheck,
        tone: "teal",
      },
    ],
    [users, pagination]
  );

  function beginCreate() {
    setCreating(true);
    setEditingUser(null);
    setForm({
      ...emptyForm,
      roleName: roles[0]?.name ?? "",
    });
  }

  function beginEdit(user) {
    setCreating(false);
    setEditingUser(user);
    setForm({
      userName: user.userName ?? "",
      email: user.email ?? "",
      password: "",
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      phoneNumber: user.phoneNumber ?? "",
      roleName: user.roleNames?.[0] ?? roles[0]?.name ?? "",
      isActive: Boolean(user.isActive),
    });
  }

  function resetForm() {
    if (saving) return;
    setCreating(false);
    setEditingUser(null);
    setForm(emptyForm);
  }

  async function submitForm(event) {
    event.preventDefault();
    if (saving) return;

    if (!form.email.trim() || !form.roleName) {
      showToast("Email and role are required.", "error");
      return;
    }

    if (creating && (!form.userName.trim() || form.password.length < 8)) {
      showToast("Username is required and password must be at least 8 characters.", "error");
      return;
    }

    if (!creating && form.password && form.password.length < 8) {
      showToast("New password must be at least 8 characters.", "error");
      return;
    }

    setSaving(true);
    try {
      if (creating) {
        const created = await apiClient.post("/admin/users", {
          userName: form.userName.trim(),
          email: form.email.trim(),
          password: form.password,
          roleNames: [form.roleName],
        });
        await apiClient.put(`/admin/users/${created.data.id}`, {
          email: form.email.trim(),
          firstName: form.firstName,
          lastName: form.lastName,
          phoneNumber: form.phoneNumber,
          isActive: form.isActive,
          roleNames: [form.roleName],
        });
        showToast("User created.");
      } else {
        const payload = {
          email: form.email.trim(),
          firstName: form.firstName,
          lastName: form.lastName,
          phoneNumber: form.phoneNumber,
          isActive: form.isActive,
          roleNames: [form.roleName],
        };
        if (form.password) payload.newPassword = form.password;
        await apiClient.put(`/admin/users/${editingUser.id}`, payload);
        showToast(form.password ? "User and password updated." : "User updated.");
      }

      resetForm();
      await load();
    } catch (e) {
      showToast(apiError(e), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Administration
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Users
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Manage system users, access, roles, and account status.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(20rem,40rem)_13rem_13rem_auto] lg:items-center">
          <label className="block">
            <span className="sr-only">Search</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search by name, email or username..."
                className="h-11 w-full rounded-lg border border-slate-100 bg-slate-100/80 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20"
              />
            </span>
          </label>

          <label className="block">
            <span className="sr-only">Role</span>
            <select
              value={roleFilter}
              onChange={(event) => {
                setPage(1);
                setRoleFilter(event.target.value);
              }}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="all">All roles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="sr-only">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <button
            type="button"
            onClick={beginCreate}
            className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-sky-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            <Plus className="size-4" aria-hidden />
            Add User
          </button>
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
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      <div className="scrollbar-none min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[16rem] items-center justify-center text-sm text-slate-500">
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex min-h-[16rem] items-center justify-center p-8 text-center text-sm text-slate-500">
            No users found.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">User</th>
                <th className="px-4 py-4">Username</th>
                <th className="px-4 py-4">Role</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4">Phone</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="align-middle transition hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                        {initials(user)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-950">{fullName(user)}</p>
                        <p className="truncate text-sm text-slate-600">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{user.userName}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {(user.roleNames ?? []).map((roleName) => (
                        <RoleLabel key={roleName} roleName={roleName} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={
                        user.isActive
                          ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200"
                          : "inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200"
                      }
                    >
                      <span className={user.isActive ? "size-1.5 rounded-full bg-emerald-500" : "size-1.5 rounded-full bg-slate-400"} />
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{user.phoneNumber || "-"}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => beginEdit(user)}
                        className="inline-flex size-9 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100"
                        aria-label={`Edit ${fullName(user)}`}
                      >
                        <MoreHorizontal className="size-5" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <PaginationBar
          pagination={pagination}
          loading={loading}
          onPageChange={setPage}
        />
      </div>

      {(creating || editingUser) && (
        <UserDialog
          creating={creating}
          user={editingUser}
          form={form}
          roles={roles}
          saving={saving}
          onCancel={resetForm}
          onSubmit={submitForm}
          onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        />
      )}
    </div>
  );
}

function StatCard({ stat }) {
  const Icon = stat.icon;
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    slate: "bg-slate-100 text-slate-500",
    teal: "bg-teal-50 text-teal-600",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{stat.label}</p>
          <p className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-950">
            <CountUpValue value={stat.value} />
          </p>
        </div>
        <div className={`flex size-12 items-center justify-center rounded-xl ${tones[stat.tone]}`}>
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}

function UserDialog({ creating, user, form, roles, saving, onCancel, onChange, onSubmit }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
      role="dialog"
      aria-modal="true"
    >
      <section className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-base font-semibold text-blue-700">
              {creating ? <Plus className="size-6" aria-hidden /> : initials(user)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-slate-950">
                {creating ? "Add User" : `Edit ${fullName(user)}`}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {creating
                  ? "Create the account and assign initial access."
                  : "Update profile details, access, status, or reset the password."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto bg-slate-50 px-6 py-5">
            <div className="grid gap-5 md:grid-cols-2">
              {creating && (
                <Field label="Username" required>
                  <input
                    value={form.userName}
                    onChange={(e) => onChange({ userName: e.target.value })}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    required
                  />
                </Field>
              )}
              <Field label="First name">
                <input
                  value={form.firstName}
                  onChange={(e) => onChange({ firstName: e.target.value })}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </Field>
              <Field label="Last name">
                <input
                  value={form.lastName}
                  onChange={(e) => onChange({ lastName: e.target.value })}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </Field>
              <Field label="Email" required>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => onChange({ email: e.target.value })}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  required
                />
              </Field>
              <Field label="Phone">
                <input
                  value={form.phoneNumber}
                  onChange={(e) => onChange({ phoneNumber: e.target.value })}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </Field>
              <Field label="Role" required>
                <select
                  value={form.roleName}
                  onChange={(e) => onChange({ roleName: e.target.value })}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  required
                >
                  <option value="" disabled>
                    Select role
                  </option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={creating ? "Password" : "New password"} required={creating}>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => onChange({ password: e.target.value })}
                    placeholder={creating ? "Minimum 8 characters" : "Leave blank to keep current password"}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-9 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                    required={creating}
                    minLength={creating || form.password ? 8 : undefined}
                  />
                </div>
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
                    onChange={(e) => onChange({ isActive: e.target.checked })}
                    className="peer sr-only"
                  />
                  <span className="relative h-8 w-14 shrink-0 rounded-full bg-slate-200 after:absolute after:left-1 after:top-1 after:size-6 after:rounded-full after:bg-white after:shadow-sm after:transition peer-checked:bg-sky-600 peer-checked:after:translate-x-6" />
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 bg-white px-6 py-5">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-sky-600 px-5 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : creating ? "Create user" : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required && " *"}
      </span>
      {children}
    </label>
  );
}

import api from "@/api/apiClient";

export { getApiErrorMessage } from "@/features/patients/patientsApi";

const STAFF_ROLE_NAMES = [
  "Doctor",
  "Nurse",
  "Infermier",
  "Laboratorant",
  "Lab",
  "LabStaff",
  "Laboratory",
  "Receptionist",
  "Reception",
  "Admin",
  "SuperAdmin",
];

function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function extractArray(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];

  const directKeys = [
    "items",
    "Items",
    "data",
    "Data",
    "result",
    "Result",
    "users",
    "Users",
    "staff",
    "Staff",
  ];
  for (const key of directKeys) {
    if (Array.isArray(data[key])) return data[key];
  }

  for (const key of directKeys) {
    const value = data[key];
    if (value && typeof value === "object") {
      const nested = extractArray(value);
      if (nested.length > 0) return nested;
    }
  }

  return [];
}

function totalPages(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return 1;
  return Number(data.totalPages ?? data.TotalPages ?? 1) || 1;
}

function roleKey(role) {
  return String(role ?? "").replace(/\s+/g, "").toLowerCase();
}

function hasStaffRole(user) {
  const staffRoleKeys = new Set(STAFF_ROLE_NAMES.map(roleKey));
  return (user.roleNames ?? user.RoleNames ?? user.roles ?? user.Roles ?? []).some((role) =>
    staffRoleKeys.has(roleKey(role))
  );
}

function normalizeUser(user) {
  return {
    ...user,
    id: user.id ?? user.Id,
    userName: user.userName ?? user.UserName,
    email: user.email ?? user.Email,
    firstName: user.firstName ?? user.FirstName,
    lastName: user.lastName ?? user.LastName,
    phoneNumber: user.phoneNumber ?? user.PhoneNumber,
    departmentName: user.departmentName ?? user.DepartmentName,
    createdAt: user.createdAt ?? user.CreatedAt,
    isActive: user.isActive ?? user.IsActive,
    roleNames: user.roleNames ?? user.RoleNames ?? user.roles ?? user.Roles ?? [],
  };
}

async function fetchUsersPage(page) {
  const { data } = await api.get("/admin/users", {
    params: cleanParams({
      page,
      pageSize: 100,
    }),
  });
  return {
    items: extractArray(data),
    totalPages: totalPages(data),
  };
}

export async function fetchStaffUsers() {
  const firstPage = await fetchUsersPage(1);
  const remainingPages = Math.max(firstPage.totalPages, 1);
  const rest =
    remainingPages > 1
      ? await Promise.all(
          Array.from({ length: remainingPages - 1 }, (_, index) => fetchUsersPage(index + 2))
        )
      : [];

  const byId = new Map();

  for (const page of [firstPage, ...rest]) {
    for (const user of page.items) {
      const normalized = normalizeUser(user);
      if (hasStaffRole(normalized)) {
        byId.set(Number(normalized.id), normalized);
      }
    }
  }

  const items = [...byId.values()].sort((a, b) =>
    String(a.userName ?? "").localeCompare(String(b.userName ?? ""))
  );

  return {
    items,
  };
}

export async function fetchStaffRoles() {
  const { data } = await api.get("/admin/roles", { params: { pageSize: 100 } });
  const staffRoleKeys = new Set(STAFF_ROLE_NAMES.map(roleKey));
  return extractArray(data)
    .map((role) => ({
      ...role,
      id: role.id ?? role.Id ?? role.name ?? role.Name,
      name: role.name ?? role.Name,
    }))
    .filter((role) => staffRoleKeys.has(roleKey(role.name)));
}

export async function fetchDoctors() {
  const { data } = await api.get("/doctors");
  return extractArray(data);
}

export async function fetchNurses() {
  const { data } = await api.get("/nurses");
  return extractArray(data);
}

export async function fetchDepartments() {
  const { data } = await api.get("/departments");
  return extractArray(data);
}

export async function createDoctorStaff(body) {
  const { data } = await api.post("/admin/staff/doctors", body);
  return data;
}

export async function createNurseStaff(body) {
  const { data } = await api.post("/admin/staff/nurses", body);
  return data;
}

export async function createGeneralStaff(body) {
  const { data } = await api.post("/admin/staff/general", body);
  return data;
}

export async function updateStaffUser(id, body) {
  const { data } = await api.put(`/admin/users/${id}`, body);
  return data;
}

export async function setStaffUserActive(id, isActive) {
  await api.patch(`/admin/users/${id}/active`, { IsActive: isActive });
}

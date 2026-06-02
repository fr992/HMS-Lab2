import apiClient from "@/api/apiClient";

export async function fetchAdminDashboardData(auth) {
  const requests = {};

  if (auth.hasPermission("Patients.Read")) {
    requests.patients = apiClient.get("/patients", {
      params: { page: 1, pageSize: 25 },
    });
  }
  if (auth.hasPermission("Appointments.Read")) {
    requests.appointments = apiClient.get("/receptionist/appointments", {
      params: { from: new Date().toISOString(), page: 1, pageSize: 25 },
    });
  }
  if (auth.hasPermission("Invoices.Read")) {
    requests.invoices = apiClient.get("/invoices", {
      params: { page: 1, pageSize: 25 },
    });
  }
  if (auth.hasPermission("Payments.Read")) {
    requests.payments = apiClient.get("/payments", {
      params: { page: 1, pageSize: 25 },
    });
  }
  if (auth.hasPermission("LabRequests.Read")) {
    requests.labRequests = apiClient.get("/lab/requests", {
      params: { page: 1, pageSize: 25 },
    });
  }
  if (auth.hasPermission("NurseTasks.Read")) {
    requests.nurseTasks = apiClient.get("/nurse-tasks/my");
  }
  if (auth.hasPermission("Beds.Read")) {
    requests.beds = apiClient.get("/beds");
    requests.bedAssignments = apiClient.get("/beds/assignments/active");
  }
  if (auth.isSuperAdmin) {
    requests.users = apiClient.get("/admin/users", {
      params: { page: 1, pageSize: 25 },
    });
    requests.roles = apiClient.get("/admin/roles", {
      params: { page: 1, pageSize: 100 },
    });
  }

  return settleNamed(requests);
}

export async function fetchPatientDashboardData() {
  const now = new Date().toISOString();

  return settleNamed({
    appointments: apiClient.get("/patients/me/appointments", {
      params: { from: now, page: 1, pageSize: 25 },
    }),
    invoices: apiClient.get("/me/invoices", {
      params: { page: 1, pageSize: 25 },
    }),
    labResults: apiClient.get("/me/lab-results"),
    encounters: apiClient.get("/encounters/patient"),
    notifications: apiClient.get("/me/notifications"),
  });
}

export async function fetchNurseDashboardData(auth) {
  const requests = {
    nurseTasks: apiClient.get("/nurse-tasks/my"),
  };

  if (auth.hasPermission("Beds.Read")) {
    requests.beds = apiClient.get("/beds");
    requests.bedAssignments = apiClient.get("/beds/assignments/active");
  }

  return settleNamed(requests);
}

async function settleNamed(requests) {
  const entries = Object.entries(requests);
  const settled = await Promise.allSettled(entries.map(([, request]) => request));

  return entries.reduce((result, [key], index) => {
    const item = settled[index];
    result[key] =
      item.status === "fulfilled"
        ? { ok: true, data: item.value.data }
        : { ok: false, error: item.reason };
    return result;
  }, {});
}

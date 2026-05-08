import apiClient from "@/api/apiClient";

export async function createLabTest(body) {
  const payload = {
    testCode: body.testCode?.trim() ? body.testCode.trim() : null,
    name: body.name,
    specimenType: body.specimenType?.trim() ? body.specimenType.trim() : null,
    description: body.description?.trim() ? body.description.trim() : null,
    price: body.price ?? null,
    isActive: body.isActive ?? true,
  };

  const { data } = await apiClient.post("/admin/lab-tests", payload);
  return data;
}

export async function fetchLabTests(params = {}) {
  const query = {};
  if (params.isActive !== undefined && params.isActive !== "all") {
    query.isActive = params.isActive;
  }
  if (params.search) query.search = params.search;
  if (params.page) query.page = params.page;
  if (params.pageSize) query.pageSize = params.pageSize;

  const { data } = await apiClient.get("/admin/lab-tests", { params: query });
  return data;
}

export async function updateLabTest(id, body) {
  const payload = {
    testCode: body.testCode?.trim() ? body.testCode.trim() : null,
    name: body.name,
    specimenType: body.specimenType?.trim() ? body.specimenType.trim() : null,
    description: body.description?.trim() ? body.description.trim() : null,
    isActive: Boolean(body.isActive),
    price: body.price ?? null,
  };

  const { data } = await apiClient.put(`/admin/lab-tests/${id}`, payload);
  return data;
}

export async function deactivateLabTest(id) {
  await apiClient.delete(`/admin/lab-tests/${id}`);
}

export function getApiErrorMessage(err) {
  const d = err.response?.data;
  if (d && typeof d === "object" && "error" in d && d.error) {
    return String(d.error);
  }
  if (err.message) return err.message;
  return "Request failed";
}


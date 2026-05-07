import apiClient from "@/api/apiClient";

export async function createLabTest(body) {
  const payload = {
    name: body.name,
    description: body.description?.trim() ? body.description.trim() : null,
    price: body.Price,
  };

  const { data } = await apiClient.post("/admin/lab-tests", payload);
  return data;
}


export async function getLabTestsId(id) {
    const response = await apiClient.get(`/lab-tests/${id}`);
    return response.data;
}

export async function fetchLabTests(params = {}) {
  const query = {};
  if (params.isActive !== undefined && params.isActive !== "all") {
    query.isActive = params.isActive;
  }

   const { data } = await apiClient.get("/admin/lab-tests", { params: query });
  return data;
}

export async function updateLabTest(id, body) {
  const payload = {
    name: body.name,
    description: body.description?.trim() ? body.description.trim() : null,
    isActive: Boolean(body.isActive),
    price: body.price,
  };

  const { data } = await apiClient.put(`/admin/lab-tests/${id}`, payload);
  return data;
}

export function getApiErrorMessage(err) {
  const d = err.response?.data;
  if (d && typeof d === "object" && "error" in d && d.error) {
    return String(d.error);
  }
  if (err.message) return err.message;
  return "Request failed";
}


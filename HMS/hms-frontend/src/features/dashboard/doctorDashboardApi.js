import api from "@/api/apiClient";
import { getApiErrorMessage } from "@/features/patients/patientsApi";

export async function fetchDoctorDashboard() {
  const { data } = await api.get("/clinical/doctor/dashboard");
  return data;
}

export { getApiErrorMessage };

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/pages/auth/LoginPage";
import AdminLayout from "@/layouts/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import UsersPage from "@/pages/admin/UsersPage";
import PermissionRoute from "@/routes/PermissionRoute";
import { AuthProvider } from "@/auth/AuthContext";
import PatientsListPage from "@/patients/PatientsListPage";
import PatientCreatePage from "@/patients/PatientCreatePage";
import PatientEditPage from "@/patients/PatientEditPage";
import PatientDetailPage from "@/patients/PatientDetailPage";
import UnauthorizedPage from "@/pages/UnauthorizedPage";
import AppointmentsListPage from "@/appointments/AppointmentsListPage";
import AppointmentDetailPage from "@/appointments/AppointmentDetailPage";
import AppointmentEditPage from "@/appointments/AppointmentEditPage";
import AppointmentCreatePage from "@/appointments/AppointmentCreatePage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          <Route
            path="/admin"
            element={
              <PermissionRoute requireRole="Admin">
                <AdminLayout />
              </PermissionRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<UsersPage />} />
          </Route>

          <Route
            path="/patients"
            element={
              <PermissionRoute anyPermission={["Patients.Read"]}>
                <AdminLayout />
              </PermissionRoute>
            }
          >
            <Route index element={<PatientsListPage />} />
            <Route
              path="new"
              element={
                <PermissionRoute anyPermission={["Patients.Register"]}>
                  <PatientCreatePage />
                </PermissionRoute>
              }
            />
            <Route path=":id" element={<PatientDetailPage />} />
            <Route
              path=":id/edit"
              element={
                <PermissionRoute anyPermission={["Patients.Update"]}>
                  <PatientEditPage />
                </PermissionRoute>
              }
            />
          </Route>

          <Route
            path="/appointments"
            element={
              <PermissionRoute anyPermission={["Appointments.Read"]}>
                <AdminLayout />
              </PermissionRoute>
            }
          >
            <Route index element={<AppointmentsListPage />} />
            <Route
              path="new"
              element={
                <PermissionRoute anyPermission={["Appointments.Create"]}>
                  <AppointmentCreatePage />
                </PermissionRoute>
              }
            />
            <Route path=":id" element={<AppointmentDetailPage />} />
            <Route
              path=":id/edit"
              element={
                <PermissionRoute anyPermission={["Appointments.Create"]}>
                  <AppointmentEditPage />
                </PermissionRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

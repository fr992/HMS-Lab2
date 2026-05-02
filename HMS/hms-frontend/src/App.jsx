import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoginPage from "@/pages/auth/LoginPage";
import AdminLayout from "@/layouts/AdminLayout";
import MainLayout from "@/layouts/MainLayout";
import DashboardPage from "@/features/dashboard/DashboardPage";
import UsersPage from "@/features/users/UsersPage";
import PermissionRoute from "@/routes/PermissionRoute";
import { AuthProvider } from "@/auth/AuthContext";
import PatientsListPage from "@/features/patients/PatientsListPage";
import PatientCreatePage from "@/features/patients/PatientCreatePage";
import PatientEditPage from "@/features/patients/PatientEditPage";
import PatientDetailPage from "@/features/patients/PatientDetailPage";
import UnauthorizedPage from "@/pages/errors/UnauthorizedPage";
import AppointmentsListPage from "@/features/appointments/AppointmentsListPage";
import AppointmentDetailPage from "@/features/appointments/AppointmentDetailPage";
import AppointmentEditPage from "@/features/appointments/AppointmentEditPage";
import AppointmentCreatePage from "@/features/appointments/AppointmentCreatePage";
import AppointmentRequestsPage from "@/features/appointmentRequests/AppointmentRequestsPage";
import LandingPage from "@/pages/home/LandingPage";
import EncountersListPage from "@/features/encounters/EncountersListPage";
import EncounterPanelPage from "@/features/encounters/EncounterPanelPage";


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<LandingPage />} />
          </Route>
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
            <Route path="dashboard" element={<DashboardPage />} />
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

          <Route
            path="/appointment-requests"
            element={
              <PermissionRoute anyPermission={["Appointments.Read"]}>
                <AdminLayout />
              </PermissionRoute>
            }
          >
            <Route index element={<AppointmentRequestsPage />} />
          </Route>

          <Route
            path="/doctor/encounters"
            element={
              <PermissionRoute anyPermission={["Encounters.Read"]}>
                <AdminLayout />
              </PermissionRoute>
            }
          >
            <Route index element={<EncountersListPage />} />
            <Route path=":encounterId" element={<EncounterPanelPage />} />
          </Route>
          
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

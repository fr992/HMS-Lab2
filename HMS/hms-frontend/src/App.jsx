import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoginPage from "@/pages/auth/LoginPage";
import AdminLayout from "@/layouts/AdminLayout";
import MainLayout from "@/layouts/MainLayout";
import DashboardPage from "@/features/dashboard/DashboardPage";
import DoctorDashboardPage from "@/features/dashboard/DoctorDashboardPage";
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
import PatientEncounterDiagnosesPage from "@/features/encounters/PatientEncounterDiagnosesPage";
import PatientEncountersListPage from "@/features/encounters/PatientEncountersListPage";
import MedicationsPage from "@/features/medications/MedicationsPage";
import LabTestPage from "@/features/labtests/LabTests";


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
            <Route
              path="encounters"
              element={
                <PermissionRoute anyPermission={["Encounters.Read"]}>
                  <EncountersListPage />
                </PermissionRoute>
              }
            />
            <Route
              path="encounters/:encounterId"
              element={
                <PermissionRoute anyPermission={["Encounters.Read"]}>
                  <EncounterPanelPage />
                </PermissionRoute>
              }
            />
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
            path="/medications"
            element={
              <PermissionRoute anyPermission={["Medications.Read"]}>
                <AdminLayout />
              </PermissionRoute>
            }
          >
            <Route index element={<MedicationsPage />} />
          </Route>

          <Route
            path="/doctor"
            element={
              <PermissionRoute requireRole="Doctor">
                <AdminLayout />
              </PermissionRoute>
            }
          >
            <Route
              path="dashboard"
              element={
                <PermissionRoute anyPermission={["Patients.Read"]}>
                  <DoctorDashboardPage />
                </PermissionRoute>
              }
            />
            <Route
              path="encounters"
              element={
                <PermissionRoute anyPermission={["Encounters.Read"]}>
                  <EncountersListPage />
                </PermissionRoute>
              }
            />
            <Route
              path="encounters/:encounterId"
              element={
                <PermissionRoute anyPermission={["Encounters.Read"]}>
                  <EncounterPanelPage />
                </PermissionRoute>
              }
            />
          </Route>

          <Route
              path="/patient/encounters"
              element={
                <PermissionRoute requireRole="Patient">
                  <AdminLayout />
                </PermissionRoute>
              }
            >
              <Route index element={<PatientEncountersListPage />} />
              <Route
                path=":encounterId/diagnoses"
                element={<PatientEncounterDiagnosesPage />}
              />
          </Route>
  
          <Route
              path="/admin/laboratory"
              element={
                <PermissionRoute requireRole="Admin">
                  <AdminLayout />
                </PermissionRoute>
              }
            >
              <Route index element={<LabTestPage />} />
            </Route>

          
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

import { BrowserRouter, Route, Routes } from "react-router-dom";
import LoginPage from "@/pages/auth/LoginPage";
import AdminLayout from "@/layouts/AdminLayout";
import MainLayout from "@/layouts/MainLayout";
import DoctorDashboardPage from "@/features/dashboard/DoctorDashboardPage";
import AdminOverviewDashboard from "@/features/dashboard/AdminOverviewDashboard";
import PatientDashboardPage from "@/features/dashboard/PatientDashboardPage";
import NurseDashboardPage from "@/features/dashboard/NurseDashboardPage";
import UsersPage from "@/features/users/UsersPage";
import RolesPage from "@/features/roles/RolesPage";
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
import LabRequestsPage from "@/features/labRequests/LabRequestsPage";
import LabRequestDetailPage from "@/features/labRequests/LabRequestDetailPage";
import NurseTasksPage from "@/features/nurseTasks/NurseTasksPage";
import BedAssignmentsPage from "@/features/bedAssignments/BedAssignmentsPage";
import StaffManagementPage from "@/features/staff/StaffManagementPage";
import InvoicesListPage from "@/features/invoices/InvoicesListPage";
import InvoiceDetailPage from "@/features/invoices/InvoiceDetailPage";
import PaymentsPage from "@/features/payments/PaymentsPage";
import SettingsPage from "@/features/settings/SettingsPage";
import NotificationsPage from "@/features/notifications/NotificationsPage";


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
            path="/notifications"
            element={
              <PermissionRoute>
                <AdminLayout />
              </PermissionRoute>
            }
          >
            <Route index element={<NotificationsPage />} />
          </Route>

          <Route
            path="/admin"
            element={
              <PermissionRoute requireRole="Admin">
                <AdminLayout />
              </PermissionRoute>
            }
          >
            <Route path="dashboard" element={<AdminOverviewDashboard />} />
            <Route
              path="users"
              element={
                <PermissionRoute requireRole="SuperAdmin">
                  <UsersPage />
                </PermissionRoute>
              }
            />
            <Route
              path="roles"
              element={
                <PermissionRoute requireRole="SuperAdmin">
                  <RolesPage />
                </PermissionRoute>
              }
            />
            <Route
              path="settings"
              element={
                <PermissionRoute anyPermission={["Settings.Manage"]}>
                  <SettingsPage />
                </PermissionRoute>
              }
            />
            <Route
              path="staff"
              element={
                <PermissionRoute requireRole="SuperAdmin">
                  <StaffManagementPage />
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
            path="/lab-tests"
            element={
              <PermissionRoute anyPermission={["LabTests.Read"]}>
                <AdminLayout />
              </PermissionRoute>
            }
          >
            <Route index element={<LabTestPage />} />
          </Route>

          <Route
            path="/lab-requests"
            element={
              <PermissionRoute anyPermission={["LabRequests.Read"]}>
                <AdminLayout />
              </PermissionRoute>
            }
          >
            <Route index element={<LabRequestsPage />} />
            <Route path=":requestNumber/:id" element={<LabRequestDetailPage />} />
          </Route>

          <Route
            path="/nurse-tasks"
            element={
              <PermissionRoute anyPermission={["NurseTasks.Read"]}>
                <AdminLayout />
              </PermissionRoute>
            }
          >
            <Route index element={<NurseTasksPage />} />
          </Route>

          <Route
            path="/bed-assignments"
            element={
              <PermissionRoute anyPermission={["Beds.Read"]}>
                <AdminLayout />
              </PermissionRoute>
            }
          >
            <Route index element={<BedAssignmentsPage />} />
          </Route>

          <Route
            path="/invoices"
            element={
              <PermissionRoute anyPermission={["Invoices.Read"]}>
                <AdminLayout />
              </PermissionRoute>
            }
          >
            <Route index element={<InvoicesListPage />} />
            <Route path=":id" element={<InvoiceDetailPage />} />
          </Route>

          <Route
            path="/payments"
            element={
              <PermissionRoute anyPermission={["Payments.Read"]}>
                <AdminLayout />
              </PermissionRoute>
            }
          >
            <Route index element={<PaymentsPage />} />
          </Route>

          <Route
            path="/staff/dashboard"
            element={
              <PermissionRoute
                anyPermission={[
                  "Patients.Read",
                  "Appointments.Read",
                  "Invoices.Read",
                  "Payments.Read",
                  "LabRequests.Read",
                  "LabResults.Read",
                  "Beds.Read",
                ]}
              >
                <AdminLayout />
              </PermissionRoute>
            }
          >
            <Route index element={<AdminOverviewDashboard />} />
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
            path="/nurse"
            element={
              <PermissionRoute anyRole={["Nurse", "Infermier"]}>
                <AdminLayout />
              </PermissionRoute>
            }
          >
            <Route
              path="dashboard"
              element={
                <PermissionRoute anyPermission={["NurseTasks.Read"]}>
                  <NurseDashboardPage />
                </PermissionRoute>
              }
            />
          </Route>

          <Route
              path="/patient"
              element={
                <PermissionRoute requireRole="Patient">
                  <AdminLayout />
                </PermissionRoute>
              }
            >
              <Route path="dashboard" element={<PatientDashboardPage />} />
              <Route path="encounters" element={<PatientEncountersListPage />} />
              <Route
                path="encounters/:encounterId/diagnoses"
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

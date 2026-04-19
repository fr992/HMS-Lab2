import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "@/pages/auth/LoginPage";
import AdminLayout from "@/layouts/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import UsersPage from "@/pages/admin/UsersPage";
import ProtectedRoute from "@/routes/ProtectedRoute";
import { AuthProvider } from "@/auth/AuthContext";
import { Navigate } from "react-router-dom";

export default function App(){
  return (
    <AuthProvider>
      <BrowserRouter>

        <Routes>

          <Route path="/" element={<Navigate to="/login" replace />} />
          {/* Public */ }
          <Route path="/login" element={<LoginPage />} />

          {/* Admin Area */}
          <Route path="/admin" 
            element={
            // <ProtectedRoute role="Admin">
               <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          } 
        >

          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<UsersPage />} />
         </Route>
           <Route path="/unauthorized" element={<h1>403 - Nuk ke qasje</h1>} />
        </Routes>

      </BrowserRouter>
    </AuthProvider>
  );
}
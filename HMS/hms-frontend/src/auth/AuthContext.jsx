import { createContext, useContext, useState } from "react";
import { hasSession } from "./session";
import { jwtDecode } from "jwt-decode";
import { logout as clearAuthService } from "./authService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(hasSession());
  const [userRole, setUserRole] = useState(null);

  function loginSuccess(token) {
    const decoded = jwtDecode(token);

    const role =
      decoded.role ||
      decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
      null;

    setUserRole(role);
    setIsAuthenticated(true);
  }

  function logout() {
    clearAuthService();
    setIsAuthenticated(false);
    setUserRole(null);
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, userRole, loginSuccess, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
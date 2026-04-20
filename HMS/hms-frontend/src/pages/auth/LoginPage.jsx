import { useState } from 'react';
import { login } from "@/auth/authService";
import { useAuth } from "@/auth/AuthContext";
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";

export default function LoginPage(){

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const auth = useAuth();
    const navigate = useNavigate();

    async function handleLogin() {
        try {
            const data = await login(username, password);

            auth.loginSuccess(data.accessToken);

            const decoded = jwtDecode(data.accessToken);

            const role =
                decoded.role ||
                decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];

            if (role === "Admin") {
                navigate("/admin/dashboard");
            }
            else if (role === "User") {
                navigate("/user/dashboard");
            }
            else if (role === "Doctor") {
                navigate("/doctor/patients");
            }
            else {
                navigate("/login");
            }

        } catch (error) {
            console.error("Login error:", error);

            if (error.response) {
                alert(`Login failed: ${error.response.status}`);
            } else {
                alert("Login failed.");
            }
        }
    }

    return (
        <div>
            <h2>Login</h2>
            <input 
                placeholder="Username or email"
                onChange={(e) => setUsername(e.target.value)}/>

            <input
                type="password"
                placeholder="Password"
                onChange={(e) => setPassword(e.target.value)}/>

                <button onClick={handleLogin}>
                    Login
                </button>
        </div>
    );
}
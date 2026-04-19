import { useState } from 'react';
import { login } from "@/auth/authService";
import { useAuth } from "@/auth/AuthContext";
import { useNavigate } from 'react-router-dom';

export default function LoginPage(){

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const auth = useAuth();
    const navigate = useNavigate();

async function handleLogin() {
  try {
    const data = await login(username, password);

    auth.loginSuccess(data.accessToken);
    navigate("/admin/dashboard");
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
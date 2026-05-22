import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import "./App.css";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const ACCESS_TOKEN_KEY = "pms_access_token";

export type AuthUser = {
    id: number;
    email: string;
    display_name: string;
    auth_provider: string;
    provider_user_id: string;
    is_active: boolean;
};

export default function App() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadCurrentUser = async () => {
            const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error("Token is invalid.");
                }

                setUser((await response.json()) as AuthUser);
            } catch (error) {
                console.error(error);
                window.localStorage.removeItem(ACCESS_TOKEN_KEY);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        void loadCurrentUser();
    }, []);

    if (loading) return null;

    return (
        <Routes>
            <Route path="/" element={<Home user={user} onLogout={() => setUser(null)} />} />
            <Route path="/login" element={!user ? <Login onLogin={setUser} /> : <Navigate to="/" replace />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

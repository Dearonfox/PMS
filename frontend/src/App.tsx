import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { Navigate, Route, Routes } from "react-router-dom";

import "./App.css";
import { auth } from "./firebase";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const BACKEND_USER_ID_KEY = "pms_backend_user_id";

export default function App() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const syncUserToBackend = async (firebaseUser: User) => {
            const primaryProvider = firebaseUser.providerData[0];
            const providerId = primaryProvider?.providerId ?? "firebase";
            const providerUserId = primaryProvider?.uid ?? firebaseUser.uid;
            const displayName = firebaseUser.displayName ?? firebaseUser.email?.split("@")[0] ?? "PMS User";

            if (!firebaseUser.email) {
                window.localStorage.removeItem(BACKEND_USER_ID_KEY);
                return;
            }

            const response = await fetch(`${API_BASE_URL}/users/sync`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: firebaseUser.email,
                    display_name: displayName,
                    auth_provider: providerId,
                    provider_user_id: providerUserId,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to sync user with backend.");
            }

            const backendUser = (await response.json()) as { id: number };
            window.localStorage.setItem(BACKEND_USER_ID_KEY, String(backendUser.id));
        };

        const unsub = onAuthStateChanged(auth, (firebaseUser) => {
            void (async () => {
                try {
                    if (firebaseUser) {
                        await syncUserToBackend(firebaseUser);
                        setUser(firebaseUser);
                    } else {
                        window.localStorage.removeItem(BACKEND_USER_ID_KEY);
                        setUser(null);
                    }
                } catch (error) {
                    console.error(error);
                    setUser(firebaseUser);
                } finally {
                    setLoading(false);
                }
            })();
        });

        return () => unsub();
    }, []);

    if (loading) return null;

    return (
        <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

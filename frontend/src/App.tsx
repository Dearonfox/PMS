// src/App.tsx
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./pages/Login";
import Home from "./pages/Home";
import "./App.css";
import Signup from "./pages/Signup"; // ✅ 추가
import { Routes, Route, Navigate } from "react-router-dom";

export default function App() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    if (loading) return null;

    return (
        <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
            <Route path="/signup" element={ <Signup />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

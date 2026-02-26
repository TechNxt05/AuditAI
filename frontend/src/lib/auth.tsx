"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "./api";

interface User {
    id: string;
    email: string;
    plan_tier: string;
    execution_count: number;
}

interface AuthCtx {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthCtx>({
    user: null,
    loading: true,
    login: async () => { },
    register: async () => { },
    logout: () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("auditai_token");
        if (token) {
            api.getMe().then(setUser).catch(() => localStorage.removeItem("auditai_token")).finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email: string, password: string) => {
        const data = await api.login(email, password);
        localStorage.setItem("auditai_token", data.access_token);
        const me = await api.getMe();
        setUser(me);
    };

    const register = async (email: string, password: string) => {
        await api.register(email, password);
        await login(email, password);
    };

    const logout = () => {
        localStorage.removeItem("auditai_token");
        setUser(null);
        window.location.href = "/login";
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

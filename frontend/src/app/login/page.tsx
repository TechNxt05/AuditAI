"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { Shield, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(email, password);
            window.location.href = "/dashboard";
        } catch (err: any) {
            setError(err.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            {/* Background gradient orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px]"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px]"></div>
            </div>

            <div className="glass-card p-8 w-full max-w-md animate-in relative z-10">
                <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold gradient-text">Welcome back</h1>
                    <p className="text-gray-400 text-sm mt-1">Sign in to AuditAI</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="glass-input"
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400 mb-1 block">Password</label>
                        <div className="relative">
                            <input
                                type={showPwd ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="glass-input pr-10"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPwd(!showPwd)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                            >
                                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <button type="submit" className="glow-btn w-full" disabled={loading}>
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                <p className="text-center text-gray-500 text-sm mt-6">
                    Don&apos;t have an account?{" "}
                    <Link href="/register" className="text-indigo-400 hover:text-indigo-300">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}

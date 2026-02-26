"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { LayoutDashboard, FolderKanban, AlertTriangle, LogOut, Shield, Zap } from "lucide-react";
import { ReactNode } from "react";

const NAV = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/risks", label: "Risk Insights", icon: AlertTriangle },
];

export default function Sidebar({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/5 bg-gray-950/80 backdrop-blur-xl flex flex-col fixed h-full z-50">
                {/* Logo */}
                <Link href="/dashboard" className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg gradient-text">AuditAI</h1>
                        <p className="text-[10px] text-gray-500 -mt-0.5">Datadog for LLM Agents</p>
                    </div>
                </Link>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {NAV.map((item) => {
                        const active = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`sidebar-link ${active ? "active" : ""}`}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="text-sm font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User info */}
                <div className="border-t border-white/5 p-4">
                    {user && (
                        <div className="flex items-center justify-between">
                            <div className="min-w-0">
                                <p className="text-sm text-white truncate">{user.email}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <Zap className="w-3 h-3 text-indigo-400" />
                                    <span className="text-xs text-gray-400 capitalize">{user.plan_tier}</span>
                                </div>
                            </div>
                            <button onClick={logout} className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="Logout">
                                <LogOut className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 ml-64 p-8">{children}</main>
        </div>
    );
}

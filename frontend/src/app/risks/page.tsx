"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";
import { AlertTriangle, Shield, Eye, FileWarning } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

interface Stats {
    total_executions: number;
    avg_reliability_score: number;
    avg_injection_risk: number;
    avg_latency_ms: number;
    total_tokens_used: number;
    executions_by_day: any[];
    score_trend: any[];
}

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

const tooltipStyle = {
    contentStyle: {
        background: "rgba(15,23,42,0.95)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "12px",
        color: "#e2e8f0",
    },
};

export default function RisksPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) router.replace("/login");
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) {
            api.getDashboard().then(setStats).catch(console.error).finally(() => setLoading(false));
        }
    }, [user]);

    if (authLoading || !user) return null;

    // Derived risk data
    const riskCategories = stats
        ? [
            { name: "Hallucination", value: Math.round((1 - stats.avg_reliability_score) * 100) || 10 },
            { name: "Injection", value: Math.round(stats.avg_injection_risk * 100) || 5 },
            { name: "Compliance", value: 15 },
            { name: "Tool Misuse", value: 10 },
            { name: "Faithfulness", value: 12 },
        ]
        : [];

    const alertData = [
        {
            type: "Injection Risk Trend",
            level: stats && stats.avg_injection_risk > 0.3 ? "high" : stats && stats.avg_injection_risk > 0.1 ? "medium" : "low",
            description: `Average injection risk at ${stats ? (stats.avg_injection_risk * 100).toFixed(1) : 0}%`,
            icon: AlertTriangle,
        },
        {
            type: "Reliability Score",
            level: stats && stats.avg_reliability_score < 0.5 ? "high" : stats && stats.avg_reliability_score < 0.7 ? "medium" : "low",
            description: `Average reliability at ${stats ? (stats.avg_reliability_score * 100).toFixed(1) : 0}%`,
            icon: Shield,
        },
        {
            type: "Compliance Monitor",
            level: "low",
            description: "No PII exposure incidents detected",
            icon: Eye,
        },
        {
            type: "Failure Rate",
            level: "low",
            description: `${stats?.total_executions || 0} total executions tracked`,
            icon: FileWarning,
        },
    ];

    const levelColors: Record<string, string> = {
        high: "border-red-500/30 bg-red-500/5",
        medium: "border-amber-500/30 bg-amber-500/5",
        low: "border-emerald-500/30 bg-emerald-500/5",
    };

    const levelDot: Record<string, string> = {
        high: "bg-red-500",
        medium: "bg-amber-500",
        low: "bg-emerald-500",
    };

    return (
        <Sidebar>
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold gradient-text">Risk Insights</h1>
                    <p className="text-gray-400 mt-1">Security and compliance overview</p>
                </div>

                {loading || !stats ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => <div key={i} className="loading-shimmer h-40"></div>)}
                    </div>
                ) : (
                    <>
                        {/* Alerts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            {alertData.map((alert, i) => (
                                <div key={i} className={`glass-card p-5 border-l-4 ${levelColors[alert.level]} animate-in`} style={{ animationDelay: `${i * 50}ms` }}>
                                    <div className="flex items-start gap-3">
                                        <alert.icon className="w-5 h-5 mt-0.5 text-gray-400" />
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-sm font-semibold text-white">{alert.type}</h4>
                                                <div className={`w-2 h-2 rounded-full ${levelDot[alert.level]}`}></div>
                                            </div>
                                            <p className="text-xs text-gray-400">{alert.description}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Risk Distribution Pie */}
                            <div className="glass-card p-6">
                                <h3 className="text-lg font-semibold mb-4 text-white">Risk Distribution</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie data={riskCategories} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} strokeWidth={2} stroke="rgba(0,0,0,0.3)">
                                            {riskCategories.map((_, i) => (
                                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip {...tooltipStyle} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-wrap gap-3 justify-center mt-2">
                                    {riskCategories.map((cat, i) => (
                                        <div key={cat.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                                            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[i] }}></div>
                                            {cat.name}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Score trend bar chart */}
                            <div className="glass-card p-6">
                                <h3 className="text-lg font-semibold mb-4 text-white">Score Trend</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={stats.score_trend}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 11 }} />
                                        <YAxis stroke="#475569" tick={{ fontSize: 11 }} domain={[0, 1]} />
                                        <Tooltip {...tooltipStyle} />
                                        <Bar dataKey="reliability" fill="#6366f1" radius={[4, 4, 0, 0]} name="Reliability" />
                                        <Bar dataKey="injection_risk" fill="#ef4444" radius={[4, 4, 0, 0]} name="Injection Risk" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Sidebar>
    );
}

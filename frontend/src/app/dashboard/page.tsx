"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";
import { Activity, Shield, AlertTriangle, Clock, Coins, TrendingUp } from "lucide-react";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line,
} from "recharts";

interface Stats {
    total_executions: number;
    avg_reliability_score: number;
    avg_injection_risk: number;
    avg_latency_ms: number;
    total_tokens_used: number;
    executions_by_day: { date: string; count: number }[];
    score_trend: { date: string; reliability: number; injection_risk: number }[];
}

function ScoreColor({ score }: { score: number }) {
    if (score >= 0.7) return <span className="score-badge score-high">{(score * 100).toFixed(1)}%</span>;
    if (score >= 0.4) return <span className="score-badge score-medium">{(score * 100).toFixed(1)}%</span>;
    return <span className="score-badge score-low">{(score * 100).toFixed(1)}%</span>;
}

function StatCard({ icon: Icon, label, value, sub, color }: {
    icon: any; label: string; value: string; sub?: string; color: string;
}) {
    return (
        <div className="glass-card p-5 animate-in">
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm text-gray-400">{label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
    );
}

const tooltipStyle = {
    contentStyle: {
        background: "rgba(15,23,42,0.95)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "12px",
        color: "#e2e8f0",
    },
};

export default function DashboardPage() {
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

    return (
        <Sidebar>
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
                    <p className="text-gray-400 mt-1">Overview of your AI system&apos;s reliability</p>
                </div>

                {loading || !stats ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="loading-shimmer h-32"></div>
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Stat Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                            <StatCard icon={Activity} label="Total Executions" value={stats.total_executions.toLocaleString()} color="bg-indigo-600/80" />
                            <StatCard icon={Shield} label="Avg Reliability" value={`${(stats.avg_reliability_score * 100).toFixed(1)}%`} color="bg-emerald-600/80" />
                            <StatCard icon={AlertTriangle} label="Injection Risk" value={`${(stats.avg_injection_risk * 100).toFixed(1)}%`} color="bg-amber-600/80" />
                            <StatCard icon={Clock} label="Avg Latency" value={`${stats.avg_latency_ms.toFixed(0)}ms`} color="bg-blue-600/80" />
                            <StatCard icon={Coins} label="Total Tokens" value={stats.total_tokens_used.toLocaleString()} color="bg-purple-600/80" />
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Executions over time */}
                            <div className="glass-card p-6">
                                <h3 className="text-lg font-semibold mb-4 text-white">Executions Over Time</h3>
                                <ResponsiveContainer width="100%" height={280}>
                                    <AreaChart data={stats.executions_by_day}>
                                        <defs>
                                            <linearGradient id="execGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                                                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 11 }} />
                                        <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
                                        <Tooltip {...tooltipStyle} />
                                        <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#execGrad)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Score Trend */}
                            <div className="glass-card p-6">
                                <h3 className="text-lg font-semibold mb-4 text-white">Score Trends</h3>
                                <ResponsiveContainer width="100%" height={280}>
                                    <LineChart data={stats.score_trend}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 11 }} />
                                        <YAxis stroke="#475569" tick={{ fontSize: 11 }} domain={[0, 1]} />
                                        <Tooltip {...tooltipStyle} />
                                        <Line type="monotone" dataKey="reliability" stroke="#22c55e" strokeWidth={2} dot={false} name="Reliability" />
                                        <Line type="monotone" dataKey="injection_risk" stroke="#ef4444" strokeWidth={2} dot={false} name="Injection Risk" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Sidebar>
    );
}

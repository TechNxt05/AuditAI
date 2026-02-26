"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Play, Zap, Clock, Hash, CheckCircle, XCircle } from "lucide-react";

interface Execution {
    id: string;
    model_name: string;
    total_tokens: number;
    latency_ms: number;
    status: string;
    created_at: string;
}

interface Project {
    id: string;
    name: string;
}

export default function ProjectDetailPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;
    const [project, setProject] = useState<Project | null>(null);
    const [executions, setExecutions] = useState<Execution[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");

    useEffect(() => {
        if (!authLoading && !user) router.replace("/login");
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user && projectId) {
            Promise.all([
                api.listExecutions(projectId),
                api.listProjects(),
            ]).then(([execs, projects]) => {
                setExecutions(execs);
                const p = projects.find((pr: Project) => pr.id === projectId);
                if (p) setProject(p);
            }).catch(console.error).finally(() => setLoading(false));
        }
    }, [user, projectId]);

    const filtered = filter === "all"
        ? executions
        : executions.filter((e) => e.status === filter);

    if (authLoading || !user) return null;

    return (
        <Sidebar>
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => router.push("/projects")} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold gradient-text">{project?.name || "Project"}</h1>
                        <p className="text-gray-400 mt-1">Execution history and analysis</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-6">
                    {["all", "success", "failure"].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f
                                    ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                                    : "bg-white/3 text-gray-400 border border-white/5 hover:bg-white/5"
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => <div key={i} className="loading-shimmer h-20"></div>)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <Play className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg">No executions found</p>
                        <p className="text-gray-500 text-sm mt-1">Send traces via SDK or API to see them here</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((exec, i) => (
                            <Link
                                key={exec.id}
                                href={`/executions/${exec.id}`}
                                className="glass-card p-4 flex items-center justify-between animate-in block"
                                style={{ animationDelay: `${i * 30}ms` }}
                            >
                                <div className="flex items-center gap-4">
                                    {exec.status === "success" ? (
                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-red-400" />
                                    )}
                                    <div>
                                        <p className="text-sm font-mono text-gray-300">{exec.id.slice(0, 8)}...</p>
                                        <p className="text-xs text-gray-500">{new Date(exec.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                        <Zap className="w-3.5 h-3.5" />
                                        {exec.model_name || "—"}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                        <Hash className="w-3.5 h-3.5" />
                                        {exec.total_tokens.toLocaleString()} tokens
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                        <Clock className="w-3.5 h-3.5" />
                                        {exec.latency_ms.toFixed(0)}ms
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </Sidebar>
    );
}

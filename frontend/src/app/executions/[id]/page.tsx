"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft, Play, Shield, AlertTriangle, CheckCircle,
    FileText, Wrench, MessageSquare, Bot, RefreshCw
} from "lucide-react";
import {
    ReactFlow, Background, Controls, MarkerType,
    type Node, type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

interface TraceStep {
    id: string;
    step_order: number;
    step_type: string;
    content: any;
    latency_ms: number;
}

interface Execution {
    id: string;
    project_id: string;
    model_name: string;
    total_tokens: number;
    latency_ms: number;
    status: string;
    created_at: string;
    trace_steps: TraceStep[];
}

interface Evaluation {
    hallucination_score: number;
    faithfulness_score: number;
    injection_risk_score: number;
    compliance_score: number;
    tool_usage_score: number;
    overall_score: number;
    failure_taxonomy: any;
}

interface AdversarialTest {
    test_type: string;
    result_score: number;
    details: any;
}

const stepIcon: Record<string, any> = {
    prompt: MessageSquare,
    system_prompt: Shield,
    retrieval: FileText,
    tool_call: Wrench,
    tool_output: CheckCircle,
    response: Bot,
};

const stepColor: Record<string, string> = {
    prompt: "#6366f1",
    system_prompt: "#8b5cf6",
    retrieval: "#3b82f6",
    tool_call: "#f59e0b",
    tool_output: "#22c55e",
    response: "#ec4899",
};

function buildFlowGraph(steps: TraceStep[]): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = steps.map((step, i) => ({
        id: step.id,
        position: { x: 60, y: i * 120 },
        data: {
            label: (
                <div className="text-left min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: stepColor[step.step_type] || "#666" }}></div>
                        <span className="font-bold text-xs uppercase tracking-wide" style={{ color: stepColor[step.step_type] }}>
                            {step.step_type.replace("_", " ")}
                        </span>
                        <span className="text-[10px] text-gray-500 ml-auto">{step.latency_ms.toFixed(0)}ms</span>
                    </div>
                    <p className="text-xs text-gray-300 line-clamp-2">
                        {step.content?.text || JSON.stringify(step.content).slice(0, 100)}
                    </p>
                </div>
            ),
        },
        type: "default",
    }));

    const edges: Edge[] = steps.slice(1).map((step, i) => ({
        id: `e-${steps[i].id}-${step.id}`,
        source: steps[i].id,
        target: step.id,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
        style: { stroke: "#6366f1", strokeWidth: 2 },
    }));

    return { nodes, edges };
}

const tooltipStyle = {
    contentStyle: {
        background: "rgba(15,23,42,0.95)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "12px",
        color: "#e2e8f0",
    },
};

export default function ExecutionDetailPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const executionId = params.id as string;

    const [execution, setExecution] = useState<Execution | null>(null);
    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [adversarial, setAdversarial] = useState<AdversarialTest[]>([]);
    const [loading, setLoading] = useState(true);
    const [evaluating, setEvaluating] = useState(false);
    const [runningAdv, setRunningAdv] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) router.replace("/login");
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user && executionId) {
            api.getExecution(executionId)
                .then(setExecution)
                .catch(console.error)
                .finally(() => setLoading(false));
            api.getAdversarial(executionId).then(setAdversarial).catch(() => { });
        }
    }, [user, executionId]);

    const handleEvaluate = async () => {
        setEvaluating(true);
        try {
            const ev = await api.evaluate(executionId);
            setEvaluation(ev);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setEvaluating(false);
        }
    };

    const handleAdversarial = async () => {
        setRunningAdv(true);
        try {
            const tests = await api.runAdversarial(executionId);
            setAdversarial(tests);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setRunningAdv(false);
        }
    };

    if (authLoading || !user || loading) return null;
    if (!execution) return <Sidebar><p className="text-gray-400">Execution not found</p></Sidebar>;

    const { nodes, edges } = buildFlowGraph(execution.trace_steps);

    const radarData = evaluation
        ? [
            { metric: "Hallucination", score: evaluation.hallucination_score },
            { metric: "Faithfulness", score: evaluation.faithfulness_score },
            { metric: "Injection Safety", score: 1 - evaluation.injection_risk_score },
            { metric: "Tool Usage", score: evaluation.tool_usage_score },
            { metric: "Compliance", score: evaluation.compliance_score },
        ]
        : [];

    return (
        <Sidebar>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-400" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold gradient-text">Execution Detail</h1>
                            <p className="text-gray-500 text-sm font-mono">{execution.id}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleEvaluate} className="glow-btn flex items-center gap-2" disabled={evaluating}>
                            <Shield className="w-4 h-4" />
                            {evaluating ? "Evaluating..." : "Evaluate"}
                        </button>
                        <button onClick={handleAdversarial} className="glow-btn flex items-center gap-2 !bg-gradient-to-r !from-amber-600 !to-red-600" disabled={runningAdv}>
                            <AlertTriangle className="w-4 h-4" />
                            {runningAdv ? "Testing..." : "Adversarial Test"}
                        </button>
                    </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="glass-card p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">Model</p>
                        <p className="text-sm font-semibold text-indigo-300">{execution.model_name || "—"}</p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">Tokens</p>
                        <p className="text-sm font-semibold text-white">{execution.total_tokens.toLocaleString()}</p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">Latency</p>
                        <p className="text-sm font-semibold text-white">{execution.latency_ms.toFixed(0)}ms</p>
                    </div>
                    <div className="glass-card p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">Status</p>
                        <span className={`score-badge ${execution.status === "success" ? "score-high" : "score-low"}`}>
                            {execution.status}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Trace Flow Graph */}
                    <div className="glass-card p-4" style={{ height: Math.max(400, execution.trace_steps.length * 120 + 60) }}>
                        <h3 className="text-lg font-semibold mb-3 text-white">Execution Trace</h3>
                        <div style={{ height: Math.max(340, execution.trace_steps.length * 120) }}>
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                fitView
                                proOptions={{ hideAttribution: true }}
                            >
                                <Background color="#1e293b" gap={20} />
                                <Controls className="!bg-gray-900 !border-gray-700 !rounded-xl" />
                            </ReactFlow>
                        </div>
                    </div>

                    {/* Evaluation Radar */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold mb-3 text-white">Evaluation Breakdown</h3>
                        {evaluation ? (
                            <>
                                <div className="text-center mb-4">
                                    <span className="text-4xl font-bold gradient-text">
                                        {(evaluation.overall_score * 100).toFixed(1)}%
                                    </span>
                                    <p className="text-sm text-gray-400 mt-1">Overall Reliability Score</p>
                                </div>
                                <ResponsiveContainer width="100%" height={280}>
                                    <RadarChart data={radarData}>
                                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                        <PolarAngleAxis dataKey="metric" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                                        <PolarRadiusAxis angle={90} domain={[0, 1]} tick={false} axisLine={false} />
                                        <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} strokeWidth={2} />
                                    </RadarChart>
                                </ResponsiveContainer>

                                {/* Failure Taxonomy */}
                                {evaluation.failure_taxonomy && Object.keys(evaluation.failure_taxonomy).length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="text-sm font-semibold text-gray-300 mb-2">Failure Taxonomy</h4>
                                        <div className="space-y-2">
                                            {Object.entries(evaluation.failure_taxonomy).map(([key, val]: [string, any]) => (
                                                <div key={key}>
                                                    {Array.isArray(val) && val.length > 0 && (
                                                        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-2">
                                                            <p className="text-xs font-semibold text-red-400 capitalize">{key.replace(/_/g, " ")}</p>
                                                            {val.map((issue: string, i: number) => (
                                                                <p key={i} className="text-xs text-gray-400 mt-1">• {issue}</p>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                                <Shield className="w-12 h-12 mb-3 opacity-30" />
                                <p className="text-sm">Click &quot;Evaluate&quot; to run analysis</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Adversarial Test Results */}
                {adversarial.length > 0 && (
                    <div className="glass-card p-6 mb-8">
                        <h3 className="text-lg font-semibold mb-4 text-white">Adversarial Test Results</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {adversarial.map((test) => (
                                <div key={test.test_type} className="bg-white/2 rounded-xl p-4 border border-white/5">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-sm font-semibold text-white capitalize">{test.test_type.replace(/_/g, " ")}</h4>
                                        <span className={`score-badge ${test.result_score >= 0.7 ? "score-high" : test.result_score >= 0.4 ? "score-medium" : "score-low"
                                            }`}>
                                            {(test.result_score * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    {test.details?.vulnerability && (
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${test.details.vulnerability === "low"
                                                ? "bg-emerald-500/10 text-emerald-400"
                                                : test.details.vulnerability === "medium"
                                                    ? "bg-amber-500/10 text-amber-400"
                                                    : "bg-red-500/10 text-red-400"
                                            }`}>
                                            {test.details.vulnerability} risk
                                        </span>
                                    )}
                                    <div className="mt-2 space-y-1">
                                        {Object.entries(test.details)
                                            .filter(([k]) => k !== "vulnerability")
                                            .slice(0, 4)
                                            .map(([key, val]) => (
                                                <div key={key} className="flex justify-between text-xs">
                                                    <span className="text-gray-500">{key.replace(/_/g, " ")}</span>
                                                    <span className="text-gray-300 font-mono">
                                                        {typeof val === "number" ? val.toFixed(4) : String(val).slice(0, 40)}
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Trace Steps Detail */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-4 text-white">Trace Steps</h3>
                    <div className="space-y-3">
                        {execution.trace_steps.map((step) => {
                            const Icon = stepIcon[step.step_type] || FileText;
                            return (
                                <div key={step.id} className="bg-white/2 rounded-xl p-4 border border-white/5">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Icon className="w-4 h-4" style={{ color: stepColor[step.step_type] }} />
                                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: stepColor[step.step_type] }}>
                                            {step.step_type.replace("_", " ")}
                                        </span>
                                        <span className="text-xs text-gray-500 ml-auto">{step.latency_ms.toFixed(0)}ms</span>
                                    </div>
                                    <pre className="text-xs text-gray-300 bg-black/20 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                                        {step.content?.text || JSON.stringify(step.content, null, 2)}
                                    </pre>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Sidebar>
    );
}

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { 
  Activity, ShieldCheck, BarChart2, Code2, ArrowUpRight, ArrowDownRight, 
  CheckCircle, AlertTriangle, XCircle 
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell,
  TooltipProps
} from "recharts";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const token = localStorage.getItem("token");
        const res = await fetch(`${apiUrl}/api/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setStats(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      }
    };
    fetchStats();
  }, []);

  if (!stats) {
    return <div className="animate-pulse space-y-6">
      <div className="h-24 bg-gray-900 rounded-xl"></div>
      <div className="h-64 bg-gray-900 rounded-xl"></div>
    </div>;
  }

  // Colors for score distribution gradient (red to green)
  const getScoreColor = (index: number, total: number) => {
    const hue = (index / (total - 1)) * 120; // 0 is red, 120 is green
    return `hsl(${hue}, 80%, 50%)`;
  };

  const radarData = [
    { subject: "Hallucination", A: stats.radar_averages?.hallucination || 0, fullMark: 1 },
    { subject: "Faithfulness", A: stats.radar_averages?.faithfulness || 0, fullMark: 1 },
    { subject: "Injection", A: 1 - (stats.radar_averages?.injection || 0), fullMark: 1 }, // Reverse risk for radar
    { subject: "Compliance", A: stats.radar_averages?.compliance || 0, fullMark: 1 },
    { subject: "Tool Usage", A: stats.radar_averages?.tool_usage || 0, fullMark: 1 },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-950 border border-gray-800 p-2 rounded shadow-xl text-xs">
          <p className="text-gray-400 mb-1">{label}</p>
          <p className="text-white font-medium">
            {payload[0].name}: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Welcome back, {user?.email.split('@')[0]}</h1>
        <p className="text-gray-400 text-sm">Here's what's happening with your AI applications today.</p>
      </div>

      {/* Row 1 — KPI cards */}
      <div className="grid grid-cols-6 gap-4">
        {[
          { label: "Total Evals", val: stats.total_executions, trend: "+12% ↑", good: true },
          { label: "Avg Score", val: stats.avg_overall_score.toFixed(2), trend: "+0.03 ↑", good: true },
          { label: "High Risk", val: stats.high_risk_count, trend: "-8% ↓", good: true }, // Down is good
          { label: "Aegis Evals", val: stats.aegis_total_evaluations, trend: "+45% ↑", good: true },
          { label: "Block Rate", val: `${stats.aegis_block_rate.toFixed(1)}%`, trend: "-0.4% ↓", good: false },
          { label: "Benchmarks", val: stats.benchmark_count, trend: "+3 ↑", good: true },
        ].map((kpi, i) => (
          <div key={i} className="bg-gray-900 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
            <p className="text-xs text-gray-400 font-medium">{kpi.label}</p>
            <div className="mt-2">
              <p className="text-2xl font-semibold text-white">{kpi.val}</p>
              <p className={`text-[10px] font-medium mt-1 ${kpi.good ? "text-emerald-400" : "text-amber-400"}`}>
                {kpi.trend}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2 — Main charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-white/5 rounded-xl p-6">
          <h3 className="text-sm font-medium mb-4">Evaluation Volume (30 days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.daily_execution_trend}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} 
                  tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} 
                />
                <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" name="Evaluations" stroke="#818cf8" fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-900 border border-white/5 rounded-xl p-6">
          <h3 className="text-sm font-medium mb-4">Score Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.score_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="bucket" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{fill: '#1f2937'}} />
                <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                  {stats.score_distribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={getScoreColor(index, stats.score_distribution.length)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3 — Split panels */}
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 bg-gray-900 border border-white/5 rounded-xl p-6">
          <h3 className="text-sm font-medium mb-4">Reliability Radar</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 1]} tick={false} axisLine={false} />
                {/* Target polygon (all 1.0) in gray */}
                <Radar name="Target" dataKey="fullMark" stroke="#4b5563" fill="#4b5563" fillOpacity={0.1} />
                {/* Current averages */}
                <Radar name="Current" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-2 bg-gray-900 border border-white/5 rounded-xl p-6 flex flex-col">
          <h3 className="text-sm font-medium mb-4">Top Failure Categories</h3>
          <div className="flex-1 flex flex-col justify-center gap-4">
            {stats.top_failures.length > 0 ? stats.top_failures.map((f: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300 font-medium">{f.category}</span>
                  <span className="text-gray-500">{f.count}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: `${Math.min((f.count / stats.total_executions) * 100 * 3, 100)}%` }}></div>
                </div>
              </div>
            )) : (
              <div className="text-center text-gray-500 text-sm">No failures detected yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Row 4 — Recent activity table */}
      <div className="bg-gray-900 border border-white/5 rounded-xl p-6">
        <h3 className="text-sm font-medium mb-4">RECENT EXECUTIONS</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-white/5">
                <th className="pb-3 font-medium">Project</th>
                <th className="pb-3 font-medium">Model</th>
                <th className="pb-3 font-medium">Score</th>
                <th className="pb-3 font-medium">Flags</th>
                <th className="pb-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats.recent_executions.map((ex: any) => (
                <tr key={ex.id} className="hover:bg-white/5">
                  <td className="py-3 font-medium text-white">{ex.project_name}</td>
                  <td className="py-3 text-gray-400">{ex.model || "unknown"}</td>
                  <td className="py-3">
                    <span className={`flex items-center gap-1 ${
                      ex.score > 0.8 ? 'text-emerald-400' : ex.score > 0.5 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {ex.score.toFixed(2)}
                      {ex.score > 0.8 ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    </span>
                  </td>
                  <td className="py-3 text-gray-400">
                    {ex.flags.length > 0 ? ex.flags.join(", ") : "—"}
                  </td>
                  <td className="py-3 text-gray-500">
                    {new Date(ex.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </td>
                </tr>
              ))}
              {stats.recent_executions.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-gray-500">No executions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 5 — Quick action cards */}
      <div className="grid grid-cols-3 gap-4">
        <Link href="/aegis" className="bg-gray-900 border border-white/5 hover:border-indigo-500/50 rounded-xl p-5 transition-colors group">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <h4 className="font-semibold text-white">Run Aegis Check</h4>
          </div>
          <p className="text-xs text-gray-400 mb-4 line-clamp-2">Evaluate your next agent output for safety risks before it reaches the user.</p>
          <span className="text-xs text-indigo-400 font-medium group-hover:text-indigo-300">Open Aegis →</span>
        </Link>
        <Link href="/benchmarks" className="bg-gray-900 border border-white/5 hover:border-indigo-500/50 rounded-xl p-5 transition-colors group">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="w-5 h-5 text-purple-400" />
            <h4 className="font-semibold text-white">New Benchmark</h4>
          </div>
          <p className="text-xs text-gray-400 mb-4 line-clamp-2">Compare GPT-4 vs Claude on your own test cases and custom data.</p>
          <span className="text-xs text-indigo-400 font-medium group-hover:text-indigo-300">New Benchmark →</span>
        </Link>
        <Link href="/docs" className="bg-gray-900 border border-white/5 hover:border-indigo-500/50 rounded-xl p-5 transition-colors group">
          <div className="flex items-center gap-2 mb-2">
            <Code2 className="w-5 h-5 text-emerald-400" />
            <h4 className="font-semibold text-white">Ingest via SDK</h4>
          </div>
          <p className="text-xs text-gray-400 mb-4 line-clamp-2"><code className="bg-black/30 px-1 rounded">pip install auditai</code> 3-line integration.</p>
          <span className="text-xs text-indigo-400 font-medium group-hover:text-indigo-300">View Docs →</span>
        </Link>
      </div>

    </div>
  );
}

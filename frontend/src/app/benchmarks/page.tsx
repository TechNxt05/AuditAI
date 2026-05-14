"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { BarChart2, CheckCircle, Search, Trophy, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from "recharts";

export default function BenchmarksPage() {
  const { user } = useAuth();
  const [benchmarks, setBenchmarks] = useState<any[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [selectedBenchmark, setSelectedBenchmark] = useState<any | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const token = localStorage.getItem("token");
        const pRes = await fetch(`${apiUrl}/api/projects/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const projects = await pRes.json();
        if (projects.length > 0) {
          const pid = projects[0].id;
          setProjectId(pid);
          loadBenchmarks(pid);
        }
      } catch (err) {
        console.error("Failed to load Benchmarks data", err);
      }
    };
    init();
  }, []);

  const loadBenchmarks = async (pid: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const token = localStorage.getItem("token");
    const res = await fetch(`${apiUrl}/api/benchmarks/?project_id=${pid}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setBenchmarks(await res.json());
    }
  };

  const viewBenchmark = async (id: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const token = localStorage.getItem("token");
    const res = await fetch(`${apiUrl}/api/benchmarks/${id}/results`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setSelectedBenchmark(await res.json());
    }
  };

  // Radar chart formatting
  const getRadarData = () => {
    if (!selectedBenchmark) return [];
    
    // Create common subjects array
    const subjects = ["Hallucination", "Faithfulness", "Injection", "Compliance", "Overall"];
    const data: any[] = subjects.map(sub => ({ subject: sub }));

    selectedBenchmark.model_results.forEach((modelResult: any) => {
      const mn = modelResult.model_name;
      data[0][mn] = modelResult.avg_hallucination_score || 0;
      data[1][mn] = modelResult.avg_faithfulness_score || 0;
      data[2][mn] = modelResult.avg_injection_risk ? (1 - modelResult.avg_injection_risk) : 0; // reverse risk for radar
      data[3][mn] = modelResult.avg_compliance_score || 0;
      data[4][mn] = modelResult.avg_overall_score || 0;
    });

    return data;
  };

  const colors = ["#818cf8", "#f43f5e", "#10b981", "#fbbf24"];

  return (
    <div className="space-y-6">
      {!selectedBenchmark ? (
        // List View
        <>
          <div className="flex items-center justify-between border border-white/10 rounded-xl p-6 bg-gray-900/50 backdrop-blur-sm">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
                <BarChart2 className="w-6 h-6 text-indigo-400" />
                Model Benchmarks
              </h1>
              <p className="text-gray-400">Compare LLM reliability across your own test cases</p>
            </div>
            <button
              onClick={() => setIsWizardOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
            >
              + New Benchmark
            </button>
          </div>

          <div className="space-y-4">
            {benchmarks.map((b) => (
              <div key={b.id} className="border border-white/5 rounded-xl bg-gray-900 p-5 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-lg">{b.name}</h3>
                    {b.status === "complete" ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Complete
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                        <Loader2 className="w-3 h-3 animate-spin" /> Running
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{new Date(b.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    {b.models_compared.join(" vs ")} · {b.test_cases_count} test cases
                  </p>
                  {b.winner_model && (
                    <p className="text-sm text-gray-300 mt-2 flex items-center gap-1">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      Winner: <span className="font-medium text-white">{b.winner_model}</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => viewBenchmark(b.id)}
                  disabled={b.status !== "complete"}
                  className="px-4 py-2 text-sm text-indigo-400 hover:text-indigo-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  View →
                </button>
              </div>
            ))}
            {benchmarks.length === 0 && (
              <div className="text-center py-12 border border-white/5 border-dashed rounded-xl text-gray-500">
                No benchmarks run yet. Create one to compare models!
              </div>
            )}
          </div>
        </>
      ) : (
        // Detail View
        <div className="space-y-6">
          <div className="flex items-center justify-between border border-white/10 rounded-xl p-6 bg-gray-900/50 backdrop-blur-sm">
            <div>
              <button onClick={() => setSelectedBenchmark(null)} className="text-sm text-indigo-400 hover:text-indigo-300 mb-2 inline-flex items-center gap-1">
                ← Back to List
              </button>
              <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
                {selectedBenchmark.benchmark.name}
              </h1>
              <p className="text-gray-300 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Winner: <span className="font-semibold text-white">{selectedBenchmark.benchmark.winner_model}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="border border-white/5 rounded-xl bg-gray-900 p-6">
              <h3 className="text-sm font-medium mb-4">METRICS BREAKDOWN</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getRadarData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="subject" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} domain={[0, 1]} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    {selectedBenchmark.benchmark.models_compared.map((mn: string, i: number) => (
                      <Bar key={mn} dataKey={mn} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} barSize={20} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="border border-white/5 rounded-xl bg-gray-900 p-6">
              <h3 className="text-sm font-medium mb-4">RELIABILITY RADAR</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getRadarData()}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 1]} tick={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    {selectedBenchmark.benchmark.models_compared.map((mn: string, i: number) => (
                      <Radar key={mn} name={mn} dataKey={mn} stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.2} />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          <div className="border border-white/5 rounded-xl bg-gray-900 p-6">
            <h3 className="text-sm font-medium mb-4">PER-TEST-CASE BREAKDOWN</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-white/5">
                    <th className="pb-3 font-medium">Test Case ID</th>
                    {selectedBenchmark.benchmark.models_compared.map((mn: string) => (
                      <th key={mn} className="pb-3 font-medium">{mn} (Overall)</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {/* Find first model to map over cases, assumes all have same case length */}
                  {selectedBenchmark.model_results[0]?.case_results.map((cResult: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="py-3 pr-4 text-gray-300">Case {idx + 1}</td>
                      {selectedBenchmark.model_results.map((mr: any, mi: number) => {
                        const score = mr.case_results[idx]?.scores?.overall_score || 
                                      mr.case_results[idx]?.scores?.hallucination || 0; // rough fallback
                        return (
                          <td key={mi} className="py-3 pr-4 font-medium text-white">
                            {(score || 0).toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* New Benchmark Wizard placeholder */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-xl font-bold">New Benchmark (Preview)</h2>
              <button onClick={() => setIsWizardOpen(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="p-6 text-gray-400 text-sm">
              <p>For this production upgrade, use the Python SDK to construct complex test cases and run benchmarks.</p>
              <div className="mt-4 bg-gray-950 p-4 rounded-lg border border-white/5">
                <pre className="text-xs text-gray-300 font-mono leading-relaxed">
<span className="text-pink-400">from</span> auditai <span className="text-pink-400">import</span> AuditAI{'\n\n'}
client = AuditAI(api_key=<span className="text-green-400">"your-key"</span>){'\n'}
client.create_benchmark({'\n'}
{'    '}name=<span className="text-green-400">"GPT-4 vs Claude Comparison"</span>,{'\n'}
{'    '}models=[<span className="text-green-400">"gpt-4"</span>, <span className="text-green-400">"claude-3-sonnet"</span>],{'\n'}
{'    '}test_cases=[{'{'}{'\n'}
{'        '}<span className="text-green-400">"input"</span>: <span className="text-green-400">"Summarize SOC 2"</span>,{'\n'}
{'        '}<span className="text-green-400">"context_docs"</span>: [<span className="text-green-400">"SOC 2 is an AICPA framework..."</span>],{'\n'}
{'        '}<span className="text-green-400">"model_outputs"</span>: {'{'}{'\n'}
{'            '}<span className="text-green-400">"gpt-4"</span>: <span className="text-green-400">"SOC 2 is a standard..."</span>,{'\n'}
{'            '}<span className="text-green-400">"claude-3-sonnet"</span>: <span className="text-green-400">"System and Organization Controls..."</span>{'\n'}
{'        '}{'}'}{'\n'}
{'    '}{'}'}]{'\n'}
)
                </pre>
              </div>
            </div>
            <div className="p-4 border-t border-white/5 flex justify-end">
              <button onClick={() => setIsWizardOpen(false)} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

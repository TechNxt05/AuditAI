"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Shield, CheckCircle, AlertTriangle, XCircle, Search } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";

export default function AegisDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [traces, setTraces] = useState<any[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);

  // Live Evaluator State
  const [agentInput, setAgentInput] = useState("Summarize SOC 2");
  const [agentOutput, setAgentOutput] = useState("SOC 2 is an AICPA framework...");
  const [contextDocs, setContextDocs] = useState("SOC 2 is an AICPA trust services framework.");
  const [policy, setPolicy] = useState("warn");
  const [evalResult, setEvalResult] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    // Fetch first project then stats
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
          
          const [statsRes, tracesRes] = await Promise.all([
            fetch(`${apiUrl}/api/aegis/stats/${pid}`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${apiUrl}/api/aegis/traces/${pid}`, { headers: { Authorization: `Bearer ${token}` } })
          ]);
          
          if (statsRes.ok) setStats(await statsRes.json());
          if (tracesRes.ok) setTraces(await tracesRes.json());
        }
      } catch (err) {
        console.error("Failed to load Aegis data", err);
      }
    };
    init();
  }, []);

  const runEvaluation = async () => {
    if (!projectId) return;
    setIsEvaluating(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiUrl}/api/aegis/evaluate`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({
          project_id: projectId,
          agent_input: agentInput,
          agent_output: agentOutput,
          context_docs: [contextDocs],
          policy_mode: policy
        })
      });
      const data = await res.json();
      setEvalResult(data);
      
      // Refresh traces
      const tracesRes = await fetch(`${apiUrl}/api/aegis/traces/${projectId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (tracesRes.ok) setTraces(await tracesRes.json());
      const statsRes = await fetch(`${apiUrl}/api/aegis/stats/${projectId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (statsRes.ok) setStats(await statsRes.json());

    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const radarData = [
    { subject: "Hallucination", A: evalResult?.detector_breakdown?.hallucination || 0, fullMark: 1 },
    { subject: "Injection", A: evalResult?.detector_breakdown?.injection || 0, fullMark: 1 },
    { subject: "Grounding", A: evalResult?.detector_breakdown?.grounding || 0, fullMark: 1 }
  ];

  // Dummy area chart data for "Distribution over time"
  const areaData = [
    { name: "Mon", risk: 0.1 }, { name: "Tue", risk: 0.12 }, { name: "Wed", risk: 0.25 },
    { name: "Thu", risk: 0.15 }, { name: "Fri", risk: 0.3 }, { name: "Sat", risk: 0.18 }, { name: "Sun", risk: 0.22 }
  ];

  return (
    <div className="space-y-6">
      <div className="border border-white/10 rounded-xl p-6 bg-gray-900/50 backdrop-blur-sm">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <Shield className="w-6 h-6 text-indigo-400" />
          Runtime Safety <span className="text-sm font-normal text-gray-400 ml-2">— powered by aegis-agent</span>
        </h1>
        <p className="text-gray-400">Prevent bad outputs before they reach your users</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 border border-white/5 rounded-xl bg-gray-900">
          <p className="text-sm text-gray-400 mb-1">Total Evals</p>
          <p className="text-2xl font-semibold">{stats?.total_evaluations || 0}</p>
        </div>
        <div className="p-4 border border-white/5 rounded-xl bg-gray-900">
          <p className="text-sm text-gray-400 mb-1">Block Rate</p>
          <p className="text-2xl font-semibold">{(stats?.block_rate || 0).toFixed(1)}%</p>
        </div>
        <div className="p-4 border border-white/5 rounded-xl bg-gray-900">
          <p className="text-sm text-gray-400 mb-1">Avg Risk</p>
          <p className="text-2xl font-semibold">{(stats?.avg_risk_score || 0).toFixed(2)}</p>
        </div>
        <div className="p-4 border border-red-500/20 rounded-xl bg-red-500/5">
          <p className="text-sm text-red-400 mb-1">High Risk</p>
          <p className="text-2xl font-semibold text-red-500">{stats?.high_risk_count || 0} flagged</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="border border-white/5 rounded-xl bg-gray-900 p-6">
          <h3 className="text-sm font-medium mb-4">RISK DISTRIBUTION</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }} />
                <Area type="monotone" dataKey="risk" stroke="#818cf8" fillOpacity={1} fill="url(#colorRisk)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="border border-white/5 rounded-xl bg-gray-900 p-6">
          <h3 className="text-sm font-medium mb-4">DETECTOR BREAKDOWN (Latest Eval)</h3>
          <div className="h-64">
            {evalResult ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 1]} tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <Radar name="Risk Score" dataKey="A" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.4} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Run an evaluation below to see radar
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border border-white/5 rounded-xl bg-gray-900 p-6">
        <h3 className="text-sm font-medium mb-4">RECENT AEGIS TRACES</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-white/5">
                <th className="pb-3 font-medium">Input</th>
                <th className="pb-3 font-medium">Risk</th>
                <th className="pb-3 font-medium">Flags</th>
                <th className="pb-3 font-medium">Policy</th>
                <th className="pb-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {traces.slice(0, 5).map((t: any) => (
                <tr key={t.id} className="hover:bg-white/5">
                  <td className="py-3 pr-4 truncate max-w-[200px] text-gray-300">"{t.agent_input}"</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-1 rounded text-xs ${t.risk_level === 'HIGH' ? 'bg-red-500/20 text-red-400' : t.risk_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {t.overall_risk_score.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-400 truncate max-w-[200px]">
                    {t.flags.length > 0 ? t.flags.join(", ") : "—"}
                  </td>
                  <td className="py-3 pr-4 text-gray-400">{t.was_blocked ? "BLOCKED" : t.policy_mode.toUpperCase()}</td>
                  <td className="py-3 text-gray-500">{new Date(t.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
              {traces.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-gray-500">No traces yet. Run an evaluation to generate data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 border border-white/5 rounded-xl bg-gray-900 p-6">
          <h3 className="text-sm font-medium mb-4">LIVE EVALUATOR</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Agent Input</label>
              <input value={agentInput} onChange={(e) => setAgentInput(e.target.value)} className="w-full bg-gray-950 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Agent Output</label>
              <textarea value={agentOutput} onChange={(e) => setAgentOutput(e.target.value)} className="w-full bg-gray-950 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 min-h-[60px]" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Context Docs</label>
              <input value={contextDocs} onChange={(e) => setContextDocs(e.target.value)} className="w-full bg-gray-950 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="flex items-end gap-4">
              <div className="w-48">
                <label className="block text-xs text-gray-400 mb-1">Policy</label>
                <select value={policy} onChange={(e) => setPolicy(e.target.value)} className="w-full bg-gray-950 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                  <option value="warn">warn</option>
                  <option value="block">block</option>
                  <option value="rewrite">rewrite</option>
                </select>
              </div>
              <button 
                onClick={runEvaluation} 
                disabled={isEvaluating || !projectId}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2 rounded font-medium text-sm transition-colors"
              >
                {isEvaluating ? "Evaluating..." : "Run Aegis Evaluation"}
              </button>
            </div>
            
            {evalResult && (
              <div className={`mt-6 p-4 rounded-lg border ${evalResult.risk_level === 'HIGH' ? 'border-red-500/30 bg-red-500/10' : evalResult.risk_level === 'MEDIUM' ? 'border-amber-500/30 bg-amber-500/10' : 'border-emerald-500/30 bg-emerald-500/10'}`}>
                <div className="flex items-center gap-2 mb-2 font-medium">
                  {evalResult.risk_level === 'HIGH' ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-emerald-500" />}
                  <span className={evalResult.risk_level === 'HIGH' ? 'text-red-500' : 'text-emerald-500'}>
                    {evalResult.risk_level} RISK ({evalResult.risk_score.toFixed(2)})
                  </span>
                </div>
                <div className="text-sm text-gray-300 mb-1">
                  <span className="text-gray-400">Flags: </span>
                  {evalResult.flags.length > 0 ? evalResult.flags.join(", ") : "None"}
                </div>
                {evalResult.explanations.map((exp: string, i: number) => (
                  <div key={i} className="text-xs text-gray-400">"{exp}"</div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-1 border border-white/5 rounded-xl bg-gray-900 p-6 flex flex-col">
          <h3 className="text-sm font-medium mb-4">Integrate in 3 lines</h3>
          <div className="flex-1 bg-gray-950 border border-white/5 rounded p-4 overflow-x-auto">
            <pre className="text-xs text-gray-300 font-mono leading-relaxed">
<span className="text-pink-400">from</span> auditai <span className="text-pink-400">import</span> AuditAI{'\n\n'}
client = AuditAI(api_key=<span className="text-green-400">"your-key"</span>){'\n'}
result = client.evaluate_with_aegis({'\n'}
{'    '}agent_input=user_prompt,{'\n'}
{'    '}agent_output=llm_response,{'\n'}
{'    '}context_docs=retrieved_chunks,{'\n'}
{'    '}policy_mode=<span className="text-green-400">"block"</span>{'\n'}
){'\n\n'}
<span className="text-pink-400">if</span> result[<span className="text-green-400">"was_blocked"</span>]:{'\n'}
{'    '}<span className="text-pink-400">return</span> <span className="text-green-400">"I can't help with that."</span>{'\n'}
<span className="text-blue-400">print</span>(<span className="text-green-400">f"Risk: {'{'}result['risk_level']{'}'}"</span>)
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

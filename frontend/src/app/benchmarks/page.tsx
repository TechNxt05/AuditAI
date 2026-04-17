"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";

export default function BenchmarksPage() {
  const [projectId, setProjectId] = useState<string>("");
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // This is a naive fetch for demo purposes. 
  // In a real app we'd get the actual selected project ID from context.
  const fetchProjects = async () => {
    try {
      const data = await api.listProjects();
      if (data && data.length > 0) {
        setProjectId(data[0].id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchBenchmarks = async (pid: string) => {
    setLoading(true);
    try {
      const data = await api.listBenchmarks(pid);
      setRuns(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchBenchmarks(projectId);
    }
  }, [projectId]);

  const chartData = runs.map((r, idx) => ({
    name: `${r.model} (${idx})`,
    Score: r.avg_score * 100,
    Latency: r.latency_avg,
  }));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
            Benchmarks Leaderboard
          </h1>
          <p className="text-gray-400 mt-2">
            Compare model performance, latency, and reliability on your golden datasets.
          </p>
        </div>
        <button 
          onClick={() => {
            // Mock running a benchmark
            alert("A real upload would trigger POST /api/benchmark/run here.");
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
        >
          Run New Benchmark
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-[#1C1C1F] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Model Score Comparison</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1C1C1F", borderColor: "#333", color: "#fff" }}
                />
                <Legend />
                <Bar dataKey="Score" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#1C1C1F] border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Latency Comparison (ms)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1C1C1F", borderColor: "#333", color: "#fff" }}
                />
                <Legend />
                <Bar dataKey="Latency" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-[#1C1C1F] border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#2a2a2e] border-b border-gray-800 text-gray-300">
              <th className="p-4 font-semibold">Dataset</th>
              <th className="p-4 font-semibold">Model</th>
              <th className="p-4 font-semibold">Score</th>
              <th className="p-4 font-semibold">Hallucination Rate</th>
              <th className="p-4 font-semibold">Latency</th>
              <th className="p-4 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">Loading benchmarks...</td>
              </tr>
            )}
            {!loading && runs.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">No runs found.</td>
              </tr>
            )}
            {runs.map((run) => (
              <tr key={run.id} className="hover:bg-[#252529] transition-colors">
                <td className="p-4 text-white font-medium">{run.dataset_name}</td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-gray-800 text-gray-200 rounded text-sm">
                    {run.model}
                  </span>
                </td>
                <td className="p-4 text-emerald-400 font-semibold text-lg hover:animate-pulse">
                  {(run.avg_score * 100).toFixed(1)}%
                </td>
                <td className="p-4 text-rose-400">
                  {(run.hallucination_rate * 100).toFixed(1)}%
                </td>
                <td className="p-4 text-gray-400">
                  {run.latency_avg.toFixed(0)} ms
                </td>
                <td className="p-4 text-gray-500 text-sm">
                  {new Date(run.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

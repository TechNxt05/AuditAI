"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderPlus, Folder, Trash2, ChevronRight } from "lucide-react";

interface Project {
    id: string;
    name: string;
    created_at: string;
}

export default function ProjectsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) router.replace("/login");
    }, [user, authLoading, router]);

    const load = () => {
        api.listProjects().then(setProjects).catch(console.error).finally(() => setLoading(false));
    };

    useEffect(() => { if (user) load(); }, [user]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setCreating(true);
        try {
            await api.createProject(newName.trim());
            setNewName("");
            setShowForm(false);
            load();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this project and all its data?")) return;
        await api.deleteProject(id);
        load();
    };

    if (authLoading || !user) return null;

    return (
        <Sidebar>
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold gradient-text">Projects</h1>
                        <p className="text-gray-400 mt-1">Organize your AI systems</p>
                    </div>
                    <button onClick={() => setShowForm(!showForm)} className="glow-btn flex items-center gap-2">
                        <FolderPlus className="w-4 h-4" />
                        New Project
                    </button>
                </div>

                {showForm && (
                    <form onSubmit={handleCreate} className="glass-card p-4 mb-6 flex gap-3 animate-in">
                        <input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="glass-input flex-1"
                            placeholder="Project name..."
                            required
                        />
                        <button type="submit" className="glow-btn" disabled={creating}>
                            {creating ? "Creating..." : "Create"}
                        </button>
                    </form>
                )}

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => <div key={i} className="loading-shimmer h-20"></div>)}
                    </div>
                ) : projects.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <Folder className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg">No projects yet</p>
                        <p className="text-gray-500 text-sm mt-1">Create your first project to start auditing</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {projects.map((p, i) => (
                            <div key={p.id} className="glass-card p-4 flex items-center justify-between animate-in" style={{ animationDelay: `${i * 50}ms` }}>
                                <Link href={`/projects/${p.id}`} className="flex items-center gap-4 flex-1 group">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center">
                                        <Folder className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors">{p.name}</h3>
                                        <p className="text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-600 ml-auto group-hover:text-indigo-400 transition-colors" />
                                </Link>
                                <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg hover:bg-red-500/10 ml-2 transition-colors">
                                    <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Sidebar>
    );
}

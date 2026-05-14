"""
AuditAI Python SDK Client

Usage:
    from auditai import AuditAI

    client = AuditAI(api_key="your-api-key", base_url="https://your-api.com")

    client.log_execution(
        project_name="my-rag-app",
        prompt="What is the capital of France?",
        response="The capital of France is Paris.",
        retrieval_docs=["France is a country in Europe. Its capital is Paris."],
        tools=[{"name": "search", "arguments": {"query": "capital of France"}}],
        tool_outputs=[{"result": "Paris is the capital of France"}],
        model="gpt-4",
        total_tokens=150,
        latency_ms=1200.0,
    )
"""

import json
from typing import Optional, List, Dict, Any

try:
    import requests
except ImportError:
    import urllib.request
    import urllib.error
    requests = None


class AuditAI:
    """AuditAI SDK Client for logging execution traces."""

    def __init__(self, api_key: str, base_url: str = "http://localhost:8000"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _post(self, endpoint: str, data: dict) -> dict:
        url = f"{self.base_url}{endpoint}"
        if requests:
            resp = requests.post(url, json=data, headers=self._headers(), timeout=30)
            resp.raise_for_status()
            return resp.json()
        else:
            # Fallback to urllib
            req = urllib.request.Request(
                url,
                data=json.dumps(data).encode("utf-8"),
                headers=self._headers(),
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            except urllib.error.HTTPError as e:
                raise Exception(f"HTTP {e.code}: {e.read().decode('utf-8')}")

    def _get(self, endpoint: str) -> dict:
        url = f"{self.base_url}{endpoint}"
        if requests:
            resp = requests.get(url, headers=self._headers(), timeout=30)
            resp.raise_for_status()
            return resp.json()
        else:
            req = urllib.request.Request(url, headers=self._headers())
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))

    def log_execution(
        self,
        project_name: str,
        prompt: str,
        response: str,
        system_prompt: Optional[str] = None,
        retrieval_docs: Optional[List[str]] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
        tool_outputs: Optional[List[Dict[str, Any]]] = None,
        model: str = "unknown",
        total_tokens: int = 0,
        latency_ms: float = 0.0,
    ) -> dict:
        """Log an execution trace to AuditAI."""
        payload = {
            "project_name": project_name,
            "prompt": prompt,
            "response": response,
            "system_prompt": system_prompt,
            "retrieval_docs": retrieval_docs,
            "tools": tools,
            "tool_outputs": tool_outputs,
            "model": model,
            "total_tokens": total_tokens,
            "latency_ms": latency_ms,
        }
        return self._post("/api/executions/ingest", payload)

    def list_projects(self) -> list:
        """List all projects."""
        return self._get("/api/projects/")

    def list_executions(self, project_id: Optional[str] = None) -> list:
        """List executions, optionally filtered by project."""
        endpoint = "/api/executions/"
        if project_id:
            endpoint += f"?project_id={project_id}"
        return self._get(endpoint)

    def evaluate(self, execution_id: str) -> dict:
        """Trigger evaluation for an execution."""
        return self._post(f"/api/executions/{execution_id}/evaluate", {})

    def run_adversarial(self, execution_id: str) -> list:
        """Run adversarial tests on an execution."""
        return self._post(f"/api/adversarial/{execution_id}/run", {})

    def get_dashboard(self) -> dict:
        """Get dashboard statistics."""
        return self._get("/api/dashboard/stats")

    def _resolve_project(self, project_name: str) -> str:
        if not project_name:
            raise ValueError("project_name is required")
        projects = self.list_projects()
        for p in projects:
            if p.get("name") == project_name:
                return p.get("id")
        # If not found, maybe create it or raise. The ingest endpoint creates it.
        # But we need ID here, so raise.
        raise ValueError(f"Project '{project_name}' not found. Please create it first.")

    def evaluate_with_aegis(
        self,
        agent_input: str,
        agent_output: str,
        context_docs: list[str] = None,
        policy_mode: str = "warn",
        project_name: str = None,
    ) -> dict:
        """
        Run aegis-agent safety evaluation on an agent's output.
        
        Returns risk score, risk level, flags, and whether output was blocked.
        """
        return self._post("/api/aegis/evaluate", {
            "agent_input": agent_input,
            "agent_output": agent_output,
            "context_docs": context_docs or [],
            "policy_mode": policy_mode,
            "project_id": self._resolve_project(project_name),
        })

    def create_benchmark(
        self,
        name: str,
        models: list[str],
        test_cases: list[dict],
        project_name: str = None,
    ) -> dict:
        """
        Create and run a model reliability benchmark.
        """
        benchmark = self._post("/api/benchmarks/", {
            "project_id": self._resolve_project(project_name),
            "name": name,
            "models": models,
            "test_cases": test_cases
        })
        self._post(f"/api/benchmarks/{benchmark['id']}/run", {})
        return benchmark

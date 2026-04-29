import uuid
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr, Field


# ──── Auth ────
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    plan_tier: str
    execution_count: int
    created_at: datetime

    class Config:
        from_attributes = True


# ──── Projects ────
class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class ProjectOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


# ──── Trace Steps ────
class TraceStepIn(BaseModel):
    step_type: str  # prompt, system_prompt, retrieval, tool_call, tool_output, response
    content: Dict[str, Any] = {}
    latency_ms: float = 0.0


class TraceStepOut(BaseModel):
    id: uuid.UUID
    step_order: int
    step_type: str
    content: Dict[str, Any]
    latency_ms: float

    class Config:
        from_attributes = True


# ──── Executions ────
class ExecutionCreate(BaseModel):
    model_config = {"protected_namespaces": ()}
    project_id: uuid.UUID
    model_name: Optional[str] = None
    total_tokens: int = 0
    latency_ms: float = 0.0
    status: str = "success"
    trace_steps: List[TraceStepIn] = []


class ExecutionOut(BaseModel):
    model_config = {"protected_namespaces": ()}
    id: uuid.UUID
    project_id: uuid.UUID
    model_name: Optional[str]
    total_tokens: int
    latency_ms: float
    estimated_cost: float = 0.0
    status: str
    created_at: datetime
    trace_steps: List[TraceStepOut] = []

    class Config:
        from_attributes = True


class ExecutionListOut(BaseModel):
    model_config = {"protected_namespaces": ()}
    id: uuid.UUID
    project_id: uuid.UUID
    model_name: Optional[str]
    total_tokens: int
    latency_ms: float
    estimated_cost: float = 0.0
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ──── Evaluations ────
class EvaluationOut(BaseModel):
    id: uuid.UUID
    execution_id: uuid.UUID
    hallucination_score: float
    faithfulness_score: float
    injection_risk_score: float
    compliance_score: float
    tool_usage_score: float
    embedding_grounded_score: float = 0.0
    overall_score: float
    failure_taxonomy: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


# ──── Adversarial Tests ────
class AdversarialTestOut(BaseModel):
    id: uuid.UUID
    execution_id: uuid.UUID
    test_type: str
    result_score: float
    details: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


# ──── Replay ────
class ReplayRequest(BaseModel):
    new_model_name: str


# ──── Dashboard ────
class DashboardStats(BaseModel):
    total_executions: int
    avg_reliability_score: float
    avg_injection_risk: float
    avg_latency_ms: float
    total_tokens_used: int
    executions_by_day: List[Dict[str, Any]]
    score_trend: List[Dict[str, Any]]


# ──── SDK Ingestion ────
class SDKIngestionPayload(BaseModel):
    model_config = {"protected_namespaces": ()}
    project_name: str
    prompt: str
    system_prompt: Optional[str] = None
    response: str
    retrieval_docs: Optional[List[str]] = None
    tools: Optional[List[Dict[str, Any]]] = None
    tool_outputs: Optional[List[Dict[str, Any]]] = None
    model: str = "unknown"
    total_tokens: int = 0
    latency_ms: float = 0.0


# ──── Benchmarks ────
class BenchmarkItemData(BaseModel):
    question: str
    expected_answer: str
    retrieval_docs: List[str] = []


class BenchmarkRunRequest(BaseModel):
    model_config = {"protected_namespaces": ()}
    project_id: uuid.UUID
    dataset_name: str
    model: str
    items: List[BenchmarkItemData]


class BenchmarkItemOut(BaseModel):
    id: uuid.UUID
    run_id: uuid.UUID
    question: str
    expected_answer: str
    actual_response: Optional[str]
    overall_score: float

    class Config:
        from_attributes = True


class BenchmarkRunOut(BaseModel):
    model_config = {"protected_namespaces": ()}
    id: uuid.UUID
    project_id: uuid.UUID
    dataset_name: str
    model: str
    avg_score: float
    hallucination_rate: float
    faithfulness_rate: float
    latency_avg: float
    created_at: datetime
    items: List[BenchmarkItemOut] = []

    class Config:
        from_attributes = True

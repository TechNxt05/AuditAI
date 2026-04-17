import uuid
import enum
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, Integer, DateTime, ForeignKey,
    Text, Enum as SAEnum, JSON, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from database import Base


class PlanTier(str, enum.Enum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class ExecutionStatus(str, enum.Enum):
    SUCCESS = "success"
    FAILURE = "failure"


class StepType(str, enum.Enum):
    PROMPT = "prompt"
    SYSTEM_PROMPT = "system_prompt"
    RETRIEVAL = "retrieval"
    TOOL_CALL = "tool_call"
    TOOL_OUTPUT = "tool_output"
    RESPONSE = "response"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    plan_tier = Column(SAEnum(PlanTier, create_type=False), default=PlanTier.FREE, nullable=False)
    execution_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="projects")
    executions = relationship("Execution", back_populates="project", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_project_user_name"),
    )


class Execution(Base):
    __tablename__ = "executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    model_name = Column(String(100), nullable=True)
    total_tokens = Column(Integer, default=0)
    latency_ms = Column(Float, default=0.0)
    status = Column(SAEnum(ExecutionStatus, create_type=False), default=ExecutionStatus.SUCCESS, nullable=False)
    estimated_cost = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="executions")
    trace_steps = relationship("TraceStep", back_populates="execution", cascade="all, delete-orphan",
                               order_by="TraceStep.step_order")
    evaluations = relationship("Evaluation", back_populates="execution", cascade="all, delete-orphan")
    adversarial_tests = relationship("AdversarialTest", back_populates="execution", cascade="all, delete-orphan")


class TraceStep(Base):
    __tablename__ = "trace_steps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    execution_id = Column(UUID(as_uuid=True), ForeignKey("executions.id", ondelete="CASCADE"), nullable=False)
    step_order = Column(Integer, nullable=False, default=0)
    step_type = Column(SAEnum(StepType, create_type=False), nullable=False)
    content = Column(JSONB, nullable=False, default={})
    latency_ms = Column(Float, default=0.0)

    execution = relationship("Execution", back_populates="trace_steps")


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    execution_id = Column(UUID(as_uuid=True), ForeignKey("executions.id", ondelete="CASCADE"), nullable=False)
    hallucination_score = Column(Float, default=0.0)
    faithfulness_score = Column(Float, default=0.0)
    injection_risk_score = Column(Float, default=0.0)
    compliance_score = Column(Float, default=0.0)
    tool_usage_score = Column(Float, default=0.0)
    embedding_grounded_score = Column(Float, default=0.0)
    overall_score = Column(Float, default=0.0)
    failure_taxonomy = Column(JSONB, default={})
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    execution = relationship("Execution", back_populates="evaluations")


class AdversarialTest(Base):
    __tablename__ = "adversarial_tests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    execution_id = Column(UUID(as_uuid=True), ForeignKey("executions.id", ondelete="CASCADE"), nullable=False)
    test_type = Column(String(100), nullable=False)
    result_score = Column(Float, default=0.0)
    details = Column(JSONB, default={})
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    execution = relationship("Execution", back_populates="adversarial_tests")


class BenchmarkRun(Base):
    __tablename__ = "benchmark_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    dataset_name = Column(String(255), nullable=False)
    model = Column(String(100), nullable=False)
    avg_score = Column(Float, default=0.0)
    hallucination_rate = Column(Float, default=0.0)
    faithfulness_rate = Column(Float, default=0.0)
    latency_avg = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project")
    items = relationship("BenchmarkItem", back_populates="run", cascade="all, delete-orphan")


class BenchmarkItem(Base):
    __tablename__ = "benchmark_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("benchmark_runs.id", ondelete="CASCADE"), nullable=False)
    question = Column(Text, nullable=False)
    expected_answer = Column(Text, nullable=False)
    retrieval_docs = Column(JSONB, default=[])
    actual_response = Column(Text, nullable=True)
    overall_score = Column(Float, default=0.0)

    run = relationship("BenchmarkRun", back_populates="items")

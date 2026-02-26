from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Execution, TraceStep, Project, User, StepType, ExecutionStatus, Evaluation
from schemas import (
    ExecutionCreate, ExecutionOut, ExecutionListOut,
    SDKIngestionPayload, TraceStepOut, EvaluationOut,
    ReplayRequest
)
from deps import get_current_user

router = APIRouter(prefix="/executions", tags=["Executions"])


def _check_project_access(db: Session, project_id, user: User) -> Project:
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/", response_model=ExecutionOut, status_code=status.HTTP_201_CREATED)
def create_execution(
    payload: ExecutionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_project_access(db, str(payload.project_id), current_user)

    # Check quota
    from services.quota import check_quota
    check_quota(current_user)

    execution = Execution(
        project_id=payload.project_id,
        model_name=payload.model_name,
        total_tokens=payload.total_tokens,
        latency_ms=payload.latency_ms,
        status=ExecutionStatus(payload.status) if payload.status else ExecutionStatus.SUCCESS,
    )
    db.add(execution)
    db.flush()

    for i, step in enumerate(payload.trace_steps):
        trace_step = TraceStep(
            execution_id=execution.id,
            step_order=i,
            step_type=StepType(step.step_type),
            content=step.content,
            latency_ms=step.latency_ms,
        )
        db.add(trace_step)

    # Increment user execution count
    current_user.execution_count += 1
    db.commit()
    db.refresh(execution)
    return execution


@router.post("/ingest", response_model=ExecutionOut, status_code=status.HTTP_201_CREATED)
def sdk_ingest(
    payload: SDKIngestionPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """SDK-friendly ingestion endpoint that auto-creates project and builds trace."""
    # Find or create project
    project = (
        db.query(Project)
        .filter(Project.user_id == current_user.id, Project.name == payload.project_name)
        .first()
    )
    if not project:
        project = Project(user_id=current_user.id, name=payload.project_name)
        db.add(project)
        db.flush()

    from services.quota import check_quota
    check_quota(current_user)

    execution = Execution(
        project_id=project.id,
        model_name=payload.model,
        total_tokens=payload.total_tokens,
        latency_ms=payload.latency_ms,
        status=ExecutionStatus.SUCCESS,
    )
    db.add(execution)
    db.flush()

    # Build trace steps from SDK payload
    step_order = 0

    if payload.system_prompt:
        db.add(TraceStep(
            execution_id=execution.id, step_order=step_order,
            step_type=StepType.SYSTEM_PROMPT,
            content={"text": payload.system_prompt},
        ))
        step_order += 1

    db.add(TraceStep(
        execution_id=execution.id, step_order=step_order,
        step_type=StepType.PROMPT,
        content={"text": payload.prompt},
    ))
    step_order += 1

    if payload.retrieval_docs:
        for doc in payload.retrieval_docs:
            db.add(TraceStep(
                execution_id=execution.id, step_order=step_order,
                step_type=StepType.RETRIEVAL,
                content={"text": doc},
            ))
            step_order += 1

    if payload.tools:
        for tool in payload.tools:
            db.add(TraceStep(
                execution_id=execution.id, step_order=step_order,
                step_type=StepType.TOOL_CALL,
                content=tool,
            ))
            step_order += 1

    if payload.tool_outputs:
        for output in payload.tool_outputs:
            db.add(TraceStep(
                execution_id=execution.id, step_order=step_order,
                step_type=StepType.TOOL_OUTPUT,
                content=output,
            ))
            step_order += 1

    db.add(TraceStep(
        execution_id=execution.id, step_order=step_order,
        step_type=StepType.RESPONSE,
        content={"text": payload.response},
    ))

    current_user.execution_count += 1
    db.commit()
    db.refresh(execution)
    return execution


@router.get("/", response_model=List[ExecutionListOut])
def list_executions(
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(Execution)
        .join(Project)
        .filter(Project.user_id == current_user.id)
    )
    if project_id:
        query = query.filter(Execution.project_id == project_id)
    return query.order_by(Execution.created_at.desc()).limit(100).all()


@router.get("/{execution_id}", response_model=ExecutionOut)
def get_execution(
    execution_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    execution = (
        db.query(Execution)
        .join(Project)
        .filter(Execution.id == execution_id, Project.user_id == current_user.id)
        .first()
    )
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    return execution


@router.post("/{execution_id}/evaluate", response_model=EvaluationOut)
def evaluate_execution(
    execution_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    execution = (
        db.query(Execution)
        .join(Project)
        .filter(Execution.id == execution_id, Project.user_id == current_user.id)
        .first()
    )
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    from services.evaluation import run_evaluation
    evaluation = run_evaluation(db, execution)
    return evaluation


@router.post("/{execution_id}/replay", response_model=ExecutionOut)
def replay_execution(
    execution_id: str,
    payload: ReplayRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    execution = (
        db.query(Execution)
        .join(Project)
        .filter(Execution.id == execution_id, Project.user_id == current_user.id)
        .first()
    )
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")

    from services.replay import replay_execution as do_replay
    new_execution = do_replay(db, execution, payload.new_model_name)
    return new_execution

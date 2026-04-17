import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import (
    Project, Execution, TraceStep, StepType, 
    BenchmarkRun, BenchmarkItem
)
from schemas import BenchmarkRunRequest, BenchmarkRunOut
from deps import get_current_user
from services.model_provider import get_provider
from services.evaluation import run_evaluation
from services.metrics import calculate_cost

router = APIRouter(prefix="/benchmark", tags=["Benchmarks"])

@router.post("/run", response_model=BenchmarkRunOut)
def run_benchmark(
    request: BenchmarkRunRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),  # typing doesn't matter much locally
):
    # Verify project
    project = db.query(Project).filter(
        Project.id == request.project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    provider = get_provider(request.model)
    
    run_instance = BenchmarkRun(
        project_id=project.id,
        dataset_name=request.dataset_name,
        model=request.model,
    )
    db.add(run_instance)
    db.commit()
    db.refresh(run_instance)
    
    total_score = 0.0
    total_latency = 0.0
    hallucination_failures = 0
    faithfulness_failures = 0

    items_out = []

    for item_data in request.items:
        # Simulate execution
        start_time = datetime.utcnow()
        actual_response = provider.generate_response(item_data.question)
        latency = (datetime.utcnow() - start_time).total_seconds() * 1000

        # Create trace
        execution = Execution(
            project_id=project.id,
            model_name=request.model,
            total_tokens=150,  # mock
            latency_ms=latency,
            estimated_cost=calculate_cost(request.model, 150)
        )
        db.add(execution)
        db.commit()
        db.refresh(execution)

        # Create steps
        db.add(TraceStep(execution_id=execution.id, step_order=1, step_type=StepType.PROMPT, content={"text": item_data.question}))
        if item_data.retrieval_docs:
            for i, doc in enumerate(item_data.retrieval_docs):
                db.add(TraceStep(execution_id=execution.id, step_order=2+i, step_type=StepType.RETRIEVAL, content={"text": doc}))
        db.add(TraceStep(execution_id=execution.id, step_order=10, step_type=StepType.RESPONSE, content={"text": actual_response}))
        db.commit()

        # Run Eval
        evaluation = run_evaluation(db, execution)
        
        # Calculate metrics
        total_score += evaluation.overall_score
        total_latency += latency
        
        if evaluation.hallucination_score < 0.7:
            hallucination_failures += 1
        if evaluation.faithfulness_score < 0.7:
            faithfulness_failures += 1
            
        benchmark_item = BenchmarkItem(
            run_id=run_instance.id,
            question=item_data.question,
            expected_answer=item_data.expected_answer,
            retrieval_docs=item_data.retrieval_docs,
            actual_response=actual_response,
            overall_score=evaluation.overall_score
        )
        db.add(benchmark_item)
        db.commit()
        db.refresh(benchmark_item)
        
        items_out.append(benchmark_item)

    num_items = len(request.items)
    if num_items > 0:
        run_instance.avg_score = total_score / num_items
        run_instance.latency_avg = total_latency / num_items
        run_instance.hallucination_rate = hallucination_failures / num_items
        run_instance.faithfulness_rate = faithfulness_failures / num_items
        
    db.commit()
    db.refresh(run_instance)
    
    return run_instance

@router.get("/", response_model=list[BenchmarkRunOut])
def list_benchmarks(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    runs = db.query(BenchmarkRun).filter(BenchmarkRun.project_id == project.id).order_by(BenchmarkRun.created_at.desc()).all()
    return runs

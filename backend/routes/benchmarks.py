from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from deps import get_current_user, get_db
from models import User, Project, Benchmark, BenchmarkResult
from services.benchmark_runner import execute_benchmark
from database import SessionLocal

router = APIRouter(prefix="/api/benchmarks", tags=["benchmarks"])

class TestCase(BaseModel):
    id: Optional[str] = None
    input: str
    context_docs: Optional[List[str]] = []
    expected_keywords: Optional[List[str]] = []
    ground_truth: Optional[str] = None
    model_outputs: Dict[str, str]
    latency_ms: Optional[Dict[str, float]] = {}

class BenchmarkCreateRequest(BaseModel):
    project_id: str
    name: str
    description: Optional[str] = ""
    models: List[str]
    test_cases: List[dict]

class BenchmarkResponse(BaseModel):
    id: str
    status: str

@router.post("/", response_model=BenchmarkResponse)
async def create_benchmark(req: BenchmarkCreateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == req.project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    benchmark = Benchmark(
        project_id=project.id,
        user_id=current_user.id,
        name=req.name,
        description=req.description,
        models_compared=req.models,
        test_cases=req.test_cases,
        status="pending"
    )
    db.add(benchmark)
    db.commit()
    db.refresh(benchmark)
    
    return {"id": str(benchmark.id), "status": "pending"}

async def run_benchmark_task(benchmark_id: str):
    db = SessionLocal()
    try:
        await execute_benchmark(benchmark_id, db)
    finally:
        db.close()

@router.post("/{benchmark_id}/run")
async def run_benchmark(benchmark_id: str, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    benchmark = db.query(Benchmark).filter(Benchmark.id == benchmark_id, Benchmark.user_id == current_user.id).first()
    if not benchmark:
        raise HTTPException(status_code=404, detail="Benchmark not found")
        
    background_tasks.add_task(run_benchmark_task, str(benchmark.id))
    return {"status": "running", "benchmark_id": benchmark_id}

@router.get("/{benchmark_id}/results")
async def get_benchmark_results(benchmark_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    benchmark = db.query(Benchmark).filter(Benchmark.id == benchmark_id, Benchmark.user_id == current_user.id).first()
    if not benchmark:
        raise HTTPException(status_code=404, detail="Benchmark not found")
        
    results = db.query(BenchmarkResult).filter(BenchmarkResult.benchmark_id == benchmark_id).all()
    
    return {
        "benchmark": {
            "id": str(benchmark.id),
            "name": benchmark.name,
            "status": benchmark.status,
            "winner_model": benchmark.winner_model,
            "models_compared": benchmark.models_compared,
            "results": benchmark.results,
            "test_cases_count": len(benchmark.test_cases)
        },
        "model_results": [
            {
                "model_name": r.model_name,
                "avg_overall_score": r.avg_overall_score,
                "avg_hallucination_score": r.avg_hallucination_score,
                "avg_faithfulness_score": r.avg_faithfulness_score,
                "avg_injection_risk": r.avg_injection_risk,
                "avg_compliance_score": r.avg_compliance_score,
                "avg_latency_ms": r.avg_latency_ms,
                "case_results": r.case_results
            } for r in results
        ]
    }

@router.get("/")
async def list_benchmarks(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    benchmarks = db.query(Benchmark).filter(Benchmark.project_id == project_id, Benchmark.user_id == current_user.id).order_by(Benchmark.created_at.desc()).all()
    return [{
        "id": str(b.id),
        "name": b.name,
        "status": b.status,
        "winner_model": b.winner_model,
        "models_compared": b.models_compared,
        "test_cases_count": len(b.test_cases),
        "created_at": b.created_at
    } for b in benchmarks]

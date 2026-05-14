from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from sqlalchemy.orm import Session
from deps import get_current_user, get_db
from models import User, Project, AegisTrace
from services.aegis.aegis_middleware import run_aegis_evaluation

router = APIRouter(prefix="/api/aegis", tags=["aegis"])

class AegisEvaluateRequest(BaseModel):
    project_id: str
    agent_input: str
    agent_output: str
    context_docs: Optional[List[str]] = []
    policy_mode: Optional[str] = "warn"  # warn/block/rewrite
    weights: Optional[dict] = {
        "hallucination": 0.4,
        "injection": 0.4,
        "grounding": 0.2
    }

class AegisResponse(BaseModel):
    risk_score: float
    risk_level: str  # LOW/MEDIUM/HIGH
    flags: List[str]
    explanations: List[str]
    was_blocked: bool
    safe_output: str  # original output or rewritten if policy=rewrite
    detector_breakdown: dict

@router.post("/evaluate", response_model=AegisResponse)
async def evaluate_with_aegis(req: AegisEvaluateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == req.project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    result = await run_aegis_evaluation(
        agent_input=req.agent_input,
        agent_output=req.agent_output,
        context_docs=req.context_docs,
        policy_mode=req.policy_mode,
        weights=req.weights,
        project_id=req.project_id,
        user_id=str(current_user.id)
    )
    return result

@router.get("/traces/{project_id}")
async def get_aegis_traces(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    traces = db.query(AegisTrace).filter(AegisTrace.project_id == project_id).order_by(AegisTrace.created_at.desc()).all()
    return traces

@router.get("/stats/{project_id}")
async def get_aegis_stats(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from sqlalchemy import func
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    total = db.query(AegisTrace).filter(AegisTrace.project_id == project_id).count()
    blocked = db.query(AegisTrace).filter(AegisTrace.project_id == project_id, AegisTrace.was_blocked == True).count()
    avg_risk = db.query(func.avg(AegisTrace.overall_risk_score)).filter(AegisTrace.project_id == project_id).scalar()
    
    high_risk = db.query(AegisTrace).filter(AegisTrace.project_id == project_id, AegisTrace.risk_level == "HIGH").count()
    medium_risk = db.query(AegisTrace).filter(AegisTrace.project_id == project_id, AegisTrace.risk_level == "MEDIUM").count()
    low_risk = db.query(AegisTrace).filter(AegisTrace.project_id == project_id, AegisTrace.risk_level == "LOW").count()

    return {
        "total_evaluations": total,
        "block_rate": (blocked / total * 100) if total > 0 else 0,
        "avg_risk_score": float(avg_risk or 0),
        "high_risk_count": high_risk,
        "risk_distribution": {
            "high": high_risk,
            "medium": medium_risk,
            "low": low_risk
        }
    }

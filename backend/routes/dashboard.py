from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from database import get_db
from models import Execution, Evaluation, Project, User
from schemas import DashboardStats
from deps import get_current_user
from datetime import datetime, timedelta

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Base query filtered by user
    user_executions = (
        db.query(Execution)
        .join(Project)
        .filter(Project.user_id == current_user.id)
    )

    total_executions = user_executions.count()

    # Average scores from evaluations
    eval_stats = (
        db.query(
            func.avg(Evaluation.overall_score).label("avg_reliability"),
            func.avg(Evaluation.injection_risk_score).label("avg_injection_risk"),
        )
        .join(Execution)
        .join(Project)
        .filter(Project.user_id == current_user.id)
        .first()
    )

    avg_reliability = round(float(eval_stats.avg_reliability or 0), 3)
    avg_injection_risk = round(float(eval_stats.avg_injection_risk or 0), 3)

    # Average latency and total tokens
    exec_stats = (
        db.query(
            func.avg(Execution.latency_ms).label("avg_latency"),
            func.sum(Execution.total_tokens).label("total_tokens"),
        )
        .join(Project)
        .filter(Project.user_id == current_user.id)
        .first()
    )

    avg_latency = round(float(exec_stats.avg_latency or 0), 2)
    total_tokens = int(exec_stats.total_tokens or 0)

    # Executions by day (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    daily_counts = (
        db.query(
            cast(Execution.created_at, Date).label("day"),
            func.count(Execution.id).label("count"),
        )
        .join(Project)
        .filter(Project.user_id == current_user.id)
        .filter(Execution.created_at >= thirty_days_ago)
        .group_by(cast(Execution.created_at, Date))
        .order_by(cast(Execution.created_at, Date))
        .all()
    )
    executions_by_day = [{"date": str(row.day), "count": row.count} for row in daily_counts]

    # Score trend (last 30 days)
    score_trend_rows = (
        db.query(
            cast(Evaluation.created_at, Date).label("day"),
            func.avg(Evaluation.overall_score).label("avg_score"),
            func.avg(Evaluation.injection_risk_score).label("avg_injection"),
        )
        .join(Execution)
        .join(Project)
        .filter(Project.user_id == current_user.id)
        .filter(Evaluation.created_at >= thirty_days_ago)
        .group_by(cast(Evaluation.created_at, Date))
        .order_by(cast(Evaluation.created_at, Date))
        .all()
    )
    score_trend = [
        {
            "date": str(row.day),
            "reliability": round(float(row.avg_score or 0), 3),
            "injection_risk": round(float(row.avg_injection or 0), 3),
        }
        for row in score_trend_rows
    ]

    return DashboardStats(
        total_executions=total_executions,
        avg_reliability_score=avg_reliability,
        avg_injection_risk=avg_injection_risk,
        avg_latency_ms=avg_latency,
        total_tokens_used=total_tokens,
        executions_by_day=executions_by_day,
        score_trend=score_trend,
    )

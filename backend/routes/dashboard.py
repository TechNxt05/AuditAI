from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from database import get_db
from models import Execution, Evaluation, Project, User, AegisTrace, Benchmark

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    
    total_executions = db.query(Execution).join(Project).filter(Project.user_id == user_id).count()
    
    # 30-day trend (executions per day)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    daily_counts = db.query(
        cast(Execution.created_at, Date).label("date"),
        func.count(Execution.id).label("count")
    ).join(Project).filter(
        Project.user_id == user_id,
        Execution.created_at >= thirty_days_ago
    ).group_by(cast(Execution.created_at, Date)).all()
    
    # Score distribution (histogram buckets)
    # Using python to group to avoid complex SQL for simplicity
    evaluations = db.query(Evaluation.overall_score, Evaluation.failure_taxonomy, Evaluation.hallucination_score, Evaluation.faithfulness_score, Evaluation.injection_risk_score, Evaluation.compliance_score, Evaluation.tool_usage_score).join(Execution).join(Project).filter(Project.user_id == user_id).all()
    
    score_distribution_map = {f"0.{i}-0.{i+1}": 0 for i in range(10)}
    score_distribution_map["0.9-1.0"] = 0 # For exactly 1.0
    
    failure_counts = {}
    sum_hallucination = 0
    sum_faithfulness = 0
    sum_injection = 0
    sum_compliance = 0
    sum_tool = 0
    sum_overall = 0
    eval_count = len(evaluations)
    
    high_risk_count = 0

    for e in evaluations:
        score = e.overall_score or 0
        sum_hallucination += e.hallucination_score or 0
        sum_faithfulness += e.faithfulness_score or 0
        sum_injection += e.injection_risk_score or 0
        sum_compliance += e.compliance_score or 0
        sum_tool += e.tool_usage_score or 0
        sum_overall += score
        
        if score < 0.5:
            high_risk_count += 1
            
        bucket = min(int(score * 10), 9)
        bucket_key = f"0.{bucket}-0.{bucket+1}"
        score_distribution_map[bucket_key] += 1
        
        if e.failure_taxonomy:
            for fail_type in e.failure_taxonomy:
                failure_counts[fail_type] = failure_counts.get(fail_type, 0) + 1
                
    score_distribution = [{"bucket": k, "count": v} for k, v in score_distribution_map.items()]
    top_failures = [{"category": k, "count": v} for k, v in sorted(failure_counts.items(), key=lambda x: x[1], reverse=True)[:5]]
    
    # Aegis stats
    aegis_total = db.query(AegisTrace).filter(AegisTrace.user_id == user_id).count()
    aegis_blocked = db.query(AegisTrace).filter(AegisTrace.user_id == user_id, AegisTrace.was_blocked == True).count()
    aegis_avg_risk = db.query(func.avg(AegisTrace.overall_risk_score)).filter(AegisTrace.user_id == user_id).scalar()
    
    # Benchmark stats
    benchmark_count = db.query(Benchmark).filter(Benchmark.user_id == user_id).count()
    
    radar_averages = {
        "hallucination": sum_hallucination / eval_count if eval_count else 0,
        "faithfulness": sum_faithfulness / eval_count if eval_count else 0,
        "injection": sum_injection / eval_count if eval_count else 0,
        "compliance": sum_compliance / eval_count if eval_count else 0,
        "tool_usage": sum_tool / eval_count if eval_count else 0,
    }

    recent_executions = db.query(Execution).join(Project).filter(Project.user_id == user_id).order_by(Execution.created_at.desc()).limit(5).all()
    recent_exec_data = []
    for ex in recent_executions:
        # get eval
        ev = db.query(Evaluation).filter(Evaluation.execution_id == ex.id).first()
        recent_exec_data.append({
            "id": str(ex.id),
            "project_name": ex.project.name,
            "model": ex.model_name,
            "score": ev.overall_score if ev else 0,
            "flags": list(ev.failure_taxonomy.keys()) if ev and ev.failure_taxonomy else [],
            "created_at": ex.created_at.isoformat()
        })

    return {
        "total_executions": total_executions,
        "avg_overall_score": sum_overall / eval_count if eval_count else 0,
        "high_risk_count": high_risk_count,
        "daily_execution_trend": [{"date": str(r.date), "count": r.count} for r in daily_counts],
        "score_distribution": score_distribution,
        "top_failures": top_failures,
        "aegis_total_evaluations": aegis_total,
        "aegis_block_rate": (aegis_blocked / aegis_total * 100) if aegis_total > 0 else 0,
        "aegis_avg_risk": float(aegis_avg_risk or 0),
        "benchmark_count": benchmark_count,
        "radar_averages": radar_averages,
        "recent_executions": recent_exec_data
    }

from datetime import datetime
from sqlalchemy.orm import Session
from models import Benchmark, BenchmarkResult
from evaluator.hallucination import detect_hallucination
from evaluator.injection import detect_injection
from evaluator.faithfulness import score_faithfulness
from evaluator.compliance import score_compliance

def aggregate_results(model_results: list) -> dict:
    if not model_results:
        return {}
    
    count = len(model_results)
    
    avg_hallucination = sum(r["scores"]["hallucination"] for r in model_results) / count
    avg_faithfulness = sum(r["scores"]["faithfulness"] for r in model_results) / count
    avg_injection = sum(r["scores"]["injection"] for r in model_results) / count
    avg_compliance = sum(r["scores"]["compliance"] for r in model_results) / count
    avg_latency = sum(r.get("latency_ms", 0) for r in model_results) / count
    
    # overall score logic
    avg_overall = (avg_hallucination + avg_faithfulness + (1.0 - avg_injection) + avg_compliance) / 4.0
    
    return {
        "avg_hallucination_score": avg_hallucination,
        "avg_faithfulness_score": avg_faithfulness,
        "avg_injection_risk": avg_injection,
        "avg_compliance_score": avg_compliance,
        "avg_overall_score": avg_overall,
        "avg_latency_ms": avg_latency,
        "case_results": model_results
    }

def run_full_evaluation(prompt: str, response: str, context_docs: list) -> dict:
    hallucination = detect_hallucination(response, context_docs)
    injection = detect_injection(prompt)
    faithfulness = score_faithfulness(response, context_docs)
    compliance = score_compliance(response)
    
    # Just return raw scores here
    return {
        "hallucination": hallucination,
        "injection": injection,
        "faithfulness": faithfulness,
        "compliance": compliance
    }

async def execute_benchmark(benchmark_id: str, db: Session):
    benchmark = db.query(Benchmark).filter(Benchmark.id == benchmark_id).first()
    if not benchmark:
        return
        
    benchmark.status = "running"
    db.commit()
    
    results_by_model = {}
    
    for model_name in benchmark.models_compared:
        model_results = []
        
        for idx, test_case in enumerate(benchmark.test_cases):
            model_outputs = test_case.get("model_outputs", {})
            model_output = model_outputs.get(model_name, "")
            
            if not model_output:
                continue
            
            eval_result = run_full_evaluation(
                prompt=test_case.get("input", ""),
                response=model_output,
                context_docs=test_case.get("context_docs", []),
            )
            
            latencies = test_case.get("latency_ms", {})
            latency = latencies.get(model_name, 0)
            
            model_results.append({
                "test_case_id": test_case.get("id", str(idx)),
                "scores": eval_result,
                "latency_ms": latency
            })
            
        results_by_model[model_name] = aggregate_results(model_results)
        
    if results_by_model:
        # Determine winner
        winner = max(results_by_model.items(), key=lambda x: x[1].get("avg_overall_score", 0))
        benchmark.winner_model = winner[0]
        benchmark.winner_reason = f"Highest overall score: {winner[1].get('avg_overall_score', 0):.2f}"
    
    benchmark.results = results_by_model
    benchmark.status = "complete"
    benchmark.completed_at = datetime.utcnow()
    db.commit()
    
    # Also save to BenchmarkResult model
    for model_name, res in results_by_model.items():
        if res:
            b_result = BenchmarkResult(
                benchmark_id=benchmark.id,
                model_name=model_name,
                avg_hallucination_score=res.get("avg_hallucination_score", 0),
                avg_faithfulness_score=res.get("avg_faithfulness_score", 0),
                avg_injection_risk=res.get("avg_injection_risk", 0),
                avg_compliance_score=res.get("avg_compliance_score", 0),
                avg_overall_score=res.get("avg_overall_score", 0),
                avg_latency_ms=res.get("avg_latency_ms", 0),
                case_results=res.get("case_results", [])
            )
            db.add(b_result)
    db.commit()

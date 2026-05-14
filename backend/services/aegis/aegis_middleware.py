from services.aegis.hallucination_detector import get_hallucination_score
from services.aegis.injection_detector import get_injection_score
from services.aegis.grounding_detector import get_grounding_score
from services.aegis.risk_engine import calculate_overall_risk, determine_risk_level
from models import AegisTrace
from database import SessionLocal

async def run_aegis_evaluation(
    agent_input: str,
    agent_output: str,
    context_docs: list[str],
    policy_mode: str,
    weights: dict,
    project_id: str,
    user_id: str
) -> dict:
    hallucination_risk = get_hallucination_score(agent_output, context_docs)
    
    injection_data = get_injection_score(agent_input)
    injection_risk = injection_data.get("risk_score", 0.0)
    
    grounding_risk = get_grounding_score(agent_output, context_docs)
    
    overall_risk_score = calculate_overall_risk(hallucination_risk, injection_risk, grounding_risk, weights)
    risk_level = determine_risk_level(overall_risk_score)
    
    flags = []
    explanations = []
    
    if hallucination_risk > 0.5:
        flags.append("hallucination")
        explanations.append(f"High hallucination risk detected ({hallucination_risk})")
        
    if injection_risk > 0.5:
        flags.append("injection")
        for finding in injection_data.get("findings", []):
            explanations.append(f"Injection detected: {finding['category']}")
            
    if grounding_risk > 0.5:
        flags.append("grounding")
        explanations.append(f"Low grounding detected ({grounding_risk})")
        
    was_blocked = False
    safe_output = agent_output
    
    if policy_mode == "block" and risk_level == "HIGH":
        was_blocked = True
        safe_output = "This request could not be processed due to safety constraints."
        
    elif policy_mode == "rewrite" and risk_level == "HIGH":
        was_blocked = False
        safe_output = "The original response was flagged for safety and has been redacted."

    # Save trace to db
    db = SessionLocal()
    try:
        trace = AegisTrace(
            project_id=project_id,
            user_id=user_id,
            agent_input=agent_input,
            agent_output=agent_output,
            context_docs=context_docs,
            hallucination_score=hallucination_risk,
            injection_score=injection_risk,
            grounding_score=grounding_risk,
            overall_risk_score=overall_risk_score,
            risk_level=risk_level,
            flags=flags,
            explanations=explanations,
            policy_mode=policy_mode,
            was_blocked=was_blocked
        )
        db.add(trace)
        db.commit()
    finally:
        db.close()

    return {
        "risk_score": overall_risk_score,
        "risk_level": risk_level,
        "flags": flags,
        "explanations": explanations,
        "was_blocked": was_blocked,
        "safe_output": safe_output,
        "detector_breakdown": {
            "hallucination": hallucination_risk,
            "injection": injection_risk,
            "grounding": grounding_risk
        }
    }

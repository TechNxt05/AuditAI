def calculate_overall_risk(hallucination_risk: float, injection_risk: float, grounding_risk: float, weights: dict) -> float:
    w_h = weights.get("hallucination", 0.4)
    w_i = weights.get("injection", 0.4)
    w_g = weights.get("grounding", 0.2)
    
    overall = (hallucination_risk * w_h) + (injection_risk * w_i) + (grounding_risk * w_g)
    return round(min(overall, 1.0), 4)

def determine_risk_level(overall_score: float) -> str:
    if overall_score > 0.7:
        return "HIGH"
    elif overall_score > 0.4:
        return "MEDIUM"
    return "LOW"

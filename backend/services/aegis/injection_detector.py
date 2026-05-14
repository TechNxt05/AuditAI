from evaluator.injection import detect_injection, get_injection_details

def get_injection_score(agent_input: str) -> dict:
    """
    Returns dict with risk_score and findings.
    evaluator already returns risk score (0.0 safe, 1.0 high risk).
    """
    return get_injection_details(agent_input)

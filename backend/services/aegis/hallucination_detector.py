from evaluator.hallucination import detect_hallucination

def get_hallucination_score(agent_output: str, context_docs: list[str]) -> float:
    """
    Returns risk score (0.0 to 1.0)
    evaluator returns 1.0 for grounded, 0.0 for hallucinated.
    """
    score = detect_hallucination(agent_output, context_docs)
    return round(1.0 - score, 4)

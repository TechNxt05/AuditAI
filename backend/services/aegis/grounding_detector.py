from evaluator.faithfulness import score_faithfulness

def get_grounding_score(agent_output: str, context_docs: list[str]) -> float:
    """
    Returns risk score (0.0 to 1.0)
    evaluator returns 1.0 perfectly faithful, 0.0 not faithful.
    """
    score = score_faithfulness(agent_output, context_docs)
    return round(1.0 - score, 4)

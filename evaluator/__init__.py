"""
AuditAI Evaluator Engine
Deterministic, seeded, reproducible evaluation modules.
"""

from evaluator.hallucination import detect_hallucination
from evaluator.faithfulness import score_faithfulness
from evaluator.injection import detect_injection
from evaluator.tool_validator import validate_tool_usage
from evaluator.compliance import check_compliance


def evaluate_execution(
    response: str,
    retrieval_docs: list[str] = None,
    prompt: str = "",
    system_prompt: str = "",
    tool_calls: list[dict] = None,
    tool_outputs: list[dict] = None,
) -> dict:
    """Run the full evaluation suite and return all scores."""
    retrieval_docs = retrieval_docs or []
    tool_calls = tool_calls or []
    tool_outputs = tool_outputs or []

    h_score = detect_hallucination(response=response, retrieval_docs=retrieval_docs)
    f_score = score_faithfulness(response=response, retrieval_docs=retrieval_docs)
    i_score = detect_injection(prompt=prompt, system_prompt=system_prompt)
    t_score = validate_tool_usage(response=response, tool_calls=tool_calls, tool_outputs=tool_outputs)
    c_score, c_details = check_compliance(response=response, prompt=prompt)

    overall = round(
        h_score * 0.25 + f_score * 0.25 + (1.0 - i_score) * 0.20 + t_score * 0.15 + c_score * 0.15,
        4,
    )

    return {
        "hallucination_score": h_score,
        "faithfulness_score": f_score,
        "injection_risk_score": i_score,
        "tool_usage_score": t_score,
        "compliance_score": c_score,
        "overall_score": overall,
        "compliance_details": c_details,
    }

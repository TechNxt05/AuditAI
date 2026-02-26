import sys
import os

# Add parent dirs so evaluator package is importable on all platforms
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_root_dir = os.path.dirname(_backend_dir)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

from sqlalchemy.orm import Session
from models import Execution, TraceStep, Evaluation, StepType
from evaluator.hallucination import detect_hallucination
from evaluator.faithfulness import score_faithfulness
from evaluator.injection import detect_injection
from evaluator.tool_validator import validate_tool_usage
from evaluator.compliance import check_compliance


def _extract_trace_data(execution: Execution) -> dict:
    """Extract structured data from trace steps."""
    data = {
        "prompt": "",
        "system_prompt": "",
        "response": "",
        "retrieval_docs": [],
        "tool_calls": [],
        "tool_outputs": [],
    }

    for step in execution.trace_steps:
        content = step.content or {}
        text = content.get("text", str(content))

        if step.step_type == StepType.PROMPT:
            data["prompt"] = text
        elif step.step_type == StepType.SYSTEM_PROMPT:
            data["system_prompt"] = text
        elif step.step_type == StepType.RESPONSE:
            data["response"] = text
        elif step.step_type == StepType.RETRIEVAL:
            data["retrieval_docs"].append(text)
        elif step.step_type == StepType.TOOL_CALL:
            data["tool_calls"].append(content)
        elif step.step_type == StepType.TOOL_OUTPUT:
            data["tool_outputs"].append(content)

    return data


def run_evaluation(db: Session, execution: Execution) -> Evaluation:
    """Run all evaluation checks on an execution and store results."""
    trace_data = _extract_trace_data(execution)

    hallucination_score = detect_hallucination(
        response=trace_data["response"],
        retrieval_docs=trace_data["retrieval_docs"],
    )

    faithfulness_score = score_faithfulness(
        response=trace_data["response"],
        retrieval_docs=trace_data["retrieval_docs"],
    )

    injection_risk_score = detect_injection(
        prompt=trace_data["prompt"],
        system_prompt=trace_data["system_prompt"],
    )

    tool_usage_score = validate_tool_usage(
        response=trace_data["response"],
        tool_calls=trace_data["tool_calls"],
        tool_outputs=trace_data["tool_outputs"],
    )

    compliance_score, compliance_details = check_compliance(
        response=trace_data["response"],
        prompt=trace_data["prompt"],
    )

    overall_score = round(
        (
            hallucination_score * 0.25 +
            faithfulness_score * 0.25 +
            (1.0 - injection_risk_score) * 0.20 +
            tool_usage_score * 0.15 +
            compliance_score * 0.15
        ),
        4,
    )

    failure_taxonomy = {
        "hallucination_issues": [] if hallucination_score > 0.7 else ["Unsupported claims detected"],
        "faithfulness_issues": [] if faithfulness_score > 0.7 else ["Retrieved documents not fully utilized"],
        "injection_risks": [] if injection_risk_score < 0.3 else ["Prompt injection patterns detected"],
        "tool_issues": [] if tool_usage_score > 0.7 else ["Tool usage issues detected"],
        "compliance_issues": compliance_details,
    }

    evaluation = Evaluation(
        execution_id=execution.id,
        hallucination_score=hallucination_score,
        faithfulness_score=faithfulness_score,
        injection_risk_score=injection_risk_score,
        tool_usage_score=tool_usage_score,
        compliance_score=compliance_score,
        overall_score=overall_score,
        failure_taxonomy=failure_taxonomy,
    )
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)
    return evaluation

"""
Tool Usage Validator

Validates tool calls and outputs:
- Tool output referenced correctly in response?
- Invalid tool call format?
- Unnecessary tool invocations?

Fully deterministic.
"""

from typing import List, Dict, Any
from evaluator.similarity import text_similarity
from evaluator.utils import normalize_text
import json


def validate_tool_usage(
    response: str,
    tool_calls: List[Dict[str, Any]],
    tool_outputs: List[Dict[str, Any]],
) -> float:
    """
    Validate tool usage and return a score from 0.0 (poor) to 1.0 (good).
    
    Checks:
    1. Are tool outputs referenced in the response?
    2. Are tool calls properly formatted?
    3. Were unnecessary tools invoked?
    """
    if not tool_calls and not tool_outputs:
        return 1.0  # No tools to validate

    scores = []

    # 1. Check tool output referencing
    if tool_outputs:
        ref_score = _check_output_referencing(response, tool_outputs)
        scores.append(ref_score)

    # 2. Check tool call format
    if tool_calls:
        format_score = _check_format(tool_calls)
        scores.append(format_score)

    # 3. Check tool necessity (heuristic)
    if tool_calls:
        necessity_score = _check_necessity(response, tool_calls, tool_outputs)
        scores.append(necessity_score)

    if not scores:
        return 1.0

    return round(sum(scores) / len(scores), 4)


def _check_output_referencing(response: str, tool_outputs: List[Dict[str, Any]]) -> float:
    """Check if tool outputs are referenced in the response."""
    if not tool_outputs or not response:
        return 1.0

    referenced_count = 0
    for output in tool_outputs:
        output_text = _dict_to_text(output)
        if not output_text:
            continue

        sim = text_similarity(response, output_text)
        if sim >= 0.1:
            referenced_count += 1

    return referenced_count / max(len(tool_outputs), 1)


def _check_format(tool_calls: List[Dict[str, Any]]) -> float:
    """Check if tool calls have valid format (name + arguments)."""
    if not tool_calls:
        return 1.0

    valid_count = 0
    for call in tool_calls:
        has_name = "name" in call or "function" in call or "tool" in call
        has_args = "arguments" in call or "args" in call or "parameters" in call or "input" in call
        if has_name:
            valid_count += 1
        elif isinstance(call, dict) and len(call) > 0:
            valid_count += 0.5  # Partial credit for having some structure

    return valid_count / max(len(tool_calls), 1)


def _check_necessity(
    response: str,
    tool_calls: List[Dict[str, Any]],
    tool_outputs: List[Dict[str, Any]],
) -> float:
    """Heuristic check for tool necessity."""
    if not tool_calls:
        return 1.0

    # If there are tool outputs that have information relevant to the response,
    # then the tool calls were likely necessary
    if tool_outputs:
        useful_count = 0
        for output in tool_outputs:
            output_text = _dict_to_text(output)
            if output_text and text_similarity(response, output_text) >= 0.1:
                useful_count += 1

        return useful_count / max(len(tool_calls), 1)

    return 0.7  # Default: can't determine without outputs


def _dict_to_text(d: Any) -> str:
    """Convert dict/value to searchable text."""
    if isinstance(d, str):
        return d
    if isinstance(d, dict):
        parts = []
        for k, v in d.items():
            parts.append(f"{k}: {v}")
        return " ".join(parts)
    return str(d)

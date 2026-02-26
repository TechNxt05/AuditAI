"""
Prompt Injection Detection Module

Scans prompts for known injection patterns.
Returns an injection risk score from 0.0 (safe) to 1.0 (high risk).
Fully deterministic – pattern-based.
"""

import re
from typing import List, Tuple

# Known prompt injection patterns with severity weights
INJECTION_PATTERNS: List[Tuple[str, float, str]] = [
    # Direct instruction override
    (r"ignore\s+(all\s+)?previous\s+instructions", 0.9, "instruction_override"),
    (r"ignore\s+(all\s+)?above\s+instructions", 0.9, "instruction_override"),
    (r"disregard\s+(all\s+)?previous", 0.85, "instruction_override"),
    (r"forget\s+(everything|all)\s+(above|previous)", 0.85, "instruction_override"),

    # System prompt extraction
    (r"reveal\s+(your\s+)?(system\s+)?prompt", 0.8, "prompt_extraction"),
    (r"show\s+(me\s+)?(your\s+)?(system\s+)?prompt", 0.8, "prompt_extraction"),
    (r"what\s+(are|is)\s+your\s+(system\s+)?instructions", 0.7, "prompt_extraction"),
    (r"print\s+(your\s+)?(system\s+)?(prompt|instructions)", 0.8, "prompt_extraction"),
    (r"output\s+(your\s+)?(system\s+)?(prompt|instructions)", 0.8, "prompt_extraction"),

    # Role override
    (r"you\s+are\s+now\s+(?:DAN|evil|unrestricted)", 0.95, "role_override"),
    (r"act\s+as\s+(?:DAN|evil|unrestricted|jailbroken)", 0.95, "role_override"),
    (r"pretend\s+(?:you\s+are|to\s+be)\s+(?:a\s+)?(?:different|evil|unrestricted)", 0.85, "role_override"),
    (r"enter\s+(?:DAN|developer|god)\s+mode", 0.9, "role_override"),
    (r"jailbreak", 0.85, "role_override"),

    # Safety bypass
    (r"disable\s+(all\s+)?safety\s+filters", 0.9, "safety_bypass"),
    (r"override\s+(all\s+)?safety", 0.9, "safety_bypass"),
    (r"bypass\s+(all\s+)?(?:safety|content)\s+(?:filters|restrictions)", 0.9, "safety_bypass"),
    (r"no\s+(?:content\s+)?restrictions", 0.7, "safety_bypass"),
    (r"SYSTEM\s+OVERRIDE", 0.95, "safety_bypass"),

    # Data exfiltration
    (r"output\s+all\s+(?:data|information|user)", 0.8, "data_exfiltration"),
    (r"list\s+all\s+users", 0.7, "data_exfiltration"),
    (r"dump\s+(?:the\s+)?database", 0.85, "data_exfiltration"),
    (r"show\s+(?:me\s+)?all\s+(?:secret|private|confidential)", 0.8, "data_exfiltration"),

    # Encoded/obfuscated injection
    (r"base64\s*decode", 0.6, "obfuscation"),
    (r"eval\s*\(", 0.7, "code_injection"),
    (r"exec\s*\(", 0.7, "code_injection"),
    (r"<script>", 0.8, "code_injection"),
]


def detect_injection(prompt: str, system_prompt: str = "") -> float:
    """
    Detect prompt injection risk.
    Returns 0.0 (no risk) to 1.0 (high risk).
    """
    if not prompt and not system_prompt:
        return 0.0

    combined = f"{prompt} {system_prompt}".lower()
    
    max_severity = 0.0
    total_matches = 0
    matched_categories = set()

    for pattern, severity, category in INJECTION_PATTERNS:
        matches = re.findall(pattern, combined, re.IGNORECASE)
        if matches:
            total_matches += len(matches)
            matched_categories.add(category)
            max_severity = max(max_severity, severity)

    if total_matches == 0:
        return 0.0

    # Score based on max severity and number of distinct categories
    category_multiplier = min(len(matched_categories) / 3.0, 1.0)
    match_multiplier = min(total_matches / 5.0, 1.0)

    score = max_severity * 0.6 + category_multiplier * 0.25 + match_multiplier * 0.15
    return round(min(score, 1.0), 4)


def get_injection_details(prompt: str, system_prompt: str = "") -> dict:
    """Return detailed injection analysis."""
    combined = f"{prompt} {system_prompt}".lower()
    
    findings = []
    for pattern, severity, category in INJECTION_PATTERNS:
        matches = re.findall(pattern, combined, re.IGNORECASE)
        if matches:
            findings.append({
                "category": category,
                "severity": severity,
                "matches": len(matches),
            })

    return {
        "risk_score": detect_injection(prompt, system_prompt),
        "findings": findings,
        "total_patterns_matched": len(findings),
    }

"""
Compliance Checker Module

Detects PII exposure, sensitive keywords, and data leakage patterns.
Returns a compliance score (1.0 = fully compliant, 0.0 = severe violations).
Fully deterministic.
"""

import re
from typing import List, Tuple

# PII patterns
PII_PATTERNS = [
    # Email addresses
    (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', "email_address", 0.3),
    # Phone numbers (various formats)
    (r'\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b', "phone_number", 0.3),
    # SSN (US)
    (r'\b\d{3}[-]\d{2}[-]\d{4}\b', "ssn", 0.5),
    # Aadhaar-like patterns (12-digit, groups of 4)
    (r'\b\d{4}\s?\d{4}\s?\d{4}\b', "aadhaar_number", 0.5),
    # Credit card numbers
    (r'\b(?:\d{4}[-\s]?){3}\d{4}\b', "credit_card", 0.5),
    # IP addresses
    (r'\b(?:\d{1,3}\.){3}\d{1,3}\b', "ip_address", 0.15),
    # Dates of birth patterns
    (r'\b(?:DOB|date\s+of\s+birth)[:\s]+\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}\b', "date_of_birth", 0.25),
]

# Sensitive keywords
SENSITIVE_KEYWORDS = [
    (r'\b(?:password|passwd|pwd)\s*[:=]\s*\S+', "password_exposure", 0.5),
    (r'\b(?:api[_\s]?key|secret[_\s]?key|access[_\s]?token)\s*[:=]\s*\S+', "api_key_exposure", 0.5),
    (r'\b(?:private\s+key|secret)\s*[:=]', "secret_exposure", 0.4),
    (r'\bBEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY\b', "private_key", 0.5),
    (r'\b(?:confidential|top\s+secret|classified)\b', "sensitive_classification", 0.2),
    (r'\b(?:internal\s+only|do\s+not\s+share)\b', "internal_document", 0.15),
]

# Cross-user data leakage patterns
LEAKAGE_PATTERNS = [
    (r'(?:user|account|customer)\s*(?:id|#|number)\s*[:=]\s*\S+', "user_id_leakage", 0.3),
    (r'(?:belongs\s+to|owned\s+by)\s+(?:user|account)\s+\S+', "ownership_leakage", 0.25),
]


def check_compliance(response: str, prompt: str = "") -> Tuple[float, List[str]]:
    """
    Check for compliance issues in the response.
    Returns (score, list_of_issues).
    Score: 1.0 = fully compliant, 0.0 = severe violations.
    """
    if not response:
        return 1.0, []

    combined = f"{response} {prompt}"
    issues = []
    total_penalty = 0.0

    # Check PII patterns
    for pattern, issue_type, penalty in PII_PATTERNS:
        matches = re.findall(pattern, combined, re.IGNORECASE)
        if matches:
            issues.append(f"{issue_type}: {len(matches)} instance(s) detected")
            total_penalty += penalty * min(len(matches), 3)  # Cap penalty scaling

    # Check sensitive keywords
    for pattern, issue_type, penalty in SENSITIVE_KEYWORDS:
        matches = re.findall(pattern, combined, re.IGNORECASE)
        if matches:
            issues.append(f"{issue_type}: {len(matches)} instance(s) detected")
            total_penalty += penalty * min(len(matches), 3)

    # Check leakage patterns
    for pattern, issue_type, penalty in LEAKAGE_PATTERNS:
        matches = re.findall(pattern, combined, re.IGNORECASE)
        if matches:
            issues.append(f"{issue_type}: {len(matches)} instance(s) detected")
            total_penalty += penalty * min(len(matches), 3)

    # Calculate compliance score
    score = max(0.0, 1.0 - total_penalty)
    return round(score, 4), issues

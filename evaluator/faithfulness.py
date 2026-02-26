"""
Faithfulness Scoring Module

Checks whether retrieved documents are actually referenced in the response.
Measures how well the response utilizes the provided context.
Fully deterministic.
"""

from typing import List
from evaluator.similarity import text_similarity, tokenize
from evaluator.utils import extract_key_phrases


def score_faithfulness(response: str, retrieval_docs: List[str]) -> float:
    """
    Score how faithfully the response uses retrieved documents.
    Returns 0.0 (not faithful) to 1.0 (perfectly faithful).
    
    If no retrieval docs, returns 1.0 (nothing to be faithful to).
    """
    if not response or not response.strip():
        return 0.0

    if not retrieval_docs:
        return 1.0

    total_doc_score = 0.0
    doc_count = len(retrieval_docs)

    for doc in retrieval_docs:
        # Check overall similarity
        sim = text_similarity(response, doc)

        # Check key phrase overlap
        doc_phrases = extract_key_phrases(doc)
        response_lower = response.lower()

        phrase_matches = 0
        for phrase in doc_phrases:
            if phrase in response_lower:
                phrase_matches += 1

        phrase_score = phrase_matches / max(len(doc_phrases), 1)

        # Check token overlap
        doc_tokens = set(tokenize(doc))
        response_tokens = set(tokenize(response))
        
        if doc_tokens:
            overlap = len(doc_tokens & response_tokens) / len(doc_tokens)
        else:
            overlap = 0.0

        # Weighted combination
        doc_score = sim * 0.4 + phrase_score * 0.3 + overlap * 0.3
        total_doc_score += min(doc_score * 2.0, 1.0)  # Scale up, cap at 1.0

    faithfulness = total_doc_score / doc_count if doc_count > 0 else 1.0
    return round(min(faithfulness, 1.0), 4)

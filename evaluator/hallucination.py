"""
Hallucination Detection Module

Compares response sentences against retrieved documents.
Uses TF-IDF cosine similarity to identify unsupported claims.
Fully deterministic – no randomness.
"""

from typing import List
from evaluator.similarity import text_similarity, sentence_split


def detect_hallucination(response: str, retrieval_docs: List[str]) -> float:
    """
    Detect hallucination by comparing each response sentence against
    retrieval documents. Returns a score from 0.0 (fully hallucinated)
    to 1.0 (fully grounded).
    
    If no retrieval docs exist, returns 1.0 (no grounding to check against).
    """
    if not response or not response.strip():
        return 1.0

    if not retrieval_docs:
        return 1.0  # No retrieval context to ground against

    sentences = sentence_split(response)
    if not sentences:
        return 1.0

    combined_docs = " ".join(retrieval_docs)

    grounded_count = 0
    total_sentences = len(sentences)

    for sentence in sentences:
        # Check similarity against combined docs
        sim_combined = text_similarity(sentence, combined_docs)

        # Check similarity against each individual doc
        max_individual_sim = 0.0
        for doc in retrieval_docs:
            sim = text_similarity(sentence, doc)
            max_individual_sim = max(max_individual_sim, sim)

        # A sentence is grounded if it has reasonable similarity to sources
        best_sim = max(sim_combined, max_individual_sim)
        if best_sim >= 0.15:  # Threshold for "grounded"
            grounded_count += 1

    score = grounded_count / total_sentences if total_sentences > 0 else 1.0
    return round(score, 4)

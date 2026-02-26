"""
Text similarity utilities using TF-IDF for deterministic, reproducible scoring.
No neural models, no randomness.
"""

import re
import math
from typing import List, Dict
from collections import Counter


def tokenize(text: str) -> List[str]:
    """Simple whitespace + punctuation tokenizer."""
    text = text.lower()
    tokens = re.findall(r'\b[a-z0-9]+\b', text)
    return tokens


def compute_tf(tokens: List[str]) -> Dict[str, float]:
    """Compute term frequency."""
    counts = Counter(tokens)
    total = len(tokens)
    if total == 0:
        return {}
    return {word: count / total for word, count in counts.items()}


def compute_idf(documents: List[List[str]]) -> Dict[str, float]:
    """Compute inverse document frequency."""
    n_docs = len(documents)
    if n_docs == 0:
        return {}

    df = Counter()
    for doc_tokens in documents:
        unique_tokens = set(doc_tokens)
        for token in unique_tokens:
            df[token] += 1

    return {word: math.log((n_docs + 1) / (count + 1)) + 1 for word, count in df.items()}


def tfidf_vector(tokens: List[str], idf: Dict[str, float]) -> Dict[str, float]:
    """Compute TF-IDF vector for a document."""
    tf = compute_tf(tokens)
    return {word: tf_val * idf.get(word, 1.0) for word, tf_val in tf.items()}


def cosine_similarity(vec_a: Dict[str, float], vec_b: Dict[str, float]) -> float:
    """Compute cosine similarity between two sparse vectors."""
    if not vec_a or not vec_b:
        return 0.0

    all_keys = set(vec_a.keys()) | set(vec_b.keys())
    dot_product = sum(vec_a.get(k, 0) * vec_b.get(k, 0) for k in all_keys)
    norm_a = math.sqrt(sum(v ** 2 for v in vec_a.values()))
    norm_b = math.sqrt(sum(v ** 2 for v in vec_b.values()))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot_product / (norm_a * norm_b)


def text_similarity(text_a: str, text_b: str) -> float:
    """Compute TF-IDF cosine similarity between two texts."""
    tokens_a = tokenize(text_a)
    tokens_b = tokenize(text_b)

    if not tokens_a or not tokens_b:
        return 0.0

    idf = compute_idf([tokens_a, tokens_b])
    vec_a = tfidf_vector(tokens_a, idf)
    vec_b = tfidf_vector(tokens_b, idf)

    return cosine_similarity(vec_a, vec_b)


def sentence_split(text: str) -> List[str]:
    """Split text into sentences."""
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in sentences if len(s.strip()) > 5]

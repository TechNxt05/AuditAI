import numpy as np
import re

# Lazily loaded model to avoid freezing the app on startup
_model = None

def get_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            # Using the fast, lightweight model requested
            _model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        except ImportError:
            # Fallback if library missing
            print("Warning: sentence-transformers not installed. Groundedness will return 0.0")
            return None
    return _model

def compute_embedding(text: str):
    """Compute the embedding for a given text."""
    model = get_model()
    if model is None:
        return np.zeros(384)
    return model.encode(text)

def cosine_similarity(vec1, vec2) -> float:
    """Calculate cosine similarity between two vectors."""
    dot_product = np.dot(vec1, vec2)
    norm_a = np.linalg.norm(vec1)
    norm_b = np.linalg.norm(vec2)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot_product / (norm_a * norm_b))

def evaluate_groundedness(response: str, retrieved_docs: list[str]) -> float:
    """
    Evaluate how grounded a response is in the retrieved docs.
    Returns a score from 0.0 to 1.0.
    """
    if not retrieved_docs or not response:
        return 0.0
        
    # Split response into sentences
    sentences = re.split(r'(?<=[.!?])\s+', response)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if not sentences:
        return 0.0

    # Split docs into sentences
    doc_text = " ".join(retrieved_docs)
    doc_sentences = re.split(r'(?<=[.!?])\s+', doc_text)
    doc_sentences = [s.strip() for s in doc_sentences if s.strip()]
    
    if not doc_sentences:
        doc_sentences = retrieved_docs

    try:
        doc_embeddings = [compute_embedding(s) for s in doc_sentences]
        response_embeddings = [compute_embedding(s) for s in sentences]
    except Exception as e:
        print(f"Embedding computation failed: {e}")
        return 0.0

    if not doc_embeddings or not response_embeddings:
        return 0.0
        
    scores = []
    for resp_vec in response_embeddings:
        max_sim = 0.0
        for doc_vec in doc_embeddings:
            sim = cosine_similarity(resp_vec, doc_vec)
            if sim > max_sim:
                max_sim = sim
        scores.append(max_sim)

    if not scores:
        return 0.0

    # Average maximum similarity across all response sentences
    avg_score = sum(scores) / len(scores)
    
    return round(max(0.0, min(1.0, float(avg_score))), 4)

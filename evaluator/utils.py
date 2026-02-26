"""Text processing utilities."""

import re
from typing import List


def normalize_text(text: str) -> str:
    """Normalize text by lowering case and removing extra whitespace."""
    text = text.lower().strip()
    text = re.sub(r'\s+', ' ', text)
    return text


def sentence_split(text: str) -> List[str]:
    """Split text into sentences."""
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in sentences if len(s.strip()) > 5]


def extract_key_phrases(text: str) -> List[str]:
    """Extract meaningful phrases (3+ word ngrams)."""
    words = re.findall(r'\b[a-z0-9]+\b', text.lower())
    phrases = []
    for i in range(len(words) - 2):
        phrases.append(' '.join(words[i:i + 3]))
    return phrases

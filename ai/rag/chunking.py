
"""
Document chunking module.

Splits extracted PDF pages into token-limited chunks while
preserving original sentence text, document metadata, and
original page references.
"""

import hashlib
import re
from typing import Any

from transformers import AutoTokenizer


MODEL_NAME = "BAAI/bge-m3"

DEFAULT_CHUNK_SIZE = 400
DEFAULT_CHUNK_OVERLAP = 60

_tokenizer = None


def get_tokenizer():
    """Load and reuse the BGE-M3 tokenizer."""
    global _tokenizer

    if _tokenizer is None:
        print(f"Loading tokenizer: {MODEL_NAME}")
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

    return _tokenizer


def count_tokens(text: str, tokenizer) -> int:
    """Count tokens without adding special tokens."""
    return len(
        tokenizer.encode(
            text,
            add_special_tokens=False,
        )
    )


def split_into_sentences(text: str) -> list[str]:
    """
    Split text at common sentence boundaries.

    Supports English, French, and Arabic punctuation.
    Original sentence strings are retained.
    """
    parts = re.split(
        r"(?<=[.!?؟。])\s+|\n+",
        text.strip(),
    )

    return [part for part in parts if part.strip()]


def split_long_sentence(
    sentence: str,
    tokenizer,
    chunk_size: int,
    chunk_overlap: int,
) -> list[str]:
    """
    Split an exceptionally long sentence at word boundaries.

    Words are never split into tokenizer subword pieces.
    Adjacent pieces overlap by whole words where possible.
    """
    words = sentence.split()

    pieces = []
    current_words = []

    for word in words:
        candidate = " ".join(current_words + [word])

        if count_tokens(candidate, tokenizer) <= chunk_size:
            current_words.append(word)
            continue

        if not current_words:
            raise ValueError(
                "A single word exceeds the configured chunk size."
            )

        pieces.append(" ".join(current_words))

        # Keep whole words from the end as overlap.
        overlap_words = []

        for previous_word in reversed(current_words):
            candidate_overlap = " ".join(
                [previous_word] + overlap_words
            )

            if count_tokens(candidate_overlap, tokenizer) > chunk_overlap:
                break

            overlap_words.insert(0, previous_word)

        current_words = overlap_words + [word]

        if count_tokens(" ".join(current_words), tokenizer) > chunk_size:
            raise ValueError(
                "Unable to fit a word within the configured chunk size."
            )

    if current_words:
        pieces.append(" ".join(current_words))

    return pieces


def create_chunk_id(
    document_id: str,
    page_number: int,
    chunk_index: int,
    text: str,
) -> str:
    """Generate a deterministic ID for a chunk."""
    content = (
        f"{document_id}|{page_number}|{chunk_index}|{text}"
    )

    return hashlib.sha256(
        content.encode("utf-8")
    ).hexdigest()


def get_sentence_overlap(
    sentences: list[str],
    tokenizer,
    chunk_overlap: int,
) -> list[str]:
    """
    Select complete trailing sentences for the next chunk.

    Never cuts a sentence just to reach the overlap target.
    """
    overlap = []

    for sentence in reversed(sentences):
        candidate = [sentence] + overlap

        if count_tokens(" ".join(candidate), tokenizer) > chunk_overlap:
            break

        overlap = candidate

    return overlap


def chunk_pages(
    pages: list[dict[str, Any]],
    document_id: str,
    document_title: str,
    filename: str,
    source_type: str = "pdf",
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> list[dict[str, Any]]:
    """
    Split extracted pages into overlapping, token-limited chunks.

    Each chunk belongs to exactly one original page.
    Original sentence text is preserved whenever possible.
    """

    if not isinstance(document_id, str) or not document_id.strip():
        raise ValueError("document_id cannot be empty.")

    if chunk_size < 1:
        raise ValueError("chunk_size must be at least 1.")

    if chunk_overlap < 0:
        raise ValueError("chunk_overlap cannot be negative.")

    if chunk_overlap >= chunk_size:
        raise ValueError(
            "chunk_overlap must be smaller than chunk_size."
        )

    tokenizer = get_tokenizer()
    chunks = []

    for page in pages:
        page_number = page["page_number"]
        text = page["text"].strip()

        if not text:
            continue

        sentences = split_into_sentences(text)

        # Keep normal sentences intact. Only split sentences
        # that exceed the configured token limit.
        units = []

        for sentence in sentences:
            if count_tokens(sentence, tokenizer) <= chunk_size:
                units.append(sentence)
            else:
                units.extend(
                    split_long_sentence(
                        sentence,
                        tokenizer,
                        chunk_size,
                        chunk_overlap,
                    )
                )

        current_sentences = []
        page_chunk_index = 0

        def save_chunk(sentence_parts: list[str]) -> None:
            nonlocal page_chunk_index

            if not sentence_parts:
                return

            chunk_text = " ".join(sentence_parts).strip()

            if not chunk_text:
                return

            token_count = count_tokens(chunk_text, tokenizer)

            if token_count > chunk_size:
                raise RuntimeError(
                    f"Chunk has {token_count} tokens; "
                    f"maximum is {chunk_size}."
                )

            chunk_id = create_chunk_id(
                document_id=document_id,
                page_number=page_number,
                chunk_index=page_chunk_index,
                text=chunk_text,
            )

            chunks.append(
                {
                    "chunk_id": chunk_id,
                    "document_id": document_id,
                    "document_title": document_title,
                    "filename": filename,
                    "source_type": source_type,
                    "page_number": page_number,
                    "chunk_index": page_chunk_index,
                    "text": chunk_text,
                    "token_count": token_count,
                }
            )

            page_chunk_index += 1

        for unit in units:
            candidate = " ".join(current_sentences + [unit])

            if count_tokens(candidate, tokenizer) <= chunk_size:
                current_sentences.append(unit)
                continue

            # Save the current chunk before starting another.
            save_chunk(current_sentences)

            # Retain complete trailing sentences as overlap.
            overlap_sentences = get_sentence_overlap(
                current_sentences,
                tokenizer,
                chunk_overlap,
            )

            current_sentences = overlap_sentences + [unit]

        if current_sentences:
            save_chunk(current_sentences)

    return chunks

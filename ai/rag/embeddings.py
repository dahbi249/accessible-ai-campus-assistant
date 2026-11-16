
"""
BGE-M3 embedding service.

Responsible for converting questions and document text
into 1024-dimensional dense embeddings.
"""

from typing import Sequence

import numpy as np
import torch
from FlagEmbedding import BGEM3FlagModel


class BGEEmbeddingService:
    """Reusable BGE-M3 embedding service."""

    MODEL_NAME = "BAAI/bge-m3"
    EMBEDDING_DIMENSION = 1024

    def __init__(
        self,
        model_name: str = MODEL_NAME,
        device: str | None = None,
        use_fp16: bool = True,
    ) -> None:
        """
        Initialize the embedding model.

        Args:
            model_name: Hugging Face model identifier.
            device: Device to use, such as cuda:0 or cpu.
            use_fp16: Enable half-precision inference.
        """

        if device is None:
            device = "cuda:0" if torch.cuda.is_available() else "cpu"

        if device.startswith("cuda") and not torch.cuda.is_available():
            raise RuntimeError(
                "CUDA was requested, but CUDA is not available."
            )

        self.device = device

        print(f"Loading embedding model: {model_name}")
        print(f"Using device: {self.device}")

        self.model = BGEM3FlagModel(
            model_name,
            use_fp16=use_fp16,
            devices=device,
        )

        print("Embedding model loaded successfully.")

    def embed_texts(
        self,
        texts: Sequence[str],
        batch_size: int = 8,
        max_length: int = 512,
    ) -> np.ndarray:
        """
        Generate dense embeddings for multiple texts.

        Returns:
            NumPy array with shape (number_of_texts, 1024).
        """

        if isinstance(texts, str):
            raise TypeError(
                "texts must be a sequence of strings, not a single string."
            )

        texts = list(texts)

        if not texts:
            return np.empty(
                (0, self.EMBEDDING_DIMENSION),
                dtype=np.float32,
            )

        if not all(isinstance(text, str) for text in texts):
            raise TypeError("Every input must be a string.")

        if any(not text.strip() for text in texts):
            raise ValueError("Input texts cannot be empty.")

        if batch_size < 1:
            raise ValueError("batch_size must be at least 1.")

        if max_length < 1:
            raise ValueError("max_length must be at least 1.")

        result = self.model.encode(
            texts,
            batch_size=batch_size,
            max_length=max_length,
        )

        embeddings = np.asarray(
            result["dense_vecs"],
            dtype=np.float32,
        )

        expected_shape = (
            len(texts),
            self.EMBEDDING_DIMENSION,
        )

        if embeddings.shape != expected_shape:
            raise RuntimeError(
                f"Unexpected embedding shape: {embeddings.shape}. "
                f"Expected: {expected_shape}"
            )

        return embeddings

    def embed_query(self, query: str) -> np.ndarray:
        """
        Generate an embedding for one student question.

        Returns:
            One 1024-dimensional NumPy vector.
        """

        if not isinstance(query, str):
            raise TypeError("query must be a string.")

        if not query.strip():
            raise ValueError("query cannot be empty.")

        embeddings = self.embed_texts([query])

        return embeddings[0]

    def embed_documents(
        self,
        documents: Sequence[str],
        batch_size: int = 8,
        max_length: int = 512,
    ) -> np.ndarray:
        """
        Generate embeddings for document chunks.

        Returns:
            NumPy array with shape (number_of_chunks, 1024).
        """

        return self.embed_texts(
            documents,
            batch_size=batch_size,
            max_length=max_length,
        )

    def to_pgvector(self, embedding: np.ndarray) -> list[float]:
        """
        Convert an embedding into a Python list of floats.

        Suitable for passing to a PostgreSQL/pgvector
        integration after the database interface is agreed.
        """

        embedding = np.asarray(
            embedding,
            dtype=np.float32,
        )

        if embedding.shape != (self.EMBEDDING_DIMENSION,):
            raise ValueError(
                f"Expected a single {self.EMBEDDING_DIMENSION}-"
                f"dimensional vector. Got {embedding.shape}."
            )

        return embedding.tolist()


# Module-level service instance.
# The model is loaded only when the service is first requested.

_embedding_service: BGEEmbeddingService | None = None


def get_embedding_service() -> BGEEmbeddingService:
    """
    Return the shared embedding service.

    Subsequent calls reuse the already-loaded model.
    """

    global _embedding_service

    if _embedding_service is None:
        _embedding_service = BGEEmbeddingService()

    return _embedding_service

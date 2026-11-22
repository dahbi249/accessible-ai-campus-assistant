import re
import math

from sqlalchemy import select

from app.database.session import SessionLocal
from app.database.models import Document, DocumentChunk


SHA256_PATTERN = re.compile(r"^[a-fA-F0-9]{64}$")


def validate_hash(value: str, field_name: str) -> None:
    if not isinstance(value, str) or not SHA256_PATTERN.fullmatch(value):
        raise ValueError(
            f"{field_name} must be a valid 64-character SHA-256 hash"
        )


def validate_embedding(embedding: list) -> None:
    if not isinstance(embedding, list) or len(embedding) != 1024:
        raise ValueError("Embedding must contain exactly 1024 values")

    for value in embedding:
        if (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(value)
        ):
            raise ValueError("Embedding contains an invalid numeric value")


def store_document_chunks(
    document_hash: str,
    document_info: dict,
    chunks: list[dict],
) -> int:
    """
    Store document information, chunks and BGE-M3 embeddings.
    Returns the number of newly inserted chunks.
    """

    validate_hash(document_hash, "document_hash")

    if not isinstance(document_info, dict):
        raise ValueError("document_info must be a dictionary")

    if not isinstance(chunks, list):
        raise ValueError("chunks must be a list")

    if not chunks:
        return 0

    required_document_fields = (
        "title",
        "file_name",
        "file_path",
        "source",
    )

    for field in required_document_fields:
        if not document_info.get(field):
            raise ValueError(f"Missing document field: {field}")

    inserted_count = 0

    with SessionLocal.begin() as db:
        document = db.scalar(
            select(Document).where(
                Document.content_hash == document_hash
            )
        )

        if document is None:
            document = Document(
                content_hash=document_hash,
                title=document_info["title"],
                file_name=document_info["file_name"],
                file_path=document_info["file_path"],
                source=document_info["source"],
            )
            db.add(document)
            db.flush()

        for chunk in chunks:
            required_fields = (
                "chunk_id",
                "text",
                "chunk_index",
                "embedding",
            )

            for field in required_fields:
                if field not in chunk:
                    raise ValueError(f"Missing chunk field: {field}")

            validate_hash(chunk["chunk_id"], "chunk_id")
            validate_embedding(chunk["embedding"])

            if not isinstance(chunk["text"], str) or not chunk["text"].strip():
                raise ValueError("Chunk text must not be empty")

            if (
                isinstance(chunk["chunk_index"], bool)
                or not isinstance(chunk["chunk_index"], int)
                or chunk["chunk_index"] < 0
            ):
                raise ValueError("Invalid chunk_index")

            chunk_metadata = chunk.get("metadata") or {}

            if not isinstance(chunk_metadata, dict):
                raise ValueError("Chunk metadata must be a dictionary")

            existing_chunk = db.scalar(
                select(DocumentChunk).where(
                    DocumentChunk.chunk_id == chunk["chunk_id"]
                )
            )

            if existing_chunk is not None:
                continue

            metadata = {
                **chunk_metadata,
                "document_title": document_info["title"],
                "filename": document_info["file_name"],
                "source_type": document_info["source"],
                "token_count": chunk.get("token_count"),
            }

            db.add(
                DocumentChunk(
                    chunk_id=chunk["chunk_id"],
                    document_id=document.id,
                    content=chunk["text"],
                    chunk_index=chunk["chunk_index"],
                    page_number=chunk.get("page_number"),
                    chunk_metadata=metadata,
                    embedding=chunk["embedding"],
                )
            )

            inserted_count += 1

    return inserted_count
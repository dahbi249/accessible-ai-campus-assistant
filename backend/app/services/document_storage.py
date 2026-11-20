import re

from sqlalchemy import select

from app.database.session import SessionLocal
from app.database.models import Document, DocumentChunk


SHA256_PATTERN = re.compile(r"^[a-fA-F0-9]{64}$")


def validate_hash(value: str, field_name: str) -> None:
    if not isinstance(value, str) or not SHA256_PATTERN.fullmatch(value):
        raise ValueError(
            f"{field_name} must be a valid 64-character SHA-256 hash"
        )


def store_document_chunks(
    document_hash: str,
    document_info: dict,
    chunks: list[dict],
) -> int:
    """
    Store document chunks and their 1024-dimensional embeddings.
    Returns the number of newly inserted chunks.
    """

    validate_hash(document_hash, "document_hash")

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

            required_chunk_fields = (
                "chunk_id",
                "text",
                "chunk_index",
                "embedding",
            )

            for field in required_chunk_fields:
                if field not in chunk:
                    raise ValueError(f"Missing chunk field: {field}")

            validate_hash(chunk["chunk_id"], "chunk_id")

            if len(chunk["embedding"]) != 1024:
                raise ValueError(
                    "Embedding must contain exactly 1024 values"
                )

            existing_chunk = db.scalar(
                select(DocumentChunk).where(
                    DocumentChunk.chunk_id == chunk["chunk_id"]
                )
            )

            if existing_chunk is not None:
                continue

            metadata = {
                "document_title": document_info["title"],
                "filename": document_info["file_name"],
                "source_type": document_info["source"],
                "token_count": chunk.get("token_count"),
            }

            new_chunk = DocumentChunk(
                chunk_id=chunk["chunk_id"],
                document_id=document.id,
                content=chunk["text"],
                chunk_index=chunk["chunk_index"],
                page_number=chunk.get("page_number"),
                chunk_metadata=metadata,
                embedding=chunk["embedding"],
            )

            db.add(new_chunk)
            inserted_count += 1

    return inserted_count
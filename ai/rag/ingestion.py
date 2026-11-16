
"""
Document ingestion pipeline.

Connects PDF extraction, text chunking, and BGE-M3 embeddings.
Returns prepared records for database storage.
"""

import hashlib
from pathlib import Path
from typing import Any

from ai.rag.pdf_extraction import extract_pdf
from ai.rag.chunking import chunk_pages
from ai.rag.embeddings import get_embedding_service


def calculate_document_id(pdf_path: Path) -> str:
    """
    Generate a deterministic document ID from the PDF content.
    """
    sha256 = hashlib.sha256()

    with pdf_path.open("rb") as file:
        for block in iter(lambda: file.read(1024 * 1024), b""):
            sha256.update(block)

    return sha256.hexdigest()


def process_pdf(
    pdf_path: str | Path,
    batch_size: int = 8,
    chunk_size: int = 400,
    chunk_overlap: int = 60,
    embedding_max_length: int = 512,
) -> dict[str, Any]:
    """
    Process a PDF through the complete ingestion pipeline.

    Pipeline:
        1. Extract PDF text.
        2. Split text into chunks.
        3. Generate BGE-M3 embeddings.
        4. Attach embeddings to chunk records.

    Returns:
        Document information, prepared chunks, statistics,
        and warnings.
    """

    pdf_path = Path(pdf_path)

    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    if not pdf_path.is_file():
        raise ValueError(f"Not a file: {pdf_path}")

    if chunk_size >= embedding_max_length:
        raise ValueError(
            "chunk_size must be smaller than embedding_max_length."
        )

    print("\nStarting document ingestion...")
    print(f"File: {pdf_path.name}")

    # Step 1: Extract PDF text.
    print("\n[1/3] Extracting PDF text...")

    extraction = extract_pdf(pdf_path)

    document = extraction["document"]
    pages = extraction["pages"]

    document_id = calculate_document_id(pdf_path)

    print(f"Pages extracted: {len(pages)}")

    # Step 2: Create text chunks.
    print("\n[2/3] Creating document chunks...")

    chunks = chunk_pages(
        pages=pages,
        document_id=document_id,
        document_title=document["title"],
        filename=document["filename"],
        source_type=document["source_type"],
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

    if not chunks:
        raise ValueError(
            "No extractable text was found in this PDF."
        )

    print(f"Chunks created: {len(chunks)}")

    # Step 3: Generate embeddings.
    print("\n[3/3] Generating embeddings...")

    embedding_service = get_embedding_service()

    texts = [chunk["text"] for chunk in chunks]

    embeddings = embedding_service.embed_documents(
        texts,
        batch_size=batch_size,
        max_length=embedding_max_length,
    )

    if len(embeddings) != len(chunks):
        raise RuntimeError(
            "The number of embeddings does not match "
            "the number of chunks."
        )

    # Attach each vector to its corresponding chunk.
    for chunk, embedding in zip(chunks, embeddings):
        chunk["embedding"] = embedding_service.to_pgvector(
            embedding
        )

    # Identify pages that may need OCR.
    pages_needing_ocr = [
        page["page_number"]
        for page in pages
        if page["needs_ocr"]
    ]

    warnings = []

    if pages_needing_ocr:
        warnings.append(
            "Some pages contain no extractable text and may "
            "require OCR."
        )

    document_info = {
        "document_id": document_id,
        "title": document["title"],
        "filename": document["filename"],
        "source_type": document["source_type"],
        "page_count": document["page_count"],
        "metadata": document["metadata"],
    }

    statistics = {
        "total_pages": len(pages),
        "total_chunks": len(chunks),
        "embedding_dimension": 1024,
        "pages_needing_ocr": pages_needing_ocr,
    }

    print("\nDocument ingestion completed.")
    print(f"Document ID: {document_id}")
    print(f"Total chunks: {len(chunks)}")
    print("Embedding dimension: 1024")

    return {
        "document": document_info,
        "chunks": chunks,
        "statistics": statistics,
        "warnings": warnings,
    }


"""
PDF text extraction module.

Extracts text page by page using PyMuPDF
and preserves document metadata for the RAG pipeline.
"""

from pathlib import Path
from typing import Any

import pymupdf


def extract_pdf(pdf_path: str | Path) -> dict[str, Any]:
    """
    Extract text and metadata from a PDF.

    Args:
        pdf_path: Path to the PDF document.

    Returns:
        A dictionary containing document metadata and page data.

    Raises:
        FileNotFoundError: If the PDF does not exist.
        ValueError: If the file is not a PDF or is encrypted.
    """

    pdf_path = Path(pdf_path)

    # 1. Validate the file
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    if not pdf_path.is_file():
        raise ValueError(f"Not a file: {pdf_path}")

    if pdf_path.suffix.lower() != ".pdf":
        raise ValueError(f"Expected a PDF file: {pdf_path}")

    # 2. Open the PDF
    with pymupdf.open(pdf_path) as document:

        if document.needs_pass:
            raise ValueError(
                f"PDF is password-protected: {pdf_path.name}"
            )

        # 3. Extract document metadata
        metadata = document.metadata or {}

        document_title = (
            metadata.get("title") or pdf_path.stem
        ).strip()

        pages = []

        # 4. Extract text page by page
        for page_index, page in enumerate(document):

            text = page.get_text("text", sort=True)

            # Normalize line endings and remove null characters
            text = text.replace("\x00", "")
            text = text.replace("\r\n", "\n")
            text = text.strip()

            pages.append(
                {
                    "page_number": page_index + 1,
                    "text": text,
                    "is_empty": not bool(text),
                    "needs_ocr": not bool(text),
                }
            )

        # 5. Return structured document data
        return {
            "document": {
                "title": document_title,
                "filename": pdf_path.name,
                "source_type": "pdf",
                "page_count": len(document),
                "metadata": metadata,
            },
            "pages": pages,
        }

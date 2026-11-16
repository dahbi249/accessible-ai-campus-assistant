
import tempfile
from pathlib import Path

import pymupdf

from ai.rag.ingestion import process_pdf


def create_sample_pdf(pdf_path: Path) -> None:
    """Create a small university PDF for testing."""

    document = pymupdf.open()

    page1 = document.new_page()
    page1.insert_text(
        (72, 72),
        "University of Tamanrasset\n"
        "Scholarship Application Guide.\n"
        "Students must provide a registration certificate.\n"
        "Applications must be submitted before the deadline."
    )

    page2 = document.new_page()
    page2.insert_text(
        (72, 72),
        "Required Documents.\n"
        "Students must provide proof of enrollment.\n"
        "The administration verifies every application."
    )

    document.set_metadata(
        {"title": "Sample Scholarship Guide"}
    )

    document.save(pdf_path)
    document.close()


def main():
    print("Testing complete document ingestion pipeline...")

    with tempfile.TemporaryDirectory() as temp_dir:

        pdf_path = Path(temp_dir) / "sample_guide.pdf"

        create_sample_pdf(pdf_path)

        result = process_pdf(pdf_path)

        document = result["document"]
        chunks = result["chunks"]
        statistics = result["statistics"]

        # Document metadata.
        assert document["title"] == "Sample Scholarship Guide"
        assert document["filename"] == "sample_guide.pdf"
        assert len(document["document_id"]) == 64

        # Page and chunk information.
        assert statistics["total_pages"] == 2
        assert statistics["total_chunks"] == len(chunks)
        assert len(chunks) >= 2

        # Embedding information.
        assert statistics["embedding_dimension"] == 1024

        for chunk in chunks:
            assert chunk["page_number"] in (1, 2)
            assert len(chunk["embedding"]) == 1024
            assert isinstance(chunk["embedding"], list)
            assert chunk["text"].strip()

        # All chunks must belong to the same document.
        assert all(
            chunk["document_id"] == document["document_id"]
            for chunk in chunks
        )

        print("\nDocument information:")
        print(f"Title: {document['title']}")
        print(f"Pages: {statistics['total_pages']}")
        print(f"Chunks: {statistics['total_chunks']}")

        print("\nEmbedding verification:")
        print(f"Dimensions: {statistics['embedding_dimension']}")
        print(f"Number of vectors: {len(chunks)}")

        print("\nChunk preview:")
        for chunk in chunks:
            print(
                f"Page {chunk['page_number']} | "
                f"Tokens: {chunk['token_count']} | "
                f"Vector size: {len(chunk['embedding'])}"
            )
            print(chunk["text"])
            print()

        print("Warnings:", result["warnings"])
        print("\nAll ingestion tests passed!")


if __name__ == "__main__":
    main()

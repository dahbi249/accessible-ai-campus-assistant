
from ai.rag.chunking import chunk_pages


def main():
    print("Testing document chunking...")

    pages = [
        {
            "page_number": 1,
            "text": " ".join(
                [
                    "Students must provide a registration certificate. "
                    "The application form must be completed carefully. "
                    "Applications must be submitted before the deadline. "
                    "Students should contact the administration for help."
                ] * 5
            ),
        },
        {
            "page_number": 2,
            "text": (
                "Scholarship applications require supporting documents. "
                "The student must provide proof of enrollment. "
                "The administration verifies every application."
            ),
        },
    ]

    chunks = chunk_pages(
        pages=pages,
        document_id="test-document-001",
        document_title="University Scholarship Guide",
        filename="scholarship_guide.pdf",
        chunk_size=40,
        chunk_overlap=8,
    )

    assert len(chunks) >= 2, (
        f"Expected at least 2 chunks, but got {len(chunks)}."
    )

    # Check required metadata and token limits.
    for chunk in chunks:
        assert chunk["document_id"] == "test-document-001"
        assert chunk["document_title"] == "University Scholarship Guide"
        assert chunk["filename"] == "scholarship_guide.pdf"
        assert chunk["source_type"] == "pdf"
        assert chunk["page_number"] in (1, 2)
        assert chunk["text"].strip()
        assert chunk["token_count"] <= 40

    # Original sentence wording must remain intact.
    original_sentence = (
        "Students must provide a registration certificate."
    )

    assert any(
        original_sentence in chunk["text"]
        for chunk in chunks
    ), "Original sentence text was modified."

    # Detect the damaged word fragments seen in the previous output.
    for chunk in chunks:
        assert not chunk["text"].startswith("s should")
        assert "aregistration" not in chunk["text"]


    # Check that chunks preserve page boundaries.
    page_numbers = {chunk["page_number"] for chunk in chunks}
    assert page_numbers == {1, 2}

    # Check that IDs are unique.
    chunk_ids = [chunk["chunk_id"] for chunk in chunks]
    assert len(chunk_ids) == len(set(chunk_ids))

    # Check deterministic IDs and output.
    second_run = chunk_pages(
        pages=pages,
        document_id="test-document-001",
        document_title="University Scholarship Guide",
        filename="scholarship_guide.pdf",
        chunk_size=40,
        chunk_overlap=8,
    )

    assert [c["chunk_id"] for c in chunks] == [
        c["chunk_id"] for c in second_run
    ]

    # Test a sentence longer than the chunk limit.
    long_page = [
        {
            "page_number": 3,
            "text": " ".join(
                ["university"] * 100
            ),
        }
    ]

    long_chunks = chunk_pages(
        pages=long_page,
        document_id="long-document",
        document_title="Long Text Test",
        filename="long_test.pdf",
        chunk_size=40,
        chunk_overlap=8,
    )
    # Long-sentence chunks must contain complete words.
    for chunk in long_chunks:
        assert all(
            word == "university"
            for word in chunk["text"].split()
        )
    assert len(long_chunks) > 1
    assert all(c["token_count"] <= 40 for c in long_chunks)
    assert all(c["page_number"] == 3 for c in long_chunks)

    print(f"\nTotal chunks created: {len(chunks)}")

    for chunk in chunks:
        print(
            f"\nPage: {chunk['page_number']}"
            f" | Chunk: {chunk['chunk_index']}"
            f" | Tokens: {chunk['token_count']}"
        )
        print(chunk["text"])

    print("\nLong sentence test passed.")
    print("Deterministic ID test passed.")
    print("Page preservation test passed.")
    print("\nAll chunking tests passed!")


if __name__ == "__main__":
    main()


import tempfile
from pathlib import Path

import pymupdf

from ai.rag.pdf_extraction import extract_pdf


def create_sample_pdf(pdf_path: Path):
    """Create a two-page PDF for testing."""

    document = pymupdf.open()

    # Page 1
    page1 = document.new_page()
    page1.insert_text(
        (72, 72),
        "University of Tamanrasset\n"
        "Scholarship Application Guide\n"
        "Required documents: Registration certificate."
    )

    # Page 2
    page2 = document.new_page()
    page2.insert_text(
        (72, 72),
        "Application Deadline: 30 November."
    )

    document.set_metadata(
        {"title": "Sample University Guide"}
    )

    document.save(pdf_path)
    document.close()


def main():

    print("Testing PDF extraction...")

    with tempfile.TemporaryDirectory() as temp_dir:

        pdf_path = Path(temp_dir) / "sample_guide.pdf"

        # Create test PDF
        create_sample_pdf(pdf_path)

        # Extract its contents
        result = extract_pdf(pdf_path)

        # Test document metadata
        document = result["document"]

        assert document["title"] == "Sample University Guide"
        assert document["filename"] == "sample_guide.pdf"
        assert document["page_count"] == 2

        # Test extracted pages
        pages = result["pages"]

        assert len(pages) == 2

        assert "Scholarship Application Guide" in pages[0]["text"]
        assert "30 November" in pages[1]["text"]

        assert pages[0]["page_number"] == 1
        assert pages[1]["page_number"] == 2

        print("\nDocument metadata:")
        print("Title:", document["title"])
        print("Filename:", document["filename"])
        print("Pages:", document["page_count"])

        print("\nExtracted pages:")

        for page in pages:
            print(f"\nPage {page['page_number']}:")
            print(page["text"])
            print("Needs OCR:", page["needs_ocr"])

        print("\nAll PDF extraction tests passed!")


if __name__ == "__main__":
    main()

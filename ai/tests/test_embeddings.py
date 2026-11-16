
import numpy as np
import torch

from ai.rag.embeddings import get_embedding_service


def main():
    print("Testing reusable BGE-M3 embedding service...")

    service = get_embedding_service()

    # Test 1: Embed a student question
    query = (
        "What documents are required "
        "for university registration?"
    )

    query_embedding = service.embed_query(query)

    print("\nQuery embedding:")
    print("Shape:", query_embedding.shape)
    print("Dimensions:", len(query_embedding))

    assert query_embedding.shape == (1024,)

    # Test 2: Embed multiple document chunks
    documents = [
        "Students must submit their registration documents.",
        "Scholarship applications require supporting documents.",
        "The university provides student accommodation.",
    ]

    document_embeddings = service.embed_documents(
        documents,
        batch_size=2,
    )

    print("\nDocument embeddings:")
    print("Shape:", document_embeddings.shape)

    assert document_embeddings.shape == (3, 1024)

    # Test 3: Convert one vector to pgvector-compatible format
    vector = service.to_pgvector(query_embedding)

    print("\nVector conversion:")
    print("Type:", type(vector))
    print("Length:", len(vector))
    print("First 5 values:", vector[:5])

    assert isinstance(vector, list)
    assert len(vector) == 1024

    # Test 4: Confirm the shared service is reused
    service_again = get_embedding_service()

    assert service is service_again

    print("\nShared service reused:", service is service_again)

    # Test 5: GPU verification
    print("\nGPU available:", torch.cuda.is_available())

    if torch.cuda.is_available():
        print("GPU:", torch.cuda.get_device_name(0))

    print("\nAll embedding tests passed!")


if __name__ == "__main__":
    main()

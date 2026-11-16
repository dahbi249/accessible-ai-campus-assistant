import torch
from FlagEmbedding import BGEM3FlagModel


def main():
    print("Loading BGE-M3...")

    model = BGEM3FlagModel(
        "BAAI/bge-m3",
        use_fp16=True,
        devices="cuda:0",
    )

    sentence = (
        "What documents are required "
        "for university registration?"
    )

    print("\nGenerating embedding...")

    result = model.encode(
        [sentence],
        batch_size=1,
        max_length=512,
    )

    embedding = result["dense_vecs"]

    print("\nEmbedding generated successfully!")

    print("Embedding shape:", embedding.shape)
    print("Embedding dimensions:", embedding.shape[-1])

    print("First 5 values:")
    print(embedding[0][:5])

    torch.cuda.synchronize()

    print("\nGPU available:", torch.cuda.is_available())
    print("GPU:", torch.cuda.get_device_name(0))
    print(
        "GPU memory allocated:",
        round(torch.cuda.memory_allocated() / 1024**2, 2),
        "MB",
    )


if __name__ == "__main__":
    main()

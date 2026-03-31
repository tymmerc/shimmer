"""Download multilingual-e5-base ONNX model from HuggingFace Hub (no torch needed)."""

import sys
from pathlib import Path


def download_model(output_dir: str):
    from huggingface_hub import hf_hub_download
    from transformers import AutoTokenizer

    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)

    model_name = "intfloat/multilingual-e5-base"

    print(f"Downloading tokenizer for {model_name}...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    tokenizer.save_pretrained(str(output))

    # Download pre-quantized ONNX model from xenova's repo
    print("Downloading pre-quantized ONNX model...")
    onnx_file = hf_hub_download(
        repo_id="xenova/multilingual-e5-base",
        filename="onnx/model_quantized.onnx",
        local_dir=str(output),
    )

    # Move from subfolder to root
    target = output / "model_quantized.onnx"
    source = output / "onnx" / "model_quantized.onnx"
    if source.exists() and not target.exists():
        source.rename(target)
        # Clean up empty dir
        onnx_dir = output / "onnx"
        if onnx_dir.exists() and not list(onnx_dir.iterdir()):
            onnx_dir.rmdir()
        print(f"Moved model to {target}")

    print(f"Model ready at {output}")


if __name__ == "__main__":
    dest = sys.argv[1] if len(sys.argv) > 1 else "./model"
    download_model(dest)

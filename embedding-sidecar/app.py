"""Shimmer Embedding Sidecar — FastAPI + ONNX Runtime (no torch dependency)."""

import os
import logging
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoTokenizer

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("embedding-sidecar")

MODEL_DIR = Path(os.getenv("MODEL_DIR", "/app/model"))
MODEL_NAME = "intfloat/multilingual-e5-base"
MAX_BATCH = 64
MAX_LENGTH = 512

session: ort.InferenceSession | None = None
tokenizer: AutoTokenizer | None = None


def _load_model():
    global session, tokenizer

    onnx_path = MODEL_DIR / "model_quantized.onnx"
    if not onnx_path.exists():
        log.info("Model not found, downloading...")
        from download_model import download_model
        download_model(str(MODEL_DIR))

    log.info("Loading tokenizer from %s", MODEL_DIR)
    tokenizer = AutoTokenizer.from_pretrained(str(MODEL_DIR))

    log.info("Loading ONNX model from %s", onnx_path)
    opts = ort.SessionOptions()
    opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    opts.intra_op_num_threads = 2
    session = ort.InferenceSession(str(onnx_path), opts, providers=["CPUExecutionProvider"])
    log.info("Model loaded successfully")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _load_model()
    yield


app = FastAPI(title="Shimmer Embedding Sidecar", lifespan=lifespan)


class EmbedRequest(BaseModel):
    texts: list[str]
    prefix: str = "query: "


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]
    dimension: int


def _mean_pool(last_hidden: np.ndarray, attention_mask: np.ndarray) -> np.ndarray:
    mask_expanded = np.expand_dims(attention_mask, -1).astype(np.float32)
    summed = np.sum(last_hidden * mask_expanded, axis=1)
    counts = np.clip(mask_expanded.sum(axis=1), a_min=1e-9, a_max=None)
    return summed / counts


def _normalize(vecs: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    return vecs / np.clip(norms, a_min=1e-9, a_max=None)


@app.post("/embed", response_model=EmbedResponse)
async def embed(req: EmbedRequest):
    if not req.texts:
        return EmbedResponse(embeddings=[], dimension=768)
    if len(req.texts) > MAX_BATCH:
        raise HTTPException(400, f"Max batch size is {MAX_BATCH}")

    prefixed = [f"{req.prefix}{t}" for t in req.texts]

    inputs = tokenizer(
        prefixed,
        padding=True,
        truncation=True,
        max_length=MAX_LENGTH,
        return_tensors="np",
    )

    # Run ONNX inference
    ort_inputs = {
        "input_ids": inputs["input_ids"].astype(np.int64),
        "attention_mask": inputs["attention_mask"].astype(np.int64),
    }
    # Add token_type_ids if the model expects it
    if "token_type_ids" in inputs:
        ort_inputs["token_type_ids"] = inputs["token_type_ids"].astype(np.int64)

    outputs = session.run(None, ort_inputs)
    last_hidden = outputs[0]  # (batch, seq_len, hidden_dim)

    pooled = _mean_pool(last_hidden, inputs["attention_mask"])
    normalized = _normalize(pooled)

    return EmbedResponse(
        embeddings=normalized.tolist(),
        dimension=normalized.shape[1],
    )


@app.get("/health")
async def health():
    return {
        "status": "ok" if session is not None else "loading",
        "model": MODEL_NAME,
    }

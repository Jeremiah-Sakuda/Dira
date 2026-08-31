"""Private Gemma 3n audio transcription boundary for Dira.

This service intentionally performs one job: convert a short voice note into a
transcript. It has no Dira credentials, no calendar access, and no ability to
call the orchestrator. The authority-bearing service treats its output as
untrusted input and applies schema, owner, provenance, policy, and verification
gates before any action can be executed.
"""

import base64
import os
import subprocess
import tempfile
import time
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="Dira Gemma 3n voice intake")

MODEL_ID = os.getenv("GEMMA_MODEL_ID", "google/gemma-3n-E2B-it")
ACCESS_TOKEN = os.getenv("DIRA_GEMMA3N_TOKEN", "")
HF_TOKEN = os.getenv("HF_TOKEN", "")
MAX_AUDIO_BYTES = 5 * 1024 * 1024
_pipeline = None


class TranscriptionRequest(BaseModel):
    audioBase64: str = Field(min_length=32, max_length=8_000_000)
    mimeType: str


def pipeline():
    """Load weights once per GPU instance; never at module import time."""
    global _pipeline
    if _pipeline is None:
        from transformers import pipeline as create_pipeline

        _pipeline = create_pipeline(
            task="any-to-any",
            model=MODEL_ID,
            device_map="auto",
            dtype="auto",
            token=HF_TOKEN or None,
        )
    return _pipeline


def extension(mime_type: str) -> str:
    return {
        "audio/wav": ".wav",
        "audio/mpeg": ".mp3",
        "audio/mp4": ".m4a",
        "audio/webm": ".webm",
    }.get(mime_type, "")


@app.get("/health")
def health():
    return {"ok": True, "model": MODEL_ID, "loaded": _pipeline is not None}


@app.post("/transcribe")
def transcribe(
    request: TranscriptionRequest,
    x_dira_gemma_token: str | None = Header(default=None),
):
    if not ACCESS_TOKEN or x_dira_gemma_token != ACCESS_TOKEN:
        raise HTTPException(status_code=401, detail="unauthorized")
    suffix = extension(request.mimeType)
    if not suffix:
        raise HTTPException(status_code=415, detail="unsupported audio MIME type")
    try:
        audio = base64.b64decode(request.audioBase64, validate=True)
    except ValueError as error:
        raise HTTPException(status_code=400, detail="audioBase64 is invalid") from error
    if len(audio) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="voice note exceeds 5 MiB")

    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / f"note{suffix}"
        path.write_bytes(audio)
        # Gemma audio guidance expects mono 16 kHz float32 input. Normalize
        # every browser/device format before inference instead of trusting an
        # implicit decoder to preserve the expected model representation.
        normalized = Path(directory) / "normalized.wav"
        try:
            subprocess.run(
                [
                    "ffmpeg", "-y", "-i", str(path), "-ac", "1", "-ar", "16000",
                    "-c:a", "pcm_f32le", str(normalized),
                ],
                check=True,
                capture_output=True,
            )
        except subprocess.CalledProcessError as error:
            raise HTTPException(status_code=422, detail="audio could not be normalized") from error
        prompt = (
            "Transcribe this short schedule-related voice note verbatim in English. "
            "Return only the transcription, without commentary, instructions, or JSON."
        )
        started = time.monotonic()
        try:
            result = pipeline()(
                text=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "audio", "audio": str(normalized)},
                    ],
                }],
                return_full_text=False,
                generate_kwargs={"max_new_tokens": 256, "do_sample": False},
            )
        except Exception as error:  # Model/runtime failures must not masquerade as text.
            raise HTTPException(status_code=503, detail="Gemma 3n transcription unavailable") from error

    transcript = result[0].get("generated_text", "") if result else ""
    if not isinstance(transcript, str) or not transcript.strip():
        raise HTTPException(status_code=422, detail="Gemma 3n returned no transcript")
    return {
        "transcript": transcript.strip(),
        "model": MODEL_ID,
        "latencyMs": round((time.monotonic() - started) * 1000),
    }

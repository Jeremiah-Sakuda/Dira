# Dedicated, optional Gemma 3n audio intake service. It is deliberately
# separate from the authority-bearing orchestrator: the only output accepted
# by Dira is a transcript, never a tool call or action proposal.
FROM nvidia/cuda:12.6.3-cudnn-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip ffmpeg libsndfile1 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN python3 -m pip install --no-cache-dir -r requirements.txt
COPY app.py .

CMD ["sh", "-c", "python3 -m uvicorn app:app --host 0.0.0.0 --port ${PORT}"]

# SCTR Railway API — Playwright Chromium included (official image)
# Use this so /api/sctr-top30 works on Railway.

FROM mcr.microsoft.com/playwright/python:v1.49.0-jammy

WORKDIR /app

# Install Python deps (playwright already in base image; we add the rest)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code
COPY main.py fetch_sctr.py ./
COPY pyproject.toml ./

# Railway uses $PORT at runtime
ENV PORT=8000
EXPOSE $PORT
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}

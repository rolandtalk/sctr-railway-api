# Start from Python; install Playwright + Chromium into a fixed path.
FROM python:3.12-slim

WORKDIR /app

# Browsers live here so path is consistent at build and runtime
ENV PLAYWRIGHT_BROWSERS_PATH=/app/ms-playwright

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Chromium + system deps into PLAYWRIGHT_BROWSERS_PATH
RUN playwright install --with-deps chromium

COPY . .
EXPOSE 8000

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}

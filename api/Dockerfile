# Use official Playwright image: Playwright + Chromium at /ms-playwright.
# We do NOT pip install playwright so we use the image's version and browsers.
FROM mcr.microsoft.com/playwright/python:v1.49.0-noble

WORKDIR /app

# Use image's pre-installed browsers (avoid /root/.cache lookup)
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# App deps only (no playwright - use image's)
COPY requirements-docker.txt .
RUN pip install --no-cache-dir -r requirements-docker.txt

COPY . .
EXPOSE 8000

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}

# Use official Playwright image (Chromium + system deps pre-installed).
FROM mcr.microsoft.com/playwright/python:v1.49.0-noble

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Install Chromium to match the installed Playwright version
RUN playwright install chromium

COPY . .
EXPOSE 8000

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}

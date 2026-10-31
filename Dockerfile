FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /srv

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

RUN useradd --system --uid 10001 appuser && mkdir -p uploads && chown appuser uploads
USER appuser

EXPOSE 8000

# Loads secrets from SSM when SSM_PREFIX is set, then execs gunicorn.
# WEB_CONCURRENCY sets the worker count (default 2, sized for a 1 GB instance).
CMD ["python", "-m", "app.entrypoint"]

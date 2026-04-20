FROM mcr.microsoft.com/playwright/python:v1.58.0-jammy

COPY --from=ghcr.io/astral-sh/uv:0.6 /uv /bin/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TZ=America/Sao_Paulo

LABEL org.opencontainers.image.title="Argus"

WORKDIR /app

# Instala deps no Python do sistema (sem venv) — permite volume mount do código
COPY pyproject.toml .
RUN uv pip install --system --no-cache \
    "playwright>=1.51" \
    "psycopg[binary]>=3.2" \
    "apscheduler>=3.11" \
    "pyyaml>=6.0.2" \
    "python-dotenv>=1.1"

COPY . .

CMD ["python", "main.py", "--schedule"]

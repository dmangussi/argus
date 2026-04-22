FROM mcr.microsoft.com/playwright/python:v1.58.0-jammy

COPY --from=ghcr.io/astral-sh/uv:0.6 /uv /bin/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TZ=America/Sao_Paulo

WORKDIR /app

COPY pyproject.toml .
RUN uv pip install --system --no-cache -e .

COPY . .

CMD ["python", "main.py", "--schedule"]

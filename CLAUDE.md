# Argus — Project Context

Monitor de preços com alertas por e-mail quando houver variação relevante (queda ≥ 5% ou alta ≥ 10% vs média dos últimos preços coletados).

## Stack

- **Python 3.12** + **uv** para gestão de deps e venv
- **Playwright** (async, Chromium headless) para scraping
- **Vercel Postgres** (Neon) — free tier
- **Resend** para envio de e-mail (3k/mês free) — futuro
- **Docker Compose** + **APScheduler** para cron local

## Estrutura

```
argus/
├── main.py            # orquestra tudo: seed, scraping, análise, scheduler, config
├── scraper.py         # Playwright scraping
├── notify.py          # Vercel Postgres (DB) + Resend (e-mail, futuro)
├── products.yaml      # lista de produtos monitorados
├── pyproject.toml
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── migration.sql      # aplicar manualmente no SQL Editor do Vercel Postgres
```

## Convenções

- **Type hints** em toda função pública.
- **Async-first**: scraping e HTTP usam `async/await`.
- **Sem `print()`** em produção — use `logging`.
- **Seletores CSS** ficam em `products.yaml`, nunca hardcoded no Python.
- **Defensive scraping**: `scrape()` retorna `None` em falha — não propaga exceção.

## Comandos úteis

```bash
# Setup (tudo via Docker, sem precisar de Python local)
cp .env.example .env
# Cole POSTGRES_URL_NON_POOLING do Vercel como DATABASE_URL no .env
docker compose up --build -d                              # sobe o scheduler
docker compose run --rm scraper python main.py --seed     # popula banco (1x ou ao mudar products.yaml)
docker compose logs -f scraper                            # acompanha logs
docker compose run --rm scraper python main.py --once     # disparo manual
```

## O que NÃO fazer (MVP)

- Não criar API HTTP/FastAPI — frontend lê Vercel Postgres direto
- Não implementar multi-usuário
- Não adicionar WhatsApp/push/SMS — só e-mail
- Não monitorar múltiplos supermercados

## Plan Mode

Use **Plan Mode** (shift+tab) para qualquer mudança que:
- Toque em mais de 1 arquivo
- Adicione dependências novas
- Altere schema de banco
- Modifique o fluxo principal (main.py)

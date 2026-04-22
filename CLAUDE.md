# Argus — Project Context

Monitor de preços com alertas quando houver variação relevante (queda ≥ 5% ou alta ≥ 10% vs média dos últimos preços coletados).

## Stack

- **Python 3.12** + **uv** para gestão de deps e venv
- **Playwright** (async, Chromium headless) para scraping
- **Vercel Postgres** (Neon) — free tier
- **Resend** para envio de e-mail (3k/mês free) — futuro
- **Next.js 16** (App Router) — frontend + admin
- **GitHub Actions** para agendamento do scraper (3x/dia: 06h, 12h, 18h BRT)
- **Docker Compose** para execução local opcional

## Estrutura

```
argus/
├── main.py            # scraping, análise de variação, scheduler local
├── scraper.py         # Playwright scraping
├── notify.py          # Vercel Postgres (DB) + Resend (e-mail, futuro)
├── pyproject.toml
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── migration.sql      # aplicar manualmente no SQL Editor do Vercel Postgres
├── .github/
│   └── workflows/
│       └── scraper.yml  # cron 3x/dia via GitHub Actions
└── web/               # Next.js frontend
    └── app/
        ├── page.tsx              # página pública — lista por categoria
        ├── CategoryList.tsx      # client component: expand/collapse por categoria
        ├── PageWrapper.tsx       # client component: animação de transição entre páginas
        ├── layout.tsx            # layout raiz
        ├── globals.css           # estilos globais + @theme Tailwind v4
        ├── admin/
        │   ├── page.tsx          # página do admin (server component)
        │   └── ProductActions.tsx # formulário + lista de produtos + botão "Coletar agora"
        ├── login/page.tsx
        ├── proxy.ts              # proteção de rotas (requer argus_session)
        └── api/
            ├── auth/route.ts
            ├── scrape/route.ts   # POST — dispara workflow via GitHub API
            └── products/
                ├── route.ts        # POST — criar produto
                └── [id]/route.ts   # PATCH (parcial) + DELETE
```

## Produtos e categorias

Produtos são gerenciados **inteiramente pelo banco de dados** via `/admin`. Não existe `products.yaml`.

Categorias disponíveis (lista fixa definida em `ProductActions.tsx`):
`Hortifruti` · `Padaria` · `Açougue` · `Laticínios e Frios` · `Mercearia` · `Congelados` · `Bebidas` · `Higiene` · `Limpeza` · `Pet Shop`

## Variáveis de ambiente

### Scraper (`.env`)
| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Vercel Postgres — usar `POSTGRES_URL_NON_POOLING` |

### Frontend (`web/.env.local`)
| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Mesmo valor acima |
| `ADMIN_PASSWORD` | Senha do `/admin` |
| `GITHUB_TOKEN` | Fine-grained PAT com `Actions: Read and write` no repo `argus` |

### GitHub Actions (Secrets)
| Secret | Descrição |
|--------|-----------|
| `DATABASE_URL` | Vercel Postgres — mesmo valor acima |

## Convenções

- **Type hints** em toda função pública.
- **Async-first**: scraping e HTTP usam `async/await`.
- **Sem `print()`** em produção — use `logging`.
- **Seletores CSS** dos produtos ficam no banco de dados (coluna `price_selector`), nunca hardcoded no Python.
- **Defensive scraping**: `scrape()` retorna `None` em falha — não propaga exceção.
- **PATCH parcial**: a rota `/api/products/[id]` aceita qualquer subconjunto dos campos — faz SELECT + merge antes do UPDATE.
- **Tailwind v4**: configuração de tema em `globals.css` via `@theme {}`. Não existe `tailwind.config.ts`.
- **Proxy**: `proxy.ts` (antes `middleware.ts`) protege todas as rotas exceto `/login` e `/api/auth`.

## Comandos úteis

```bash
# Scraper local (Docker)
cp .env.example .env
# Cole POSTGRES_URL_NON_POOLING do Vercel como DATABASE_URL no .env
docker compose up --build -d                          # sobe o scheduler local
docker compose logs -f scraper                        # acompanha logs
docker compose run --rm scraper python main.py --once # disparo manual

# Frontend local
cd web && npm run dev                                 # http://localhost:3000
```

## O que NÃO fazer (MVP)

- Não criar API HTTP/FastAPI — frontend lê Vercel Postgres direto
- Não implementar multi-usuário
- Não adicionar WhatsApp/push/SMS — só e-mail
- Não monitorar múltiplos supermercados
- Não reintroduzir `products.yaml` — produtos vivem no banco

## Plan Mode

Use **Plan Mode** (shift+tab) para qualquer mudança que:
- Toque em mais de 1 arquivo
- Adicione dependências novas
- Altere schema de banco
- Modifique o fluxo principal (main.py)

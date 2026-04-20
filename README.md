# Argus

Monitor de preços. Scraper local coleta preços duas vezes ao dia e persiste no Vercel Postgres. Dashboard Next.js hospedado na Vercel exibe os dados em tempo real.

## Arquitetura

```
Docker local (scraper) ──escreve──▶ Vercel Postgres ◀──lê── Vercel (Next.js)
```

## Pré-requisitos

- Docker Desktop + WSL2 (Windows)
- Conta Vercel (free): https://vercel.com

## 1. Vercel Postgres — setup (uma vez)

1. No dashboard da Vercel: **Storage → Create Database → Postgres**
2. Abra o banco criado → **Query** → cole e execute `migration.sql`
3. Vá em **.env.local** e copie o valor de `POSTGRES_URL_NON_POOLING`

## 2. Scraper local

```bash
cp .env.example .env
# Cole POSTGRES_URL_NON_POOLING como DATABASE_URL no .env

docker compose up --build -d                          # sobe o scheduler
docker compose run --rm scraper python main.py --seed # popula o banco (1x)
docker compose logs -f scraper                        # acompanha logs
docker compose run --rm scraper python main.py --once # disparo manual
```

## 3. Vercel Deploy

1. Push para o GitHub
2. Importe o repositório na Vercel
3. Em **Project Settings → General → Root Directory**: defina `web`
4. Conecte o banco Vercel Postgres ao projeto (injeta `POSTGRES_URL` automaticamente)
5. Adicione a env var: `DATABASE_URL` = `$POSTGRES_URL`
6. Deploy

## Adicionando produtos

Edite `products.yaml` e rode o seed novamente:

```bash
docker compose run --rm scraper python main.py --seed
```

## Convenções e arquitetura

Ver `CLAUDE.md`.

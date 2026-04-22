# Argus

Monitor de preços. Scraper coleta preços três vezes ao dia via GitHub Actions e persiste no Vercel Postgres. Dashboard Next.js hospedado na Vercel exibe os dados em tempo real.

## Arquitetura

```
GitHub Actions (scraper) ──escreve──▶ Vercel Postgres ◀──lê── Vercel (Next.js)
```

## Pré-requisitos

- Conta Vercel (free): https://vercel.com
- Conta GitHub (repositório já criado)

## 1. Vercel Postgres — setup (uma vez)

1. No dashboard da Vercel: **Storage → Create Database → Postgres**
2. Abra o banco criado → **Query** → cole e execute `migration.sql`
3. Vá em **.env.local** e copie o valor de `POSTGRES_URL_NON_POOLING`

## 2. GitHub Actions — setup (uma vez)

O scraper roda automaticamente às **06h, 12h e 18h BRT** via GitHub Actions.

1. Gere um fine-grained PAT em **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**
   - Repository access: só este repositório
   - Permissions → Actions: **Read and write**
2. No repositório: **Settings → Secrets and variables → Actions → New repository secret**
   - `DATABASE_URL` = valor de `POSTGRES_URL_NON_POOLING`

## 3. Vercel Deploy

1. Push para o GitHub
2. Importe o repositório na Vercel
3. Em **Project Settings → General → Root Directory**: defina `web`
4. Conecte o banco Vercel Postgres ao projeto (injeta `POSTGRES_URL` automaticamente)
5. Adicione as env vars:
   - `DATABASE_URL` = `$POSTGRES_URL`
   - `ADMIN_PASSWORD` = senha de acesso ao `/admin`
   - `GITHUB_TOKEN` = o PAT gerado acima (para o botão "Coletar agora" no admin)
6. Deploy

## Adicionando produtos

Acesse `/admin` no frontend e use o formulário para criar, editar ou remover produtos.
Os produtos são gerenciados inteiramente pelo banco de dados.

## Rodando o scraper localmente (opcional)

```bash
cp .env.example .env
# Cole POSTGRES_URL_NON_POOLING como DATABASE_URL no .env

docker compose up --build -d           # sobe o scheduler local
docker compose logs -f scraper         # acompanha logs
docker compose run --rm scraper python main.py --once # disparo manual
```

## Convenções e arquitetura

Ver `CLAUDE.md`.

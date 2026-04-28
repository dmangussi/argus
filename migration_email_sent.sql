-- Aplicar manualmente no SQL Editor do Vercel Postgres
ALTER TABLE notifications_sent
  ADD COLUMN IF NOT EXISTS email_sent boolean NOT NULL DEFAULT false;

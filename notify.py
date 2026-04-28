"""PostgreSQL persistence and alert notifications."""

from __future__ import annotations

import logging
import os

import psycopg
import resend
from psycopg.rows import dict_row

from models import Alert, Product

log = logging.getLogger(__name__)

_DATABASE_URL     = os.environ["DATABASE_URL"]
_RESEND_API_KEY   = os.environ.get("RESEND_API_KEY", "")
_ALERT_EMAIL_TO   = [e.strip() for e in os.environ.get("ALERT_EMAIL_TO", "").split(",") if e.strip()]
_ALERT_EMAIL_FROM = "onboarding@resend.dev"


def _conn() -> psycopg.Connection:
    """Open a new database connection using the module-level DATABASE_URL."""
    return psycopg.connect(_DATABASE_URL, row_factory=dict_row)


def upsert_products(products: list[Product]) -> None:
    """Insert or update products; sets is_active=true on conflict."""
    with _conn() as conn:
        for product in products:
            conn.execute(
                """
                INSERT INTO products
                    (slug, name, category, product_url, price_selector, is_active)
                VALUES
                    (%(slug)s, %(name)s, %(category)s, %(product_url)s,
                     %(price_selector)s, true)
                ON CONFLICT (slug) DO UPDATE SET
                    name           = EXCLUDED.name,
                    category       = EXCLUDED.category,
                    product_url    = EXCLUDED.product_url,
                    price_selector = EXCLUDED.price_selector,
                    is_active      = true,
                    updated_at     = now()
                """,
                product,
            )


def fetch_products() -> list[Product]:
    """Return all active products from the database."""
    with _conn() as conn:
        rows: list[Product] = conn.execute(
            "SELECT * FROM products WHERE is_active = true"
        ).fetchall()
    log.info("Produtos ativos: %d", len(rows))
    return rows


def update_product_image(product_id: str, image_url: str) -> None:
    """Set image_url for a product only if it has none yet."""
    with _conn() as conn:
        conn.execute(
            "UPDATE products SET image_url = %s WHERE id = %s AND image_url IS NULL",
            (image_url, product_id),
        )


def save_price(product_id: str, price: float) -> None:
    """Insert a price_history row; logs and continues on database error."""
    try:
        with _conn() as conn:
            conn.execute(
                "INSERT INTO price_history (product_id, price) VALUES (%s, %s)",
                (product_id, price),
            )
    except psycopg.Error:
        log.exception("Erro ao salvar preço — product_id=%s price=%.2f", product_id, price)


def recent_prices(product_id: str, limit: int = 14) -> list[float]:
    """Return up to ``limit`` historical prices, excluding the most recent insert."""
    with _conn() as conn:
        rows = conn.execute(
            """
            SELECT price FROM price_history
            WHERE product_id = %s
            ORDER BY collected_at DESC
            LIMIT %s
            """,
            (product_id, limit + 1),
        ).fetchall()
    return [float(r["price"]) for r in rows[1:]]


# --- E-mail ---

def _already_notified(conn: psycopg.Connection, product_id: str, kind: str) -> bool:
    """Return True if an email alert of this type was sent in the last 24 hours."""
    row = conn.execute(
        """
        SELECT 1 FROM notifications_sent
        WHERE product_id = %s
          AND kind = %s
          AND email_sent = true
          AND sent_at >= now() - interval '24 hours'
        LIMIT 1
        """,
        (product_id, kind),
    ).fetchone()
    return row is not None


def _email_html(alert: Alert, icon: str, label: str, color: str) -> str:
    name       = alert["product"]["name"]
    url        = alert["product"]["product_url"]
    new_price  = alert["new_price"]
    prev_price = alert["prev_price"]
    pct        = alert["pct"]
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr>
          <td style="background:{color};padding:24px 32px;">
            <p style="margin:0;font-size:13px;color:rgba(255,255,255,.8);text-transform:uppercase;letter-spacing:.08em;">Argus · Monitor de preços</p>
            <h1 style="margin:8px 0 0;font-size:22px;color:#fff;">{icon} {label}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px;font-size:18px;font-weight:600;color:#18181b;">{name}</p>
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f4f4f5;border-radius:10px;padding:16px;">
              <tr>
                <td style="font-size:13px;color:#71717a;padding-bottom:8px;">Preço atual</td>
                <td align="right" style="font-size:20px;font-weight:700;color:{color};">R$ {new_price:.2f}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#71717a;padding-bottom:8px;">Preço anterior</td>
                <td align="right" style="font-size:14px;color:#3f3f46;">R$ {prev_price:.2f}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#71717a;">Variação</td>
                <td align="right" style="font-size:14px;font-weight:600;color:{color};">{pct:+.2f}%</td>
              </tr>
            </table>
            <div style="margin-top:24px;text-align:center;">
              <a href="{url}"
                 style="display:inline-block;padding:12px 28px;background:{color};color:#fff;
                        font-size:14px;font-weight:600;border-radius:8px;text-decoration:none;">
                Ver produto
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 24px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#a1a1aa;">
              Coleta automática 3× ao dia · Argus
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _send_email(alert: Alert) -> bool:
    """Send a price-alert email via Resend. Returns True on success."""
    if not _RESEND_API_KEY or not _ALERT_EMAIL_TO:
        log.warning("Resend não configurado (RESEND_API_KEY / ALERT_EMAIL_TO ausente) — e-mail não enviado")
        return False

    resend.api_key = _RESEND_API_KEY
    icon  = "📉" if alert["kind"] == "price_drop" else "📈"
    label = "Queda de preço" if alert["kind"] == "price_drop" else "Alta de preço"
    color = "#16a34a" if alert["kind"] == "price_drop" else "#dc2626"

    try:
        resend.Emails.send({
            "from": _ALERT_EMAIL_FROM,
            "to": _ALERT_EMAIL_TO,
            "subject": f"{icon} {label} — {alert['product']['name']}",
            "html": _email_html(alert, icon, label, color),
        })
        log.info("E-mail enviado: %s (%s)", alert["product"]["name"], alert["kind"])
        return True
    except Exception:
        log.exception("Falha ao enviar e-mail — produto: %s", alert["product"]["name"])
        return False


# --- Alertas ---

def send_alerts(alerts: list[Alert]) -> None:
    """Log each alert, send email if not deduped, and persist to notifications_sent."""
    with _conn() as conn:
        for alert in alerts:
            icon = "📉" if alert["kind"] == "price_drop" else "📈"
            log.info(
                "%s ALERTA %s — %s: R$ %.2f (%+.1f%% vs anterior R$ %.2f)",
                icon,
                alert["kind"],
                alert["product"]["name"],
                alert["new_price"],
                alert["pct"],
                alert["prev_price"],
            )

            if _already_notified(conn, alert["product"]["id"], alert["kind"]):
                log.info("Deduplicado (< 24h): %s (%s)", alert["product"]["name"], alert["kind"])
                email_sent = False
            else:
                email_sent = _send_email(alert)

            try:
                conn.execute(
                    """
                    INSERT INTO notifications_sent
                        (product_id, kind, old_price, new_price, variation_pct, email_sent)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        alert["product"]["id"],
                        alert["kind"],
                        alert["prev_price"],
                        alert["new_price"],
                        alert["pct"],
                        email_sent,
                    ),
                )
            except psycopg.Error:
                log.exception("Erro ao registrar alerta — product_id=%s", alert["product"]["id"])

    log.info("%d alerta(s) processado(s)", len(alerts))

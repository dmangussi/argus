"""Argus — monitor de preços.

Modos:
    python main.py --once      # coleta uma vez e sai
    python main.py --schedule  # roda o scheduler (padrão no Docker)
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import time

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from dotenv import load_dotenv

import notify
import scraper as sc
from analysis import analyze
from models import Alert, Product, ScrapeOutcome

load_dotenv()

# --- Config ---
CRON_MORNING    = os.getenv("SCRAPE_CRON_MORNING", "0 6 * * *")
CRON_EVENING    = os.getenv("SCRAPE_CRON_EVENING", "0 18 * * *")
HEADLESS        = os.getenv("PLAYWRIGHT_HEADLESS", "true").lower() == "true"
CONCURRENCY     = int(os.getenv("SCRAPE_CONCURRENCY", "3"))
DELAY_MIN       = float(os.getenv("SCRAPE_DELAY_MIN_SEC", "2"))
DELAY_MAX       = float(os.getenv("SCRAPE_DELAY_MAX_SEC", "6"))
DROP_THRESHOLD  = float(os.getenv("ALERT_DROP_THRESHOLD", "-5"))
RISE_THRESHOLD  = float(os.getenv("ALERT_RISE_THRESHOLD", "10"))
MIN_HISTORY     = int(os.getenv("ALERT_MIN_HISTORY_POINTS", "3"))
LOG_LEVEL       = os.getenv("LOG_LEVEL", "INFO")

TIMEZONE = "America/Sao_Paulo"

log = logging.getLogger(__name__)


# --- Orquestração ---
def _print_results(scrape_results: list[tuple[str, float | None]]) -> int:
    """Log a formatted summary table and return the number of successful scrapes."""
    log.info("─" * 45)
    log.info(" RESULTADOS DA COLETA")
    log.info("─" * 45)
    for name, price in sorted(scrape_results, key=lambda r: r[0]):
        if price is not None:
            log.info(" %-30s  R$ %.2f", name, price)
        else:
            log.info(" %-30s  FALHOU", name)
    log.info("─" * 45)
    ok = sum(1 for _, price in scrape_results if price is not None)
    log.info(" %d/%d coletados", ok, len(scrape_results))
    return ok


async def _scrape_product(
    product: Product,
    scraper: sc.Scraper,
    sem: asyncio.Semaphore,
) -> ScrapeOutcome:
    """Scrape one product under the given semaphore and return its outcome.

    Never raises — failures are captured in ``ScrapeOutcome.price = None``.
    DB writes (save_price, update_product_image) happen here so they are
    tied to the scrape and do not require a second pass over the results.
    """
    log.info("[→] Iniciando: %s", product["name"])
    t0 = time.monotonic()
    async with sem:
        scrape_result = await scraper.scrape(
            product["product_url"],
            product.get("price_selector") or "",
        )
    elapsed = time.monotonic() - t0

    if scrape_result is None:
        log.warning("[✗] Falhou: %s  (%.1fs)", product["name"], elapsed)
        return ScrapeOutcome(product_name=product["name"], price=None)

    price, image_url = scrape_result
    log.info("[✓] Coletado: %-30s R$ %.2f  (%.1fs)", product["name"], price, elapsed)
    notify.save_price(product["id"], price)

    if image_url and not product.get("image_url"):
        notify.update_product_image(product["id"], image_url)
        log.info("[img] Imagem salva: %s", product["name"])

    history = notify.recent_prices(product["id"])
    alert = analyze(
        product, price, history,
        min_history=MIN_HISTORY,
        drop_threshold=DROP_THRESHOLD,
        rise_threshold=RISE_THRESHOLD,
    )
    return ScrapeOutcome(product_name=product["name"], price=price, alert=alert)


async def run_once() -> None:
    """Fetch active products, scrape prices concurrently, and dispatch alerts."""
    products = notify.fetch_products()
    if not products:
        log.warning("Nenhum produto ativo. Adicione produtos em /admin.")
        return

    log.info("Iniciando coleta de %d produtos", len(products))
    t0 = time.monotonic()
    sem = asyncio.Semaphore(CONCURRENCY)

    async with sc.Scraper(headless=HEADLESS, delay_min=DELAY_MIN, delay_max=DELAY_MAX) as scraper:
        outcomes: tuple[ScrapeOutcome, ...] = await asyncio.gather(*[
            _scrape_product(product, scraper, sem) for product in products
        ])

    scrape_results = [(o.product_name, o.price) for o in outcomes]
    price_alerts: list[Alert] = [o.alert for o in outcomes if o.alert is not None]

    ok = _print_results(scrape_results)
    log.info(
        "Coleta concluída em %.1fs — %d/%d ok, %d alerta(s)",
        time.monotonic() - t0, ok, len(scrape_results), len(price_alerts),
    )
    if price_alerts:
        notify.send_alerts(price_alerts)


# --- Scheduler ---
def _run_once_sync() -> None:
    """Synchronous wrapper around run_once for APScheduler compatibility."""
    try:
        asyncio.run(run_once())
    except Exception:
        log.exception("Rodada falhou — scheduler continua")


def run_scheduler() -> None:
    """Start the blocking APScheduler with morning and evening jobs."""
    scheduler = BlockingScheduler(timezone=TIMEZONE)
    scheduler.add_job(
        _run_once_sync,
        CronTrigger.from_crontab(CRON_MORNING, timezone=TIMEZONE),
        id="morning", name="Coleta matinal", replace_existing=True,
    )
    scheduler.add_job(
        _run_once_sync,
        CronTrigger.from_crontab(CRON_EVENING, timezone=TIMEZONE),
        id="evening", name="Coleta vespertina", replace_existing=True,
    )
    log.info("Scheduler iniciado (TZ=%s) morning=%r evening=%r", TIMEZONE, CRON_MORNING, CRON_EVENING)
    for job in scheduler.get_jobs():
        log.info("  %s → %s", job.name, job.next_run_time)
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info("Scheduler parado")


# --- Entrypoint ---
def main() -> None:
    """Configure logging and dispatch to the appropriate run mode."""
    logging.basicConfig(
        level=LOG_LEVEL,
        format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    parser = argparse.ArgumentParser(description="Argus — monitor de preços")
    parser.add_argument("--once", action="store_true", help="Coleta uma vez e sai")
    parser.add_argument("--schedule", action="store_true", help="Inicia o scheduler (padrão Docker)")
    args = parser.parse_args()

    if args.schedule:
        run_scheduler()
    else:
        asyncio.run(run_once())


if __name__ == "__main__":
    main()

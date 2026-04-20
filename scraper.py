"""Playwright scraping."""

from __future__ import annotations

import asyncio
import logging
import random
import re

from playwright.async_api import Browser, TimeoutError as PWTimeout, async_playwright

log = logging.getLogger(__name__)

# Padrão BR com vírgula decimal: "1.234,56" ou "24,90" — não captura "3x", "16un", etc.
_PRICE_RE = re.compile(r"\d{1,3}(?:\.\d{3})*,\d{2}")
_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)


def _parse_price(text: str) -> float | None:
    """Extrai o último preço BR do texto. 'de R$ 5,99 por R$ 5,49' → 5.49."""
    matches = _PRICE_RE.findall(text)
    if not matches:
        return None
    try:
        value = float(matches[-1].replace(".", "").replace(",", "."))
        return value if value > 0 else None
    except ValueError:
        return None


class Scraper:
    """Browser Playwright reutilizável — um context por produto."""

    def __init__(self, headless: bool = True, delay_min: float = 2, delay_max: float = 6) -> None:
        self.headless = headless
        self.delay_min = delay_min
        self.delay_max = delay_max
        self._browser: Browser | None = None
        self._pw = None

    async def __aenter__(self) -> Scraper:
        self._pw = await async_playwright().start()
        self._browser = await self._pw.chromium.launch(
            headless=self.headless,
            args=["--disable-blink-features=AutomationControlled"],
        )
        return self

    async def __aexit__(self, *_: object) -> None:
        if self._browser:
            await self._browser.close()
        if self._pw:
            await self._pw.stop()

    async def scrape(self, url: str, selector: str) -> tuple[float, str | None] | None:
        """Coleta preço e imagem de uma URL. Retorna None em qualquer falha."""
        if not selector:
            log.warning("Sem seletor CSS definido para %s", url)
            return None
        await asyncio.sleep(random.uniform(self.delay_min, self.delay_max))
        for attempt in (1, 2):
            try:
                return await self._fetch(url, selector)
            except PWTimeout:
                log.warning("Timeout em %s (tentativa %d/2)", url, attempt)
                if attempt == 2:
                    return None
                await asyncio.sleep(5)
            except Exception as exc:
                log.exception("Erro inesperado em %s: %s", url, exc)
                return None
        return None

    async def _fetch(self, url: str, selector: str) -> tuple[float, str | None] | None:
        assert self._browser is not None
        ctx = await self._browser.new_context(
            user_agent=_USER_AGENT,
            locale="pt-BR",
            timezone_id="America/Sao_Paulo",
            viewport={"width": 1366, "height": 768},
        )
        try:
            page = await ctx.new_page()
            await page.goto(url, wait_until="networkidle", timeout=30_000)
            await page.wait_for_selector(selector, timeout=10_000)
            text = await page.locator(selector).first.inner_text()
            price = _parse_price(text)
            if price is None:
                log.warning("Não parseou preço em %s: %r", url, text)
                return None

            image_url: str | None = None
            try:
                image_url = await page.locator(".imagem img").first.get_attribute("src")
            except Exception:
                pass

            return (price, image_url)
        finally:
            await ctx.close()

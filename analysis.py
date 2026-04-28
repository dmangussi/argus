"""Price-variation analysis — pure functions with no external dependencies."""

from __future__ import annotations

from models import Alert, Product


def analyze(
    product: Product,
    new_price: float,
    history: list[float],
    *,
    min_history: int = 1,
) -> Alert | None:
    """Return an Alert whenever ``new_price`` differs from the previous collected price.

    Compares against ``history[0]`` (the most recent price before this scrape).
    Any negative variation → price_drop; any positive → price_rise.
    Returns ``None`` when history is too short, the previous price is zero,
    or the price did not change.
    """
    if len(history) < min_history or not history or history[0] == 0:
        return None
    prev = history[0]
    pct = (new_price - prev) / prev * 100
    if pct < 0:
        kind: Alert["kind"] = "price_drop"
    elif pct > 0:
        kind = "price_rise"
    else:
        return None
    return Alert(
        product=product,
        new_price=new_price,
        prev_price=round(prev, 2),
        pct=round(pct, 2),
        kind=kind,
    )

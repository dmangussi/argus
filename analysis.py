"""Price-variation analysis — pure functions with no external dependencies."""

from __future__ import annotations

from models import Alert, Product


def analyze(
    product: Product,
    new_price: float,
    history: list[float],
    *,
    min_history: int = 3,
    drop_threshold: float = -5.0,
    rise_threshold: float = 10.0,
) -> Alert | None:
    """Return an Alert if ``new_price`` crosses a threshold versus ``history``.

    Thresholds are injected as keyword arguments so callers (including tests)
    can override them without touching module-level env vars.

    Returns ``None`` when history is too short, the average is zero,
    or the variation falls within the normal range.
    """
    if len(history) < min_history or sum(history) == 0:
        return None
    avg = sum(history) / len(history)
    pct = (new_price - avg) / avg * 100
    if pct <= drop_threshold:
        kind: Alert["kind"] = "price_drop"
    elif pct >= rise_threshold:
        kind = "price_rise"
    else:
        return None
    return Alert(
        product=product,
        new_price=new_price,
        avg_price=round(avg, 2),
        pct=round(pct, 2),
        kind=kind,
    )

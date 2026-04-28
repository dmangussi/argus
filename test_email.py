"""Disparo manual de e-mail de teste — não grava nada no banco."""

from dotenv import load_dotenv
load_dotenv()

from notify import _send_email
from models import Alert, Product

fake_product: Product = {
    "id": "00000000-0000-0000-0000-000000000000",
    "name": "Arroz Tio João 5kg",
    "product_url": "https://example.com",
    "price_selector": None,
    "category": "Mercearia",
    "image_url": None,
    "is_active": True,
}

fake_alert: Alert = {
    "product": fake_product,
    "new_price": 22.90,
    "prev_price": 27.50,
    "pct": -16.73,
    "kind": "price_drop",
}

ok = _send_email(fake_alert)
print("E-mail enviado com sucesso!" if ok else "Falha — verifique RESEND_API_KEY e ALERT_EMAIL_TO no .env")

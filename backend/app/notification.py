import json
import logging
import urllib.error
import urllib.request

from app.config import settings
from app.models import Order


logger = logging.getLogger(__name__)


def _short_address(community: str, address: str) -> str:
    summary = f"{community} {address}".strip()
    if len(summary) <= 24:
        return summary
    return f"{summary[:24]}..."


def build_order_created_payload(order: Order) -> dict[str, object]:
    base_url = settings.APP_BASE_URL.strip().rstrip("/")
    admin_path = f"/admin/orders/{order.id}"
    detail_url = f"{base_url}{admin_path}" if base_url else admin_path

    return {
        "event": "order.created",
        "order_no": order.order_no,
        "service_type": order.service_type or "维修",
        "appliance_type": order.appliance_type,
        "address_summary": _short_address(order.community, order.address),
        "is_urgent": bool(order.is_urgent),
        "admin_detail_url": detail_url,
    }


def send_order_created_webhook(payload: dict[str, object]) -> None:
    """发送新订单 Webhook。失败只记录日志，不影响下单主流程。"""
    if not settings.ORDER_WEBHOOK_ENABLED:
        return
    if not settings.ORDER_WEBHOOK_URL:
        logger.warning("ORDER_WEBHOOK_ENABLED=true but ORDER_WEBHOOK_URL is empty")
        return

    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        settings.ORDER_WEBHOOK_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=settings.ORDER_WEBHOOK_TIMEOUT_SECONDS) as response:
            if response.status >= 400:
                logger.warning("Order webhook returned HTTP %s", response.status)
    except (urllib.error.URLError, OSError, ValueError) as exc:
        logger.warning("Order webhook failed: %s", exc)

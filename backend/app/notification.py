import json
import logging
import urllib.error
import urllib.request

from app.config import settings
from app.models import Order


logger = logging.getLogger(__name__)

ORDER_WEBHOOK_PROVIDERS = {"generic", "wecom"}


def _short_address(community: str, address: str) -> str:
    summary = community.strip() or address.strip()
    if len(summary) <= 24:
        return summary
    return f"{summary[:24]}..."


def _full_address(community: str, address: str) -> str:
    return " ".join(part.strip() for part in (community, address) if part and part.strip())


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
        "_private": {
            "customer_name": order.customer_name,
            "phone": order.phone,
            "address": _full_address(order.community, order.address),
            "fault_description": order.fault_description,
        },
    }


def _webhook_provider() -> str:
    provider = (settings.ORDER_WEBHOOK_PROVIDER or "generic").strip().lower()
    if provider in ORDER_WEBHOOK_PROVIDERS:
        return provider
    logger.warning("Unsupported order webhook provider '%s'; falling back to generic", provider)
    return "generic"


def _clean_markdown_value(value: object, max_length: int = 80) -> str:
    text = str(value or "").replace("\r", " ").replace("\n", " ").replace("\t", " ")
    text = text.replace("<", "[").replace(">", "]").replace("`", "'").replace("|", "/")
    text = " ".join(text.split())
    if not text:
        return "-"
    if len(text) <= max_length:
        return text
    return f"{text[:max_length].rstrip()}..."


def _is_absolute_url(value: object) -> bool:
    url = str(value or "").strip()
    return url.startswith("https://") or url.startswith("http://")


def build_wecom_order_created_payload(payload: dict[str, object]) -> dict[str, object]:
    """构造企业微信机器人 markdown payload，只发送脱敏订单摘要。"""
    lines = [
        "【新订单提醒】",
        f"> 工单号：{_clean_markdown_value(payload.get('order_no'), 40)}",
        f"> 服务类型：{_clean_markdown_value(payload.get('service_type') or '维修', 12)}",
        f"> 家电类型：{_clean_markdown_value(payload.get('appliance_type'), 24)}",
        f"> 区域：{_clean_markdown_value(payload.get('address_summary'), 60)}",
        f"> 紧急程度：{'紧急' if payload.get('is_urgent') else '普通'}",
    ]
    if _is_absolute_url(payload.get("admin_detail_url")):
        lines.append(f"> 后台查看：{_clean_markdown_value(payload.get('admin_detail_url'), 200)}")
    if settings.ORDER_WECOM_INCLUDE_PRIVATE_FIELDS:
        private = payload.get("_private")
        if isinstance(private, dict):
            lines.extend(
                [
                    f"> 客户：{_clean_markdown_value(private.get('customer_name'), 80)}",
                    f"> 电话：{_clean_markdown_value(private.get('phone'), 40)}",
                    f"> 地址：{_clean_markdown_value(private.get('address'), 200)}",
                    f"> 描述：{_clean_markdown_value(private.get('fault_description'), 500)}",
                ]
            )

    return {
        "msgtype": "markdown",
        "markdown": {
            "content": "\n".join(lines),
        },
    }


def _provider_payload(payload: dict[str, object], provider: str) -> dict[str, object]:
    if provider == "wecom":
        return build_wecom_order_created_payload(payload)
    return {key: value for key, value in payload.items() if not key.startswith("_")}


def send_order_created_webhook(payload: dict[str, object]) -> None:
    """发送新订单 Webhook。失败只记录日志，不影响下单主流程。"""
    if not settings.ORDER_WEBHOOK_ENABLED:
        return
    provider = _webhook_provider()
    url = (settings.ORDER_WEBHOOK_URL or "").strip()
    if not url:
        logger.warning("ORDER_WEBHOOK_ENABLED=true but ORDER_WEBHOOK_URL is empty for provider=%s", provider)
        return

    body = json.dumps(_provider_payload(payload, provider), ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=settings.ORDER_WEBHOOK_TIMEOUT_SECONDS) as response:
            if response.status >= 400:
                logger.warning("Order webhook provider=%s returned HTTP %s", provider, response.status)
    except (urllib.error.URLError, OSError, ValueError) as exc:
        logger.warning("Order webhook provider=%s failed: %s", provider, exc)


async def send_order_created_bot_notification(order_no: str) -> None:
    """通过企微智能机器人发送来单通知。失败只记日志。"""
    from app.bot import send_bot_message

    if not settings.WECOM_BOT_ENABLED:
        return

    message = f"🔔 新订单来了！工单号：**{order_no}**"
    await send_bot_message(message)

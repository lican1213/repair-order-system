import asyncio
import logging
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

_ws_client: Any = None


async def startup_bot() -> None:
    """FastAPI startup: 在后台建立机器人长连接。"""
    global _ws_client

    if not settings.WECOM_BOT_ENABLED:
        return

    bot_id = settings.WECOM_BOT_ID.strip()
    secret = settings.WECOM_BOT_SECRET.strip()
    if not bot_id or not secret:
        logger.warning("WECOM_BOT_ENABLED=true but WECOM_BOT_ID or WECOM_BOT_SECRET is empty")
        return

    from aibot import WSClient, WSClientOptions

    _ws_client = WSClient(
        WSClientOptions(
            bot_id=bot_id,
            secret=secret,
        )
    )

    @_ws_client.on("authenticated")
    def _on_authenticated() -> None:
        logger.info("企业微信机器人认证成功 (bot_id=%s)", bot_id[:8] + "...")

    @_ws_client.on("disconnected")
    def _on_disconnected(reason: str) -> None:
        logger.warning("企业微信机器人连接断开: %s", reason)

    @_ws_client.on("error")
    def _on_error(error: Exception) -> None:
        logger.error("企业微信机器人错误: %s", error)

    @_ws_client.on("event.enter_chat")
    async def _on_enter_chat(frame: dict) -> None:
        try:
            await _ws_client.reply_welcome(
                frame,
                {
                    "msgtype": "text",
                    "text": {"content": "您好！我是来单通知机器人，有新订单时会通知您。"},
                },
            )
        except Exception as exc:
            logger.warning("回复欢迎语失败: %s", exc)

    @_ws_client.on("message")
    def _on_message(frame: dict) -> None:
        """调试用：收到消息时打印 chat_id，方便配置 WECOM_BOT_CHAT_ID。"""
        body = frame.get("body", {})
        chat_id = body.get("chat_id", "")
        msg_type = body.get("msgtype", "unknown")
        logger.info("[调试] 收到消息 type=%s chat_id=%s", msg_type, chat_id)

    # 后台连接，不阻塞 FastAPI 启动
    asyncio.create_task(_safe_connect())


async def _safe_connect() -> None:
    """安全连接，异常只记日志。"""
    try:
        await _ws_client.connect()
    except Exception as exc:
        logger.error("企业微信机器人连接失败: %s", exc)


def shutdown_bot() -> None:
    """FastAPI shutdown: 断开机器人连接。"""
    global _ws_client
    if _ws_client is not None:
        try:
            _ws_client.disconnect()
        except Exception as exc:
            logger.warning("企业微信机器人断开异常: %s", exc)
        _ws_client = None


async def send_bot_message(message: str) -> None:
    """向配置的群聊发送 markdown 消息。失败只写日志。"""
    if _ws_client is None or not settings.WECOM_BOT_ENABLED:
        return

    chat_id = settings.WECOM_BOT_CHAT_ID.strip()
    if not chat_id:
        logger.warning("WECOM_BOT_ENABLED=true but WECOM_BOT_CHAT_ID is empty")
        return

    try:
        await _ws_client.send_message(
            chat_id,
            {
                "msgtype": "markdown",
                "markdown": {"content": message},
            },
        )
    except Exception as exc:
        logger.warning("企业微信机器人发送失败: %s", exc)

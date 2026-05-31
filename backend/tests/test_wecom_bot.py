import asyncio
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock


class WecomBotTest(unittest.TestCase):
    """企业微信智能机器人通知测试。"""

    @classmethod
    def setUpClass(cls):
        cls.tmpdir = tempfile.TemporaryDirectory()
        cls.db_path = Path(cls.tmpdir.name) / "wecom_bot_test.db"
        os.environ["DATABASE_URL"] = f"sqlite:///{cls.db_path}"
        os.environ["SECRET_KEY"] = "test-secret-key-for-wecom-bot"
        os.environ["ADMIN_USERNAME"] = "admin"
        os.environ["ADMIN_PASSWORD"] = "ChangeThisStrongPassword123!"
        os.environ["SHOP_PHONE"] = "13800138000"
        os.environ["ORDER_WEBHOOK_ENABLED"] = "false"
        os.environ["WECOM_BOT_ENABLED"] = "false"
        os.environ["WECOM_BOT_ID"] = ""
        os.environ["WECOM_BOT_SECRET"] = ""
        os.environ["WECOM_BOT_CHAT_ID"] = ""

        from fastapi.testclient import TestClient
        from app.main import app

        cls.client = TestClient(app)
        with cls.client:
            pass

    @classmethod
    def tearDownClass(cls):
        from app.database import engine

        engine.dispose()
        cls.tmpdir.cleanup()

    def setUp(self):
        from app.config import settings

        self._settings_snapshot = {
            "WECOM_BOT_ENABLED": settings.WECOM_BOT_ENABLED,
            "WECOM_BOT_ID": settings.WECOM_BOT_ID,
            "WECOM_BOT_SECRET": settings.WECOM_BOT_SECRET,
            "WECOM_BOT_CHAT_ID": settings.WECOM_BOT_CHAT_ID,
            "ORDER_WEBHOOK_ENABLED": settings.ORDER_WEBHOOK_ENABLED,
        }

    def tearDown(self):
        from app.config import settings

        for key, value in self._settings_snapshot.items():
            setattr(settings, key, value)

        # 重置 bot 模块状态，防止测试间泄漏
        import app.bot as bot_mod
        bot_mod._ws_client = None

    def login_headers(self):
        response = self.client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "ChangeThisStrongPassword123!"},
        )
        self.assertEqual(response.status_code, 200)
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def submit_order(self, phone="13100000099"):
        return self.client.post(
            "/api/public/submit",
            json={
                "customer_name": "测试客户",
                "phone": phone,
                "community": "阳光小区",
                "address": "3号楼2单元501",
                "appliance_type": "空调",
                "fault_description": "不制冷",
                "is_urgent": False,
            },
        )

    # --- bot.py 单元测试 ---

    def test_startup_bot_skips_when_disabled(self):
        from app.config import settings

        settings.WECOM_BOT_ENABLED = False

        import importlib
        import app.bot as bot_mod

        # startup_bot 应该直接返回，不创建 WSClient
        result = asyncio.get_event_loop().run_until_complete(bot_mod.startup_bot())
        self.assertIsNone(result)
        self.assertIsNone(bot_mod._ws_client)

    def test_startup_bot_skips_when_credentials_empty(self):
        from app.config import settings

        settings.WECOM_BOT_ENABLED = True
        settings.WECOM_BOT_ID = ""
        settings.WECOM_BOT_SECRET = ""

        import app.bot as bot_mod

        result = asyncio.get_event_loop().run_until_complete(bot_mod.startup_bot())
        self.assertIsNone(result)
        self.assertIsNone(bot_mod._ws_client)

    @mock.patch("app.bot.WSClient", create=True)
    def test_startup_bot_creates_client(self, mock_ws_cls):
        from app.config import settings

        settings.WECOM_BOT_ENABLED = True
        settings.WECOM_BOT_ID = "test-bot-id"
        settings.WECOM_BOT_SECRET = "test-secret"

        # Mock WSClient instance
        mock_instance = mock.MagicMock()
        mock_instance.on = mock.MagicMock(return_value=lambda f: f)
        mock_instance.connect = mock.AsyncMock()
        mock_ws_cls.return_value = mock_instance

        # Patch the import inside startup_bot
        with mock.patch.dict("sys.modules", {"aibot": mock.MagicMock()}):
            import sys
            sys.modules["aibot"].WSClient = mock_ws_cls
            sys.modules["aibot"].WSClientOptions = mock.MagicMock()

            import app.bot as bot_mod
            bot_mod._ws_client = None  # Reset

            asyncio.get_event_loop().run_until_complete(bot_mod.startup_bot())

        self.assertIsNotNone(bot_mod._ws_client)

    def test_shutdown_bot_disconnects(self):
        import app.bot as bot_mod

        mock_client = mock.MagicMock()
        bot_mod._ws_client = mock_client

        bot_mod.shutdown_bot()

        mock_client.disconnect.assert_called_once()
        self.assertIsNone(bot_mod._ws_client)

    def test_shutdown_bot_noop_when_none(self):
        import app.bot as bot_mod

        bot_mod._ws_client = None
        # Should not raise
        bot_mod.shutdown_bot()
        self.assertIsNone(bot_mod._ws_client)

    def test_send_bot_message_skips_when_disabled(self):
        from app.config import settings

        settings.WECOM_BOT_ENABLED = False

        import app.bot as bot_mod

        # 应该直接返回，不调用 send_message
        asyncio.get_event_loop().run_until_complete(bot_mod.send_bot_message("test"))
        # No exception = pass

    def test_send_bot_message_skips_when_no_client(self):
        from app.config import settings

        settings.WECOM_BOT_ENABLED = True
        settings.WECOM_BOT_CHAT_ID = "test-chat-id"

        import app.bot as bot_mod

        bot_mod._ws_client = None

        asyncio.get_event_loop().run_until_complete(bot_mod.send_bot_message("test"))
        # No exception = pass

    def test_send_bot_message_skips_when_chat_id_empty(self):
        from app.config import settings

        settings.WECOM_BOT_ENABLED = True
        settings.WECOM_BOT_CHAT_ID = ""

        import app.bot as bot_mod

        mock_client = mock.MagicMock()
        bot_mod._ws_client = mock_client

        asyncio.get_event_loop().run_until_complete(bot_mod.send_bot_message("test"))

        mock_client.send_message.assert_not_called()

    def test_send_bot_message_calls_send_message(self):
        from app.config import settings

        settings.WECOM_BOT_ENABLED = True
        settings.WECOM_BOT_CHAT_ID = "test-chat-id"

        import app.bot as bot_mod

        mock_client = mock.MagicMock()
        mock_client.send_message = mock.AsyncMock()
        bot_mod._ws_client = mock_client

        asyncio.get_event_loop().run_until_complete(
            bot_mod.send_bot_message("来订单了")
        )

        mock_client.send_message.assert_called_once_with(
            "test-chat-id",
            {
                "msgtype": "markdown",
                "markdown": {"content": "来订单了"},
            },
        )

    def test_send_bot_message_handles_exception(self):
        from app.config import settings

        settings.WECOM_BOT_ENABLED = True
        settings.WECOM_BOT_CHAT_ID = "test-chat-id"

        import app.bot as bot_mod

        mock_client = mock.MagicMock()
        mock_client.send_message = mock.AsyncMock(side_effect=Exception("network error"))
        bot_mod._ws_client = mock_client

        # 应该不抛异常
        asyncio.get_event_loop().run_until_complete(
            bot_mod.send_bot_message("test")
        )

    # --- notification.py 机器人通知测试 ---

    def test_bot_notification_skips_when_disabled(self):
        from app.config import settings

        settings.WECOM_BOT_ENABLED = False

        from app.notification import send_order_created_bot_notification

        # 应该直接返回
        asyncio.get_event_loop().run_until_complete(
            send_order_created_bot_notification("WX20260531001")
        )

    @mock.patch("app.bot.send_bot_message", new_callable=mock.AsyncMock)
    def test_bot_notification_sends_message(self, mock_send):
        from app.config import settings

        settings.WECOM_BOT_ENABLED = True

        from app.notification import send_order_created_bot_notification

        asyncio.get_event_loop().run_until_complete(
            send_order_created_bot_notification("WX20260531001")
        )

        mock_send.assert_called_once()
        call_args = mock_send.call_args[0][0]
        self.assertIn("WX20260531001", call_args)
        self.assertIn("新订单", call_args)

    # --- 下单流程集成测试 ---

    @mock.patch("app.bot.send_bot_message", new_callable=mock.AsyncMock)
    def test_submit_order_triggers_bot_notification(self, mock_send):
        from app.config import settings

        settings.WECOM_BOT_ENABLED = True

        response = self.submit_order("13100000088")
        self.assertEqual(response.status_code, 200)
        order_no = response.json()["order_no"]

        # 后台任务执行需要一点时间
        import time
        time.sleep(0.1)

        # 验证 bot 通知被调用
        mock_send.assert_called_once()
        call_args = mock_send.call_args[0][0]
        self.assertIn(order_no, call_args)

    @mock.patch("app.bot.send_bot_message", new_callable=mock.AsyncMock)
    def test_submit_order_bot_disabled_no_notification(self, mock_send):
        from app.config import settings

        settings.WECOM_BOT_ENABLED = False

        response = self.submit_order("13100000077")
        self.assertEqual(response.status_code, 200)

        import time
        time.sleep(0.1)

        mock_send.assert_not_called()

    def test_submit_order_still_works_without_bot(self):
        """确保机器人功能不影响正常下单流程。"""
        from app.config import settings

        settings.WECOM_BOT_ENABLED = False

        response = self.submit_order("13100000066")
        self.assertEqual(response.status_code, 200)
        self.assertIn("order_no", response.json())

        # 验证订单已入库
        headers = self.login_headers()
        orders_response = self.client.get("/api/orders", headers=headers)
        self.assertEqual(orders_response.status_code, 200)
        items = orders_response.json()["items"]
        self.assertTrue(any(o["phone"] == "13100000066" for o in items))

    # --- 配置测试 ---

    def test_config_has_bot_settings(self):
        from app.config import settings

        self.assertFalse(settings.WECOM_BOT_ENABLED)
        self.assertEqual(settings.WECOM_BOT_ID, "")
        self.assertEqual(settings.WECOM_BOT_SECRET, "")
        self.assertEqual(settings.WECOM_BOT_CHAT_ID, "")


if __name__ == "__main__":
    unittest.main()

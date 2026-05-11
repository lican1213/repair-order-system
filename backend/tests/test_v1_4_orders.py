import json
import os
import tempfile
import urllib.error
import unittest
from unittest import mock
from pathlib import Path


class V14OrdersTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmpdir = tempfile.TemporaryDirectory()
        cls.db_path = Path(cls.tmpdir.name) / "v1_4_orders_test.db"
        os.environ["DATABASE_URL"] = f"sqlite:///{cls.db_path}"
        os.environ["SECRET_KEY"] = "test-secret-key-for-v1-4-orders"
        os.environ["ADMIN_USERNAME"] = "admin"
        os.environ["ADMIN_PASSWORD"] = "ChangeThisStrongPassword123!"
        os.environ["SHOP_PHONE"] = "13800138000"
        os.environ["ORDER_WEBHOOK_ENABLED"] = "false"

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
        from app.rate_limit import limiter

        self._settings_snapshot = {
            "ORDER_WEBHOOK_ENABLED": settings.ORDER_WEBHOOK_ENABLED,
            "ORDER_WEBHOOK_PROVIDER": settings.ORDER_WEBHOOK_PROVIDER,
            "ORDER_WEBHOOK_URL": settings.ORDER_WEBHOOK_URL,
            "ORDER_WEBHOOK_TIMEOUT_SECONDS": settings.ORDER_WEBHOOK_TIMEOUT_SECONDS,
            "ORDER_WECOM_INCLUDE_PRIVATE_FIELDS": settings.ORDER_WECOM_INCLUDE_PRIVATE_FIELDS,
            "APP_BASE_URL": settings.APP_BASE_URL,
        }
        limiter._records.clear()

    def tearDown(self):
        from app.config import settings

        for key, value in self._settings_snapshot.items():
            setattr(settings, key, value)

    def login_headers(self):
        response = self.client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "ChangeThisStrongPassword123!"},
        )
        self.assertEqual(response.status_code, 200)
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def submit_order(self, phone: str, service_type: str | None = "维修", appliance_type: str = "空调"):
        payload = {
            "customer_name": "李师傅",
            "phone": phone,
            "community": "阳光小区",
            "address": "3号楼2单元501",
            "appliance_type": appliance_type,
            "fault_description": "测试需求",
            "is_urgent": False,
        }
        if service_type is not None:
            payload["service_type"] = service_type
        return self.client.post("/api/public/submit", json=payload)

    def test_submit_rejects_invalid_service_type_and_returns_valid_service_type(self):
        invalid_response = self.submit_order("13100000001", service_type="安装")
        self.assertEqual(invalid_response.status_code, 422)

        valid_response = self.submit_order("13100000002", service_type="清洗")
        self.assertEqual(valid_response.status_code, 200)

        headers = self.login_headers()
        list_response = self.client.get("/api/orders", headers=headers)
        self.assertEqual(list_response.status_code, 200)
        items = list_response.json()["items"]
        self.assertEqual(items[0]["service_type"], "清洗")

    def test_missing_and_empty_service_type_falls_back_to_repair(self):
        missing_response = self.submit_order("13100000003", service_type=None)
        self.assertEqual(missing_response.status_code, 200)

        headers = self.login_headers()
        orders_response = self.client.get("/api/orders", headers=headers)
        self.assertEqual(orders_response.status_code, 200)
        order_id = orders_response.json()["items"][0]["id"]

        from sqlalchemy import text
        from app.database import SessionLocal

        db = SessionLocal()
        try:
            db.execute(text("UPDATE orders SET service_type = '' WHERE id = :id"), {"id": order_id})
            db.commit()
        finally:
            db.close()

        detail_response = self.client.get(f"/api/orders/{order_id}", headers=headers)
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["service_type"], "维修")

    def test_new_order_notification_endpoint_returns_count_latest_id_and_orders(self):
        unauthorized_response = self.client.get("/api/orders/notifications/new?after_id=0")
        self.assertEqual(unauthorized_response.status_code, 401)

        headers = self.login_headers()

        first_response = self.submit_order("13100000004", service_type="维修")
        self.assertEqual(first_response.status_code, 200)
        baseline_response = self.client.get("/api/orders/notifications/new?after_id=0", headers=headers)
        self.assertEqual(baseline_response.status_code, 200)
        baseline_latest_id = baseline_response.json()["latest_id"]

        second_response = self.submit_order("13100000005", service_type="清洗", appliance_type="油烟机")
        self.assertEqual(second_response.status_code, 200)

        notification_response = self.client.get(
            f"/api/orders/notifications/new?after_id={baseline_latest_id}",
            headers=headers,
        )
        self.assertEqual(notification_response.status_code, 200)
        body = notification_response.json()
        self.assertEqual(body["count"], 1)
        self.assertGreater(body["latest_id"], baseline_latest_id)
        self.assertEqual(len(body["orders"]), 1)
        item = body["orders"][0]
        self.assertIn("id", item)
        self.assertIn("order_no", item)
        self.assertIn("service_type", item)
        self.assertIn("appliance_type", item)
        self.assertIn("is_urgent", item)
        self.assertIn("created_at", item)
        self.assertEqual(item["service_type"], "清洗")
        self.assertEqual(item["appliance_type"], "油烟机")
        self.assertNotIn("phone", item)
        self.assertNotIn("customer_name", item)
        self.assertNotIn("address", item)
        self.assertNotIn("fault_description", item)

    def test_webhook_payload_uses_privacy_preserving_order_summary(self):
        from app.models import Order
        from app.notification import build_order_created_payload

        order = Order(
            id=99,
            order_no="WX20260505099",
            customer_name="王先生",
            phone="13100000099",
            community="阳光小区",
            address="3号楼2单元501室门口左侧靠近电梯间请不要完整发送",
            service_type="清洗",
            appliance_type="油烟机",
            fault_description="重油污清洗",
            is_urgent=True,
        )

        payload = build_order_created_payload(order)

        self.assertEqual(payload["order_no"], "WX20260505099")
        self.assertEqual(payload["service_type"], "清洗")
        self.assertEqual(payload["appliance_type"], "油烟机")
        self.assertEqual(payload["is_urgent"], True)
        self.assertIn("/admin/orders/99", payload["admin_detail_url"])
        self.assertNotIn("phone", payload)
        self.assertNotIn("customer_name", payload)
        self.assertNotEqual(payload["address_summary"], "阳光小区 3号楼2单元501室门口左侧靠近电梯间请不要完整发送")

    def test_order_webhook_disabled_does_not_send_external_request(self):
        from app.config import settings
        from app.notification import send_order_created_webhook

        settings.ORDER_WEBHOOK_ENABLED = False
        settings.ORDER_WEBHOOK_PROVIDER = "wecom"
        settings.ORDER_WEBHOOK_URL = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=REPLACE_WITH_YOUR_KEY"

        with mock.patch("app.notification.urllib.request.urlopen") as urlopen:
            send_order_created_webhook({"event": "order.created", "order_no": "WX20260511001"})

        urlopen.assert_not_called()

    def test_wecom_webhook_builds_markdown_payload_without_private_fields(self):
        from app.config import settings
        from app.models import Order
        from app.notification import build_order_created_payload, send_order_created_webhook

        settings.ORDER_WEBHOOK_ENABLED = True
        settings.ORDER_WEBHOOK_PROVIDER = "wecom"
        settings.ORDER_WEBHOOK_URL = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=REPLACE_WITH_YOUR_KEY"
        settings.APP_BASE_URL = "https://example.com"

        order = Order(
            id=101,
            order_no="WX20260511101",
            customer_name="赵女士",
            phone="13100000101",
            community="幸福花园",
            address="8号楼1单元2302室请不要完整发送",
            service_type="清洗",
            appliance_type="油烟机",
            fault_description="客户说油污很重，需要下午联系",
            is_urgent=False,
        )
        payload = build_order_created_payload(order)

        with mock.patch("app.notification.urllib.request.urlopen") as urlopen:
            response = mock.Mock()
            response.status = 200
            urlopen.return_value.__enter__.return_value = response

            send_order_created_webhook(payload)

        request = urlopen.call_args[0][0]
        body = json.loads(request.data.decode("utf-8"))
        content = body["markdown"]["content"]

        self.assertEqual(body["msgtype"], "markdown")
        self.assertIn("【新订单提醒】", content)
        self.assertIn("> 工单号：WX20260511101", content)
        self.assertIn("> 服务类型：清洗", content)
        self.assertIn("> 家电类型：油烟机", content)
        self.assertIn("> 区域：", content)
        self.assertIn("> 紧急程度：普通", content)
        self.assertIn("> 后台查看：https://example.com/admin/orders/101", content)
        self.assertNotIn("13100000101", content)
        self.assertNotIn("赵女士", content)
        self.assertNotIn("8号楼1单元2302室请不要完整发送", content)
        self.assertNotIn("客户说油污很重，需要下午联系", content)

    def test_wecom_webhook_includes_private_fields_when_explicitly_enabled(self):
        from app.config import settings
        from app.models import Order
        from app.notification import build_order_created_payload, send_order_created_webhook

        settings.ORDER_WEBHOOK_ENABLED = True
        settings.ORDER_WEBHOOK_PROVIDER = "wecom"
        settings.ORDER_WECOM_INCLUDE_PRIVATE_FIELDS = True
        settings.ORDER_WEBHOOK_URL = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=REPLACE_WITH_YOUR_KEY"
        settings.APP_BASE_URL = "https://example.com"

        order = Order(
            id=107,
            order_no="WX20260511107",
            customer_name="赵女士",
            phone="13100000107",
            community="幸福花园",
            address="8号楼1单元2302室",
            service_type="清洗",
            appliance_type="油烟机",
            fault_description="客户说油污很重，需要下午联系",
            is_urgent=False,
        )
        payload = build_order_created_payload(order)

        with mock.patch("app.notification.urllib.request.urlopen") as urlopen:
            response = mock.Mock()
            response.status = 200
            urlopen.return_value.__enter__.return_value = response

            send_order_created_webhook(payload)

        request = urlopen.call_args[0][0]
        body = json.loads(request.data.decode("utf-8"))
        content = body["markdown"]["content"]

        self.assertIn("> 客户：赵女士", content)
        self.assertIn("> 电话：13100000107", content)
        self.assertIn("> 地址：幸福花园 8号楼1单元2302室", content)
        self.assertIn("> 描述：客户说油污很重，需要下午联系", content)

    def test_wecom_payload_omits_admin_link_when_app_base_url_empty(self):
        from app.config import settings
        from app.models import Order
        from app.notification import build_order_created_payload, send_order_created_webhook

        settings.ORDER_WEBHOOK_ENABLED = True
        settings.ORDER_WEBHOOK_PROVIDER = "wecom"
        settings.ORDER_WEBHOOK_URL = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=REPLACE_WITH_YOUR_KEY"
        settings.APP_BASE_URL = ""

        order = Order(
            id=102,
            order_no="WX20260511102",
            customer_name="孙先生",
            phone="13100000102",
            community="幸福花园",
            address="9号楼",
            service_type="维修",
            appliance_type="冰箱",
            fault_description="不制冷",
            is_urgent=True,
        )
        payload = build_order_created_payload(order)

        with mock.patch("app.notification.urllib.request.urlopen") as urlopen:
            response = mock.Mock()
            response.status = 200
            urlopen.return_value.__enter__.return_value = response

            send_order_created_webhook(payload)

        request = urlopen.call_args[0][0]
        body = json.loads(request.data.decode("utf-8"))
        content = body["markdown"]["content"]

        self.assertNotIn("后台查看", content)
        self.assertNotIn("/admin/orders/102", content)

    def test_webhook_url_empty_or_request_failure_does_not_break_submit(self):
        from app.config import settings

        settings.ORDER_WEBHOOK_ENABLED = True
        settings.ORDER_WEBHOOK_PROVIDER = "wecom"
        settings.ORDER_WEBHOOK_URL = ""

        with mock.patch("app.notification.urllib.request.urlopen") as urlopen:
            empty_url_response = self.submit_order("13100000103", service_type="清洗")

        self.assertEqual(empty_url_response.status_code, 200)
        urlopen.assert_not_called()

        settings.ORDER_WEBHOOK_URL = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=REPLACE_WITH_YOUR_KEY"

        with mock.patch(
            "app.notification.urllib.request.urlopen",
            side_effect=urllib.error.URLError("network down"),
        ) as urlopen:
            failure_response = self.submit_order("13100000104", service_type="维修")

        self.assertEqual(failure_response.status_code, 200)
        urlopen.assert_called_once()

    def test_generic_webhook_provider_keeps_existing_json_payload(self):
        from app.config import settings
        from app.models import Order
        from app.notification import build_order_created_payload, send_order_created_webhook

        order = Order(
            id=105,
            order_no="WX20260511105",
            customer_name="钱先生",
            phone="13100000105",
            community="阳光小区",
            address="3号楼2单元501",
            service_type="维修",
            appliance_type="空调",
            fault_description="漏水",
            is_urgent=False,
        )
        payload = build_order_created_payload(order)

        settings.ORDER_WEBHOOK_ENABLED = True
        settings.ORDER_WEBHOOK_PROVIDER = "generic"
        settings.ORDER_WEBHOOK_URL = "https://example.com/webhook"

        with mock.patch("app.notification.urllib.request.urlopen") as urlopen:
            response = mock.Mock()
            response.status = 200
            urlopen.return_value.__enter__.return_value = response

            send_order_created_webhook(payload)

        request = urlopen.call_args[0][0]
        body = json.loads(request.data.decode("utf-8"))

        self.assertEqual(body["event"], "order.created")
        self.assertEqual(body["order_no"], "WX20260511105")
        self.assertEqual(body["service_type"], "维修")
        self.assertEqual(body["appliance_type"], "空调")
        self.assertEqual(body["address_summary"], "阳光小区")
        self.assertNotIn("msgtype", body)
        self.assertNotIn("_private", body)
        self.assertNotIn("phone", body)
        self.assertNotIn("customer_name", body)
        self.assertNotIn("address", body)
        self.assertNotIn("fault_description", body)

    def test_invalid_webhook_provider_falls_back_to_generic_payload(self):
        from app.config import settings
        from app.notification import send_order_created_webhook

        payload = {
            "event": "order.created",
            "order_no": "WX20260511106",
            "service_type": "维修",
            "appliance_type": "冰箱",
            "address_summary": "幸福花园",
            "is_urgent": True,
            "admin_detail_url": "/admin/orders/106",
        }

        settings.ORDER_WEBHOOK_ENABLED = True
        settings.ORDER_WEBHOOK_PROVIDER = "unknown"
        settings.ORDER_WEBHOOK_URL = "https://example.com/webhook"

        with mock.patch("app.notification.urllib.request.urlopen") as urlopen:
            response = mock.Mock()
            response.status = 200
            urlopen.return_value.__enter__.return_value = response

            with self.assertLogs("app.notification", level="WARNING") as logs:
                send_order_created_webhook(payload)

        request = urlopen.call_args[0][0]
        body = json.loads(request.data.decode("utf-8"))

        self.assertEqual(body, payload)
        self.assertIn("falling back to generic", "\n".join(logs.output))


if __name__ == "__main__":
    unittest.main()

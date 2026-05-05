import os
import tempfile
import unittest
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


if __name__ == "__main__":
    unittest.main()

import os
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path


class ManualOrderCreateApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmpdir = tempfile.TemporaryDirectory()
        cls.db_path = Path(cls.tmpdir.name) / "manual_order_create_test.db"
        os.environ["DATABASE_URL"] = f"sqlite:///{cls.db_path}"
        os.environ["SECRET_KEY"] = "test-secret-key-for-manual-order-create"
        os.environ["ADMIN_USERNAME"] = "admin"
        os.environ["ADMIN_PASSWORD"] = "ChangeThisStrongPassword123!"
        os.environ["SHOP_PHONE"] = "13800138000"
        os.environ["ORDER_WEBHOOK_ENABLED"] = "false"
        os.environ["WECOM_BOT_ENABLED"] = "false"

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
        from app.auth import hash_password
        from app.database import SessionLocal
        from app.models import Order, RepairLog, UsedAppliance, User

        db = SessionLocal()
        try:
            db.query(RepairLog).delete()
            db.query(Order).delete()
            db.query(UsedAppliance).delete()
            db.query(User).delete()

            admin = User(
                username="admin",
                password_hash=hash_password("ChangeThisStrongPassword123!"),
                role="admin",
                is_active=True,
            )
            staff = User(
                username="staff01",
                password_hash=hash_password("secret123"),
                role="staff",
                is_active=True,
            )
            viewer = User(
                username="viewer01",
                password_hash=hash_password("secret123"),
                role="viewer",
                is_active=True,
            )
            db.add_all([admin, staff, viewer])
            db.commit()
            db.refresh(admin)
            db.refresh(staff)
            db.refresh(viewer)
            self.admin_id = admin.id
            self.staff_id = staff.id
            self.viewer_id = viewer.id
        finally:
            db.close()

    def login_headers(self, username="admin", password="ChangeThisStrongPassword123!"):
        response = self.client.post(
            "/api/auth/login",
            json={"username": username, "password": password},
        )
        self.assertEqual(response.status_code, 200, response.text)
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def build_payload(self, **overrides):
        scheduled_at = (datetime.now() + timedelta(hours=2)).replace(microsecond=0).isoformat()
        payload = {
            "customer_name": "王师傅",
            "phone": "(021) 1234-5678",
            "community": "阳光小区",
            "address": "3号楼2单元501",
            "service_type": "维修",
            "appliance_type": "空调",
            "fault_description": "电话报修，先安排上门",
            "scheduled_at": scheduled_at,
            "is_urgent": False,
            "status": "新报修",
        }
        payload.update(overrides)
        return payload

    def test_admin_can_create_manual_order_with_assignment_and_completion(self):
        response = self.client.post(
            "/api/orders",
            headers=self.login_headers(),
            json=self.build_payload(
                service_type="清洗",
                appliance_type="油烟机",
                status="已完成",
                remark="电话录入",
                assigned_user_id=self.staff_id,
            ),
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["source"], "后台录入")
        self.assertEqual(body["assigned_user_id"], self.staff_id)
        self.assertEqual(body["assigned_username"], "staff01")
        self.assertEqual(body["status"], "已完成")
        self.assertEqual(body["remark"], "电话录入")
        self.assertEqual(body["service_type"], "清洗")
        self.assertTrue(body["order_no"].startswith("WX"))
        self.assertIsNotNone(body["completed_at"])

        from app.database import SessionLocal
        from app.models import RepairLog

        db = SessionLocal()
        try:
            logs = db.query(RepairLog).filter(RepairLog.order_id == body["id"]).all()
            self.assertEqual(len(logs), 1)
            self.assertIsNone(logs[0].old_status)
            self.assertEqual(logs[0].new_status, "已完成")
            self.assertEqual(logs[0].note, "后台录入")
        finally:
            db.close()

    def test_staff_create_auto_assigns_self(self):
        response = self.client.post(
            "/api/orders",
            headers=self.login_headers("staff01", "secret123"),
            json=self.build_payload(
                assigned_user_id=self.admin_id,
                status="已联系",
            ),
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["assigned_user_id"], self.staff_id)
        self.assertEqual(body["assigned_username"], "staff01")
        self.assertEqual(body["status"], "已联系")

    def test_viewer_cannot_create_manual_order(self):
        response = self.client.post(
            "/api/orders",
            headers=self.login_headers("viewer01", "secret123"),
            json=self.build_payload(),
        )
        self.assertEqual(response.status_code, 403, response.text)

    def test_manual_create_requires_schedule_for_reserved_status(self):
        payload = self.build_payload(status="已预约")
        payload.pop("scheduled_at", None)
        missing_schedule = self.client.post(
            "/api/orders",
            headers=self.login_headers(),
            json=payload,
        )
        self.assertEqual(missing_schedule.status_code, 422, missing_schedule.text)

        with_schedule = self.client.post(
            "/api/orders",
            headers=self.login_headers(),
            json=self.build_payload(status="已预约"),
        )
        self.assertEqual(with_schedule.status_code, 200, with_schedule.text)
        self.assertEqual(with_schedule.json()["status"], "已预约")

    def test_manual_create_validates_phone_and_other_brand_model(self):
        invalid_phone = self.client.post(
            "/api/orders",
            headers=self.login_headers(),
            json=self.build_payload(phone="电话-123"),
        )
        self.assertEqual(invalid_phone.status_code, 422, invalid_phone.text)

        missing_brand_model = self.client.post(
            "/api/orders",
            headers=self.login_headers(),
            json=self.build_payload(appliance_type="其他", brand_model=""),
        )
        self.assertEqual(missing_brand_model.status_code, 422, missing_brand_model.text)


import io
import os
import tempfile
import unittest
from pathlib import Path


class UserRolesApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmpdir = tempfile.TemporaryDirectory()
        cls.db_path = Path(cls.tmpdir.name) / "user_roles_test.db"
        os.environ["DATABASE_URL"] = f"sqlite:///{cls.db_path}"
        os.environ["SECRET_KEY"] = "test-secret-key-for-user-roles"
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
            db.query(User).filter(User.username != "admin").delete()
            admin = db.query(User).filter(User.username == "admin").first()
            admin.role = "admin"
            admin.is_active = True
            admin.password_hash = hash_password("ChangeThisStrongPassword123!")
            db.commit()
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

    def create_user(self, username: str, role: str, password: str = "secret123"):
        return self.client.post(
            "/api/auth/users",
            headers=self.login_headers(),
            json={"username": username, "password": password, "role": role},
        )

    def submit_order(self):
        response = self.client.post(
            "/api/public/submit",
            json={
                "customer_name": "李师傅",
                "phone": "13100010001",
                "community": "阳光小区",
                "address": "3号楼2单元501",
                "service_type": "维修",
                "appliance_type": "空调",
                "fault_description": "测试故障",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        orders = self.client.get("/api/orders", headers=self.login_headers())
        self.assertEqual(orders.status_code, 200, orders.text)
        return orders.json()["items"][0]["id"]

    def test_admin_manages_staff_and_viewer_accounts(self):
        create_response = self.create_user("staff01", "staff")
        self.assertEqual(create_response.status_code, 200, create_response.text)
        created = create_response.json()
        self.assertEqual(created["username"], "staff01")
        self.assertEqual(created["role"], "staff")
        self.assertTrue(created["is_active"])
        self.assertIn("created_at", created)
        self.assertIn("last_login_at", created)

        duplicate = self.create_user("staff01", "viewer")
        self.assertEqual(duplicate.status_code, 409)

        too_short = self.create_user("viewer01", "viewer", password="12345")
        self.assertEqual(too_short.status_code, 422)

        users_response = self.client.get("/api/auth/users", headers=self.login_headers())
        self.assertEqual(users_response.status_code, 200, users_response.text)
        users = users_response.json()
        self.assertEqual([u["username"] for u in users], ["admin", "staff01"])
        self.assertTrue({"is_active", "created_at", "last_login_at"}.issubset(users[0].keys()))

        patch_response = self.client.patch(
            f"/api/auth/users/{created['id']}",
            headers=self.login_headers(),
            json={"role": "viewer", "is_active": False},
        )
        self.assertEqual(patch_response.status_code, 200, patch_response.text)
        self.assertEqual(patch_response.json()["role"], "viewer")
        self.assertFalse(patch_response.json()["is_active"])

        null_role_response = self.client.patch(
            f"/api/auth/users/{created['id']}",
            headers=self.login_headers(),
            json={"role": None},
        )
        self.assertEqual(null_role_response.status_code, 200, null_role_response.text)
        self.assertEqual(null_role_response.json()["role"], "viewer")

        users_after_null_role = self.client.get("/api/auth/users", headers=self.login_headers())
        self.assertEqual(users_after_null_role.status_code, 200, users_after_null_role.text)
        self.assertEqual(
            next(u for u in users_after_null_role.json() if u["id"] == created["id"])["role"],
            "viewer",
        )

        null_active_response = self.client.patch(
            f"/api/auth/users/{created['id']}",
            headers=self.login_headers(),
            json={"is_active": None},
        )
        self.assertEqual(null_active_response.status_code, 200, null_active_response.text)
        self.assertFalse(null_active_response.json()["is_active"])

        disabled_login = self.client.post(
            "/api/auth/login",
            json={"username": "staff01", "password": "secret123"},
        )
        self.assertEqual(disabled_login.status_code, 401)

        enable_response = self.client.patch(
            f"/api/auth/users/{created['id']}",
            headers=self.login_headers(),
            json={"is_active": True},
        )
        self.assertEqual(enable_response.status_code, 200, enable_response.text)

        reset_response = self.client.post(
            f"/api/auth/users/{created['id']}/reset-password",
            headers=self.login_headers(),
            json={"password": "newpass123"},
        )
        self.assertEqual(reset_response.status_code, 200, reset_response.text)
        self.login_headers("staff01", "newpass123")

        delete_response = self.client.delete(
            f"/api/auth/users/{created['id']}",
            headers=self.login_headers(),
        )
        self.assertEqual(delete_response.status_code, 200, delete_response.text)
        deleted_login = self.client.post(
            "/api/auth/login",
            json={"username": "staff01", "password": "newpass123"},
        )
        self.assertEqual(deleted_login.status_code, 401)

    def test_account_limit_and_original_admin_protection(self):
        for i in range(1, 15):
            response = self.create_user(f"user{i:02d}", "viewer")
            self.assertEqual(response.status_code, 200, response.text)

        duplicate_at_limit = self.create_user("user01", "viewer")
        self.assertEqual(duplicate_at_limit.status_code, 409)

        over_limit = self.create_user("user15", "viewer")
        self.assertEqual(over_limit.status_code, 400)

        admin = self.client.get("/api/auth/me", headers=self.login_headers()).json()

        disable_admin = self.client.patch(
            f"/api/auth/users/{admin['id']}",
            headers=self.login_headers(),
            json={"is_active": False},
        )
        self.assertEqual(disable_admin.status_code, 400)

        demote_admin = self.client.patch(
            f"/api/auth/users/{admin['id']}",
            headers=self.login_headers(),
            json={"role": "viewer"},
        )
        self.assertEqual(demote_admin.status_code, 400)

        reset_admin = self.client.post(
            f"/api/auth/users/{admin['id']}/reset-password",
            headers=self.login_headers(),
            json={"password": "newpass123"},
        )
        self.assertEqual(reset_admin.status_code, 400)

        delete_admin = self.client.delete(
            f"/api/auth/users/{admin['id']}",
            headers=self.login_headers(),
        )
        self.assertEqual(delete_admin.status_code, 400)

        from app.auth import hash_password
        from app.database import SessionLocal
        from app.models import User

        db = SessionLocal()
        try:
            legacy_admin = User(
                username="legacy_admin",
                password_hash=hash_password("legacy123"),
                role="admin",
                is_active=True,
            )
            db.add(legacy_admin)
            db.commit()
            db.refresh(legacy_admin)
            legacy_admin_id = legacy_admin.id
        finally:
            db.close()

        demote_legacy_admin = self.client.patch(
            f"/api/auth/users/{legacy_admin_id}",
            headers=self.login_headers(),
            json={"role": "viewer"},
        )
        self.assertEqual(demote_legacy_admin.status_code, 400)

        delete_legacy_admin = self.client.delete(
            f"/api/auth/users/{legacy_admin_id}",
            headers=self.login_headers(),
        )
        self.assertEqual(delete_legacy_admin.status_code, 400)

    def test_viewer_and_staff_permissions_on_existing_endpoints(self):
        self.create_user("viewer01", "viewer")
        self.create_user("staff01", "staff")
        order_id = self.submit_order()
        viewer_headers = self.login_headers("viewer01", "secret123")
        staff_headers = self.login_headers("staff01", "secret123")

        viewer_detail = self.client.get(f"/api/orders/{order_id}", headers=viewer_headers)
        self.assertEqual(viewer_detail.status_code, 200, viewer_detail.text)
        self.assertEqual(viewer_detail.json()["phone"], "13100010001")
        self.assertEqual(viewer_detail.json()["address"], "3号楼2单元501")

        viewer_patch = self.client.patch(
            f"/api/orders/{order_id}",
            headers=viewer_headers,
            json={"status": "已联系"},
        )
        self.assertEqual(viewer_patch.status_code, 403)

        staff_patch = self.client.patch(
            f"/api/orders/{order_id}",
            headers=staff_headers,
            json={"status": "已联系"},
        )
        self.assertEqual(staff_patch.status_code, 200, staff_patch.text)

        viewer_upload = self.client.post(
            "/api/upload",
            headers=viewer_headers,
            files={"files": ("repair.jpg", io.BytesIO(b"fake-jpeg"), "image/jpeg")},
        )
        self.assertEqual(viewer_upload.status_code, 403)

        staff_upload = self.client.post(
            "/api/upload",
            headers=staff_headers,
            files={"files": ("repair.jpg", io.BytesIO(b"fake-jpeg"), "image/jpeg")},
        )
        self.assertEqual(staff_upload.status_code, 200, staff_upload.text)

        self.assertEqual(
            self.client.get("/api/export/orders", headers=viewer_headers).status_code,
            403,
        )
        self.assertEqual(
            self.client.get("/api/export/orders", headers=staff_headers).status_code,
            403,
        )
        self.assertEqual(
            self.client.get("/api/auth/users", headers=viewer_headers).status_code,
            403,
        )
        self.assertEqual(
            self.client.post(
                "/api/admin/used-appliances",
                headers=staff_headers,
                json={"title": "二手冰箱", "category": "冰箱", "status": "在售"},
            ).status_code,
            403,
        )


if __name__ == "__main__":
    unittest.main()

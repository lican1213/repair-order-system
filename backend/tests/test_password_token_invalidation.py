import os
import tempfile
import time
import unittest
from pathlib import Path


class PasswordTokenInvalidationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmpdir = tempfile.TemporaryDirectory()
        cls.db_path = Path(cls.tmpdir.name) / "pwd_invalidation_test.db"
        os.environ["DATABASE_URL"] = f"sqlite:///{cls.db_path}"
        os.environ["SECRET_KEY"] = "test-secret-key-for-pwd-invalidation"
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
        from app.models import User

        db = SessionLocal()
        try:
            db.query(User).filter(User.username != "admin").delete()
            admin = db.query(User).filter(User.username == "admin").first()
            admin.is_active = True
            admin.role = "admin"
            admin.password_hash = hash_password("ChangeThisStrongPassword123!")
            admin.password_changed_at = None
            db.commit()
        finally:
            db.close()

    def login(self, username, password):
        r = self.client.post(
            "/api/auth/login", json={"username": username, "password": password}
        )
        self.assertEqual(r.status_code, 200, r.text)
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    def test_change_password_invalidates_old_token(self):
        old = self.login("admin", "ChangeThisStrongPassword123!")
        self.assertEqual(self.client.get("/api/auth/me", headers=old).status_code, 200)

        # 确保改密时点落在旧 token 的签发整秒之后
        time.sleep(1.1)
        r = self.client.post(
            "/api/auth/change-password",
            headers=old,
            json={
                "old_password": "ChangeThisStrongPassword123!",
                "new_password": "NewStrongPass456!",
                "confirm_password": "NewStrongPass456!",
            },
        )
        self.assertEqual(r.status_code, 200, r.text)

        # 旧 token 立即失效（含读和管理接口）
        self.assertEqual(self.client.get("/api/auth/me", headers=old).status_code, 401)
        self.assertEqual(self.client.get("/api/auth/users", headers=old).status_code, 401)

        # 新登录的 token 正常可用
        new = self.login("admin", "NewStrongPass456!")
        self.assertEqual(self.client.get("/api/auth/me", headers=new).status_code, 200)
        self.assertEqual(self.client.get("/api/auth/users", headers=new).status_code, 200)

    def test_admin_reset_invalidates_target_old_token(self):
        admin = self.login("admin", "ChangeThisStrongPassword123!")
        sid = self.client.post(
            "/api/auth/users",
            headers=admin,
            json={"username": "staff_pwd", "password": "secret123", "role": "staff"},
        ).json()["id"]
        staff_old = self.login("staff_pwd", "secret123")
        self.assertEqual(self.client.get("/api/orders", headers=staff_old).status_code, 200)

        time.sleep(1.1)
        r = self.client.post(
            f"/api/auth/users/{sid}/reset-password",
            headers=admin,
            json={"password": "reset999"},
        )
        self.assertEqual(r.status_code, 200, r.text)

        # 被重置者旧 token 立即失效
        self.assertEqual(self.client.get("/api/orders", headers=staff_old).status_code, 401)
        # 新密码登录可用
        staff_new = self.login("staff_pwd", "reset999")
        self.assertEqual(self.client.get("/api/orders", headers=staff_new).status_code, 200)


if __name__ == "__main__":
    unittest.main()

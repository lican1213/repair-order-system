import os
import tempfile
import unittest
from pathlib import Path


class UsedAppliancesApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmpdir = tempfile.TemporaryDirectory()
        cls.db_path = Path(cls.tmpdir.name) / "used_appliances_test.db"
        os.environ["DATABASE_URL"] = f"sqlite:///{cls.db_path}"
        os.environ["SECRET_KEY"] = "test-secret-key-for-used-appliances"
        os.environ["ADMIN_USERNAME"] = "admin"
        os.environ["ADMIN_PASSWORD"] = "ChangeThisStrongPassword123!"
        os.environ["SHOP_PHONE"] = "13800138000"

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

    def test_used_appliance_public_visibility_and_admin_flow(self):
        public_empty = self.client.get("/api/used-appliances")
        self.assertEqual(public_empty.status_code, 200)
        self.assertEqual(public_empty.json()["items"], [])

        unauthorized = self.client.get("/api/admin/used-appliances")
        self.assertEqual(unauthorized.status_code, 401)

        headers = self.login_headers()
        create_response = self.client.post(
            "/api/admin/used-appliances",
            headers=headers,
            json={
                "title": "二手海尔洗衣机",
                "category": "洗衣机",
                "brand_model": "海尔 XQB80",
                "price": "800元起",
                "condition_note": "八成新，正常使用",
                "description": "适合出租房使用，具体请电话确认。",
                "image_paths": ["/uploads/used/test.jpg"],
                "status": "在售",
                "contact_phone": "13900139000",
            },
        )
        self.assertEqual(create_response.status_code, 200)
        item_id = create_response.json()["id"]

        public_list = self.client.get("/api/used-appliances")
        self.assertEqual(public_list.status_code, 200)
        self.assertEqual(public_list.json()["total"], 1)
        self.assertEqual(public_list.json()["items"][0]["title"], "二手海尔洗衣机")

        public_detail = self.client.get(f"/api/used-appliances/{item_id}")
        self.assertEqual(public_detail.status_code, 200)

        patch_response = self.client.patch(
            f"/api/admin/used-appliances/{item_id}",
            headers=headers,
            json={"status": "下架"},
        )
        self.assertEqual(patch_response.status_code, 200)
        self.assertEqual(patch_response.json()["status"], "下架")

        hidden_list = self.client.get("/api/used-appliances")
        self.assertEqual(hidden_list.status_code, 200)
        self.assertEqual(hidden_list.json()["items"], [])

        hidden_detail = self.client.get(f"/api/used-appliances/{item_id}")
        self.assertEqual(hidden_detail.status_code, 404)


if __name__ == "__main__":
    unittest.main()

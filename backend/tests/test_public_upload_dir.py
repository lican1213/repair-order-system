"""回归测试：公开报修上传的图片必须写入配置化的 UPLOAD_DIR，
并能通过 /uploads 挂载被真正访问（修复前会 404）。"""
import base64
import json
import os
import tempfile
import unittest
from pathlib import Path

# 1x1 PNG
_PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA"
    "60e6kgAAAABJRU5ErkJggg=="
)


class PublicUploadDirTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmpdir = tempfile.TemporaryDirectory()
        cls.db_path = Path(cls.tmpdir.name) / "public_upload_dir_test.db"
        os.environ["DATABASE_URL"] = f"sqlite:///{cls.db_path}"
        os.environ["SECRET_KEY"] = "test-secret-key-for-public-upload-dir"
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

    def test_public_uploaded_image_is_served_from_configured_dir(self):
        from app.config import BASE_DIR, resolve_upload_dir

        # 前置：UPLOAD_DIR 需为非默认目录才能复现该缺陷（conftest 已指向临时目录）
        self.assertNotEqual(
            resolve_upload_dir(),
            BASE_DIR / "uploads",
            "需将 UPLOAD_DIR 配置为非默认目录（见 tests/conftest.py）",
        )

        # 1) 公开上传
        upload = self.client.post(
            "/api/public/upload",
            files=[("files", ("fault.png", _PNG_BYTES, "image/png"))],
        )
        self.assertEqual(upload.status_code, 200, upload.text)
        temp_url = upload.json()["paths"][0]
        self.assertTrue(temp_url.startswith("/uploads/orders/temp/"))

        # 2) 带图提交报修
        submit = self.client.post(
            "/api/public/submit",
            json={
                "customer_name": "测试客户",
                "phone": "13800138000",
                "community": "测试小区",
                "address": "1号楼101",
                "service_type": "维修",
                "appliance_type": "空调",
                "fault_description": "不制冷",
                "image_paths": [temp_url],
            },
        )
        self.assertEqual(submit.status_code, 200, submit.text)

        # 3) 取订单的正式图片路径
        from app.database import SessionLocal
        from app.models import Order

        db = SessionLocal()
        try:
            order = db.query(Order).order_by(Order.id.desc()).first()
            self.assertIsNotNone(order)
            self.assertTrue(order.image_paths)
            final_url = json.loads(order.image_paths)[0]
        finally:
            db.close()

        self.assertTrue(final_url.startswith("/uploads/orders/"))
        self.assertFalse(final_url.startswith("/uploads/orders/temp/"))

        # 4) 关键：能从挂载目录被真正访问（修复前此处 404）
        served = self.client.get(final_url)
        self.assertEqual(
            served.status_code,
            200,
            f"正式图片应能从配置的 UPLOAD_DIR 提供，实际 {served.status_code}: {final_url}",
        )

        # 5) 文件确实落在 resolve_upload_dir()/orders 下
        final_fs = resolve_upload_dir() / "orders" / Path(final_url).name
        self.assertTrue(final_fs.is_file(), f"未写入配置目录: {final_fs}")

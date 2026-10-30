"""End-to-end adversarial API coverage with isolated in-memory SQLite."""
from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import Base, get_db
from app.main import app
from app.models import Order, User
from app.rate_limit import limiter
from app.routers import public


def _setup_db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=__import__("sqlalchemy").pool.StaticPool)
    Base.metadata.create_all(engine)
    def db_dep():
        with Session(engine) as session:
            yield session
    app.dependency_overrides[get_db] = db_dep
    return engine


def test_public_submit_cannot_move_env_but_can_move_valid_image(tmp_path, monkeypatch):
    engine = _setup_db()
    limiter._records.clear()
    root = tmp_path / "uploads"
    temp = root / "orders" / "temp"
    temp.mkdir(parents=True)
    secret = tmp_path / ".env"
    secret.write_text("SECRET_KEY=do-not-publish")
    monkeypatch.setattr(public, "get_uploads_dir", lambda: root)
    payload = {"customer_name": "Test", "phone": "13800138000", "community": "A",
               "address": "Unit 1", "appliance_type": "空调", "fault_description": "not cooling"}
    try:
        with TestClient(app) as client:
            bad = client.post("/api/public/submit", json={**payload, "image_paths": ["/uploads/orders/temp/../../../.env"]})
            assert bad.status_code == 400, bad.text
            assert secret.read_text() == "SECRET_KEY=do-not-publish"
            assert not (root / "orders" / ".env").exists()

            name = "C" * 22 + ".png"
            (temp / name).write_bytes(b"test-image")
            good = client.post("/api/public/submit", json={**payload, "image_paths": ["/uploads/orders/temp/" + name]})
            assert good.status_code == 200, good.text
            assert not (temp / name).exists()
            assert (root / "orders" / name).read_bytes() == b"test-image"
    finally:
        app.dependency_overrides.pop(get_db, None)
        limiter._records.clear()
        engine.dispose()


def test_admin_can_edit_old_order_without_rescheduling():
    engine = _setup_db()
    app.dependency_overrides[get_current_user] = lambda: User(id=1, username="admin", is_active=True)
    with Session(engine) as db:
        order = Order(order_no="WX20250102001", customer_name="Test", phone="13800138000",
                      community="A", address="Unit 1", appliance_type="空调", fault_description="Broken",
                      scheduled_at=datetime(2025, 1, 2, 9, 0), warranty_until="2025-12-31")
        db.add(order)
        db.commit()
        order_id = order.id
    try:
        with TestClient(app) as client:
            same = client.patch(f"/api/orders/{order_id}", json={
                "scheduled_at": "2025-01-02T09:00:00", "warranty_until": "2025-12-31", "remark": "回访完成"})
            assert same.status_code == 200, same.text
            assert same.json()["remark"] == "回访完成"
            changed = client.patch(f"/api/orders/{order_id}", json={"scheduled_at": "2025-01-03T09:00:00"})
            assert changed.status_code == 422, changed.text
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_current_user, None)
        engine.dispose()


def test_collision_preserves_original_and_uses_configured_upload_root(tmp_path, monkeypatch):
    """A pre-existing order image must not trigger a 500 or be overwritten."""
    import json
    engine = _setup_db()
    limiter._records.clear()
    root = tmp_path / "custom" / "uploads"
    temp = root / "orders" / "temp"
    temp.mkdir(parents=True)
    name = "D" * 22 + ".jpg"
    destination = root / "orders" / name
    destination.write_bytes(b"existing-order-image")
    (temp / name).write_bytes(b"new-customer-image")
    monkeypatch.setattr(public, "get_uploads_dir", lambda: root)
    monkeypatch.setattr(public.secrets, "token_urlsafe", lambda n: "E" * 22)
    payload = {"customer_name": "Test", "phone": "13800138000", "community": "A",
               "address": "Unit 1", "appliance_type": "空调", "fault_description": "repair",
               "image_paths": ["/uploads/orders/temp/" + name]}
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.post("/api/public/submit", json=payload)
            assert response.status_code == 200, response.text
            assert destination.read_bytes() == b"existing-order-image"
            renamed = root / "orders" / ("E" * 22 + ".jpg")
            assert renamed.read_bytes() == b"new-customer-image"
            with Session(engine) as db:
                saved = db.query(Order).one()
                assert json.loads(saved.image_paths) == ["/uploads/orders/" + renamed.name]
    finally:
        app.dependency_overrides.pop(get_db, None)
        limiter._records.clear()
        engine.dispose()

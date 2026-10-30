"""Adversarial regression tests: paths, JWT revocation, proxy spoofing and Excel."""
from datetime import datetime
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from openpyxl import Workbook
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.auth import create_access_token, get_current_user, password_token_version
from app.database import Base
from app.image_paths import resolve_staged_image_path
from app.models import User
from app.routers.export import _format_cell
from app.routers.public import _get_client_ip
from app.schemas import OrderUpdateRequest


def test_staged_path_blocks_escape_and_nested_paths(tmp_path):
    temp = tmp_path / "uploads/orders/temp"
    temp.mkdir(parents=True)
    name = "A" * 22 + ".jpg"
    (temp / name).write_bytes(b"image")
    assert resolve_staged_image_path("/uploads/orders/temp/" + name, tmp_path / "uploads") == temp / name
    (tmp_path / ".env").write_text("SECRET_KEY=example")
    for bad in ("/uploads/orders/temp/../../../.env",
                "/uploads/orders/temp/../" + name,
                "/uploads/orders/temp//" + name,
                "/uploads/orders/temp/%2e%2e/" + name,
                "/uploads/orders/temp/" + name + "/suffix",
                "/uploads/orders/temp/short.jpg"):
        with pytest.raises(ValueError):
            resolve_staged_image_path(bad, tmp_path / "uploads")


def test_staged_path_rejects_symlinks(tmp_path):
    temp = tmp_path / "uploads/orders/temp"
    temp.mkdir(parents=True)
    target = tmp_path / "secret.jpg"
    target.write_bytes(b"secret")
    link = temp / ("B" * 22 + ".jpg")
    link.symlink_to(target)
    with pytest.raises(ValueError):
        resolve_staged_image_path("/uploads/orders/temp/" + link.name, tmp_path / "uploads")


def test_forwarded_header_not_trusted_when_asgi_client_differs():
    request = Request({"type": "http", "method": "GET", "path": "/", "query_string": b"",
                       "headers": [(b"x-forwarded-for", b"203.0.113.99")],
                       "client": ("198.51.100.4", 12345), "server": ("localhost", 8000), "scheme": "http"})
    assert _get_client_ip(request) == "198.51.100.4"


def test_excel_export_escapes_formula_starters():
    sheet = Workbook().active
    for i, value in enumerate(("=HYPERLINK(1,2)", " +SUM(1,1)", "\t@SUM(1,2)", "-2+3"), start=1):
        cell = sheet.cell(row=i, column=1, value=_format_cell(value))
        assert cell.data_type == "s"
    assert _format_cell(100.0) == 100.0


def test_password_change_revokes_previous_tokens_and_invalid_subject():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        user = User(username="audit", password_hash="before", is_active=True)
        db.add(user)
        db.commit()
        token = create_access_token({"sub": str(user.id), "pwdv": password_token_version(user.password_hash)})
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        assert get_current_user(creds, db).id == user.id
        user.password_hash = "after"
        db.commit()
        with pytest.raises(HTTPException) as exc:
            get_current_user(creds, db)
        assert exc.value.status_code == 401
        legacy = HTTPAuthorizationCredentials(scheme="Bearer", credentials=create_access_token({"sub": str(user.id)}))
        with pytest.raises(HTTPException):
            get_current_user(legacy, db)
        malformed = HTTPAuthorizationCredentials(scheme="Bearer", credentials=create_access_token({"sub": "invalid", "pwdv": "x"}))
        with pytest.raises(HTTPException) as exc:
            get_current_user(malformed, db)
        assert exc.value.status_code == 401
    engine.dispose()


def test_historical_appointment_and_warranty_are_valid_for_edits():
    appointment = datetime(2025, 1, 2, 12, 0)
    req = OrderUpdateRequest(scheduled_at=appointment, warranty_until="2025-12-31", remark="回访")
    assert req.scheduled_at == appointment
    with pytest.raises(ValueError):
        OrderUpdateRequest(warranty_until="not-a-date")

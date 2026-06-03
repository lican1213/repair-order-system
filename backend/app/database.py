import logging
import os

from sqlalchemy import create_engine, event
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings


logger = logging.getLogger(__name__)

def _current_database_url() -> str:
    """实时解析数据库 URL。

    生产环境在导入前通过 .env / 环境变量确定；测试会在导入后按用例切换
    os.environ["DATABASE_URL"]，所以这里以环境变量为准，回落到 settings 默认值。
    """
    return os.environ.get("DATABASE_URL") or settings.DATABASE_URL


def _build_engine(url: str):
    is_sqlite = make_url(url).get_backend_name() == "sqlite"
    new_engine = create_engine(
        url,
        connect_args={"check_same_thread": False} if is_sqlite else {},
    )
    if is_sqlite:

        @event.listens_for(new_engine, "connect")
        def _set_sqlite_pragmas(dbapi_connection, _connection_record):
            cursor = dbapi_connection.cursor()
            try:
                cursor.execute("PRAGMA busy_timeout=5000")
                cursor.execute("PRAGMA journal_mode=WAL")
            finally:
                cursor.close()

    return new_engine


_bound_url = _current_database_url()
engine = _build_engine(_bound_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def _ensure_engine() -> None:
    """目标数据库 URL 变化时重建 engine，并原地改绑 SessionLocal。

    用 SessionLocal.configure(bind=...) 而非重新赋值，保证 main 等模块在导入时
    取得的 SessionLocal 引用始终指向当前 engine。生产环境 URL 不变，此处不会重建。
    """
    global engine, _bound_url
    desired = _current_database_url()
    if desired == _bound_url:
        return
    engine.dispose()
    engine = _build_engine(desired)
    SessionLocal.configure(bind=engine)
    _bound_url = desired


def get_db():
    _ensure_engine()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """创建所有表。需要先 import models 确保 Base 能发现模型。"""
    _ensure_engine()
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    ensure_order_compat_columns()
    ensure_user_compat_columns()


def ensure_order_compat_columns():
    """确保 orders 表有新增兼容列，并补齐历史数据默认值。"""
    import sqlite3
    from app.config import BASE_DIR

    db_path = _current_database_url().replace("sqlite:///", "")
    if not db_path.startswith("/"):
        db_path = str(BASE_DIR / db_path)

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(orders)")
        columns = {row[1] for row in cursor.fetchall()}

        if "service_type" not in columns:
            cursor.execute("ALTER TABLE orders ADD COLUMN service_type TEXT DEFAULT '维修'")
        if "latitude" not in columns:
            cursor.execute("ALTER TABLE orders ADD COLUMN latitude REAL")
        if "longitude" not in columns:
            cursor.execute("ALTER TABLE orders ADD COLUMN longitude REAL")
        if "location_address" not in columns:
            cursor.execute("ALTER TABLE orders ADD COLUMN location_address TEXT")
        if "assigned_user_id" not in columns:
            cursor.execute("ALTER TABLE orders ADD COLUMN assigned_user_id INTEGER")

        cursor.execute(
            "UPDATE orders SET service_type = '维修' "
            "WHERE service_type IS NULL OR TRIM(service_type) = ''"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS ix_orders_service_type ON orders(service_type)"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS ix_orders_assigned_user_id ON orders(assigned_user_id)"
        )

        conn.commit()
        conn.close()
    except Exception as exc:
        logger.warning("Failed to ensure orders compatibility columns: %s", exc)


def ensure_user_compat_columns():
    """确保 users 表有新增兼容列（password_changed_at）。"""
    import sqlite3
    from app.config import BASE_DIR

    db_path = _current_database_url().replace("sqlite:///", "")
    if not db_path.startswith("/"):
        db_path = str(BASE_DIR / db_path)

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(users)")
        columns = {row[1] for row in cursor.fetchall()}

        if "password_changed_at" not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN password_changed_at DATETIME")

        conn.commit()
        conn.close()
    except Exception as exc:
        logger.warning("Failed to ensure users compatibility columns: %s", exc)

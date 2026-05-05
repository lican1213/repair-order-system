import logging

from sqlalchemy import create_engine, event
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings


logger = logging.getLogger(__name__)

_database_url = make_url(settings.DATABASE_URL)
_is_sqlite = _database_url.get_backend_name() == "sqlite"

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)


if _is_sqlite:

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA busy_timeout=5000")
            cursor.execute("PRAGMA journal_mode=WAL")
        finally:
            cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """创建所有表。需要先 import models 确保 Base 能发现模型。"""
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    ensure_order_compat_columns()


def ensure_order_compat_columns():
    """确保 orders 表有新增兼容列，并补齐历史数据默认值。"""
    import sqlite3
    from app.config import settings, BASE_DIR

    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
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

        cursor.execute(
            "UPDATE orders SET service_type = '维修' "
            "WHERE service_type IS NULL OR TRIM(service_type) = ''"
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS ix_orders_service_type ON orders(service_type)"
        )

        conn.commit()
        conn.close()
    except Exception as exc:
        logger.warning("Failed to ensure orders compatibility columns: %s", exc)

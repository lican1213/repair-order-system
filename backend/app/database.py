from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
)

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
    ensure_order_location_columns()


def ensure_order_location_columns():
    """确保 orders 表有 latitude/longitude/location_address 列。"""
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

        if "latitude" not in columns:
            cursor.execute("ALTER TABLE orders ADD COLUMN latitude REAL")
        if "longitude" not in columns:
            cursor.execute("ALTER TABLE orders ADD COLUMN longitude REAL")
        if "location_address" not in columns:
            cursor.execute("ALTER TABLE orders ADD COLUMN location_address TEXT")

        conn.commit()
        conn.close()
    except Exception:
        pass

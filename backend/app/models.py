from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_no = Column(String(20), unique=True, nullable=False, index=True)

    # 客户信息
    customer_name = Column(String(50), nullable=False)
    phone = Column(String(20), nullable=False, index=True)
    community = Column(String(100), nullable=False)
    address = Column(String(200), nullable=False)

    # 家电信息
    appliance_type = Column(String(50), nullable=False)
    brand_model = Column(String(100))
    fault_description = Column(Text, nullable=False)

    # 预约信息
    preferred_time = Column(String(100))
    scheduled_at = Column(DateTime, index=True)
    is_urgent = Column(Boolean, default=False)

    # 客户上传图片（JSON 数组字符串）
    image_paths = Column(Text)

    # 状态
    status = Column(String(20), default="新报修", nullable=False, index=True)
    followup_status = Column(String(20), default="未回访", nullable=False, index=True)

    # 维修记录
    repair_result = Column(Text)
    parts_used = Column(Text)
    final_fee = Column(Float)
    remark = Column(Text)
    repair_images = Column(Text)  # JSON 数组字符串

    # 保修
    warranty_until = Column(String(20))
    warranty_token = Column(String(50), unique=True, index=True)
    warranty_note = Column(Text)

    # 来源
    source = Column(String(50), default="扫码报修")

    # 定位
    latitude = Column(Float)
    longitude = Column(Float)
    location_address = Column(Text)

    # 时间戳
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=_utcnow, nullable=False)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow, nullable=False)

    # 关系
    repair_logs = relationship("RepairLog", back_populates="order", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Order {self.order_no}>"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), default="admin")
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime)
    created_at = Column(DateTime, default=_utcnow, nullable=False)

    def __repr__(self):
        return f"<User {self.username}>"


class RepairLog(Base):
    __tablename__ = "repair_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    old_status = Column(String(20))
    new_status = Column(String(20), nullable=False)
    note = Column(Text)
    created_at = Column(DateTime, default=_utcnow, nullable=False)

    # 关系
    order = relationship("Order", back_populates="repair_logs")

    def __repr__(self):
        return f"<RepairLog order_id={self.order_id} {self.old_status}->{self.new_status}>"

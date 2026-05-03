import secrets
from datetime import datetime

from sqlalchemy.orm import Session

from app.models import Order


def generate_order_no(session: Session) -> str:
    """
    生成工单编号：WX + YYYYMMDD + 三位当日序号。
    例如：WX20260503001
    """
    today = datetime.now().strftime("%Y%m%d")
    prefix = f"WX{today}"

    # 查询当天最大序号
    last_order = (
        session.query(Order)
        .filter(Order.order_no.like(f"{prefix}%"))
        .order_by(Order.order_no.desc())
        .first()
    )

    if last_order:
        last_seq = int(last_order.order_no[-3:])
        seq = last_seq + 1
    else:
        seq = 1

    return f"{prefix}{seq:03d}"


def generate_warranty_token() -> str:
    """
    生成保修查询 token。
    使用 secrets.token_urlsafe(16)，不可猜测。
    """
    return secrets.token_urlsafe(16)

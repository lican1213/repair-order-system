"""订单查询筛选逻辑复用。"""

from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Query

from app.constants import FOLLOWUP_STATUSES, ORDER_STATUSES
from app.models import Order


def apply_order_filters(
    query: Query,
    status_filter: str | None = None,
    followup_status: str | None = None,
    created_date: str | None = None,
    scheduled_date: str | None = None,
    keyword: str | None = None,
) -> Query:
    """对订单查询应用筛选条件，返回新的 Query。"""
    from sqlalchemy import func

    if status_filter:
        if status_filter not in ORDER_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"无效的订单状态: {status_filter}",
            )
        query = query.filter(Order.status == status_filter)

    if followup_status:
        if followup_status not in FOLLOWUP_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"无效的回访状态: {followup_status}",
            )
        query = query.filter(Order.followup_status == followup_status)

    if created_date:
        try:
            d = date.fromisoformat(created_date)
            query = query.filter(func.date(Order.created_at) == d)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="日期格式错误，请使用 YYYY-MM-DD",
            )

    if scheduled_date:
        try:
            d = date.fromisoformat(scheduled_date)
            query = query.filter(func.date(Order.scheduled_at) == d)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="日期格式错误，请使用 YYYY-MM-DD",
            )

    if keyword:
        like = f"%{keyword}%"
        query = query.filter(
            or_(
                Order.order_no.like(like),
                Order.customer_name.like(like),
                Order.phone.like(like),
                Order.community.like(like),
                Order.address.like(like),
                Order.appliance_type.like(like),
            )
        )

    return query

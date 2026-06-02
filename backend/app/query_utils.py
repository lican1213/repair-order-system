"""订单查询筛选逻辑复用。"""

from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Query

from app.constants import FOLLOWUP_STATUSES, ORDER_STATUSES, SERVICE_TYPES
from app.models import Order


def apply_order_filters(
    query: Query,
    status_filter: str | None = None,
    followup_status: str | None = None,
    service_type: str | None = None,
    assignee: str | None = None,
    current_user_id: int | None = None,
    created_date_start: str | None = None,
    created_date_end: str | None = None,
    scheduled_date_start: str | None = None,
    scheduled_date_end: str | None = None,
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

    if service_type:
        if service_type not in SERVICE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"无效的服务类型: {service_type}",
        )
        query = query.filter(Order.service_type == service_type)

    if assignee and assignee != "all":
        if assignee == "unassigned":
            query = query.filter(Order.assigned_user_id.is_(None))
        elif assignee == "mine":
            if current_user_id is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="无法识别当前用户",
                )
            query = query.filter(Order.assigned_user_id == current_user_id)
        else:
            try:
                assignee_id = int(assignee)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"无效的负责人筛选: {assignee}",
                )
            if assignee_id <= 0:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"无效的负责人筛选: {assignee}",
                )
            query = query.filter(Order.assigned_user_id == assignee_id)

    if created_date_start or created_date_end:
        try:
            if created_date_start:
                d_start = date.fromisoformat(created_date_start)
                query = query.filter(func.date(Order.created_at) >= d_start)
            if created_date_end:
                d_end = date.fromisoformat(created_date_end)
                query = query.filter(func.date(Order.created_at) <= d_end)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="日期格式错误，请使用 YYYY-MM-DD",
            )

    if scheduled_date_start or scheduled_date_end:
        try:
            if scheduled_date_start:
                d_start = date.fromisoformat(scheduled_date_start)
                query = query.filter(func.date(Order.scheduled_at) >= d_start)
            if scheduled_date_end:
                d_end = date.fromisoformat(scheduled_date_end)
                query = query.filter(func.date(Order.scheduled_at) <= d_end)
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

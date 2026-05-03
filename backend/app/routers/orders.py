from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.constants import FOLLOWUP_STATUSES, ORDER_STATUSES
from app.database import get_db
from app.models import Order, RepairLog, User
from app.json_utils import normalize_json_array_text
from app.schemas import (
    DashboardSummaryResponse,
    OrderListResponse,
    OrderResponse,
    OrderUpdateRequest,
)
from app.query_utils import apply_order_filters
from app.utils import generate_warranty_token

router = APIRouter()


# --- GET /api/orders/dashboard/summary ---
# 必须在 /{id} 之前声明

@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """后台首页统计。"""
    today = date.today()
    today_start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc)
    month_start = datetime(today.year, today.month, 1, tzinfo=timezone.utc)

    # 今日预约
    today_count = (
        db.query(func.count(Order.id))
        .filter(func.date(Order.scheduled_at) == today)
        .scalar()
    )

    # 新报修
    new_count = (
        db.query(func.count(Order.id))
        .filter(Order.status == "新报修")
        .scalar()
    )

    # 待回访
    followup_count = (
        db.query(func.count(Order.id))
        .filter(Order.status == "已完成", Order.followup_status == "未回访")
        .scalar()
    )

    # 本月已完成
    month_completed_count = (
        db.query(func.count(Order.id))
        .filter(Order.status == "已完成", Order.completed_at >= month_start)
        .scalar()
    )

    # 本月收入
    month_income = (
        db.query(func.coalesce(func.sum(Order.final_fee), 0))
        .filter(Order.status == "已完成", Order.completed_at >= month_start)
        .scalar()
    )

    # 最近 5 条订单
    recent = (
        db.query(Order)
        .order_by(Order.created_at.desc())
        .limit(5)
        .all()
    )

    return DashboardSummaryResponse(
        today_count=today_count,
        new_count=new_count,
        followup_count=followup_count,
        month_completed_count=month_completed_count,
        month_income=float(month_income),
        recent_orders=[OrderResponse.model_validate(o) for o in recent],
    )


# --- GET /api/orders/today ---

@router.get("/today", response_model=list[OrderResponse])
def get_today_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """今日预约。只查 scheduled_at 为今天的订单。"""
    today = date.today()
    orders = (
        db.query(Order)
        .filter(func.date(Order.scheduled_at) == today)
        .order_by(Order.scheduled_at.asc())
        .all()
    )
    return [OrderResponse.model_validate(o) for o in orders]


# --- GET /api/orders/followups ---

@router.get("/followups", response_model=list[OrderResponse])
def get_followup_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """待回访。已完成且未回访的订单。"""
    orders = (
        db.query(Order)
        .filter(Order.status == "已完成", Order.followup_status == "未回访")
        .order_by(Order.completed_at.asc())
        .all()
    )
    return [OrderResponse.model_validate(o) for o in orders]


# --- GET /api/orders/{id} ---

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """订单详情。"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="订单不存在",
        )
    return OrderResponse.model_validate(order)


# --- PATCH /api/orders/{id} ---

@router.patch("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: int,
    req: OrderUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新订单。"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="订单不存在",
        )

    # 校验状态值
    if req.status is not None and req.status not in ORDER_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"无效的订单状态: {req.status}",
        )
    if req.followup_status is not None and req.followup_status not in FOLLOWUP_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"无效的回访状态: {req.followup_status}",
        )

    # 记录旧状态
    old_status = order.status

    # warranty_until 不能早于 completed_at
    if req.warranty_until:
        completed_date = None
        if req.completed_at:
            completed_date = req.completed_at.date()
        elif order.completed_at:
            completed_date = order.completed_at.date()
        if completed_date:
            try:
                wdate = date.fromisoformat(req.warranty_until)
                if wdate < completed_date:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="保修截止日期不能早于维修完成日期",
                    )
            except ValueError:
                pass

    # 更新字段
    update_data = req.model_dump(exclude_unset=True)
    if "repair_images" in update_data:
        update_data["repair_images"] = normalize_json_array_text(update_data["repair_images"])
    for field, value in update_data.items():
        setattr(order, field, value)

    # 自动逻辑
    new_status = order.status

    # 状态变更时写 repair_logs
    if req.status is not None and old_status != new_status:
        log = RepairLog(
            order_id=order.id,
            old_status=old_status,
            new_status=new_status,
            note=req.remark or f"状态变更: {old_status} → {new_status}",
        )
        db.add(log)

    # 状态改为已完成且 completed_at 为空时自动填充
    if new_status == "已完成" and order.completed_at is None:
        order.completed_at = datetime.now(timezone.utc)

    # 保修 token 只在订单已完成且设置保修截止日期时生成
    if order.status == "已完成" and order.warranty_until and not order.warranty_token:
        order.warranty_token = generate_warranty_token()

    # 更新 updated_at
    order.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(order)

    return OrderResponse.model_validate(order)


# --- GET /api/orders ---
# 必须在 /{id} 之后声明（FastAPI 按声明顺序匹配）

@router.get("", response_model=OrderListResponse)
def list_orders(
    status_filter: str | None = Query(None, alias="status"),
    followup_status: str | None = None,
    created_date: str | None = None,
    scheduled_date: str | None = None,
    keyword: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """订单列表。支持筛选和分页。"""
    query = db.query(Order)
    query = apply_order_filters(query, status_filter, followup_status, created_date, scheduled_date, keyword)

    # 总数
    total = query.count()

    # 分页
    items = (
        query
        .order_by(Order.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return OrderListResponse(
        items=[OrderResponse.model_validate(o) for o in items],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )

from datetime import date

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import Session
from fastapi import Depends

from app.config import settings
from app.database import get_db
from app.models import Order
from app.schemas import WarrantyResponse

router = APIRouter()


@router.get("/{token}", response_model=WarrantyResponse)
def query_warranty(token: str, db: Session = Depends(get_db)):
    """保修查询（无需登录）。只返回公开字段。"""
    order = db.query(Order).filter(Order.warranty_token == token).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到对应保修记录，请联系师傅确认",
        )

    # 只有已完成订单才能查看保修凭证
    if order.status != "已完成":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到对应保修记录，请联系师傅确认",
        )

    # 计算保修状态
    if not order.warranty_until:
        warranty_status = "未设置保修"
    else:
        try:
            warranty_end = date.fromisoformat(order.warranty_until)
            if date.today() <= warranty_end:
                warranty_status = "在保"
            else:
                warranty_status = "已过保"
        except ValueError:
            warranty_status = "未设置保修"

    return WarrantyResponse(
        order_no=order.order_no,
        appliance_type=order.appliance_type,
        brand_model=order.brand_model,
        repair_result=order.repair_result,
        parts_used=order.parts_used,
        completed_at=order.completed_at.isoformat() if order.completed_at else None,
        warranty_until=order.warranty_until,
        warranty_status=warranty_status,
        warranty_note=order.warranty_note,
        shop_name=settings.SHOP_NAME,
        shop_phone=settings.SHOP_PHONE,
    )

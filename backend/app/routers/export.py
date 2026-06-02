from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy.orm import Session, joinedload

from app.auth import require_admin
from app.database import get_db
from app.models import Order, User
from app.query_utils import apply_order_filters
import io

router = APIRouter()

# Excel 列定义
COLUMNS = [
    ("工单编号", "order_no"),
    ("客户姓名", "customer_name"),
    ("手机", "phone"),
    ("小区", "community"),
    ("地址", "address"),
    ("服务类型", "service_type"),
    ("负责人", "assigned_username"),
    ("家电类型", "appliance_type"),
    ("品牌型号", "brand_model"),
    ("故障描述", "fault_description"),
    ("状态", "status"),
    ("回访状态", "followup_status"),
    ("希望上门时间", "preferred_time"),
    ("实际上门时间", "scheduled_at"),
    ("维修结果", "repair_result"),
    ("更换配件", "parts_used"),
    ("收费金额", "final_fee"),
    ("保修截止", "warranty_until"),
    ("保修说明", "warranty_note"),
    ("订单来源", "source"),
    ("创建时间", "created_at"),
    ("完成时间", "completed_at"),
    ("备注", "remark"),
]


def _format_cell(value):
    """格式化单元格值。"""
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    return value


@router.get("/orders")
def export_orders(
    status_filter: str | None = Query(None, alias="status"),
    followup_status: str | None = None,
    service_type: str | None = None,
    assignee: str | None = None,
    created_date_start: str | None = None,
    created_date_end: str | None = None,
    scheduled_date_start: str | None = None,
    scheduled_date_end: str | None = None,
    keyword: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """导出订单 Excel（需 JWT）。"""
    query = db.query(Order).options(joinedload(Order.assigned_user))
    query = apply_order_filters(
        query=query,
        status_filter=status_filter,
        followup_status=followup_status,
        service_type=service_type,
        assignee=assignee,
        current_user_id=current_user.id,
        created_date_start=created_date_start,
        created_date_end=created_date_end,
        scheduled_date_start=scheduled_date_start,
        scheduled_date_end=scheduled_date_end,
        keyword=keyword,
    )
    orders = query.order_by(Order.created_at.desc()).all()

    # 创建 Excel
    wb = Workbook()
    ws = wb.active
    ws.title = "订单列表"

    # 写表头
    headers = [col[0] for col in COLUMNS]
    ws.append(headers)

    # 写数据行
    for order in orders:
        row = []
        for _, attr in COLUMNS:
            value = getattr(order, attr, None)
            if attr == "service_type" and not value:
                value = "维修"
            row.append(_format_cell(value))
        ws.append(row)

    # 生成文件名
    filename = f"orders_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    # 保存到内存
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

import json
import secrets
import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings, BASE_DIR
from app.database import get_db
from fastapi import Depends

from app.constants import APPLIANCE_TYPES
from app.models import Order
from app.schemas import (
    PublicUploadResponse,
    RepairSubmitRequest,
    RepairSubmitResponse,
    ShopInfoResponse,
)
from app.utils import generate_order_no

router = APIRouter()

# 允许的文件类型
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024  # 5MB
MAX_FILES = settings.PUBLIC_UPLOAD_MAX_FILES  # 5


@router.get("/shop-info", response_model=ShopInfoResponse)
def get_shop_info():
    """公开店铺信息。只返回非敏感展示字段。"""
    return ShopInfoResponse(
        shop_name=settings.SHOP_NAME,
        shop_phone=settings.SHOP_PHONE,
    )


@router.post("/upload", response_model=PublicUploadResponse)
async def upload_images(files: list[UploadFile]):
    """客户上传故障照片（无需登录）。"""
    if len(files) > MAX_FILES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"最多上传 {MAX_FILES} 张图片",
        )

    temp_dir = BASE_DIR / "uploads" / "orders" / "temp"
    temp_dir.mkdir(parents=True, exist_ok=True)

    saved_paths = []
    for file in files:
        # 校验 MIME 类型
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"不支持的文件类型: {file.content_type}，仅支持 jpg/jpeg/png/webp",
            )

        # 校验扩展名
        ext = Path(file.filename or "").suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"不支持的文件扩展名: {ext}",
            )

        # 读取文件内容并校验大小
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"文件过大，单张最大 {settings.MAX_UPLOAD_SIZE_MB}MB",
            )

        # 生成随机文件名
        random_name = secrets.token_urlsafe(16) + ext
        file_path = temp_dir / random_name

        # 写入文件
        with open(file_path, "wb") as f:
            f.write(content)

        saved_paths.append(f"/uploads/orders/temp/{random_name}")

    return PublicUploadResponse(paths=saved_paths)


@router.post("/submit", response_model=RepairSubmitResponse)
def submit_repair(req: RepairSubmitRequest, db: Session = Depends(get_db)):
    """客户提交报修（无需登录）。"""
    # 校验家电类型
    if req.appliance_type not in APPLIANCE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"不支持的家电类型: {req.appliance_type}",
        )

    # 校验 image_paths 只能是 temp 目录下的路径
    validated_images = []
    if req.image_paths:
        for path in req.image_paths:
            if not path.startswith("/uploads/orders/temp/"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"无效的图片路径: {path}",
                )
            # 检查文件是否存在
            file_path = BASE_DIR / path.lstrip("/")
            if not file_path.is_file():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"图片文件不存在: {path}",
                )
            validated_images.append(path)

    # 生成工单编号
    order_no = generate_order_no(db)

    # 移动图片从 temp 到正式目录
    final_image_paths = []
    for temp_path in validated_images:
        temp_file = BASE_DIR / temp_path.lstrip("/")
        filename = temp_file.name
        final_file = BASE_DIR / "uploads" / "orders" / filename

        # 防止文件名冲突
        if final_file.exists():
            filename = secrets.token_urlsafe(16) + temp_file.suffix
            final_file = BASE_DIR / "uploads" / "orders" / filename

        shutil.move(str(temp_file), str(final_file))
        final_image_paths.append(f"/uploads/orders/{filename}")

    # 创建订单
    order = Order(
        order_no=order_no,
        customer_name=req.customer_name,
        phone=req.phone,
        community=req.community,
        address=req.address,
        appliance_type=req.appliance_type,
        brand_model=req.brand_model,
        fault_description=req.fault_description,
        preferred_time=req.preferred_time,
        is_urgent=req.is_urgent,
        image_paths=json.dumps(final_image_paths, ensure_ascii=False) if final_image_paths else None,
        status="新报修",
        followup_status="未回访",
        source="扫码报修",
        latitude=req.latitude,
        longitude=req.longitude,
        location_address=req.location_address,
    )

    db.add(order)
    db.commit()

    return RepairSubmitResponse(
        order_no=order_no,
        message="报修已提交，师傅会尽快联系您",
        shop_phone=settings.SHOP_PHONE,
    )

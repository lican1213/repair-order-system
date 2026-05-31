import json
import secrets
import shutil
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings, BASE_DIR
from app.constants import APPLIANCE_TYPES
from app.database import get_db
from app.models import Order
from app.notification import build_order_created_payload, send_order_created_webhook, send_order_created_bot_notification
from app.rate_limit import limiter
from app.schemas import (
    PublicUploadResponse,
    RepairSubmitRequest,
    RepairSubmitResponse,
    ReverseGeocodeRequest,
    ReverseGeocodeResponse,
    ShopInfoResponse,
)
from app.utils import generate_order_no

router = APIRouter()

# 允许的文件类型
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024  # 5MB
MAX_FILES = settings.PUBLIC_UPLOAD_MAX_FILES  # 5

# 限频常量
UPLOAD_IP_LIMIT = 10        # 次
UPLOAD_IP_WINDOW = 60       # 秒 (1 分钟)
SUBMIT_IP_LIMIT = 5         # 次
SUBMIT_IP_WINDOW = 60       # 秒 (1 分钟)
SUBMIT_PHONE_LIMIT = 3      # 次
SUBMIT_PHONE_WINDOW = 600   # 秒 (10 分钟)


def _get_client_ip(request: Request) -> str:
    """Extract client IP, preferring X-Forwarded-For (reverse proxy)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.get("/shop-info", response_model=ShopInfoResponse)
def get_shop_info():
    """公开店铺信息。只返回非敏感展示字段。"""
    return ShopInfoResponse(
        shop_name=settings.SHOP_NAME,
        shop_phone=settings.SHOP_PHONE,
    )


@router.post("/reverse-geocode", response_model=ReverseGeocodeResponse)
def reverse_geocode(req: ReverseGeocodeRequest):
    """经纬度逆地理编码（调用高德 Web服务 API）。"""
    if not settings.AMAP_REGEOCODE_ENABLED or not settings.AMAP_WEB_SERVICE_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="地址识别服务未启用",
        )

    # 高德 location 顺序: longitude,latitude
    location = f"{req.longitude},{req.latitude}"
    params = urllib.parse.urlencode({
        "key": settings.AMAP_WEB_SERVICE_KEY,
        "location": location,
        "output": "json",
        "extensions": "base",
        "radius": "1000",
    })
    url = f"https://restapi.amap.com/v3/geocode/regeo?{params}"

    try:
        with urllib.request.urlopen(url, timeout=3) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, OSError, json.JSONDecodeError) as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"地址识别服务请求失败: {e}",
        )

    if data.get("status") != "1":
        info = data.get("info", "unknown error")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"地址识别服务返回错误: {info}",
        )

    regeocode = data.get("regeocode", {})
    address_component = regeocode.get("addressComponent", {})

    # 提取 POI（最近的兴趣点）
    pois = regeocode.get("pois", [])
    poi_name = pois[0].get("name") if pois else None

    return ReverseGeocodeResponse(
        formatted_address=regeocode.get("formatted_address"),
        province=address_component.get("province"),
        city=address_component.get("city"),
        district=address_component.get("district"),
        township=address_component.get("township"),
        poi_name=poi_name,
    )


@router.post("/upload", response_model=PublicUploadResponse)
async def upload_images(files: list[UploadFile], request: Request):
    """客户上传故障照片（无需登录）。"""
    # Rate limit: 10 uploads per IP per minute
    client_ip = _get_client_ip(request)
    if not limiter.check(f"upload:ip:{client_ip}", UPLOAD_IP_LIMIT, UPLOAD_IP_WINDOW):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="请求过于频繁，请稍后再试",
        )

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
def submit_repair(
    req: RepairSubmitRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """客户提交报修（无需登录）。"""
    # Rate limit: 5 per IP per minute + 3 per phone per 10 minutes
    client_ip = _get_client_ip(request)
    if not limiter.check(f"submit:ip:{client_ip}", SUBMIT_IP_LIMIT, SUBMIT_IP_WINDOW):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="请求过于频繁，请稍后再试",
        )
    if not limiter.check(f"submit:phone:{req.phone}", SUBMIT_PHONE_LIMIT, SUBMIT_PHONE_WINDOW):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="请求过于频繁，请稍后再试",
        )

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
        service_type=req.service_type,
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
    db.refresh(order)

    background_tasks.add_task(
        send_order_created_webhook,
        build_order_created_payload(order),
    )
    background_tasks.add_task(
        send_order_created_bot_notification,
        order_no,
    )

    return RepairSubmitResponse(
        order_no=order_no,
        message="报修已提交，师傅会尽快联系您",
        shop_phone=settings.SHOP_PHONE,
    )

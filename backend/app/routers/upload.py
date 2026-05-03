import secrets
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings, BASE_DIR
from app.database import get_db
from app.models import User
from app.schemas import PublicUploadResponse

router = APIRouter()

# 允许的文件类型
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024  # 5MB
MAX_FILES = settings.PUBLIC_UPLOAD_MAX_FILES  # 5


@router.post("", response_model=PublicUploadResponse)
async def upload_repair_images(
    files: list[UploadFile],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """后台上传维修照片（需 JWT）。"""
    if len(files) > MAX_FILES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"最多上传 {MAX_FILES} 张图片",
        )

    orders_dir = BASE_DIR / "uploads" / "orders"
    orders_dir.mkdir(parents=True, exist_ok=True)

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
        file_path = orders_dir / random_name

        # 写入文件
        with open(file_path, "wb") as f:
            f.write(content)

        saved_paths.append(f"/uploads/orders/{random_name}")

    return PublicUploadResponse(paths=saved_paths)

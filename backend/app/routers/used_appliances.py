import json
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings, BASE_DIR
from app.constants import USED_APPLIANCE_STATUSES
from app.database import get_db
from app.models import UsedAppliance, User
from app.schemas import (
    UsedApplianceCreate,
    UsedApplianceListResponse,
    UsedApplianceResponse,
    UsedApplianceUpdate,
)

router = APIRouter()


def _to_response(item: UsedAppliance) -> UsedApplianceResponse:
    return UsedApplianceResponse.model_validate(item)


def _dump_image_paths(paths: list[str] | None) -> str | None:
    if paths is None:
        return None
    return json.dumps(paths, ensure_ascii=False)


@router.get("/used-appliances", response_model=UsedApplianceListResponse)
def list_public_used_appliances(
    category: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """公开二手家电列表。只展示在售商品。"""
    query = db.query(UsedAppliance).filter(UsedAppliance.status == "在售")
    if category:
        query = query.filter(UsedAppliance.category == category)

    total = query.count()
    items = (
        query.order_by(UsedAppliance.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return UsedApplianceListResponse(
        items=[_to_response(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/used-appliances/{item_id}", response_model=UsedApplianceResponse)
def get_public_used_appliance(item_id: int, db: Session = Depends(get_db)):
    """公开二手家电详情。已售/下架不公开。"""
    item = (
        db.query(UsedAppliance)
        .filter(UsedAppliance.id == item_id, UsedAppliance.status == "在售")
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="二手家电不存在或已下架",
        )
    return _to_response(item)


@router.get("/admin/used-appliances", response_model=UsedApplianceListResponse)
def list_admin_used_appliances(
    status_filter: str | None = Query(None, alias="status"),
    category: str | None = None,
    keyword: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """后台二手家电列表。admin 可查看全部状态。"""
    if status_filter and status_filter not in USED_APPLIANCE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"无效的二手家电状态: {status_filter}",
        )

    query = db.query(UsedAppliance)
    if status_filter:
        query = query.filter(UsedAppliance.status == status_filter)
    if category:
        query = query.filter(UsedAppliance.category == category)
    if keyword:
        like = f"%{keyword}%"
        query = query.filter(
            or_(
                UsedAppliance.title.like(like),
                UsedAppliance.brand_model.like(like),
                UsedAppliance.condition_note.like(like),
            )
        )

    total = query.count()
    items = (
        query.order_by(UsedAppliance.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return UsedApplianceListResponse(
        items=[_to_response(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.post("/admin/used-appliances", response_model=UsedApplianceResponse)
def create_used_appliance(
    req: UsedApplianceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """后台新增二手家电。"""
    item = UsedAppliance(
        title=req.title.strip(),
        category=req.category.strip(),
        brand_model=req.brand_model.strip() if req.brand_model else None,
        price=req.price.strip() if req.price else None,
        condition_note=req.condition_note.strip() if req.condition_note else None,
        description=req.description.strip() if req.description else None,
        image_paths=_dump_image_paths(req.image_paths),
        status=req.status,
        contact_phone=req.contact_phone.strip() if req.contact_phone else None,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_response(item)


@router.get("/admin/used-appliances/{item_id}", response_model=UsedApplianceResponse)
def get_admin_used_appliance(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """后台查看二手家电详情。"""
    item = db.query(UsedAppliance).filter(UsedAppliance.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="二手家电不存在",
        )
    return _to_response(item)


@router.patch("/admin/used-appliances/{item_id}", response_model=UsedApplianceResponse)
def update_used_appliance(
    item_id: int,
    req: UsedApplianceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """后台编辑二手家电。下架通过 status=下架 实现。"""
    item = db.query(UsedAppliance).filter(UsedAppliance.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="二手家电不存在",
        )

    update_data = req.model_dump(exclude_unset=True)
    if "image_paths" in update_data:
        update_data["image_paths"] = _dump_image_paths(update_data["image_paths"])

    for field, value in update_data.items():
        if isinstance(value, str):
            value = value.strip() or None
        setattr(item, field, value)

    item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return _to_response(item)


def _resolve_uploads_dir() -> Path:
    uploads_dir = Path(settings.UPLOAD_DIR)
    if not uploads_dir.is_absolute():
        uploads_dir = BASE_DIR / uploads_dir
    return uploads_dir


def _delete_image_files(image_paths_json: str | None) -> int:
    """Delete image files from disk. Returns count of deleted files."""
    if not image_paths_json:
        return 0
    try:
        paths = json.loads(image_paths_json)
    except (json.JSONDecodeError, TypeError):
        return 0
    if not isinstance(paths, list):
        return 0

    uploads_dir = _resolve_uploads_dir()
    deleted = 0
    for p in paths:
        if not isinstance(p, str):
            continue
        # Convert URL path /uploads/used/xxx.jpg to filesystem path
        relative = p.lstrip("/")
        if not relative.startswith("uploads/"):
            continue
        file_path = uploads_dir.parent / relative
        try:
            if file_path.is_file():
                file_path.unlink()
                deleted += 1
        except OSError:
            pass
    return deleted


@router.delete("/admin/used-appliances/{item_id}")
def delete_used_appliance(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除已下架的二手家电（硬删除 + 清理图片文件）。仅限 status=下架。"""
    item = db.query(UsedAppliance).filter(UsedAppliance.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="二手家电不存在",
        )
    if item.status != "下架":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="只能删除已下架的商品",
        )

    deleted_files = _delete_image_files(item.image_paths)
    db.delete(item)
    db.commit()
    return {"message": "已删除", "deleted_files": deleted_files}

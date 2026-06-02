from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import hash_password, require_admin
from app.constants import MAX_USER_ACCOUNTS
from app.database import get_db
from app.models import Order, User
from app.schemas import (
    ResetUserPasswordRequest,
    UserCreateRequest,
    UserResponse,
    UserUpdateRequest,
)

router = APIRouter()

FINISHED_ORDER_STATUSES = ["已完成", "未成交"]


def _is_original_admin(user: User) -> bool:
    return user.role == "admin"


def _get_user_or_404(user_id: int, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="账号不存在",
        )
    return user


def _reject_original_admin(user: User) -> None:
    if _is_original_admin(user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="原始 admin 账号不能被修改、重置或删除",
        )


@router.get("/users", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin account list for the mobile account-management page."""
    unfinished_counts = dict(
        db.query(Order.assigned_user_id, func.count(Order.id))
        .filter(
            Order.assigned_user_id.isnot(None),
            Order.status.notin_(FINISHED_ORDER_STATUSES),
        )
        .group_by(Order.assigned_user_id)
        .all()
    )
    users = db.query(User).order_by(User.id.asc()).all()
    responses = []
    for user in users:
        item = UserResponse.model_validate(user)
        item.unfinished_assigned_count = int(unfinished_counts.get(user.id, 0))
        responses.append(item)
    return responses


@router.post("/users", response_model=UserResponse)
def create_user(
    req: UserCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a staff/viewer account. Public registration is intentionally absent."""
    exists = db.query(User).filter(User.username == req.username).first()
    if exists is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="用户名已存在",
        )

    total = db.query(User).count()
    if total >= MAX_USER_ACCOUNTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"账号总数最多 {MAX_USER_ACCOUNTS} 个",
        )

    user = User(
        username=req.username,
        password_hash=hash_password(req.password),
        role=req.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    req: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Enable/disable or change role for a non-original-admin account."""
    user = _get_user_or_404(user_id, db)
    _reject_original_admin(user)

    update_data = req.model_dump(exclude_unset=True)
    if update_data.get("role") is not None:
        user.role = update_data["role"]
    if update_data.get("is_active") is not None:
        user.is_active = update_data["is_active"]

    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.post("/users/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    req: ResetUserPasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Reset password for a non-original-admin account."""
    user = _get_user_or_404(user_id, db)
    _reject_original_admin(user)

    user.password_hash = hash_password(req.password)
    db.commit()
    return {"message": "密码已重置"}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete a non-original-admin account and free one slot under the 15-account cap."""
    user = _get_user_or_404(user_id, db)
    _reject_original_admin(user)

    db.query(Order).filter(Order.assigned_user_id == user.id).update(
        {Order.assigned_user_id: None},
        synchronize_session=False,
    )
    db.delete(user)
    db.commit()
    return {"message": "账号已删除"}

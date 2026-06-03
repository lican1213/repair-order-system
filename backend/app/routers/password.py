"""Change password endpoint for logged-in admin."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user, hash_password, verify_password
from app.database import get_db
from app.models import User
from app.schemas import ChangePasswordRequest

router = APIRouter()


@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change the current user's password.

    Returns 200 on success; frontend should clear token and redirect to login.
    """
    # Verify old password
    if not verify_password(req.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="旧密码错误",
        )

    # New password must differ from old
    if req.new_password == req.old_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="新密码不能与旧密码相同",
        )

    # Update password hash; bump password_changed_at to invalidate older tokens
    current_user.password_hash = hash_password(req.new_password)
    current_user.password_changed_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "密码修改成功，请重新登录"}

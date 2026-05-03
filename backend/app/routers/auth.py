from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import (
    check_login_allowed,
    clear_login_failures,
    create_access_token,
    get_current_user,
    hash_password,
    record_login_failure,
    verify_password,
)
from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, TokenResponse, UserResponse

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """管理员登录。"""
    # 检查是否被锁定
    check_login_allowed(req.username)

    # 查找用户
    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        record_login_failure(req.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )

    # 检查是否启用
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户已被禁用",
        )

    # 验证密码
    if not verify_password(req.password, user.password_hash):
        record_login_failure(req.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )

    # 登录成功
    clear_login_failures(req.username)

    # 更新最后登录时间
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    # 生成 token
    token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """获取当前用户信息。"""
    return current_user

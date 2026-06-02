from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.constants import USER_ROLES
from app.database import get_db
from app.models import User

# JWT 配置
ALGORITHM = "HS256"
security_scheme = HTTPBearer()

# 登录失败计数（内存）
_login_failures: dict[str, list[datetime]] = {}
MAX_FAILURES = 5
LOCKOUT_MINUTES = 5


def hash_password(password: str) -> str:
    """使用 bcrypt 哈希密码。"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain_password: str, password_hash: str) -> bool:
    """验证密码。"""
    return bcrypt.checkpw(plain_password.encode(), password_hash.encode())


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """生成 JWT。"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=settings.ACCESS_TOKEN_EXPIRE_DAYS)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """验证并解码 JWT。失败抛出 401。"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭据",
        )


def check_login_allowed(username: str) -> None:
    """检查登录是否被锁定。锁定则抛出 429。"""
    now = datetime.now(timezone.utc)
    if username in _login_failures:
        # 清理过期记录
        _login_failures[username] = [
            t for t in _login_failures[username]
            if now - t < timedelta(minutes=LOCKOUT_MINUTES)
        ]
        if len(_login_failures[username]) >= MAX_FAILURES:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"登录失败次数过多，请 {LOCKOUT_MINUTES} 分钟后再试",
            )


def record_login_failure(username: str) -> None:
    """记录一次登录失败。"""
    now = datetime.now(timezone.utc)
    if username not in _login_failures:
        _login_failures[username] = []
    _login_failures[username].append(now)


def clear_login_failures(username: str) -> None:
    """登录成功后清空失败计数。"""
    _login_failures.pop(username, None)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """从 JWT 获取当前用户。"""
    token = credentials.credentials
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭据",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户已被禁用",
        )
    return user


def _require_roles(current_user: User, allowed_roles: set[str]) -> User:
    if current_user.role not in USER_ROLES or current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权限执行该操作",
        )
    return current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require the original all-powerful admin-level role."""
    return _require_roles(current_user, {"admin"})


def require_staff_or_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require an account that can write order work records."""
    return _require_roles(current_user, {"admin", "staff"})

"""pytest 全局配置（backend/tests）。

两个目的：

1. 在导入应用之前，把 UPLOAD_DIR / DATABASE_URL 指向临时目录：
   - 避免测试污染真实的 backend/uploads 与 backend/data；
   - 让 UPLOAD_DIR 故意区别于默认的 BASE_DIR/uploads，从而真实校验
     "公开上传必须写入配置化、被实际挂载的目录"（回归 v1.5 修复）。

2. 每个用例前重置进程内共享的限流计数与登录失败计数，使整套测试可以在
   同一进程内连续运行。各测试类仍各自在 setUpClass 切换 DATABASE_URL，由
   database._ensure_engine 按需重建 engine，实现文件级数据库隔离。
"""
import atexit
import os
import shutil
import tempfile
from pathlib import Path

import pytest

_SESSION_TMP = Path(tempfile.mkdtemp(prefix="repair_test_session_"))

# 必须在任何 `from app...` 之前设置（conftest 在收集测试模块前被导入）
# 关闭 .env 加载，保证整套测试只用下面这些显式值，不读取部署机的真实配置
os.environ.setdefault("DISABLE_DOTENV", "1")
os.environ.setdefault("UPLOAD_DIR", str(_SESSION_TMP / "uploads"))
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_SESSION_TMP / 'session_default.db'}")
os.environ.setdefault("SECRET_KEY", "test-secret-key-conftest")
os.environ.setdefault("ORDER_WEBHOOK_ENABLED", "false")
os.environ.setdefault("WECOM_BOT_ENABLED", "false")


@atexit.register
def _cleanup_session_tmp() -> None:
    shutil.rmtree(_SESSION_TMP, ignore_errors=True)


@pytest.fixture(autouse=True)
def _reset_process_state():
    """清空进程内共享状态，避免整套测试在同一进程内连续运行时跨用例污染。"""
    from app.rate_limit import limiter

    limiter._records.clear()
    try:
        from app.auth import _login_failures

        _login_failures.clear()
    except Exception:
        pass
    yield

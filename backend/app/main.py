from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings, BASE_DIR
from app.database import SessionLocal, init_db

app = FastAPI(title="家电维修工单系统", version="1.0.0")


def _resolve_uploads_dir() -> Path:
    uploads_dir = Path(settings.UPLOAD_DIR)
    if not uploads_dir.is_absolute():
        uploads_dir = BASE_DIR / uploads_dir
    return uploads_dir


UPLOADS_DIR = _resolve_uploads_dir()
STATIC_DIR = BASE_DIR / "app" / "static"

# CORS - 开发环境仅允许 localhost:5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    """启动时：创建目录 + 初始化数据库表 + 创建管理员 + 启动机器人。"""
    dirs = [
        BASE_DIR / "data",
        UPLOADS_DIR / "orders" / "temp",
        UPLOADS_DIR / "used",
        UPLOADS_DIR / "warranty",
        STATIC_DIR,
    ]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)

    init_db()
    _ensure_admin()
    _start_bot()


def _ensure_admin():
    """如果 users 表为空，从 .env 创建管理员。"""
    import bcrypt
    from app.models import User

    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            password_hash = bcrypt.hashpw(
                settings.ADMIN_PASSWORD.encode(), bcrypt.gensalt()
            ).decode()
            admin = User(
                username=settings.ADMIN_USERNAME,
                password_hash=password_hash,
                role="admin",
                is_active=True,
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()


def _start_bot():
    """启动企业微信机器人（异步后台任务）。"""
    import asyncio
    from app.bot import startup_bot

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(startup_bot())
    except RuntimeError:
        import asyncio
        asyncio.run(startup_bot())


@app.on_event("shutdown")
def on_shutdown():
    """关闭时断开机器人连接。"""
    from app.bot import shutdown_bot

    shutdown_bot()


# --- API 路由 ---

@app.get("/api/health")
def health():
    return {"status": "ok"}


# 认证路由
from app.routers import auth, password
app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(password.router, prefix="/api/auth", tags=["认证"])

# 公开接口（无需登录）
from app.routers import public, warranty
app.include_router(public.router, prefix="/api/public", tags=["公开报修"])
app.include_router(warranty.router, prefix="/api/warranty", tags=["保修查询"])

# 后台订单管理（需 JWT）
from app.routers import orders
app.include_router(orders.router, prefix="/api/orders", tags=["订单管理"])

# 后台文件上传与导出（需 JWT）
from app.routers import upload, export
app.include_router(upload.router, prefix="/api/upload", tags=["文件上传"])
app.include_router(export.router, prefix="/api/export", tags=["导出"])

# 二手家电展示橱窗
from app.routers import used_appliances
app.include_router(used_appliances.router, prefix="/api", tags=["二手家电"])


# --- 静态文件 ---

# /uploads 静态文件服务
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOADS_DIR), check_dir=False),
    name="uploads",
)


# --- SPA Fallback ---

@app.middleware("http")
async def spa_fallback(request: Request, call_next):
    """
    SPA fallback: 非 /api/* 和非 /uploads/* 的请求返回 index.html。
    如果 index.html 不存在，返回清晰错误提示。
    """
    path = request.url.path

    # /api/* 和 /uploads/* 不走 fallback，交给后续路由处理
    if path.startswith("/api") or path.startswith("/uploads"):
        return await call_next(request)

    # 尝试查找静态文件
    file_path = STATIC_DIR / path.lstrip("/")
    if file_path.is_file():
        return FileResponse(str(file_path))

    # 返回 index.html (SPA fallback)
    index_path = STATIC_DIR / "index.html"
    if index_path.is_file():
        return FileResponse(str(index_path))

    # index.html 不存在，返回提示
    return JSONResponse(
        status_code=200,
        content={
            "message": "前端尚未构建。请先运行: cd frontend && npm run build",
            "hint": "开发环境请访问 http://localhost:5173",
        },
    )

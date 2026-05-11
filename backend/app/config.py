from pathlib import Path
from pydantic_settings import BaseSettings


# backend/ 目录的绝对路径
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # 安全
    SECRET_KEY: str = "please-change-this-to-a-long-random-secret"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 30

    # 店铺信息
    SHOP_NAME: str = "诚信家电维修"
    SHOP_PHONE: str = "13800138000"

    # 管理员账号
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "ChangeThisStrongPassword123!"

    # 数据库
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'data' / 'repair.db'}"

    # 上传
    UPLOAD_DIR: str = str(BASE_DIR / "uploads")
    MAX_UPLOAD_SIZE_MB: int = 5
    PUBLIC_UPLOAD_MAX_FILES: int = 5

    # 高德地图 Web服务 API（逆地理编码）
    AMAP_WEB_SERVICE_KEY: str | None = None
    AMAP_REGEOCODE_ENABLED: bool = False

    # 新订单 Webhook 通知（默认关闭）
    ORDER_WEBHOOK_ENABLED: bool = False
    ORDER_WEBHOOK_PROVIDER: str = "generic"
    ORDER_WECOM_INCLUDE_PRIVATE_FIELDS: bool = False
    ORDER_WEBHOOK_URL: str | None = None
    ORDER_WEBHOOK_TIMEOUT_SECONDS: int = 3
    APP_BASE_URL: str = ""

    model_config = {
        "env_file": str(BASE_DIR / ".env"),
        "env_file_encoding": "utf-8",
    }


settings = Settings()

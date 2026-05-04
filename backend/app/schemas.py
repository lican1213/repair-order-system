from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from app.constants import APPLIANCE_TYPES, FOLLOWUP_STATUSES, ORDER_STATUSES
from app.json_utils import normalize_json_array_text


# --- 认证 ---

class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    username: str
    role: str

    model_config = {"from_attributes": True}


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)
    confirm_password: str

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("新密码与确认密码不一致")
        return self


# --- 公开报修 ---

class RepairSubmitRequest(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=50)
    phone: str = Field(..., min_length=11, max_length=11)
    community: str = Field(..., min_length=1, max_length=100)
    address: str = Field(..., min_length=1, max_length=200)
    appliance_type: str = Field(..., description="家电类型")
    brand_model: Optional[str] = Field(None, max_length=100)
    fault_description: str = Field(..., min_length=1, max_length=2000)
    preferred_time: Optional[str] = Field(None, max_length=100)
    is_urgent: bool = False
    image_paths: list[str] = []
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_address: Optional[str] = Field(None, max_length=200)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("手机号必须为纯数字")
        if not v.startswith("1"):
            raise ValueError("手机号必须以1开头")
        if len(v) != 11:
            raise ValueError("请输入11位手机号")
        return v

    @model_validator(mode="after")
    def validate_dates_and_other(self):
        # preferred_time 日期不能早于今天，今天不能选已过去的时间段
        if self.preferred_time:
            date_part = self.preferred_time[:10]
            try:
                parsed = date.fromisoformat(date_part)
                today = date.today()
                if parsed < today:
                    raise ValueError("希望上门日期不能选择过去日期")
                if parsed == today:
                    now_hour = datetime.now().hour
                    slot = self.preferred_time[11:] if len(self.preferred_time) > 11 else ""
                    if "上午" in slot and now_hour >= 12:
                        raise ValueError("不能选择已经过去的时间段")
                    if "下午" in slot and now_hour >= 18:
                        raise ValueError("不能选择已经过去的时间段")
                    if "晚上" in slot and now_hour >= 21:
                        raise ValueError("不能选择已经过去的时间段")
                    if "都可以" in slot and now_hour >= 21:
                        raise ValueError("不能选择已经过去的时间段")
            except ValueError as e:
                if "希望上门" in str(e) or "已经过去" in str(e):
                    raise
                pass  # 非标准日期格式不强制报错

        # 家电类型"其他"时 brand_model 必填
        if self.appliance_type == "其他":
            if not self.brand_model or not self.brand_model.strip():
                raise ValueError("选择\"其他\"时，请填写具体家电类型或品牌型号")

        return self


class RepairSubmitResponse(BaseModel):
    order_no: str
    message: str
    shop_phone: str


class PublicUploadResponse(BaseModel):
    paths: list[str]


class ShopInfoResponse(BaseModel):
    shop_name: str
    shop_phone: str


class ReverseGeocodeRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class ReverseGeocodeResponse(BaseModel):
    formatted_address: str | None = None
    province: str | None = None
    city: str | None = None
    district: str | None = None
    township: str | None = None
    poi_name: str | None = None


# --- 保修查询 ---

class WarrantyResponse(BaseModel):
    order_no: str
    appliance_type: str
    brand_model: Optional[str]
    repair_result: Optional[str]
    parts_used: Optional[str]
    completed_at: Optional[str]
    warranty_until: Optional[str]
    warranty_status: str
    warranty_note: Optional[str]
    shop_name: str
    shop_phone: str


# --- 后台订单管理 ---

class OrderResponse(BaseModel):
    id: int
    order_no: str
    customer_name: str
    phone: str
    community: str
    address: str
    appliance_type: str
    brand_model: Optional[str]
    fault_description: str
    preferred_time: Optional[str]
    scheduled_at: Optional[datetime]
    is_urgent: bool
    image_paths: Optional[str]
    status: str
    followup_status: str
    repair_result: Optional[str]
    parts_used: Optional[str]
    final_fee: Optional[float]
    remark: Optional[str]
    repair_images: Optional[str]
    warranty_until: Optional[str]
    warranty_token: Optional[str]
    warranty_note: Optional[str]
    source: Optional[str]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_address: Optional[str] = None

    @field_validator("image_paths", "repair_images")
    @classmethod
    def normalize_image_json(cls, value: Optional[str]) -> Optional[str]:
        return normalize_json_array_text(value)

    model_config = {"from_attributes": True}


class OrderListResponse(BaseModel):
    items: list[OrderResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class OrderUpdateRequest(BaseModel):
    status: Optional[str] = Field(None, description="订单状态")
    followup_status: Optional[str] = Field(None, description="回访状态")
    scheduled_at: Optional[datetime] = Field(None, description="预约上门时间")
    repair_result: Optional[str] = Field(None, max_length=2000)
    parts_used: Optional[str] = Field(None, max_length=500)
    final_fee: Optional[float] = Field(None, ge=0)
    remark: Optional[str] = Field(None, max_length=2000)
    repair_images: Optional[str] = None
    warranty_until: Optional[str] = Field(None, max_length=20)
    warranty_note: Optional[str] = Field(None, max_length=500)
    completed_at: Optional[datetime] = None

    @model_validator(mode="after")
    def validate_dates(self):
        now = datetime.now()
        if self.scheduled_at and self.scheduled_at < now:
            raise ValueError("预约时间不能早于当前时间")
        if self.completed_at and self.completed_at < now:
            raise ValueError("完成时间不能早于当前时间")
        if self.warranty_until:
            try:
                wdate = date.fromisoformat(self.warranty_until)
                if wdate < date.today():
                    raise ValueError("保修截止日期不能选择过去日期")
            except ValueError as e:
                if "保修" in str(e):
                    raise
        return self


class DashboardSummaryResponse(BaseModel):
    today_count: int
    new_count: int
    followup_count: int
    month_completed_count: int
    month_income: float
    recent_orders: list[OrderResponse]

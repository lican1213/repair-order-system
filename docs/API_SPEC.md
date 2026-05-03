# API 规格文档

**Base URL:** `http://localhost:8000`

## 公开接口（无需登录）

### GET /api/health

健康检查。

**响应：**
```json
{"status": "ok"}
```

---

### POST /api/public/upload

客户上传故障照片。

**限制：**
- 文件类型：jpg/jpeg/png/webp
- 单张最大：5MB
- 单次最多：5 张
- 文件名后端随机生成

**请求：** `multipart/form-data`，字段 `file`

**响应：**
```json
{
  "path": "/uploads/orders/temp/abc123.webp"
}
```

**错误：**
- 413: 文件过大
- 415: 文件类型不支持

---

### POST /api/public/submit

客户提交报修。

**请求：**
```json
{
  "customer_name": "张三",
  "phone": "13800138000",
  "community": "阳光小区",
  "address": "3号楼2单元501",
  "appliance_type": "空调",
  "brand_model": "格力 KFR-35GW",
  "fault_description": "不制冷，外机异响",
  "preferred_time": "明天上午",
  "is_urgent": false,
  "image_paths": ["/uploads/orders/temp/abc123.webp"],
  "latitude": 39.9042,
  "longitude": 116.4074,
  "location_address": "北京市东城区"
}
```

**必填字段：** customer_name, phone, community, address, appliance_type, fault_description

**phone 校验：** 必须为 11 位纯数字，以 1 开头。不符合返回 422。

**可选字段：** latitude, longitude, location_address（定位信息）

**响应：**
```json
{
  "order_no": "WX20260503001",
  "message": "报修已提交，师傅会尽快联系您",
  "shop_phone": "13800138000"
}
```

---

### GET /api/public/shop-info

公开店铺信息。无需登录，只返回非敏感展示字段。

**响应：**
```json
{
  "shop_name": "诚信家电维修",
  "shop_phone": "13800138000"
}
```

**安全边界：** 不返回 SECRET_KEY、ADMIN_USERNAME、ADMIN_PASSWORD、DATABASE_URL 等敏感配置。

---

### GET /api/warranty/{token}

保修查询。只返回公开字段。

**响应：**
```json
{
  "order_no": "WX20260503001",
  "appliance_type": "空调",
  "brand_model": "格力 KFR-35GW",
  "repair_result": "更换电容",
  "parts_used": "启动电容 35μF",
  "completed_at": "2026-05-03T14:30:00",
  "warranty_until": "2026-06-02",
  "warranty_status": "在保",
  "warranty_note": "同一故障保修 30 天",
  "shop_name": "诚信家电维修",
  "shop_phone": "13800138000"
}
```

**保修状态计算：**
- 当前日期 <= warranty_until → "在保"
- 当前日期 > warranty_until → "已过保"
- warranty_until 为空 → "未设置保修"

**错误：** 404: 未找到对应保修记录

**隐私边界：** 不返回客户手机号、详细地址、内部备注、收费金额、成本、利润。

---

## 认证接口

### POST /api/auth/login

**请求：**
```json
{
  "username": "admin",
  "password": "ChangeThisStrongPassword123!"
}
```

**响应：**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

**错误：**
- 401: 用户名或密码错误
- 429: 登录失败次数过多，请 5 分钟后再试

---

### GET /api/auth/me

获取当前用户信息。需要 JWT。

**Header:** `Authorization: Bearer <token>`

**响应：**
```json
{
  "id": 1,
  "username": "admin",
  "role": "admin"
}
```

**错误：** 401: 未登录或 token 过期

---

## 订单管理接口（需登录）

所有接口需要 `Authorization: Bearer <token>`。

### GET /api/orders

订单列表。

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 按订单状态筛选 |
| followup_status | string | 按回访状态筛选 |
| created_date | string | 按创建日期筛选 (YYYY-MM-DD) |
| scheduled_date | string | 按预约日期筛选 (YYYY-MM-DD) |
| keyword | string | 搜索工单编号/客户名/手机/小区/地址/家电类型 |
| page | int | 页码，默认 1 |
| page_size | int | 每页数量，默认 20 |

**响应：**
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "page_size": 20
}
```

---

### GET /api/orders/today

今日预约。只查 `scheduled_at` 为今天的订单，按 `scheduled_at` 升序。

---

### GET /api/orders/followups

待回访。`status=已完成 AND followup_status=未回访`，按 `completed_at` 升序。

---

### GET /api/orders/dashboard/summary

后台首页统计。

**响应：**
```json
{
  "today_count": 3,
  "new_count": 5,
  "followup_count": 2,
  "month_completed_count": 47,
  "month_income": 12580.0,
  "recent_orders": [...]
}
```

---

### GET /api/orders/{id}

订单详情（含完整内部字段）。

---

### PATCH /api/orders/{id}

更新订单。

**请求：** 部分更新，只传需要修改的字段。

**特殊逻辑：**
- 修改 `status` 时自动写入 `repair_logs`
- 设置 `warranty_until` 且 `warranty_token` 为空时自动生成 token
- 状态改为"已完成"且 `completed_at` 为空时自动填充当前时间

---

## 文件与导出接口（需登录）

### POST /api/upload

后台上传维修照片。需 JWT。

**请求：** `multipart/form-data`，字段 `file`

**响应：**
```json
{
  "path": "/uploads/orders/abc123.webp"
}
```

---

### GET /api/export/orders

导出 Excel。支持与 GET /api/orders 相同的筛选参数。

**响应：** `.xlsx` 文件下载

---

## 错误格式

所有错误统一返回：
```json
{"detail": "错误说明"}
```

| HTTP 状态码 | 含义 |
|------------|------|
| 400 | 请求参数错误 |
| 401 | 未登录或 token 过期 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 413 | 文件过大 |
| 415 | 文件类型不支持 |
| 422 | 请求参数校验失败 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

---

## 路由顺序

以下固定路径必须声明在 `/api/orders/{id}` 之前：

1. `/api/orders/dashboard/summary`
2. `/api/orders/today`
3. `/api/orders/followups`

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

**请求：** `multipart/form-data`，字段 `files`（支持多文件）

**响应：**
```json
{
  "paths": ["/uploads/orders/temp/abc123.webp"]
}
```

**错误：**
- 400: 文件数量超限
- 413: 文件过大
- 415: 文件类型不支持
- 429: 请求过于频繁（10 次/分钟/IP）

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
  "service_type": "维修",
  "appliance_type": "空调",
  "brand_model": "格力 KFR-35GW",
  "fault_description": "不制冷，外机异响",
  "preferred_time": "明天上午",
  "is_urgent": false,
  "image_paths": ["/uploads/orders/temp/abc123.webp"]
}
```

**必填字段：** customer_name, phone, community, address, appliance_type, fault_description。`service_type` 不传时兼容为“维修”。

**phone 校验：** 必须为 11 位纯数字，以 1 开头。不符合返回 422。

**service_type 校验：** 后端强校验，只允许 `维修` / `清洗`。前端限制不能替代后端校验。

**兼容字段：** latitude, longitude, location_address 为历史兼容可选字段，当前前端不主动采集、不主动提交。

**响应：**
```json
{
  "order_no": "WX20260503001",
  "message": "报修已提交，师傅会尽快联系您",
  "shop_phone": "13800138000"
}
```

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

### GET /api/used-appliances

公开二手家电列表。无需登录，只返回 `status=在售` 的商品。

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| category | string | 按类别筛选，可选 |
| page | int | 页码，默认 1 |
| page_size | int | 每页数量，默认 20，最大 50 |

**响应：**
```json
{
  "items": [
    {
      "id": 1,
      "title": "二手海尔洗衣机",
      "category": "洗衣机",
      "brand_model": "海尔 XQB80",
      "price": "800元起",
      "condition_note": "八成新，正常使用",
      "description": "适合出租房使用，具体请电话确认。",
      "image_paths": ["/uploads/used/abc123.webp"],
      "status": "在售",
      "contact_phone": "13800138000",
      "created_at": "2026-05-04T10:00:00",
      "updated_at": "2026-05-04T10:00:00"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20,
  "has_more": false
}
```

**展示边界：**
- 只返回在售商品。
- 已售和下架商品不返回。
- 不提供下单、支付、购物车或留言能力。

---

### GET /api/used-appliances/{id}

公开二手家电详情。无需登录。

**规则：**
- 只允许查询 `status=在售` 的商品。
- 已售、下架或不存在返回 404。

**错误：**
- 404: 二手家电不存在或已下架

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

### POST /api/auth/change-password

修改密码。需要 JWT。

**Header:** `Authorization: Bearer <token>`

**请求：**
```json
{
  "old_password": "当前密码",
  "new_password": "新密码",
  "confirm_password": "确认新密码"
}
```

**校验规则：**
- `new_password` 最少 6 位
- `new_password` 必须等于 `confirm_password`
- `new_password` 不能与 `old_password` 相同

**响应：**
```json
{
  "message": "密码修改成功，请重新登录"
}
```

**错误：**
- 400: 新密码与旧密码相同
- 401: 旧密码错误
- 422: 新密码少于 6 位，或新密码与确认密码不一致

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
| service_type | string | 按服务类型筛选，可选 维修 / 清洗 |
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

### GET /api/orders/notifications/new

后台页面打开期间的新订单提醒接口。不是完整未读系统，不保存跨设备未读状态。

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| after_id | int | 只返回 id 大于该值的新订单，默认 0 |

**响应：**
```json
{
  "count": 1,
  "latest_id": 12,
  "orders": [
    {
      "id": 12,
      "order_no": "WX20260505001",
      "service_type": "清洗",
      "appliance_type": "油烟机",
      "community": "阳光小区",
      "is_urgent": false,
      "created_at": "2026-05-05T10:30:00"
    }
  ]
}
```

前端每次成功轮询后使用 `latest_id` 更新下一次的 `after_id` 基线。轮询失败不得影响后台正常使用。

**隐私边界：** `orders` 只返回新单提醒摘要，不返回 `customer_name`、`phone`、完整 `address`、`fault_description`、维修记录、收费、保修 token、图片或内部备注。

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

## 二手家电后台接口（需登录）

所有接口需要 `Authorization: Bearer <token>`。

### GET /api/admin/used-appliances

后台二手家电列表。admin 可查看全部状态。

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 全部为空；可传 在售 / 已售 / 下架 |
| category | string | 按类别筛选 |
| keyword | string | 搜索标题、品牌型号、成色说明 |
| page | int | 页码，默认 1 |
| page_size | int | 每页数量，默认 20，最大 100 |

---

### POST /api/admin/used-appliances

新增二手家电。

**请求：**
```json
{
  "title": "二手海尔洗衣机",
  "category": "洗衣机",
  "brand_model": "海尔 XQB80",
  "price": "800元起",
  "condition_note": "八成新，正常使用",
  "description": "适合出租房使用，具体请电话确认。",
  "image_paths": ["/uploads/used/abc123.webp"],
  "status": "在售",
  "contact_phone": "13800138000"
}
```

**校验：**
- title: 2-80 字
- category: 1-30 字
- price: 最多 30 字，TEXT，允许“面议/800元起/电话确认”
- status: 只能是 在售 / 已售 / 下架

---

### GET /api/admin/used-appliances/{id}

后台查看二手家电详情。需登录，可查看全部状态。

---

### PATCH /api/admin/used-appliances/{id}

编辑二手家电或切换状态。

**说明：**
- 下架通过 `status=下架` 实现。
- 售出通过 `status=已售` 实现。

### DELETE /api/admin/used-appliances/{id}

删除已下架的二手家电（硬删除 + 清理关联图片文件）。

**规则：**
- 仅限 `status=下架` 的商品可删除。
- 在售或已售商品返回 400。
- 删除时同时清理磁盘上的图片文件。
- 不存在返回 404。

**响应：**
```json
{
  "message": "已删除",
  "deleted_files": 2
}
```

---

## 文件与导出接口（需登录）

### POST /api/upload

后台上传维修照片。需 JWT。

**请求：** `multipart/form-data`，字段 `files`（支持多文件）

**响应：**
```json
{
  "paths": ["/uploads/orders/abc123.webp"]
}
```

---

### POST /api/upload/used

后台上传二手家电图片。需 JWT。

**限制：**
- 文件类型：jpg/jpeg/png/webp
- 单张最大：5MB
- 单次最多：5 张
- 文件名后端随机生成
- 保存到 `backend/uploads/used/`

**请求：** `multipart/form-data`，字段 `files`（支持多文件）

**响应：**
```json
{
  "paths": ["/uploads/used/abc123.webp"]
}
```

**边界：** 不影响现有 `/api/upload` 维修照片上传。

---

### GET /api/export/orders

导出 Excel。支持与 GET /api/orders 相同的筛选参数，包括 `service_type`。

**响应：** `.xlsx` 文件下载

---

## 新订单 Webhook（可选，默认关闭）

Webhook 不是公开 API；由后端在客户提交订单成功后异步向 `ORDER_WEBHOOK_URL` 发起 `POST`。失败只记录日志，不影响客户下单成功结果。

**启用配置：**
```env
ORDER_WEBHOOK_ENABLED=true
ORDER_WEBHOOK_PROVIDER=generic
ORDER_WECOM_INCLUDE_PRIVATE_FIELDS=false
ORDER_WEBHOOK_URL=https://example.com/webhook
APP_BASE_URL=https://your-domain.com
```

`ORDER_WEBHOOK_PROVIDER=generic` 保持原 JSON payload；`ORDER_WEBHOOK_PROVIDER=wecom` 发送企业微信机器人 markdown payload。

**generic Payload：**
```json
{
  "event": "order.created",
  "order_no": "WX20260505001",
  "service_type": "清洗",
  "appliance_type": "油烟机",
  "address_summary": "阳光小区",
  "is_urgent": false,
  "admin_detail_url": "https://your-domain.com/admin/orders/12"
}
```

**wecom Payload：**
```json
{
  "msgtype": "markdown",
  "markdown": {
    "content": "【新订单提醒】\n> 工单号：WX20260505001\n> 服务类型：清洗\n> 家电类型：油烟机\n> 区域：阳光小区\n> 紧急程度：普通\n> 后台查看：https://your-domain.com/admin/orders/12"
  }
}
```

**隐私边界：** 不发送客户手机号、客户姓名、完整地址、完整故障描述、保修 token、维修结果、最终收费、配件、图片、内部备注。企业微信机器人 URL 等同密钥，只能放在后端 `.env`，不能提交到 GitHub 或写入前端。

如企业微信群是内部接单群且确实需要完整联系信息，可设置 `ORDER_WECOM_INCLUDE_PRIVATE_FIELDS=true`。该开关只影响 `wecom` provider，会在企业微信 markdown 中额外加入客户姓名、手机号、完整地址和故障/清洗描述；`generic` provider 仍只发送脱敏摘要。

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
4. `/api/orders/notifications/new`

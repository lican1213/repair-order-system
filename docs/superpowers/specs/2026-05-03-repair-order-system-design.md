# 家电维修工单系统 设计文档

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为小型家电维修商铺构建轻量 H5 工单系统，客户扫码报修，老板手机后台管理订单。

**Architecture:** FastAPI 统一服务架构——后端同时提供 API 和 React 静态文件。开发环境用 Vite dev server + FastAPI，生产环境 FastAPI 直接 serve 构建产物。

**Tech Stack:** React + Vite (TSX) / Python FastAPI / SQLite / JWT / bcrypt

---

## 1. 项目目录结构

```
repair-order-system/
├── CLAUDE.md
├── README.md
├── .gitignore
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI 入口，挂载 API + 静态文件 + SPA fallback
│   │   ├── config.py                # 配置：密钥、数据库路径、上传目录、店铺信息
│   │   ├── database.py              # SQLite 连接 & 会话管理
│   │   ├── models.py                # SQLAlchemy ORM 模型
│   │   ├── schemas.py               # Pydantic 请求/响应模型
│   │   ├── auth.py                  # JWT、bcrypt、当前用户校验
│   │   ├── constants.py             # 状态枚举、家电类型等常量
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py              # /api/auth/*
│   │   │   ├── public.py            # /api/public/*，客户报修公开接口
│   │   │   ├── orders.py            # /api/orders/*，后台订单管理
│   │   │   ├── upload.py            # /api/upload/*
│   │   │   ├── export.py            # /api/export/*
│   │   │   └── warranty.py          # /api/warranty/*
│   │   └── static/                  # React build 后复制到这里
│   │       └── index.html
│   ├── data/
│   │   └── repair.db                # SQLite 数据库（运行时生成）
│   ├── uploads/
│   │   ├── orders/                  # 客户上传的故障照片（含 temp/ 子目录）
│   │   │   └── temp/                # 临时上传，提交报修后移动到 orders/
│   │   └── warranty/                # 维修后照片（预留）
│   ├── seed.py                      # 测试数据初始化脚本
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/
│   │   │   ├── client.ts            # axios/fetch 封装，自动附加 JWT
│   │   │   ├── auth.ts              # 登录、获取用户信息
│   │   │   ├── orders.ts            # 订单 CRUD
│   │   │   ├── public.ts            # 公开报修提交
│   │   │   ├── warranty.ts          # 保修查询
│   │   │   └── upload.ts            # 图片上传
│   │   ├── pages/
│   │   │   ├── RepairForm.tsx       # 客户报修页
│   │   │   ├── RepairSuccess.tsx    # 提交成功页
│   │   │   ├── WarrantyPage.tsx     # 保修查询页
│   │   │   ├── AdminLogin.tsx       # 后台登录
│   │   │   ├── AdminDashboard.tsx   # 后台首页
│   │   │   ├── OrderList.tsx        # 订单列表
│   │   │   ├── OrderDetail.tsx      # 订单详情
│   │   │   ├── TodayOrders.tsx      # 今日预约
│   │   │   ├── FollowupList.tsx     # 待回访
│   │   │   └── AdminProfile.tsx     # 我的页面
│   │   ├── components/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── TextArea.tsx
│   │   │   ├── OrderCard.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   └── ImageUploader.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── routes/
│   │   │   └── ProtectedRoute.tsx
│   │   ├── types/
│   │   │   ├── order.ts
│   │   │   └── user.ts
│   │   ├── utils/
│   │   │   ├── constants.ts         # ORDER_STATUSES, FOLLOWUP_STATUSES, STATUS_COLORS
│   │   │   ├── formatDate.ts
│   │   │   └── money.ts
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   └── tsconfig.json
├── docs/
│   ├── PRD.md
│   ├── API_SPEC.md
│   ├── DB_SCHEMA.md
│   ├── PROGRESS.md
│   ├── TODO.md
│   ├── DECISIONS.md
│   └── superpowers/
│       └── specs/
│           └── 2026-05-03-repair-order-system-design.md
└── scripts/
    ├── build_frontend.py
    └── init_project.py
```

---

## 2. 数据库设计

### orders 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| order_no | TEXT UNIQUE | 工单编号，格式 WX20260503001 |
| customer_name | TEXT | 客户姓名 |
| phone | TEXT | 手机号 |
| community | TEXT | 小区名称 |
| address | TEXT | 详细地址 |
| appliance_type | TEXT | 家电类型 |
| brand_model | TEXT | 品牌型号，可选 |
| fault_description | TEXT | 故障描述 |
| preferred_time | TEXT | 客户填写的希望上门时间（文本） |
| scheduled_at | DATETIME | 老板确认的实际上门时间 |
| is_urgent | BOOLEAN | 是否紧急 |
| image_paths | TEXT | 客户上传图片路径，JSON 数组 |
| status | TEXT | 订单状态 |
| followup_status | TEXT | 回访状态 |
| repair_result | TEXT | 维修结果 |
| parts_used | TEXT | 更换配件 |
| final_fee | REAL | 收费金额 |
| remark | TEXT | 备注 |
| repair_images | TEXT | 维修后图片路径，JSON 数组 |
| warranty_until | TEXT | 保修截止日期 |
| warranty_token | TEXT UNIQUE | 保修查询 token，secrets.token_urlsafe(16) |
| warranty_note | TEXT | 保修说明 |
| source | TEXT | 订单来源，默认"扫码报修" |
| completed_at | DATETIME | 实际维修完成时间 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

**索引：** order_no (UNIQUE), warranty_token (UNIQUE), phone, status, followup_status, scheduled_at, created_at

### users 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| username | TEXT UNIQUE | 用户名 |
| password_hash | TEXT | bcrypt 哈希密码 |
| role | TEXT DEFAULT 'admin' | 角色 |
| is_active | BOOLEAN DEFAULT 1 | 是否启用 |
| last_login_at | DATETIME | 最后登录时间 |
| created_at | DATETIME | 创建时间 |

### repair_logs 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| order_id | INTEGER FK | 关联工单 |
| old_status | TEXT | 原状态 |
| new_status | TEXT | 新状态 |
| note | TEXT | 变更备注 |
| created_at | DATETIME | 变更时间 |

### 状态枚举

**订单状态：** 新报修 / 已联系 / 已预约 / 已上门 / 已完成 / 需复查 / 未成交

**回访状态：** 未回访 / 已回访 / 客户有问题 / 无需回访

集中维护在 `backend/app/constants.py` 和 `frontend/src/utils/constants.ts`。

### order_no 生成规则

后端自动生成：`WX` + 日期 `YYYYMMDD` + 三位当日序号。

```
WX20260503001
WX20260503002
```

查询当天已有最大序号 + 1，UNIQUE 约束防重复。

---

## 3. API 设计

### 公开接口（无需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/public/submit` | 客户提交报修 |
| POST | `/api/public/upload` | 客户上传故障照片 |
| GET | `/api/public/shop-info` | 公开店铺名称和电话 |
| GET | `/api/warranty/{token}` | 保修查询 |
| GET | `/api/health` | 健康检查 |

### 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录，返回 JWT |
| GET | `/api/auth/me` | 获取当前用户信息 |

### 订单管理接口（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/orders` | 订单列表，支持筛选 |
| GET | `/api/orders/today` | 今日预约（基于 scheduled_at） |
| GET | `/api/orders/followups` | 待回访列表 |
| GET | `/api/orders/dashboard/summary` | 后台首页统计数据 |
| GET | `/api/orders/{id}` | 订单详情 |
| PATCH | `/api/orders/{id}` | 更新订单 |

### 文件与导出接口（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/upload` | 后台上传维修照片 |
| GET | `/api/export/orders` | 导出 Excel |

### 关键接口规则

**POST /api/public/submit** 响应：
```json
{
  "order_no": "WX20260503001",
  "message": "报修已提交，师傅会尽快联系您",
  "shop_phone": "13800138000"
}
```

**GET /api/orders** 筛选参数：
- `status`: 按订单状态筛选
- `followup_status`: 按回访状态筛选
- `created_date`: 按创建日期筛选
- `scheduled_date`: 按预约上门日期筛选
- `keyword`: 搜索工单编号/客户名/手机/小区/地址/家电类型
- `page`, `page_size`: 分页

**GET /api/orders/today**：只查 `scheduled_at` 为今天的订单，按 `scheduled_at` 升序。未设置 `scheduled_at` 的不显示。

**GET /api/orders/followups**：`status=已完成 AND followup_status=未回访`，按 `completed_at` 升序。

**GET /api/orders/dashboard/summary** 响应：
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

**PATCH /api/orders/{id}**：
- 修改 `status` 时自动写入 `repair_logs`
- 提交 `warranty_until` 且 `warranty_token` 为空时自动生成 token
- 状态改为"已完成"且 `completed_at` 为空时自动设置 `completed_at`

**GET /api/warranty/{token}** 只返回公开字段：
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

保修状态由后端计算：当前日期 <= warranty_until → "在保"，否则 → "已过保"，warranty_until 为空 → "未设置保修"。

**公开图片上传限制：**
- 只允许 jpg/jpeg/png/webp
- 单张最大 5MB
- 单次最多 5 张
- 文件名后端随机生成
- 临时存储到 `/uploads/orders/temp/`，返回路径如 `/uploads/orders/temp/abc123.webp`
- 客户提交报修时，前端将临时路径传给 `/api/public/submit`，后端将图片移动到 `/uploads/orders/` 并更新路径
- 清理策略（v1.1）：定期清理 temp/ 下超过 7 天且未绑定订单的图片

**路由顺序：** `/api/orders/today`、`/api/orders/followups`、`/api/orders/dashboard/summary` 声明在 `/api/orders/{id}` 之前。

**统一错误格式：**
```json
{"detail": "错误说明"}
```

---

## 4. 前端页面设计

### 路由结构

| 路径 | 页面 | 访问权限 |
|------|------|---------|
| `/repair` | 客户报修表单 | 公开 |
| `/repair/success` | 提交成功页 | 公开 |
| `/warranty/t/:token` | 保修查询页 | 公开 |
| `/admin` | 后台登录（已登录则跳 dashboard） | 公开 |
| `/admin/dashboard` | 后台首页 | 需登录 |
| `/admin/orders` | 订单列表 | 需登录 |
| `/admin/orders/:id` | 订单详情 | 需登录 |
| `/admin/today` | 今日预约 | 需登录 |
| `/admin/followups` | 待回访 | 需登录 |
| `/admin/profile` | 我的页面 | 需登录 |

### 后台首页统计卡片

| 卡片 | 数据来源 | 点击跳转 |
|------|---------|---------|
| 今日预约 | dashboard/summary.today_count | /admin/today |
| 新报修 | dashboard/summary.new_count | /admin/orders?status=新报修 |
| 待回访 | dashboard/summary.followup_count | /admin/followups |
| 本月已完成 | dashboard/summary.month_completed_count | /admin/orders?status=已完成 |
| 本月收入 | dashboard/summary.month_income | 只展示数字 |

### 订单列表页

- 状态筛选：全部 / 新报修 / 已联系 / 已预约 / 已上门 / 已完成 / 需复查 / 未成交
- 回访筛选：全部 / 未回访 / 已回访 / 客户有问题 / 无需回访
- 搜索框：工单编号、客户姓名、手机、小区、地址、家电类型
- 日期筛选：created_date / scheduled_date
- 加载更多（非分页）
- 卡片显示：order_no、客户姓名、手机、小区、家电类型、故障摘要、状态、预约时间、创建时间、紧急标记
- 卡片操作：拨打电话、查看详情

### 状态颜色

| 状态 | 颜色 |
|------|------|
| 新报修 | 红色 |
| 已联系 | 蓝色 |
| 已预约 | 橙色 |
| 已上门 | 紫色 |
| 已完成 | 绿色 |
| 需复查 | 黄色 |
| 未成交 | 灰色 |

必须同时显示中文状态文字，不能只靠颜色。

### 移动端 UI 规则

- 按钮高度 >= 44px
- 主按钮占满宽度
- 底部导航固定，页面底部预留导航栏高度
- 不使用复杂表格
- 不做暗色模式
- 不做复杂动画

### 一键操作

- 拨打电话：`tel:13800138000`
- 复制地址：`navigator.clipboard.writeText(address)`，失败时显示地址让用户手动复制

### 保修查询页（公开）

只展示：店铺名称、店铺电话、工单编号、维修日期、家电类型、品牌型号、维修内容、更换配件、保修截止日期、保修状态、保修说明、一键拨打、重新报修按钮。

不展示：客户手机号、详细地址、内部备注、收费金额、成本、利润。

token 不存在时显示："未找到对应保修记录，请联系师傅确认。"

### 提交成功页

显示：工单编号、师傅联系电话、安全提示。

安全提示："如有漏电、烧焦味、燃气泄漏、严重漏水或跳闸，请先断电或关闭阀门，不要自行拆修，等待师傅联系。"

---

## 5. 认证与安全

### 认证方案

- JWT Token，access_token 有效期 30 天
- 前端存 localStorage
- bcrypt 哈希密码
- ProtectedRoute 前端路由保护
- 后端 JWT 鉴权，401 时前端跳转登录页
- 退出登录：前端删除 token + 跳转 /admin

### 管理员初始化

首次启动时 users 表为空，从 .env 读取 ADMIN_USERNAME 和 ADMIN_PASSWORD 创建管理员。后续启动不覆盖。

### 登录失败限制

同用户名连续失败 5 次，暂停登录 5 分钟。成功登录后清空计数。

### 公开接口限频（第一版预留）

- POST /api/public/submit：同 IP 每分钟 5 次，同手机号每 10 分钟 3 次
- POST /api/public/upload：同 IP 每分钟 10 次

### 安全边界

| 接口 | 权限 |
|------|------|
| GET /api/health | 公开 |
| GET /api/public/shop-info | 公开，只返回店铺名称和电话 |
| POST /api/public/submit | 公开 |
| POST /api/public/upload | 公开，限频 |
| GET /api/warranty/{token} | 公开，只返回公开字段 |
| POST /api/auth/login | 公开 |
| 其他 /api/* | 需 JWT |

### 开发环境 CORS

仅允许 `http://localhost:5173`。生产环境同源，不需要 CORS。

---

## 6. 构建与部署

### 开发环境

**后端 (Windows PowerShell)：**
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

**后端 (Linux/macOS)：**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

**前端：**
```bash
cd frontend
npm install
npm run dev
```

Vite dev server 代理 `/api` 和 `/uploads` 到 `http://localhost:8000`。

### 生产构建

**默认方案（Vite 直接输出）：** 在 `vite.config.ts` 设置 `build.outDir: "../backend/app/static"` + `build.emptyOutDir: true`。运行 `npm run build` 即可，无需手动复制。

```bash
cd frontend
npm run build
# 自动输出到 backend/app/static/
```

### 生产启动

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### FastAPI SPA fallback 规则

1. `/api/*` 走后端 API
2. `/uploads/*` 走上传文件访问
3. 其他路径返回 `static/index.html`（SPA fallback）
4. `static/index.html` 不存在时返回清晰错误提示

### 首次部署检查

启动时检查：
- SECRET_KEY 是否仍是默认值 → warning
- ADMIN_PASSWORD 是否仍是默认值 → warning
- data 目录是否存在 → 自动创建
- uploads 目录是否存在 → 自动创建

### .env 配置

```
SECRET_KEY=please-change-this-to-a-long-random-secret
ACCESS_TOKEN_EXPIRE_DAYS=30
SHOP_NAME=诚信家电维修
SHOP_PHONE=13800138000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ChangeThisStrongPassword123!
DATABASE_URL=sqlite:///./data/repair.db
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=5
PUBLIC_UPLOAD_MAX_FILES=5
```

### .gitignore

```
backend/.env
backend/.venv/
backend/data/*.db
backend/uploads/
backend/app/static/
frontend/node_modules/
frontend/dist/
__pycache__/
*.pyc
```

### 备份策略

定期备份：
- `backend/data/repair.db`
- `backend/uploads/`

建议每天凌晨复制，后续可实现 `scripts/backup.py`。

### 生产部署建议（后续）

- Caddy 自动 HTTPS + 反向代理到 127.0.0.1:8000
- systemd 管理 FastAPI 进程
- 健康检查：`GET /api/health` → `{"status":"ok"}`

---

## 7. 测试账号与数据

### 测试账号

- 用户名：`admin`
- 密码：首次启动时从 .env 读取

### 测试数据（seed.py）

预设 10-15 条工单，覆盖：
- 各种状态（新报修、已预约、已完成等）
- 各种家电类型（空调、冰箱、洗衣机、热水器、燃气灶）
- 有/无紧急标记
- 有/无预约时间
- 有/无保修信息
- 有/无回访状态

---

## 8. 升级路线

| 版本 | 功能 |
|------|------|
| v1.0 | 核心工单流程：报修→接单→维修→完成→保修 |
| v1.1 | 登录失败限频、临时图片清理、备份脚本 |
| v1.2 | 修改密码、店铺信息编辑、保修二维码生成 |
| v1.3 | 微信小程序版本 |
| v2.0 | 多员工支持、简单库存、数据统计 |

---

## 设计决策记录

| 决策 | 理由 |
|------|------|
| FastAPI 统一服务 | 极简部署，单进程，无 CORS |
| React + Vite TSX | 组件化开发，TypeScript 类型安全 |
| SQLite | 零配置，单文件，小店场景够用 |
| JWT 30 天 | 避免频繁登录，单人使用场景 |
| secrets.token_urlsafe(16) | 不可猜测的保修 token |
| scheduled_at 独立字段 | 不解析文本，精确查询 |
| 公开/后台上传分离 | 客户不需要登录就能传图 |
| 状态枚举集中管理 | 避免散落，前后端一致 |

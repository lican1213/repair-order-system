# 家电维修工单系统 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成家电维修工单系统 v1.0，包含客户报修、老板后台、保修查询、Excel 导出。

**Spec:** `docs/superpowers/specs/2026-05-03-repair-order-system-design.md`

**Project Root:** `E:/claude code project 1/repair-order-system/`

---

## v1.0 Audit Fixes Note

2026-05-03 Codex 独立审计结论为 **PASS_WITH_FIXES**。本项目内已归档该实施计划和设计文档；v1.0 audit fixes 已完成，范围仅包含真机试用前修复项：`/uploads` fresh deploy 挂载、图片路径 JSON 存储、前端 lint、bcrypt 直接依赖、`/admin/profile` 店铺信息来源、冲突进度表清理、文档归档和标准端口 smoke test。

---

## Phase 0：项目上下文与基础文件

**目标：** 建立项目文档体系，确保后续开发有据可依。

### Tasks

- [x] **Task 0.1：创建项目根目录**

  **Files:**
  - Create: `repair-order-system/`

  ```bash
  mkdir -p "E:/claude code project 1/repair-order-system"
  ```

- [x] **Task 0.2：创建 CLAUDE.md**

  **Files:**
  - Create: `repair-order-system/CLAUDE.md`

  内容包括：
  - 项目概述（家电维修工单系统）
  - 技术栈（React + Vite TSX / FastAPI / SQLite）
  - 架构决策（FastAPI 统一服务）
  - 目录结构说明
  - 开发启动方式
  - 生产构建方式
  - Current Progress Summary（初始状态）

- [x] **Task 0.3：创建 docs/PROGRESS.md**

  **Files:**
  - Create: `repair-order-system/docs/PROGRESS.md`

  记录项目进度，初始状态：Phase 0 进行中。

- [x] **Task 0.4：创建 docs/TODO.md**

  **Files:**
  - Create: `repair-order-system/docs/TODO.md`

  列出所有待办事项，从设计文档中提取：
  - v1.1 功能：登录限频持久化、临时图片清理、备份脚本
  - v1.2 功能：修改密码、店铺信息编辑、保修二维码
  - 安全：HTTPS 部署、Caddy 配置

- [x] **Task 0.5：创建 docs/DECISIONS.md**

  **Files:**
  - Create: `repair-order-system/docs/DECISIONS.md`

  记录设计决策：
  - FastAPI 统一服务 vs 前后端分离 → 选择统一服务
  - React + Vite vs 纯 HTML → 选择 React + Vite TSX
  - JWT 30 天 vs 24 小时 → 选择 30 天
  - 单管理员 vs 多用户 → 选择单管理员
  - SQLite vs PostgreSQL → 选择 SQLite

- [x] **Task 0.6：创建 docs/PRD.md**

  **Files:**
  - Create: `repair-order-system/docs/PRD.md`

  从设计文档提取产品需求：业务背景、功能列表、非功能需求。

- [x] **Task 0.7：创建 docs/API_SPEC.md**

  **Files:**
  - Create: `repair-order-system/docs/API_SPEC.md`

  从设计文档提取完整 API 规格：所有接口、请求/响应格式、错误码。

- [x] **Task 0.8：创建 docs/DB_SCHEMA.md**

  **Files:**
  - Create: `repair-order-system/docs/DB_SCHEMA.md`

  从设计文档提取数据库 schema：orders、users、repair_logs 表结构、索引、枚举值。

- [x] **Task 0.9：创建 .gitignore**

  **Files:**
  - Create: `repair-order-system/.gitignore`

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
  .DS_Store
  ```

**验收标准：**
- 所有文档文件存在且内容完整
- 设计决策与 spec 文档一致
- `git init` 后可以正常 commit

**测试命令：**
```bash
ls repair-order-system/docs/
cat repair-order-system/CLAUDE.md | head -20
```

**风险点：** 无

---

## Phase 1：后端项目骨架

**目标：** 建立 FastAPI 项目结构，后端能启动，健康检查可用。

### Tasks

- [x] **Task 1.1：创建后端目录结构**

  **Files:**
  - Create: `backend/app/__init__.py`
  - Create: `backend/app/routers/__init__.py`
  - Create: `backend/data/` (empty, .gitkeep)
  - Create: `backend/uploads/orders/temp/` (empty, .gitkeep)
  - Create: `backend/uploads/warranty/` (empty, .gitkeep)
  - Create: `backend/app/static/` (empty, .gitkeep)

- [x] **Task 1.2：创建 requirements.txt**

  **Files:**
  - Create: `backend/requirements.txt`

  ```
  fastapi
  uvicorn[standard]
  sqlalchemy
  pydantic
  python-jose[cryptography]
  passlib[bcrypt]
  python-multipart
  openpyxl
  python-dotenv
  ```

- [x] **Task 1.3：创建 .env.example**

  **Files:**
  - Create: `backend/.env.example`

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

- [x] **Task 1.4：实现 config.py**

  **Files:**
  - Create: `backend/app/config.py`

  从 .env 读取配置，使用 pydantic-settings 或 dotenv。提供默认值。

- [x] **Task 1.5：实现 database.py**

  **Files:**
  - Create: `backend/app/database.py`

  SQLAlchemy 引擎 + 会话工厂。SQLite 连接。`check_same_thread=False`。

- [x] **Task 1.6：实现 constants.py**

  **Files:**
  - Create: `backend/app/constants.py`

  ```python
  ORDER_STATUSES = ["新报修", "已联系", "已预约", "已上门", "已完成", "需复查", "未成交"]
  FOLLOWUP_STATUSES = ["未回访", "已回访", "客户有问题", "无需回访"]
  APPLIANCE_TYPES = ["空调", "冰箱", "洗衣机", "热水器", "燃气灶", "电视", "微波炉", "油烟机", "其他"]
  ```

- [x] **Task 1.7：实现 main.py 基础框架**

  **Files:**
  - Create: `backend/app/main.py`

  FastAPI 应用：
  - 挂载 routers
  - 挂载 `/uploads` 静态文件
  - 挂载 `/` 静态文件（SPA fallback，仅生产模式）
  - 启动时创建数据目录
  - CORS 中间件（开发环境）

- [x] **Task 1.8：实现 /api/health**

  **Files:**
  - Modify: `backend/app/main.py` 或 Create: `backend/app/routers/health.py`

  ```python
  @app.get("/api/health")
  def health():
      return {"status": "ok"}
  ```

**验收标准：**
- `pip install -r requirements.txt` 成功
- `uvicorn app.main:app --reload --port 8000` 启动无报错
- `curl http://localhost:8000/api/health` 返回 `{"status":"ok"}`

**测试命令：**
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
# 另一个终端
curl http://localhost:8000/api/health
```

**风险点：**
- Windows 上 bcrypt 编译可能需要 Visual C++ Build Tools
- 解决方案：使用 `passlib[bcrypt]`，它会处理依赖

---

## Phase 2：数据库与模型

**目标：** 三张表可用，测试数据可生成。

### Tasks

- [x] **Task 2.1：实现 models.py**

  **Files:**
  - Create: `backend/app/models.py`

  SQLAlchemy ORM 模型：
  - `Order` 模型（所有字段，含索引）
  - `User` 模型
  - `RepairLog` 模型

- [x] **Task 2.2：实现 order_no 生成逻辑**

  **Files:**
  - Modify: `backend/app/models.py` 或 Create: `backend/app/utils.py`

  ```python
  def generate_order_no(session) -> str:
      today = datetime.now().strftime("%Y%m%d")
      prefix = f"WX{today}"
      # 查询当天最大序号
      last = session.query(Order).filter(Order.order_no.like(f"{prefix}%")).order_by(Order.order_no.desc()).first()
      if last:
          seq = int(last.order_no[-3:]) + 1
      else:
          seq = 1
      return f"{prefix}{seq:03d}"
  ```

- [x] **Task 2.3：实现 warranty_token 生成逻辑**

  **Files:**
  - Modify: `backend/app/utils.py`

  ```python
  import secrets
  def generate_warranty_token() -> str:
      return secrets.token_urlsafe(16)
  ```

- [x] **Task 2.4：实现数据库初始化**

  **Files:**
  - Modify: `backend/app/database.py`

  `Base.metadata.create_all(bind=engine)` 在应用启动时调用。

- [x] **Task 2.5：实现 seed.py**

  **Files:**
  - Create: `backend/seed.py`

  测试数据：
  - 1 个管理员账号（从 .env 读取用户名密码）
  - 15 条工单，覆盖所有状态、各种家电类型、有/无紧急、有/无预约、有/无保修
  - 对应的 repair_logs

**验收标准：**
- 启动后端自动创建数据库表
- `python seed.py` 成功，无报错
- 数据库中有 1 个用户 + 15 条工单

**测试命令：**
```powershell
cd backend
python seed.py
# 检查 data/repair.db 是否存在
python -c "import sqlite3; conn = sqlite3.connect('data/repair.db'); print(conn.execute('SELECT count(*) FROM orders').fetchone())"
```

**风险点：**
- SQLite 文件路径需相对于 backend/ 目录
- 解决方案：config.py 中使用绝对路径

---

## Phase 3：认证系统

**目标：** 管理员可登录，JWT 鉴权可用。

### Tasks

- [x] **Task 3.1：实现 auth.py**

  **Files:**
  - Create: `backend/app/auth.py`

  功能：
  - bcrypt 密码哈希
  - JWT token 生成和验证
  - `get_current_user` 依赖注入
  - 登录失败计数（内存 dict）

- [x] **Task 3.2：实现 schemas.py（认证相关）**

  **Files:**
  - Create: `backend/app/schemas.py`

  ```python
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
  ```

- [x] **Task 3.3：实现 /api/auth/login**

  **Files:**
  - Create: `backend/app/routers/auth.py`

  - 验证用户名密码
  - 登录失败 5 次锁定 5 分钟
  - 成功后返回 JWT
  - 更新 last_login_at

- [x] **Task 3.4：实现 /api/auth/me**

  **Files:**
  - Modify: `backend/app/routers/auth.py`

  - 需要 JWT
  - 返回当前用户信息

- [x] **Task 3.5：实现管理员首次启动自动创建**

  **Files:**
  - Modify: `backend/app/main.py`

  启动事件中检查 users 表，为空则从 .env 创建管理员。

**验收标准：**
- `POST /api/auth/login` 返回 JWT
- `GET /api/auth/me` 无 token 返回 401
- `GET /api/auth/me` 有 token 返回用户信息
- 连续输错 5 次密码后第 6 次返回锁定提示

**测试命令：**
```bash
# 登录
curl -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"ChangeThisStrongPassword123!\"}"

# 用返回的 token 访问
curl http://localhost:8000/api/auth/me -H "Authorization: Bearer <token>"

# 无 token
curl http://localhost:8000/api/auth/me
```

**风险点：**
- login 接口用 form-data 还是 JSON → 统一用 JSON
- 解决方案：LoginRequest 用 Pydantic，接收 JSON body

---

## Phase 4：公开报修与保修接口

**目标：** 客户可提交报修，保修可查询。

### Tasks

- [x] **Task 4.1：实现 /api/public/upload**

  **Files:**
  - Create: `backend/app/routers/public.py`

  - 无需登录
  - 验证文件类型（jpg/jpeg/png/webp）
  - 验证文件大小（5MB）
  - 验证文件数量（最多 5 张）
  - 随机生成文件名
  - 保存到 `uploads/orders/temp/`
  - 返回路径 `/uploads/orders/temp/xxx.webp`

- [x] **Task 4.2：实现 /api/public/submit**

  **Files:**
  - Modify: `backend/app/routers/public.py`

  - 接收报修表单 JSON
  - 后端校验所有必填字段
  - 生成 order_no
  - 将 temp 图片移动到 `uploads/orders/`
  - 创建订单记录
  - 返回 `{order_no, message, shop_phone}`

- [x] **Task 4.3：实现 /api/warranty/{token}**

  **Files:**
  - Create: `backend/app/routers/warranty.py`

  - 通过 warranty_token 查询订单
  - 只返回公开字段
  - 计算 warranty_status
  - token 不存在返回 404

- [x] **Task 4.4：实现 schemas.py（公开接口相关）**

  **Files:**
  - Modify: `backend/app/schemas.py`

  ```python
  class RepairSubmitRequest(BaseModel):
      customer_name: str
      phone: str
      community: str
      address: str
      appliance_type: str
      brand_model: Optional[str] = None
      fault_description: str
      preferred_time: Optional[str] = None
      is_urgent: bool = False
      image_paths: List[str] = []

  class RepairSubmitResponse(BaseModel):
      order_no: str
      message: str
      shop_phone: str

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
  ```

**验收标准：**
- `POST /api/public/upload` 上传图片成功，返回路径
- `POST /api/public/submit` 提交报修成功，返回 order_no
- `GET /api/warranty/{token}` 返回保修信息
- 保修接口不返回手机号、地址、收费等隐私字段
- 上传非图片文件被拒绝

**测试命令：**
```bash
# 上传图片
curl -X POST http://localhost:8000/api/public/upload -F "file=@test.jpg"

# 提交报修
curl -X POST http://localhost:8000/api/public/submit \
  -H "Content-Type: application/json" \
  -d '{"customer_name":"张三","phone":"13800138000","community":"阳光小区","address":"3号楼501","appliance_type":"空调","fault_description":"不制冷"}'

# 保修查询
curl http://localhost:8000/api/warranty/<token>
```

**风险点：**
- 图片移动逻辑需处理目标目录不存在的情况
- 解决方案：启动时创建目录，移动前检查

---

## Phase 5：后台订单 API

**目标：** 老板后台所有订单管理接口可用。

### Tasks

- [x] **Task 5.1：实现 GET /api/orders（订单列表）**

  **Files:**
  - Create: `backend/app/routers/orders.py`

  筛选参数：status, followup_status, created_date, scheduled_date, keyword, page, page_size。

- [x] **Task 5.2：实现 GET /api/orders/today**

  **Files:**
  - Modify: `backend/app/routers/orders.py`

  查询 scheduled_at 为今天的订单，按 scheduled_at 升序。

- [x] **Task 5.3：实现 GET /api/orders/followups**

  **Files:**
  - Modify: `backend/app/routers/orders.py`

  筛选 status=已完成 AND followup_status=未回访，按 completed_at 升序。

- [x] **Task 5.4：实现 GET /api/orders/dashboard/summary**

  **Files:**
  - Modify: `backend/app/routers/orders.py`

  返回 today_count, new_count, followup_count, month_completed_count, month_income, recent_orders。

- [x] **Task 5.5：实现 GET /api/orders/{id}**

  **Files:**
  - Modify: `backend/app/routers/orders.py`

  返回完整订单信息（含内部字段）。

- [x] **Task 5.6：实现 PATCH /api/orders/{id}**

  **Files:**
  - Modify: `backend/app/routers/orders.py`

  - 更新订单字段
  - status 变更时写 repair_logs
  - 设置 warranty_until 且 token 为空时自动生成 token
  - 状态改为已完成且 completed_at 为空时自动填充

- [x] **Task 5.7：实现 schemas.py（订单相关）**

  **Files:**
  - Modify: `backend/app/schemas.py`

  OrderResponse, OrderListResponse, OrderUpdateRequest, DashboardSummaryResponse。

- [x] **Task 5.8：路由顺序确认**

  **Files:**
  - Modify: `backend/app/routers/orders.py`

  确保 `/api/orders/today`、`/api/orders/followups`、`/api/orders/dashboard/summary` 声明在 `/api/orders/{id}` 之前。

**验收标准：**
- 订单列表筛选可用
- 今日预约只显示 scheduled_at 为今天的
- 待回访只显示已完成且未回访的
- 首页统计数据正确
- 修改状态自动写 repair_logs
- 设置保修截止自动生成 token

**测试命令：**
```bash
TOKEN="<登录获取的token>"

# 订单列表
curl "http://localhost:8000/api/orders?status=新报修" -H "Authorization: Bearer $TOKEN"

# 今日预约
curl http://localhost:8000/api/orders/today -H "Authorization: Bearer $TOKEN"

# 待回访
curl http://localhost:8000/api/orders/followups -H "Authorization: Bearer $TOKEN"

# 首页统计
curl http://localhost:8000/api/orders/dashboard/summary -H "Authorization: Bearer $TOKEN"

# 修改订单
curl -X PATCH http://localhost:8000/api/orders/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"已联系"}'
```

**风险点：**
- 路由顺序可能导致 `{id}` 误匹配固定路径
- 解决方案：router 中固定路径声明在前

---

## Phase 6：文件上传与导出

**目标：** 后台可上传维修照片，可导出 Excel。

### Tasks

- [x] **Task 6.1：实现 POST /api/upload（后台上传）**

  **Files:**
  - Create: `backend/app/routers/upload.py`

  需 JWT。验证文件类型和大小。保存到 `uploads/orders/`。返回路径。

- [x] **Task 6.2：实现 GET /api/export/orders**

  **Files:**
  - Create: `backend/app/routers/export.py`

  使用 openpyxl 生成 Excel。支持与订单列表相同的筛选参数。返回 .xlsx 文件。

- [x] **Task 6.3：Excel 列设计**

  **Files:**
  - Modify: `backend/app/routers/export.py`

  列：工单编号、客户姓名、手机、小区、地址、家电类型、品牌型号、故障描述、状态、维修结果、更换配件、收费金额、保修截止、创建时间、完成时间。

**验收标准：**
- 后台可上传维修照片
- Excel 导出包含所有订单字段
- 筛选参数生效

**测试命令：**
```bash
# 上传维修照片
curl -X POST http://localhost:8000/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@repair_photo.jpg"

# 导出 Excel
curl http://localhost:8000/api/export/orders -H "Authorization: Bearer $TOKEN" -o orders.xlsx
```

**风险点：**
- Excel 中文列名需要 openpyxl 支持
- 解决方案：openpyxl 原生支持 Unicode

---

## Phase 7：前端项目骨架

**目标：** React + Vite 项目可启动，基础路由可用。

### Tasks

- [x] **Task 7.1：初始化 React + Vite + TypeScript**

  **Files:**
  - Create: `frontend/package.json`
  - Create: `frontend/vite.config.ts`
  - Create: `frontend/tsconfig.json`
  - Create: `frontend/index.html`

  ```bash
  cd frontend
  npm create vite@latest . -- --template react-ts
  npm install
  npm install react-router-dom axios
  npm install -D tailwindcss @tailwindcss/vite
  ```

- [x] **Task 7.2：配置 Vite**

  **Files:**
  - Modify: `frontend/vite.config.ts`

  ```typescript
  export default defineConfig({
    plugins: [react(), tailwindcss()],
    build: {
      outDir: "../backend/app/static",
      emptyOutDir: true,
    },
    server: {
      proxy: {
        "/api": "http://localhost:8000",
        "/uploads": "http://localhost:8000",
      },
    },
  })
  ```

- [x] **Task 7.3：创建 api/client.ts**

  **Files:**
  - Create: `frontend/src/api/client.ts`

  axios 实例，自动附加 JWT token，401 时跳转登录。

- [x] **Task 7.4：创建类型定义**

  **Files:**
  - Create: `frontend/src/types/order.ts`
  - Create: `frontend/src/types/user.ts`

- [x] **Task 7.5：创建 constants.ts**

  **Files:**
  - Create: `frontend/src/utils/constants.ts`

  ORDER_STATUSES, FOLLOWUP_STATUSES, APPLIANCE_TYPES, STATUS_COLORS。

- [x] **Task 7.6：创建 ProtectedRoute**

  **Files:**
  - Create: `frontend/src/routes/ProtectedRoute.tsx`

  检查 localStorage token，无则跳转 /admin。

- [x] **Task 7.7：创建基础组件**

  **Files:**
  - Create: `frontend/src/components/Button.tsx`
  - Create: `frontend/src/components/Input.tsx`
  - Create: `frontend/src/components/Select.tsx`
  - Create: `frontend/src/components/TextArea.tsx`
  - Create: `frontend/src/components/OrderCard.tsx`
  - Create: `frontend/src/components/StatusBadge.tsx`
  - Create: `frontend/src/components/BottomNav.tsx`
  - Create: `frontend/src/components/ImageUploader.tsx`

- [x] **Task 7.8：配置路由**

  **Files:**
  - Modify: `frontend/src/App.tsx`

  所有路由定义，ProtectedRoute 包裹后台路由。

- [x] **Task 7.9：配置 Tailwind CSS**

  **Files:**
  - Create: `frontend/src/index.css`

  ```css
  @import "tailwindcss";
  ```

**验收标准：**
- `npm run dev` 启动无报错
- 访问 http://localhost:5173 能看到页面
- `/api/health` 通过代理返回 `{"status":"ok"}`

**测试命令：**
```bash
cd frontend
npm run dev
# 浏览器访问 http://localhost:5173
```

**风险点：**
- Tailwind CSS v4 配置方式与 v3 不同
- 解决方案：使用 `@tailwindcss/vite` 插件

---

## Phase 8：客户公开页面

**目标：** 客户报修流程完整可用。

### Tasks

- [x] **Task 8.1：实现 /repair 报修表单**

  **Files:**
  - Create: `frontend/src/pages/RepairForm.tsx`

  表单字段：姓名、手机、小区、详细地址、家电类型（下拉）、品牌型号、故障描述、希望上门时间、是否紧急、上传照片。
  调用 `/api/public/upload` 上传图片，调用 `/api/public/submit` 提交。

- [x] **Task 8.2：实现 ImageUploader 组件**

  **Files:**
  - Modify: `frontend/src/components/ImageUploader.tsx`

  支持选择图片、预览、上传、删除。最多 5 张。

- [x] **Task 8.3：实现 /repair/success 成功页**

  **Files:**
  - Create: `frontend/src/pages/RepairSuccess.tsx`

  显示工单编号、师傅电话、安全提示。使用 router state 或 URL params 获取数据。

- [x] **Task 8.4：实现 /warranty/t/:token 保修查询页**

  **Files:**
  - Create: `frontend/src/pages/WarrantyPage.tsx`

  调用 `/api/warranty/{token}`。展示公开信息。token 不存在显示友好提示。

- [x] **Task 8.5：创建 api/public.ts**

  **Files:**
  - Create: `frontend/src/api/public.ts`

  `submitRepair()`、`uploadImage()` 函数。

- [x] **Task 8.6：创建 api/warranty.ts**

  **Files:**
  - Create: `frontend/src/api/warranty.ts`

  `queryWarranty(token)` 函数。

**验收标准：**
- 客户可以填写报修表单
- 可以上传图片（预览、删除）
- 提交成功后跳转成功页
- 成功页显示工单编号和师傅电话
- 保修查询页展示正确信息
- 保修页不显示客户隐私字段

**测试命令：**
```
浏览器访问 http://localhost:5173/repair
填写表单，上传图片，提交
检查成功页
用返回的 warranty_token 访问 /warranty/t/<token>
```

**风险点：**
- 图片上传需要处理 loading 状态和错误提示
- 解决方案：ImageUploader 组件内处理

---

## Phase 9：老板后台页面

**目标：** 老板可在手机端完成全部订单管理操作。

### Tasks

- [x] **Task 9.1：实现 /admin 登录页**

  **Files:**
  - Create: `frontend/src/pages/AdminLogin.tsx`

  用户名密码表单。登录成功存 token 跳 dashboard。已登录自动跳 dashboard。

- [x] **Task 9.2：实现 api/auth.ts**

  **Files:**
  - Create: `frontend/src/api/auth.ts`

  `login()`、`getMe()`、`logout()` 函数。

- [x] **Task 9.3：实现 useAuth hook**

  **Files:**
  - Create: `frontend/src/hooks/useAuth.ts`

  管理登录状态，提供 `isAuthenticated`、`user`、`login`、`logout`。

- [x] **Task 9.4：实现 /admin/dashboard 首页**

  **Files:**
  - Create: `frontend/src/pages/AdminDashboard.tsx`

  统计卡片（今日预约、新报修、待回访、本月已完成、本月收入）+ 最近订单列表。调用 `/api/orders/dashboard/summary`。

- [x] **Task 9.5：实现 api/orders.ts**

  **Files:**
  - Create: `frontend/src/api/orders.ts`

  `getOrders()`、`getOrder()`、`updateOrder()`、`getTodayOrders()`、`getFollowups()`、`getDashboardSummary()`。

- [x] **Task 9.6：实现 /admin/orders 订单列表**

  **Files:**
  - Create: `frontend/src/pages/OrderList.tsx`

  状态筛选、回访筛选、搜索框、日期筛选、加载更多。订单卡片显示关键信息。

- [x] **Task 9.7：实现 /admin/orders/:id 订单详情**

  **Files:**
  - Create: `frontend/src/pages/OrderDetail.tsx`

  客户信息（一键拨打、一键复制地址）、家电信息、维修记录表单（状态、维修结果、配件、收费、保修、回访、备注、维修照片）。

- [x] **Task 9.8：实现 /admin/today 今日预约**

  **Files:**
  - Create: `frontend/src/pages/TodayOrders.tsx`

  只显示 scheduled_at 为今天的订单。按时间排序。空状态提示。

- [x] **Task 9.9：实现 /admin/followups 待回访**

  **Files:**
  - Create: `frontend/src/pages/FollowupList.tsx`

  已完成且未回访的订单。标记已回访/客户有问题/无需回访。

- [x] **Task 9.10：实现 /admin/profile 我的页面**

  **Files:**
  - Create: `frontend/src/pages/AdminProfile.tsx`

  店铺名称、电话、当前账号、退出登录。

- [x] **Task 9.11：实现 BottomNav 底部导航**

  **Files:**
  - Modify: `frontend/src/components/BottomNav.tsx`

  首页、订单、我的 三个 tab。固定在底部。当前页高亮。

**验收标准：**
- 登录页可用，登录后跳 dashboard
- 首页统计卡片数据正确，点击可跳转
- 订单列表筛选、搜索、加载更多可用
- 订单详情可修改所有字段
- 一键拨打调用系统拨号
- 一键复制地址到剪贴板
- 今日预约只显示今天
- 待回访可标记回访状态
- 底部导航切换正常
- 退出登录清除 token

**测试命令：**
```
浏览器访问 http://localhost:5173/admin
登录后测试各个页面
在手机浏览器中测试布局
```

**风险点：**
- 移动端底部导航需要处理 safe area
- 解决方案：使用 `pb-20` 给页面内容留出底部空间

---

## Phase 10：生产构建与 FastAPI 静态托管

**目标：** 只启动 FastAPI 即可访问全部页面。

### Tasks

- [x] **Task 10.1：验证 Vite 构建输出**

  **Files:**
  - Modify: `frontend/vite.config.ts`（如需调整）

  ```bash
  cd frontend
  npm run build
  ls ../backend/app/static/
  ```

- [x] **Task 10.2：实现 FastAPI 静态文件托管**

  **Files:**
  - Modify: `backend/app/main.py`

  - `/uploads` 挂载 StaticFiles
  - `/` 挂载 StaticFiles（指向 static 目录）
  - SPA fallback：非 `/api/*`、非 `/uploads/*` 的路径返回 `index.html`

- [x] **Task 10.3：测试生产模式**

  验证：
  - `http://localhost:8000/repair` 返回 React 页面
  - `http://localhost:8000/admin` 返回 React 页面
  - `http://localhost:8000/admin/orders/1` 刷新不 404
  - `http://localhost:8000/api/health` 返回 JSON
  - `http://localhost:8000/uploads/xxx.jpg` 返回图片

**验收标准：**
- `npm run build` 输出到 `backend/app/static/`
- 只启动 FastAPI，所有页面可访问
- 刷新前端路由不 404
- API 和 uploads 路径不被 fallback 抢走

**测试命令：**
```powershell
cd frontend
npm run build
cd ../backend
python -m uvicorn app.main:app --port 8000
# 浏览器访问 http://localhost:8000/repair
# 浏览器访问 http://localhost:8000/admin
# 刷新 http://localhost:8000/admin/orders/1
```

**风险点：**
- SPA fallback 可能误拦截 `/api/*`
- 解决方案：中间件中先检查路径前缀

---

## Phase 11：测试与验收

**目标：** v1.0 核心流程完整可用。

### Tasks

- [x] **Task 11.1：测试公开报修流程**

  1. 访问 /repair
  2. 填写表单
  3. 上传图片
  4. 提交
  5. 检查成功页显示 order_no 和 shop_phone
  6. 检查后台订单列表出现新订单

- [x] **Task 11.2：测试登录流程**

  1. 访问 /admin
  2. 输入错误密码 5 次，验证锁定
  3. 输入正确密码登录
  4. 验证跳转 dashboard
  5. 刷新页面，验证仍登录
  6. 退出登录，验证跳转 /admin

- [x] **Task 11.3：测试订单管理流程**

  1. 查看订单列表
  2. 按状态筛选
  3. 搜索客户名
  4. 进入订单详情
  5. 修改状态为"已联系"
  6. 设置预约时间
  7. 填写维修结果
  8. 设置保修截止
  9. 验证 warranty_token 自动生成
  10. 验证 repair_logs 写入

- [x] **Task 11.4：测试今日预约**

  1. 设置某个订单 scheduled_at 为今天
  2. 访问 /admin/today
  3. 验证该订单出现
  4. 设置 scheduled_at 为明天，验证消失

- [x] **Task 11.5：测试待回访**

  1. 将某个订单状态改为"已完成"
  2. 访问 /admin/followups
  3. 验证该订单出现
  4. 标记"已回访"
  5. 验证消失

- [x] **Task 11.6：测试保修查询隐私边界**

  1. 用 warranty_token 访问 /api/warranty/{token}
  2. 验证返回字段不包含：手机号、地址、备注、收费
  3. 用无效 token 访问，验证返回 404

- [x] **Task 11.7：测试 Excel 导出**

  1. 访问 /api/export/orders
  2. 验证下载 .xlsx 文件
  3. 打开验证列名和数据

- [x] **Task 11.8：测试移动端布局**

  1. Chrome DevTools 切换到手机视图
  2. 验证按钮足够大
  3. 验证底部导航固定
  4. 验证表单输入方便
  5. 验证订单卡片可读

- [x] **Task 11.9：测试 SPA 刷新**

  1. 访问 /admin/orders/1
  2. F5 刷新
  3. 验证不 404

**验收标准：** 所有测试项通过。

---

## Phase 12：文档与交付

**目标：** 项目文档完整，可交付使用。

### Tasks

- [x] **Task 12.1：更新 README.md**

  **Files:**
  - Create/Modify: `repair-order-system/README.md`

  内容：
  - 项目简介
  - 技术栈
  - Windows PowerShell 启动说明
  - Linux/macOS 启动说明
  - 生产构建说明
  - 首次部署必须修改 .env
  - 测试账号
  - 备份说明（repair.db + uploads）
  - 后续升级路线

- [x] **Task 12.2：更新 CLAUDE.md**

  **Files:**
  - Modify: `repair-order-system/CLAUDE.md`

  更新 Current Progress Summary：v1.0 开发完成。

- [x] **Task 12.3：更新 docs/PROGRESS.md**

  **Files:**
  - Modify: `repair-order-system/docs/PROGRESS.md`

  记录所有 Phase 完成状态。

- [x] **Task 12.4：更新 docs/TODO.md**

  **Files:**
  - Modify: `repair-order-system/docs/TODO.md`

  标记已完成项，补充后续 TODO。

- [x] **Task 12.5：更新 docs/DECISIONS.md**

  **Files:**
  - Modify: `repair-order-system/docs/DECISIONS.md`

  补充开发过程中的决策记录。

**验收标准：**
- README 包含完整的启动和部署说明
- 所有文档文件内容准确
- .gitignore 正确排除运行时文件

---

## Open Questions / Risks

| # | 问题 | 状态 | 备注 |
|---|------|------|------|
| 1 | Windows 上 bcrypt 编译问题 | 待验证 | 使用 passlib[bcrypt] 应可解决 |
| 2 | Tailwind CSS v4 配置 | 待验证 | 使用 @tailwindcss/vite 插件 |
| 3 | SPA fallback 与 API 路由冲突 | 待实现 | 中间件先检查路径前缀 |
| 4 | 图片移动（temp → orders）原子性 | 待实现 | 使用 shutil.move，失败回滚 |
| 5 | 登录限频内存存储 | 已知限制 | 重启后计数清空，v1.1 持久化 |
| 6 | SQLite 并发写入 | 已知限制 | 小店场景够用，WAL 模式 |

---

## 后续 TODO（v1.1+）

**v1.1（稳定性优先）：**
- [ ] 备份脚本 `scripts/backup.py`（repair.db + uploads/）
- [ ] 临时图片清理脚本（uploads/orders/temp/ 下超过 7 天未绑定订单的图片）
- [ ] 登录失败限频持久化（写入数据库，重启不清空）
- [ ] 修改密码功能（/admin/profile 页面）

**v1.2：**
- [ ] 店铺信息编辑（名称、电话，从 .env 迁移到数据库）
- [ ] 保修二维码生成与下载

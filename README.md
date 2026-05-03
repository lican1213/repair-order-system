# 家电维修工单系统 v1.0

客户扫码报修，老板手机后台管理订单，保修凭证查询。

当前状态：v1.0 开发完成，Codex audit fixes 已完成，建议先交给 Codex 复审；复审 PASS 后进入真机试用。

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React + Vite + TypeScript + Tailwind CSS |
| 后端 | Python FastAPI |
| 数据库 | SQLite |
| 认证 | JWT + bcrypt |
| 部署 | FastAPI 统一服务 |

## 项目结构

```
repair-order-system/
├── backend/           # Python FastAPI 后端
│   ├── app/           # 应用代码
│   ├── data/          # SQLite 数据库
│   ├── uploads/       # 上传图片
│   ├── seed.py        # 测试数据脚本
│   └── requirements.txt
├── frontend/          # React 前端
│   ├── src/           # 源代码
│   └── vite.config.ts
├── docs/              # 项目文档（含 IMPLEMENTATION_PLAN.md 和设计文档）
└── README.md
```

## Windows PowerShell 本地开发

**后端：**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

**前端：**

```powershell
cd frontend
npm install
npm run dev
```

**访问：**

- 客户报修：http://localhost:5173/repair
- 后台登录：http://localhost:5173/admin
- 健康检查：http://localhost:5173/api/health

## Linux/macOS 本地开发

**后端：**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

**前端：**

```bash
cd frontend
npm install
npm run dev
```

## 生产构建

```powershell
cd frontend
npm run build
```

构建输出到 `backend/app/static/`。

然后只启动 FastAPI：

```powershell
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**访问：**

- http://localhost:8000/repair
- http://localhost:8000/admin
- http://localhost:8000/warranty/t/{token}

## 首次部署必须修改 .env

复制 `.env.example` 为 `.env`，然后修改：

```bash
# 生成密钥
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

必须修改的配置项：

- `SECRET_KEY` — 用上面的命令生成
- `ADMIN_PASSWORD` — 修改为强密码
- `SHOP_NAME` — 你的店铺名称
- `SHOP_PHONE` — 你的联系电话

## 测试账号

默认来自 `.env`：

- 用户名：`admin`
- 密码：`ChangeThisStrongPassword123!`

**正式部署必须修改默认密码。**

## 核心功能

**客户端：**
- 报修表单（姓名、手机、小区、地址、家电类型、故障描述、图片）
- 提交成功页（工单编号、师傅电话、安全提示）
- 保修查询页（扫码查看保修凭证）

**老板后台：**
- 登录（JWT 鉴权，30 天有效）
- 首页统计（今日预约、新报修、待回访、本月已完成、本月收入）
- 订单列表（状态筛选、回访筛选、搜索、日期筛选）
- 订单详情（编辑维修记录、设置保修、一键拨打、复制地址）
- 今日预约（基于实际上门时间）
- 待回访（标记已回访/有问题/无需回访）
- Excel 导出（入口位于后台订单列表页 /admin/orders，支持按当前筛选条件导出）
- 我的页面（退出登录）

## 备份说明

必须备份两个目录：

- `backend/data/repair.db` — 数据库
- `backend/uploads/` — 上传图片

只备份数据库不够，因为图片文件存储在 uploads 目录。

## 常用命令

```powershell
# 启动后端
cd backend
python -m uvicorn app.main:app --port 8000

# 启动前端开发
cd frontend
npm run dev

# 构建前端
cd frontend
npm run build

# 生成测试数据
cd backend
python seed.py

# 健康检查与公开店铺信息
curl http://localhost:8000/api/health
curl http://localhost:8000/api/public/shop-info

# 导出 Excel（需先登录获取 token）
# 先登录获取 token，然后：
curl http://localhost:8000/api/export/orders -H "Authorization: Bearer <token>" -o orders.xlsx
```

## 生产部署建议

推荐 Caddy + HTTPS：

```
your-domain.com {
    reverse_proxy 127.0.0.1:8000
}
```

FastAPI 监听 127.0.0.1:8000，Caddy 负责 HTTPS 和反向代理。

systemd 管理 FastAPI 进程：

```ini
[Unit]
Description=Repair Order System
After=network.target

[Service]
WorkingDirectory=/path/to/backend
EnvironmentFile=/path/to/backend/.env
ExecStart=/path/to/backend/.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

## 已知限制

- 登录失败锁定使用内存存储，服务重启后清空
- SQLite 适合小店场景，不适合高并发
- 图片临时目录清理脚本暂未实现
- 店铺信息编辑暂未实现，后台“我的”页面展示信息来自 `.env` 的 `SHOP_NAME` / `SHOP_PHONE`
- 保修二维码下载暂未实现
- 微信小程序暂未实现

## 后续升级路线

**v1.1：**
- 登录失败限频持久化
- 临时图片清理
- 备份脚本

**v1.2：**
- 修改密码
- 店铺信息编辑
- 保修二维码生成与下载

**v1.3：**
- 微信小程序版本

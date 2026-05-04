# 家电维修工单系统 v1.3

客户扫码报修，老板手机后台管理订单，保修凭证查询，并提供极简二手家电展示橱窗。

当前状态：v1.3 二手家电展示橱窗已实现（2026-05-04）。v1.1 已完成并通过 Codex 审计；线上灰度阶段已新增清洗服务价格表 `/pricing`；v1.3 新增公开 `/used` 和后台 `/admin/used-appliances`。二手家电仅展示和电话咨询，不做在线交易、支付、购物车、客户留言或商城系统。

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
- 清洗服务价格表：http://localhost:5173/pricing
- 二手家电展示：http://localhost:5173/used
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
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

**访问：**

- http://localhost:8000/repair
- http://localhost:8000/pricing
- http://localhost:8000/used
- http://localhost:8000/admin
- http://localhost:8000/admin/used-appliances
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

地址由客户手动填写小区和详细地址，师傅上门前电话确认。正式部署版不需要配置地图 Key 或逆地理编码服务。

## 测试账号

默认来自 `.env`：

- 用户名：`admin`
- 密码：`ChangeThisStrongPassword123!`

**正式部署必须修改默认密码。**

## 核心功能

**客户端：**
- 报修表单（姓名、手机、小区、地址、家电类型、故障描述、图片）
- 清洗服务价格表（`/pricing`，只展示起步参考价，不是最终报价）
- 二手家电展示（`/used`，只展示在售商品，电话咨询，不在线交易）
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
- 二手家电管理（`/admin/used-appliances`，发布、编辑、标记在售/已售/下架）
- 我的页面（退出登录）

## 备份说明

必须备份两个目录：

- `backend/data/repair.db` — 数据库
- `backend/uploads/` — 上传图片

只备份数据库不够，因为图片文件存储在 uploads 目录。

一键备份：

```powershell
python scripts/backup.py
```

`scripts/backup.py` 默认保留最近 7 份备份。服务器部署时建议使用 cron 每天 03:00 自动备份，并定期将 `backups/` 下载到本地或网盘：

```cron
0 3 * * * cd /home/youruser/repair-order-system && /home/youruser/repair-order-system/backend/.venv/bin/python scripts/backup.py >> logs/backup.log 2>&1
```

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
curl http://localhost:8000/api/used-appliances

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

生产环境边界：

- 域名 DNS A 记录指向服务器公网 IP。
- Caddy 监听 `80/443`，负责 HTTPS 和反向代理。
- Caddy `reverse_proxy 127.0.0.1:8000`。
- FastAPI 由 systemd 启动并监听 `127.0.0.1:8000`。
- 不直接开放 `8000` 到公网。
- 安全组/防火墙只开放 `22`、`80`、`443`。

完整步骤见 `docs/DEPLOYMENT_RUNBOOK.md`。

**安全提示：** 公开接口限频使用 `X-Forwarded-For` 头识别客户端 IP。必须通过反向代理（Caddy/Nginx）暴露服务，且 FastAPI 只监听 `127.0.0.1`。若直接将 FastAPI 暴露到公网，客户端可伪造该头绕过 IP 限频。

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
- 店铺信息编辑暂未实现，后台”我的”页面展示信息来自 `.env` 的 `SHOP_NAME` / `SHOP_PHONE`
- 保修二维码下载暂未实现
- 微信小程序暂未实现
- 公开接口限频数据存内存，服务重启后清空（可接受行为）
- 修改密码后旧 JWT Token 在 30 天有效期内仍可用（已知限制，见 D-055）

## 后续升级路线

**v1.1（稳定性优先）— ✅ 已完成（2026-05-03）：**
- ✅ 备份脚本（repair.db + uploads/，可选 zip 压缩，可选保留份数）
- ✅ 临时图片清理（temp 目录 7 天过期清理，支持 --dry-run）
- ✅ 公开接口限频（upload 10次/分/IP，submit 5次/分/IP + 3次/10分/手机号，内存实现）
- ✅ 修改密码（/admin/profile 页面，旧密码验证 + bcrypt 更新）

**v1.2：**
- 店铺信息编辑
- 保修二维码生成与下载

**v1.3（二手家电展示橱窗）— ✅ 已完成（2026-05-04）：**
- ✅ 公开 `/used` 展示在售二手家电
- ✅ 后台 `/admin/used-appliances` 发布、编辑、下架
- ✅ 后台 `/api/upload/used` 上传商品图片
- ✅ 只做展示橱窗和电话咨询，不做交易闭环

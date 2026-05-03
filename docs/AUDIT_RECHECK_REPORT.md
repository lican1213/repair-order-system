# Audit Recheck Report

## 1. Summary

**结论：PASS**

本轮 targeted recheck 对 Codex v1.0 audit 建议的 8 个修复项 + 2 个 smoke test 项进行了独立复核。10 项全部通过。

核心修复均已生效：fresh deploy 下 `/uploads` 正常挂载、`image_paths` 存入合法 JSON、lint/build 通过、bcrypt 直接声明、`/admin/profile` 从后端读取店铺信息、项目内文档已归档、标准端口 smoke test 全部通过。发现 AGENTS.md 残留冲突进度表一处文档清理遗漏，已当场修复。建议进入真机试用。

## 2. Commands Run

```powershell
# Lint check
cd frontend && npm run lint

# Build check
cd frontend && npm run build

# Fresh deploy test
cd backend
Rename-Item backend/uploads backend/uploads.bak
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
Invoke-WebRequest http://127.0.0.1:8000/api/health
Invoke-WebRequest http://127.0.0.1:8000/uploads/not-found.jpg

# API smoke test (19 tests via Python script)
.\.venv\Scripts\python.exe -m pip install requests
.\.venv\Scripts\python.exe temp_smoke_test.py

# Frontend smoke test
cmd /c "npm run dev -- --host 127.0.0.1"
# Tested: /repair, /admin, /admin/profile, Vite proxy /api/health,
#         proxy /api/public/shop-info, proxy /api/warranty/{token}
```

完整 API smoke test 测试了以下接口：

| 接口 | 方法 | 验证点 |
|------|------|--------|
| `/api/health` | GET | 200, `{"status":"ok"}` |
| `/api/public/shop-info` | GET | 200, 只返回 shop_name/shop_phone, 不泄露敏感配置 |
| `/api/auth/login` | POST | 200, 返回 access_token |
| `/api/auth/me` | GET | 200, 返回 username=admin |
| `/api/public/upload` | POST | 200, 上传测试图片成功 |
| `/api/public/submit` | POST | 200, 创建订单，image_paths 为合法 JSON |
| `/api/orders` | GET | 200 (需 JWT), 401 (无 JWT) |
| `/api/warranty/{token}` | GET | 200, 不泄露 phone/address/final_fee |
| `/api/export/orders` | GET | 200 (需 JWT), 401 (无 JWT), Content-Type 为 xlsx |

## 3. Rechecked Items

### Item 1: Fresh deploy 下 /uploads 是否第一次启动就可用

**结果：PASS**

- `backend/app/main.py` L102：在 `app.mount()` 之前调用 `UPLOADS_DIR.mkdir(parents=True, exist_ok=True)` 创建目录
- L103-107：使用 `StaticFiles(directory=str(UPLOADS_DIR), check_dir=False)` 无条件挂载
- 实测：临时重命名 `backend/uploads/` 为 `uploads.bak`，启动后端后 `uploads/` 目录自动创建
- `/uploads/not-found.jpg` 返回 404（Content-Type: application/json），不是 React HTML
- `/api/health` 返回 `{"status":"ok"}`（200）
- SPA fallback 中间件（L121）正确跳过 `/uploads/*` 路径

### Item 2: image_paths 是否为合法 JSON 数组字符串

**结果：PASS**

- `backend/app/routers/public.py` L149：使用 `json.dumps(final_image_paths, ensure_ascii=False)` 存储
- 实测：提交报修后查询 `orders.image_paths`，值为 `["/uploads/orders/S6Q8eqLUYGCVB22sg39nww.jpg"]`
- `json.loads()` 成功解析
- 不是 Python list 字符串格式（不以 `['` 开头）
- 历史兼容：`backend/app/json_utils.py` 提供 `parse_json_array_text()`，fallback 使用 `ast.literal_eval()` 安全解析历史 Python list 字符串
- `schemas.py` L111-114：`OrderResponse` 的 `image_paths` / `repair_images` 通过 `@field_validator` 调用 `normalize_json_array_text()` 统一规范化输出

### Item 3: npm run lint 是否通过

**结果：PASS**

- 命令：`cd frontend && npm run lint` → exit 0, 无任何 error 输出
- 未发现大面积 `eslint-disable` 掩盖问题
- 前端类型文件 `ShopInfoResponse` 已定义（`frontend/src/types/public.ts`）

### Item 4: npm run build 是否通过

**结果：PASS**

- 命令：`cd frontend && npm run build` → exit 0
- `tsc -b` 无 TypeScript 错误
- Vite build 输出到 `backend/app/static/`：`index.html`（0.45 kB）、CSS（17.92 kB）、JS（313.42 kB）
- 构建时间 119ms

### Item 5: requirements.txt 是否直接声明 bcrypt

**结果：PASS**

- `backend/requirements.txt` L8：直接声明 `bcrypt`
- `backend/app/main.py` L52：`import bcrypt`，使用 `bcrypt.hashpw()` / `bcrypt.gensalt()`
- 认证代码不通过 passlib 调用 bcrypt
- `docs/DECISIONS.md` D-032 已记录 bcrypt/passlib 兼容处理决策

### Item 6: /admin/profile 是否显示后端 .env 的 SHOP_NAME 和 SHOP_PHONE

**结果：PASS**

- 后端新增 `GET /api/public/shop-info`（`public.py` L32-38），返回 `ShopInfoResponse`（只含 `shop_name` 和 `shop_phone`）
- `schemas.py` L59-61：`ShopInfoResponse` 仅定义 `shop_name: str` 和 `shop_phone: str`，无敏感字段
- 前端 `frontend/src/api/public.ts` L24-27：`getShopInfo()` 调用 `/api/public/shop-info`
- `frontend/src/pages/AdminProfile.tsx` L19-33：通过 `useEffect` 调用 `getShopInfo()` 获取店铺信息，不再硬编码
- 实测：API 返回 `{"shop_name":"诚信家电维修","shop_phone":"13800138000"}`（来自 `config.py` 默认值/.env 覆盖）
- 安全验证：响应中不含 `SECRET_KEY`、`ADMIN_USERNAME`、`ADMIN_PASSWORD`、`DATABASE_URL`

### Item 7: CLAUDE.md 是否不再有冲突进度表

**结果：PASS（含现场修复）**

- `CLAUDE.md`（129 行）：L86-103 仅有一个准确的进度表（Phase 0-12 全部"完成"），v1.0 交付状态说明准确，无旧"未开始"表格 ✓
- **`AGENTS.md`：首次检查时 L118-127 残留旧的 Phase 3-12 "未开始"表格** ✗ → 已当场删除修复 ✓
  - 该表格与 L84-98 的正确进度表直接矛盾，可能误导后续 agent
  - 修复：删除 L118-127 共 10 行旧表格，修复后 AGENTS.md 干净（125 行）

### Item 8: 项目内 docs 是否已归档 IMPLEMENTATION_PLAN.md 和设计文档

**结果：PASS**

- `docs/IMPLEMENTATION_PLAN.md`：存在 ✓
- `docs/superpowers/specs/2026-05-03-repair-order-system-design.md`：存在 ✓
- `README.md` L30：`docs/` 目录说明中注明了包含 IMPLEMENTATION_PLAN.md 和设计文档
- `docs/DECISIONS.md` D-033 记录了归档决策

### Item 9: 标准端口 smoke test

**结果：PASS**

- 端口 8000 干净（无历史 uvicorn 占用）
- 后端启动：`uvicorn app.main:app --port 8000` → 正常
- `/api/health`（8000）：200 ✓
- 前端启动：`npm run dev -- --host 127.0.0.1` → 5173 正常
- Vite proxy 正常：`/api/health`（5173）→ 200 ✓
- 前端路由正常：`/repair`、`/admin`、`/admin/profile` → 200 ✓
- Proxy 店铺信息：`/api/public/shop-info` → 返回正确 shop_name/shop_phone ✓
- Proxy 保修查询：`/api/warranty/{token}` → 200 ✓

### Item 10: 核心 API smoke test

**结果：PASS（19/19）**

所有核心 API 正常：

| 接口 | 公开/需登录 | 结果 |
|------|------------|------|
| `GET /api/health` | 公开 | PASS |
| `GET /api/public/shop-info` | 公开 | PASS |
| `POST /api/auth/login` | 公开 | PASS |
| `GET /api/auth/me` | 需 JWT | PASS |
| `POST /api/public/upload` | 公开 | PASS |
| `POST /api/public/submit` | 公开 | PASS |
| `GET /api/orders` | 需 JWT | PASS |
| `GET /api/orders` (no auth) | — | PASS (401) |
| `GET /api/warranty/{token}` | 公开 | PASS |
| `GET /api/export/orders` | 需 JWT | PASS |
| `GET /api/export/orders` (no auth) | — | PASS (401) |

安全验证：
- 公开接口无需 JWT ✓
- 后台接口无 token 返回 401 ✓
- 保修接口不泄露 phone/address/final_fee ✓
- shop-info 不泄露 SECRET_KEY/DATABASE_URL/ADMIN_PASSWORD ✓

## 4. Remaining Issues

本轮 recheck 未发现新的 Critical 或 High 级别问题。AGENTS.md 冲突表已在复核过程中当场修复。

原 Codex audit report 中的 Low 级别问题（公开上传未校验真实图片内容、历史端口进程残留）仍为已知限制，不在本轮 recheck 范围内，属于后续安全增强 backlog。

## 5. Final Recommendation

**PASS：可以进入真机试用。**

操作建议：

1. **真机试用**：在舅舅手机上测试完整流程（扫码报修 → 后台接单 → 维修记录 → 保修查询）
2. **v1.1 backlog**：登录限频持久化、临时图片清理、备份脚本
3. **后续安全增强**：公开上传增加真实图片内容校验

核心功能验证结论：v1.0 audit fixes 中 8 项修复均已生效，代码质量门禁（lint + build）通过，API 和前端 smoke test 全部通过。AGENTS.md 冲突表已在复核中修复。系统可以进入真机试用阶段。

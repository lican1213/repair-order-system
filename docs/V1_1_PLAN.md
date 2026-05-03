# v1.1 实施计划

> **版本目标：** 稳定性、安全、备份和轻量维护
> **创建日期：** 2026-05-03
> **状态：** ✅ 已完成（2026-05-03），Codex 审计 PASS（见 `docs/V1_1_AUDIT_REPORT.md`）

---

## 1. v1.1 目标

v1.1 不新增业务功能，专注于四项运维和安全增强：

1. **备份脚本** — 一键备份数据库和图片，防止数据丢失
2. **临时图片清理** — 自动清理 temp 目录过期文件，防止磁盘膨胀
3. **公开接口限频** — 防止恶意刷接口，保护服务可用性
4. **修改密码** — 后台可修改管理员密码，不再依赖 .env 文件

---

## 2. 明确不做的功能

| 不做 | 理由 |
|------|------|
| 微信小程序 | 架构复杂度远超 v1.1 范围 |
| AI 客服/诊断/报价 | 项目边界明确排除 |
| 库存管理 | 非核心需求 |
| 多员工/角色权限 | 单人使用场景 |
| 会员系统 | 非核心需求 |
| 在线支付 | 涉及资金安全，单独规划 |
| 复杂统计大屏 | 当前 dashboard 够用 |
| 找回密码/短信验证 | 增加复杂度，单人场景无必要 |
| Redis 或其他外部依赖 | 保持零外部依赖 |
| 登录失败限频持久化 | 内存方案够用，重启后锁定自动解除是可接受行为 |
| 店铺信息编辑 | 保留到 v1.2 |
| 保修二维码 | 保留到 v1.2 |
| 定时任务/系统服务 | 备份和清理通过手动或 cron 触发即可 |

---

## 3. 任务拆分

### Task 1：备份脚本

**目标：** 创建 `scripts/backup.py`，一键备份数据库和图片目录。

**涉及文件：**

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `scripts/backup.py` | 备份脚本主文件 |
| 修改 | `.gitignore` | 添加 `backups/` 目录（与脚本同 Phase 提交） |

**数据库修改：** 无

**API 修改：** 无

**前端修改：** 无

**实现要点：**
- 备份 `backend/data/repair.db`（SQLite 数据库文件）
- 备份 `backend/uploads/`（全部图片，含 orders/ 和 warranty/ 子目录）
- 输出到 `backups/YYYYMMDD_HHMMSS/` 目录（项目根目录下）
- 默认使用 `shutil.copytree` + `shutil.copy2`，保留文件元数据
- 可选 `--zip` 参数将备份目录压缩为 `backups/YYYYMMDD_HHMMSS.zip`，压缩后删除原始目录
- 可选 `--keep N` 参数只保留最近 N 份备份，默认保留 10 份
- 备份前检查源目录是否存在，不存在则报错退出
- 备份前检查目标磁盘可用空间，空间不足时警告并退出（使用 `shutil.disk_usage`）
- 备份完成后打印摘要：备份路径、文件数量、总大小
- 脚本通过 `python scripts/backup.py` 运行，也可通过 `python scripts/backup.py --zip` 压缩运行
- 使用 `pathlib.Path` 处理路径，兼容 Windows 和 Linux

**验收标准：**
1. `python scripts/backup.py` 成功执行，在 `backups/` 下生成带时间戳的目录
2. 备份目录包含 `repair.db` 文件
3. 备份目录包含 `uploads/` 完整目录结构
4. `python scripts/backup.py --zip` 生成 `.zip` 文件，原始目录被清理
5. `python scripts/backup.py --keep 3` 只保留最近 3 份备份
6. 源目录不存在时脚本报错退出，不产生空备份
7. Windows 和 Linux 路径均正常工作

**测试命令：**
```powershell
# 基本备份
cd "E:\claude code project 1\repair-order-system"
python scripts/backup.py

# 检查输出
dir backups/

# 压缩备份
python scripts/backup.py --zip
dir backups/*.zip

# 保留份数
python scripts/backup.py --keep 3
dir backups/

# 错误场景：重命名 data 目录后运行，应报错
```

---

### Task 2：临时图片清理脚本

**目标：** 创建 `scripts/cleanup_temp_images.py`，清理 `uploads/orders/temp/` 下超过 7 天的临时图片。

**涉及文件：**

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `scripts/cleanup_temp_images.py` | 清理脚本主文件 |

**数据库修改：** 无

**API 修改：** 无

**前端修改：** 无

**实现要点：**
- 扫描 `backend/uploads/orders/temp/` 目录
- 只清理文件修改时间（`mtime`）超过 7 天的文件
- 7 天阈值可选通过 `--days N` 参数自定义
- **安全边界：** 只操作 `uploads/orders/temp/`，绝不得删除 `uploads/orders/` 下的正式订单图片
- **安全边界：** 只操作 `uploads/orders/temp/`，绝不得删除 `uploads/warranty/` 下的图片
- 使用 `shutil.rmtree` 或 `Path.unlink` 删除文件
- 删除前打印将要删除的文件列表（dry-run 模式通过 `--dry-run` 参数）
- 删除后打印摘要：删除文件数、释放空间大小
- 如果 temp 目录为空或不存在，直接打印"无需清理"并正常退出
- 脚本通过 `python scripts/cleanup_temp_images.py` 运行
- 使用 `pathlib.Path` 和 `time.time()` 计算文件年龄，不引入额外依赖

**验收标准：**
1. `python scripts/cleanup_temp_images.py` 扫描 temp 目录并清理过期文件
2. 7 天内的临时文件不被删除
3. `uploads/orders/` 下的正式图片不受影响
4. `uploads/warranty/` 下的图片不受影响
5. `--dry-run` 只打印不删除
6. `--days 3` 将阈值改为 3 天
7. temp 目录为空时正常退出
8. temp 目录不存在时正常退出

**测试命令：**
```powershell
cd "E:\claude code project 1\repair-order-system"

# 创建测试用旧文件
python -c "
import os, time
temp = 'backend/uploads/orders/temp'
os.makedirs(temp, exist_ok=True)
# 创建一个 8 天前的文件
old_file = os.path.join(temp, 'old_test.jpg')
with open(old_file, 'wb') as f: f.write(b'test')
os.utime(old_file, (time.time() - 8*86400, time.time() - 8*86400))
# 创建一个新文件
new_file = os.path.join(temp, 'new_test.jpg')
with open(new_file, 'wb') as f: f.write(b'test')
print('Created old_test.jpg (8 days old) and new_test.jpg (just now)')
"

# dry-run 模式
python scripts/cleanup_temp_images.py --dry-run

# 执行清理
python scripts/cleanup_temp_images.py

# 验证：新文件应保留，旧文件应删除
dir backend\uploads\orders\temp\

# 清理测试文件
del backend\uploads\orders\temp\new_test.jpg
```

---

### Task 3：公开接口限频

**目标：** 对 `/api/public/upload` 和 `/api/public/submit` 实施内存限频，防止恶意刷接口。

**涉及文件：**

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `backend/app/rate_limit.py` | 限频工具模块 |
| 修改 | `backend/app/routers/public.py` | 在 upload 和 submit 端点应用限频 |

**数据库修改：** 无

**API 修改：** 无新增接口，现有接口增加 429 响应

**前端修改：** 需确认 RepairForm.tsx 的 catch 块能正确展示 429 错误消息（axios 拦截器只处理 401，429 会作为 reject 传播到组件层）

**限频规则：**

| 接口 | 维度 | 限制 | 窗口 |
|------|------|------|------|
| `/api/public/upload` | 同 IP | 10 次/分钟 | 滑动窗口 |
| `/api/public/submit` | 同 IP | 5 次/分钟 | 滑动窗口 |
| `/api/public/submit` | 同手机号 | 3 次/10 分钟 | 滑动窗口 |

**实现要点：**
- 使用 Python 字典存储 `{key: [timestamp1, timestamp2, ...]}` 实现滑动窗口计数
- `rate_limit.py` 导出 `RateLimiter` 类，提供 `check(key, limit, window_seconds)` 方法
- 获取客户端 IP：优先读取 `X-Forwarded-For` 头（反向代理场景），回退到 `request.client.host`
- 手机号从请求 body 中提取（submit 请求为 JSON，需先解析）
- 超限时返回 HTTP 429，响应体 `{"detail": "请求过于频繁，请稍后再试"}`
- 限频数据存内存，服务重启后自动清空（可接受行为）
- 不使用 Redis，不引入任何新依赖
- 定期清理过期记录（每次 check 时顺带清理，防止内存泄漏）
- `RateLimiter` 作为模块级单例实例化

**RateLimiter 设计：**

```python
class RateLimiter:
    def __init__(self):
        self._records: dict[str, list[float]] = {}

    def check(self, key: str, limit: int, window_seconds: int) -> bool:
        """检查是否允许请求。返回 True 表示允许，False 表示超限。"""
        now = time.time()
        cutoff = now - window_seconds
        # 清理过期记录
        if key in self._records:
            self._records[key] = [t for t in self._records[key] if t > cutoff]
            # 键值列表为空时删除键，防止字典无限膨胀
            if not self._records[key]:
                del self._records[key]
        # 检查是否超限
        if key not in self._records:
            self._records[key] = []
        if len(self._records[key]) >= limit:
            return False
        # 记录本次请求
        self._records[key].append(now)
        return True
```

**注意：** FastAPI 的 async 端点中，`self._records[key].append(now)` 不是原子操作。理论上两个并发请求可能同时读到相同的 `len()` 并都追加，导致略微超过限额。对于小店场景此竞态影响可忽略，不引入 `asyncio.Lock`。

**public.py 修改要点：**
- `upload_images` 端点：在文件校验之前，先检查 IP 限频
- `submit_repair` 端点：在业务逻辑之前，先检查 IP 限频 + 手机号限频
- 端点函数签名增加 `request: Request` 参数（FastAPI 自动注入）
- submit 端点的手机号限频需要先读取 request body，FastAPI 的 `req: RepairSubmitRequest` 已经解析了 body，直接用 `req.phone` 即可

**验收标准：**
1. 同 IP 快速调用 `/api/public/upload` 超过 10 次后返回 429
2. 同 IP 快速调用 `/api/public/submit` 超过 5 次后返回 429
3. 同手机号 10 分钟内调用 `/api/public/submit` 超过 3 次后返回 429
4. 不同 IP 之间的限频互不影响
5. 等待窗口过期后可正常请求
6. 服务重启后限频计数自动清空
7. 不影响正常用户的正常使用
8. 429 响应格式与现有错误格式一致

**Lint 检查：**
```powershell
cd frontend
npm run lint
```
预期：无新增 lint 错误

**测试命令：**
```powershell
cd "E:\claude code project 1\repair-order-system"

# 启动后端
cd backend
python -m uvicorn app.main:app --port 8000

# 测试 upload 限频（另一个终端）
# 快速发送 11 次上传请求，第 11 次应返回 429
for i in 1 2 3 4 5 6 7 8 9 10 11; do
  curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/api/public/upload -F "file=@test.jpg"
  echo ""
done

# 测试 submit IP 限频
# 快速发送 6 次报修，第 6 次应返回 429
for i in 1 2 3 4 5 6; do
  curl -s -w "\n%{http_code}" -X POST http://localhost:8000/api/public/submit \
    -H "Content-Type: application/json" \
    -d '{"customer_name":"test","phone":"13800000001","community":"test","address":"test","appliance_type":"空调","fault_description":"test"}'
done

# 测试手机号限频（同手机号 3 次/10 分钟）
# 用不同 IP 或等窗口过期后再测试
```

---

### Task 4：修改密码

**目标：** 在 `/admin/profile` 页面增加修改密码入口，后端验证旧密码并更新。

**涉及文件：**

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `backend/app/routers/password.py` | 新增修改密码路由 |
| 修改 | `backend/app/main.py` | 注册 password 路由 |
| 修改 | `backend/app/schemas.py` | 新增 ChangePasswordRequest |
| 修改 | `frontend/src/api/auth.ts` | 新增 changePassword API 调用 |
| 修改 | `frontend/src/pages/AdminProfile.tsx` | 增加修改密码 UI |

**数据库修改：** 无（users 表已有 `password_hash` 字段）

**API 修改：** 新增 1 个接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/change-password` | 修改密码（需 JWT） |

**前端修改：** AdminProfile.tsx 增加修改密码区域

**后端接口设计：**

```
POST /api/auth/change-password
Authorization: Bearer <token>

请求体:
{
  "old_password": "当前密码",
  "new_password": "新密码",
  "confirm_password": "确认新密码"
}

成功响应 200:
{"message": "密码修改成功，请重新登录"}

错误响应:
400: 新密码与确认密码不一致
401: 旧密码错误
422: 新密码不符合要求（至少 6 位）
```

**实现要点：**
- 新建 `backend/app/routers/password.py`，包含 `change_password` 端点
- 端点需要 JWT 认证（`current_user: User = Depends(get_current_user)`）
- 使用 `verify_password` 验证旧密码
- 新密码校验：至少 6 位，不得与旧密码相同
- 使用 `hash_password` 生成新 hash，更新 `user.password_hash`
- User 模型没有 `updated_at` 字段，无需更新
- 修改成功后返回 200，前端收到后清除 token 并跳转登录页
- `ChangePasswordRequest` schema 包含 `old_password`、`new_password`、`confirm_password` 三个字段
- 在 `schemas.py` 中添加 `ChangePasswordRequest`，使用 Pydantic `model_validator` 校验 new_password == confirm_password
- 在 `main.py` 中注册新路由：`app.include_router(password.router, prefix="/api/auth", tags=["认证"])`

**前端实现要点：**
- AdminProfile.tsx 增加"修改密码"卡片区域
- 包含三个输入框：旧密码、新密码、确认新密码
- 输入框类型为 `type="password"`
- "确认修改"按钮，点击后调用 API
- 成功后显示提示，清除 token，跳转 `/admin`（登录页）
- 失败后显示错误信息（旧密码错误、密码不一致等）
- 可折叠/展开设计，默认收起，不占用过多页面空间
- `frontend/src/api/auth.ts` 新增 `changePassword(data)` 函数

**验收标准：**
1. `/admin/profile` 页面显示"修改密码"入口
2. 输入正确旧密码 + 新密码 + 确认密码，提交成功
3. 修改成功后自动退出登录，跳转到登录页
4. 用新密码可正常登录
5. 旧密码不再有效
6. 旧密码错误时返回 401 并显示提示
7. 新密码与确认密码不一致时前端阻止提交
8. 新密码少于 6 位时前端阻止提交
9. 刷新页面后修改密码区域仍可用

**Lint 检查：**
```powershell
cd frontend
npm run lint
npm run build
```
预期：无 TS 错误，无 lint 错误

**测试命令：**
```powershell
cd "E:\claude code project 1\repair-order-system\backend"

# 启动后端
python -m uvicorn app.main:app --port 8000

# 登录获取 token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"ChangeThisStrongPassword123!"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 修改密码（旧密码错误）
curl -s -X POST http://localhost:8000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"old_password":"wrong","new_password":"NewPass123!","confirm_password":"NewPass123!"}'
# 预期: 401

# 修改密码（成功）
curl -s -X POST http://localhost:8000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"old_password":"ChangeThisStrongPassword123!","new_password":"NewPass123!","confirm_password":"NewPass123!"}'
# 预期: 200 {"message":"密码修改成功，请重新登录"}

# 用新密码登录
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"NewPass123!"}'
# 预期: 200 {"access_token":"..."}

# 用旧密码登录
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"ChangeThisStrongPassword123!"}'
# 预期: 401
```

---

### Task 5：回归测试与文档更新

**目标：** 全量回归测试 + 更新项目文档。

**涉及文件：**

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `README.md` | 更新版本号、已知限制、后续升级路线 |
| 修改 | `AGENTS.md` | 更新 v1.1 路线图状态、与 V1_1_PLAN.md 对齐 |
| 修改 | `docs/RELEASE_NOTES.md` | 追加 v1.1 release notes |
| 修改 | `docs/API_SPEC.md` | 追加 change-password 接口文档 |
| 修改 | `docs/PROGRESS.md` | 追加 v1.1 Phase 进度 |
| 修改 | `docs/TODO.md` | 整理 v1.1 完成项和剩余 backlog |
| 修改 | `docs/DECISIONS.md` | 追加 v1.1 决策记录 |
| 修改 | `CLAUDE.md` | 更新进度摘要和版本状态 |

**数据库修改：** 无

**API 修改：** 无

**前端修改：** 无

**验收标准：**
1. v1.0 核心流程全部正常（报修、登录、订单管理、今日预约、待回访、保修查询、Excel 导出）
2. v1.1 四项新功能全部正常
3. `npm run build` 无错误
4. `npm run lint` 无错误
5. 文档与实际功能一致

**测试命令：**
```powershell
cd "E:\claude code project 1\repair-order-system"

# 前端构建
cd frontend
npm run build

# 前端 lint
npm run lint

# 后端启动
cd ../backend
python -m uvicorn app.main:app --port 8000

# 核心流程 smoke test
curl http://localhost:8000/api/health
curl http://localhost:8000/api/public/shop-info

# 备份脚本
cd ..
python scripts/backup.py

# 清理脚本
python scripts/cleanup_temp_images.py --dry-run

# 登录 + 修改密码（完整流程见 Task 4 测试命令）
```

---

## 4. 数据库修改总结

| 任务 | 是否需要修改数据库 | 说明 |
|------|-------------------|------|
| Task 1 备份脚本 | 否 | 只读取数据库文件 |
| Task 2 临时图片清理 | 否 | 只操作文件系统 |
| Task 3 公开接口限频 | 否 | 限频数据存内存 |
| Task 4 修改密码 | 否 | users 表已有 password_hash 字段 |
| Task 5 文档更新 | 否 | 无代码变更 |

**v1.1 不需要任何数据库迁移。**

---

## 5. API 修改总结

| 任务 | 新增接口 | 修改接口 | 说明 |
|------|---------|---------|------|
| Task 1 备份脚本 | 无 | 无 | 脚本独立运行 |
| Task 2 临时图片清理 | 无 | 无 | 脚本独立运行 |
| Task 3 公开接口限频 | 无 | `/api/public/upload`, `/api/public/submit` | 增加 429 响应 |
| Task 4 修改密码 | `POST /api/auth/change-password` | 无 | 新增接口 |

---

## 6. 前端修改总结

| 任务 | 是否需要修改前端 | 说明 |
|------|-----------------|------|
| Task 1 备份脚本 | 否 | 后端脚本 |
| Task 2 临时图片清理 | 否 | 后端脚本 |
| Task 3 公开接口限频 | 需确认 | 429 会传播到 RepairForm.tsx 的 catch 块，需确认错误消息展示正确 |
| Task 4 修改密码 | 是 | AdminProfile.tsx 增加修改密码 UI + auth.ts 增加 API 调用 |

---

## 7. 风险点

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 备份脚本路径在 Windows/Linux 不一致 | 备份失败 | 使用 `pathlib.Path` 处理路径，BASE_DIR 基于脚本位置计算 |
| 临时图片清理误删正式图片 | 数据丢失 | 脚本硬编码只扫描 `uploads/orders/temp/`，绝对路径校验，`--dry-run` 先试运行 |
| 限频误判正常用户 | 用户体验差 | 阈值设置宽松（10次/分上传、5次/分报修），窗口期短 |
| 内存限频服务重启后清零 | 限频状态丢失 | 可接受行为，小店场景重启频率低 |
| 修改密码后 .env 中旧密码仍存在 | 配置不一致 | 文档说明修改密码后 .env 的 ADMIN_PASSWORD 仅用于首次创建，不影响已修改的密码 |
| 反向代理未设置 X-Forwarded-For | 限频获取不到真实 IP | 文档说明需在 Caddy/Nginx 中配置 `header_up X-Forwarded-For` |

---

## 8. 回滚方式

### Task 1 备份脚本
- 删除 `scripts/backup.py` 和 `backups/` 目录
- 不影响任何现有功能

### Task 2 临时图片清理
- 删除 `scripts/cleanup_temp_images.py`
- 不影响任何现有功能

### Task 3 公开接口限频
- 删除 `backend/app/rate_limit.py`
- 还原 `backend/app/routers/public.py`（移除限频相关 import 和调用）
- 不影响数据库和前端

### Task 4 修改密码
- 删除 `backend/app/routers/password.py`
- 还原 `backend/app/main.py`（移除 profile 路由注册）
- 还原 `backend/app/schemas.py`（移除 ChangePasswordRequest）
- 还原 `frontend/src/api/auth.ts`（移除 changePassword）
- 还原 `frontend/src/pages/AdminProfile.tsx`（移除修改密码 UI）
- 不影响数据库

### 整体回滚
```powershell
git log --oneline  # 找到 v1.1 之前的最后一个 commit
git revert <commit-hash>  # 逐个 revert
# 或
git checkout <v1.0-tag> -- .  # 一次性还原全部文件
```

**建议：每个 Task 完成后单独 commit，方便精确回滚。**

---

## 9. 推荐实施顺序

```
Phase 1: 备份脚本 (Task 1)
  ↓ 无依赖，独立运行，先确保数据安全
Phase 2: 临时图片清理 (Task 2)
  ↓ 无依赖，独立运行，维护磁盘健康
Phase 3: 公开接口限频 (Task 3)
  ↓ 修改后端 public.py，需回归测试公开接口
Phase 4: 修改密码 (Task 4)
  ↓ 修改后端 + 前端，需回归测试认证流程
Phase 5: 回归测试与文档更新 (Task 5)
  ↓ 全量测试 + 文档同步
  完成 → v1.1 发布
```

**每个 Phase 完成后应：**
1. 运行对应测试命令验证
2. Git commit（Conventional Commits 格式）
3. 确认不影响 v1.0 已有功能后再进入下一 Phase

---

## 10. Commit 计划

| Phase | Commit Message | 文件范围 |
|-------|---------------|---------|
| Phase 1 | `feat(backup): add backup script for db and uploads` | `scripts/backup.py`, `.gitignore` |
| Phase 2 | `feat(cleanup): add temp image cleanup script` | `scripts/cleanup_temp_images.py` |
| Phase 3 | `feat(security): add rate limiting for public endpoints` | `backend/app/rate_limit.py`, `backend/app/routers/public.py` |
| Phase 4 | `feat(auth): add change password on admin profile` | `backend/app/routers/password.py`, `backend/app/main.py`, `backend/app/schemas.py`, `frontend/src/api/auth.ts`, `frontend/src/pages/AdminProfile.tsx` |
| Phase 5 | `docs: update docs for v1.1 release` | `README.md`, `docs/RELEASE_NOTES.md`, `docs/API_SPEC.md`, `docs/PROGRESS.md`, `docs/TODO.md`, `docs/DECISIONS.md`, `CLAUDE.md` |

---

## 11. 依赖检查

v1.1 不引入任何新的 Python 或 npm 依赖。所有功能使用标准库实现：

| 功能 | 使用的标准库 |
|------|-------------|
| 备份脚本 | `pathlib`, `shutil`, `datetime`, `zipfile`, `argparse` |
| 临时图片清理 | `pathlib`, `time`, `argparse` |
| 限频 | `time` (内置于 Python) |
| 修改密码 | `bcrypt` (已依赖), `fastapi` (已依赖) |

---

## 12. 预估工时

| Phase | 预估时间 | 说明 |
|-------|---------|------|
| Phase 1 备份脚本 | 20-30 分钟 | 纯 Python 脚本，无外部依赖 |
| Phase 2 临时图片清理 | 15-20 分钟 | 纯 Python 脚本，逻辑简单 |
| Phase 3 公开接口限频 | 30-40 分钟 | 新建 rate_limit.py + 修改 public.py |
| Phase 4 修改密码 | 40-50 分钟 | 新建路由 + 修改 schema + 前端 UI |
| Phase 5 文档更新 | 20-30 分钟 | 更新 7 个文档文件 |
| **总计** | **约 2-3 小时** | |

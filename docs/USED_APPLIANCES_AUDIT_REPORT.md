# Used Appliances Audit Report

**审计日期：** 2026-05-04
**审计员：** Sisyphus（独立审计，非开发角色）
**审计对象：** v1.3 二手家电展示橱窗模块
**项目路径：** `E:\claude code project 1\repair-order-system`

---

## 1. Summary

**结论：PASS**

v1.3 二手家电展示橱窗模块完整实现，严格保持"展示 + 电话咨询"边界，未实现任何商城/支付/购物车/交易功能。后端 API JWT 保护正确，公开接口只读，图片上传安全合规。数据库设计、前后端代码、文档均与设计一致。v1.1 原有流程未受破坏。lint/build/unittest/compileall 全部通过。

可以打 v1.3 tag 并进入灰度上线。

---

## 2. Scope Reviewed

| 审计域 | 状态 |
|--------|------|
| 数据库（used_appliances 表） | ✅ 已审计 |
| 后端 API（公开 + 后台 + 上传） | ✅ 已审计 |
| 前端页面（/used + /admin/used-appliances） | ✅ 已审计 |
| 入口位置（/repair, /admin/dashboard, /admin/profile） | ✅ 已审计 |
| 范围膨胀检查（商城/支付/购物车等） | ✅ 已审计 |
| 安全检查（JWT/上传/敏感文件/路径穿越） | ✅ 已审计 |
| v1.1 回归测试 | ✅ 已审计 |
| 文档同步 | ✅ 已审计 |
| 测试（lint/build/unittest/compileall） | ✅ 全部 PASS |
| Git 安全（敏感文件跟踪） | ✅ 已审计 |

---

## 3. Commands Run

```powershell
# 后端测试
cd E:\claude code project 1\repair-order-system\backend
.\.venv\Scripts\python.exe -m unittest tests.test_used_appliances_api -v
.\.venv\Scripts\python.exe -m compileall app

# 前端测试
cd E:\claude code project 1\repair-order-system\frontend
npm run lint
npm run build

# Git 安全检查
cd E:\claude code project 1\repair-order-system
git status
git ls-files | Select-String ".env|SECRET_KEY|ADMIN_PASSWORD|repair.db|uploads/|backups/"
Get-Content .gitignore

# 全局关键词扫描（范围膨胀检查）
# 扫描关键词: 购买, 下单, 购物车, 支付, 付款, 商城, SKU, 库存, AI报价, cart, payment, checkout, purchase
# 作用域: .tsx, .ts, .py, .html（排除 docs/*.md）
```

---

## 4. Database Review

### 4.1 used_appliances 表结构验证

| 字段 | 预期类型 | 实际类型 | 状态 |
|------|---------|---------|------|
| id | INTEGER PK | `Integer, primary_key=True, autoincrement=True` | ✅ |
| title | TEXT NOT NULL | `String(80), nullable=False` | ✅ |
| category | TEXT NOT NULL | `String(30), nullable=False, index=True` | ✅ |
| brand_model | TEXT | `String(80)` | ✅ |
| price | TEXT (非 REAL) | `String(30)` | ✅ |
| condition_note | TEXT | `String(200)` | ✅ |
| description | TEXT | `Text` | ✅ |
| image_paths | TEXT (JSON 数组) | `Text` + JSON 序列化 | ✅ |
| status | TEXT NOT NULL | `String(20), default="在售", nullable=False, index=True` | ✅ |
| contact_phone | TEXT | `String(30)` | ✅ |
| created_at | DATETIME | `DateTime, default=_utcnow, index=True` | ✅ |
| updated_at | DATETIME | `DateTime, default=_utcnow, onupdate=_utcnow` | ✅ |

### 4.2 状态枚举验证

- 后端 `constants.py`: `USED_APPLIANCE_STATUSES = ["在售", "已售", "下架"]` ✅
- 前端 `constants.ts`: `USED_APPLIANCE_STATUSES = ['在售', '已售', '下架'] as const` ✅
- 前后端一致 ✅

### 4.3 无新增风险表

| 检查项 | 结果 |
|--------|------|
| 无 inventory/stock 库存表 | ✅ PASS |
| 无 used_orders 商品订单表 | ✅ PASS |
| 无 customer_messages 客户留言表 | ✅ PASS |
| 无 SKU 相关表 | ✅ PASS |
| 未修改 orders/users/repair_logs 表 | ✅ PASS |
| create_all 能创建新表 | ✅ PASS（init_db() 无修改，UsedAppliance 注册到 Base.metadata） |
| 历史数据库新增表后不影响旧数据 | ✅ PASS（仅新增表，不 ALTER 旧表） |

### 4.4 price 字段验证

`price` 使用 `String(30)`，不是 REAL。支持自由文本如 "800元起"、"面议"、"电话咨询"。✅

### 4.5 image_paths 存储验证

后端 `_dump_image_paths()` 将 `list[str]` 通过 `json.dumps()` 序列化为 JSON 数组字符串存储。读取通过 `UsedApplianceResponse.parse_image_paths` validator 解析。✅

---

## 5. API Review

### 5.1 公开 API

#### GET /api/used-appliances

| 检查项 | 结果 |
|--------|------|
| 无需登录 | ✅ PASS（无 Depends(get_current_user)） |
| 只返回 status=在售 | ✅ PASS（`.filter(UsedAppliance.status == "在售")`） |
| 不返回已售 | ✅ PASS（filter 排除） |
| 不返回下架 | ✅ PASS（filter 排除） |
| 支持分页 | ✅ PASS（page/page_size，默认 20，最大 50，has_more 标记） |
| 支持分类筛选 | ✅ PASS（category 参数） |
| 图片路径格式 | ✅ PASS（`/uploads/used/xxx` 格式） |
| 不包含服务器内部路径 | ✅ PASS |

#### GET /api/used-appliances/{id}

| 检查项 | 结果 |
|--------|------|
| 无需登录 | ✅ PASS |
| 只允许 status=在售 | ✅ PASS（`.filter(UsedAppliance.status == "在售")`） |
| 已售返回 404 | ✅ PASS |
| 下架返回 404 | ✅ PASS（同一 filter，返回 "二手家电不存在或已下架"） |
| 不存在返回 404 | ✅ PASS |

### 5.2 后台 API

#### GET /api/admin/used-appliances

| 检查项 | 结果 |
|--------|------|
| 必须 JWT | ✅ PASS（`current_user: User = Depends(get_current_user)`） |
| 未登录返回 401 | ✅ PASS（已验证） |
| admin 可查看全部状态 | ✅ PASS（status_filter 参数可选） |
| 支持状态筛选 | ✅ PASS |
| 支持关键字搜索 | ✅ PASS（标题/品牌型号/成色说明） |
| 支持分页 | ✅ PASS（page_size 最大 100） |

#### POST /api/admin/used-appliances

| 检查项 | 结果 |
|--------|------|
| 必须 JWT | ✅ PASS |
| 输入校验 | ✅ PASS（Pydantic: title 2-80字, category 1-30字, price 最多30字, status 枚举校验） |
| status 非法值拒绝 | ✅ PASS（validator 检查 USED_APPLIANCE_STATUSES） |
| image_paths 格式合法 | ✅ PASS（_dump_image_paths JSON 序列化） |

#### PATCH /api/admin/used-appliances/{id}

| 检查项 | 结果 |
|--------|------|
| 必须 JWT | ✅ PASS |
| 支持字段级更新 | ✅ PASS（model_dump(exclude_unset=True)） |
| 支持状态切换 | ✅ PASS |
| 不做硬删除 | ✅ PASS（无 DELETE 端点） |
| updated_at 自动更新 | ✅ PASS（`datetime.now(timezone.utc)`） |

### 5.3 图片上传 API

#### POST /api/upload/used

| 检查项 | 结果 |
|--------|------|
| 必须 JWT | ✅ PASS（`current_user: User = Depends(get_current_user)`） |
| 未登录返回 401 | ✅ PASS |
| MIME 类型限制 | ✅ PASS（仅 image/jpeg, image/png, image/webp） |
| 扩展名限制 | ✅ PASS（双重校验） |
| 文件大小限制 | ✅ PASS（5MB） |
| 文件数量限制 | ✅ PASS（5张） |
| 随机文件名 | ✅ PASS（secrets.token_urlsafe(16)） |
| 保存到 uploads/used/ | ✅ PASS |
| 返回路径格式 | ✅ PASS（`/uploads/used/<random>.ext`） |
| 不使用用户原始文件名 | ✅ PASS |
| 不影响订单上传 | ✅ PASS（/api/upload 和 /api/upload/used 独立端点） |
| 无路径穿越 | ✅ PASS（文件名由后端生成，不拼接用户输入） |

---

## 6. Frontend Review

### 6.1 公开页面 /used (UsedAppliancesPage.tsx)

| 检查项 | 结果 |
|--------|------|
| 无需登录 | ✅ PASS（路由在 ProtectedRoute 外） |
| 空商品状态 | ✅ PASS（显示"暂无在售二手家电" + 电话咨询按钮） |
| 只展示在售商品 | ✅ PASS（API 只返回 在售，前端无额外过滤） |
| 商品卡片内容 | ✅ PASS（图片、标题、分类、品牌型号、价格、成色说明） |
| 图片可预览 | ✅ PASS（ImagePreviewModal 组件） |
| 电话咨询使用 tel: | ✅ PASS（`href={tel:${phone}}`） |
| 免责声明 | ✅ PASS（顶部 + 底部双位展示，完整文案） |
| 无购买/下单/支付文案 | ✅ PASS（未见 "购买"、"下单"、"支付"、"加入购物车"） |
| price 为空显示 "电话咨询" | ✅ PASS |
| 移动端可读 | ✅ PASS（max-w-lg, min-h-screen, 大按钮） |
| 加载/错误状态 | ✅ PASS（loading 状态显示、错误提示） |

### 6.2 后台页面 /admin/used-appliances (AdminUsedAppliances.tsx)

| 检查项 | 结果 |
|--------|------|
| 需要登录 | ✅ PASS（ProtectedRoute 包裹） |
| 未登录跳转 | ✅ PASS（ProtectedRoute 自动重定向到 /admin） |
| 可新增商品 | ✅ PASS（表单 + POST API） |
| 可上传图片 | ✅ PASS（拖拽区域 + 前端校验类型/大小/数量 + 后台上传） |
| 可编辑商品 | ✅ PASS（startEdit + PATCH API） |
| 可切换状态 | ✅ PASS（quickStatus 按钮: 在售/已售/下架） |
| 可查看全部状态 | ✅ PASS（状态筛选 + 列表展示） |
| 不做硬删除 | ✅ PASS（无删除按钮，无 DELETE API） |
| 表单校验 | ✅ PASS（标题至少2字、类别必填、前端文件类型/大小/数量校验） |
| BottomNav 保持三栏 | ✅ PASS（BottomNav 未修改，后台保持三个主 tab） |

### 6.3 入口位置

| 页面 | 入口文案 | 目标路由 | 结果 |
|------|---------|---------|------|
| /repair (RepairForm.tsx) | "查看二手家电" | /used | ✅ PASS |
| /admin/dashboard (AdminDashboard.tsx) | "二手家电管理" | /admin/used-appliances | ✅ PASS |
| /admin/profile (AdminProfile.tsx) | "二手家电管理" | /admin/used-appliances | ✅ PASS |
| BottomNav.tsx | 未修改 | N/A | ✅ PASS（无二手家电入口，保持三栏） |

### 6.4 不影响原有页面

| 页面 | 检查结果 |
|------|---------|
| /repair | ✅ 报修表单未修改（仅增加入口链接） |
| /pricing | ✅ 清洗价格表未修改 |
| /admin/orders | ✅ 订单管理未修改 |
| /admin/dashboard | ✅ 首页统计未修改（仅增加入口链接） |
| /admin/profile | ✅ 我的页面未修改（仅增加入口链接） |
| /warranty/t/:token | ✅ 保修查询未修改 |

---

## 7. Scope Creep Review

### 7.1 关键词全局扫描结果

对所有 `.tsx`, `.ts`, `.py` 文件（排除 `docs/*.md`）进行全面关键词扫描：

| 关键词组 | 扫描范围 | 命中数 |
|---------|---------|--------|
| 购买, 立即购买, 下单, 加入购物车, 购物车, 支付, 付款, 订单交易 | .tsx, .ts, .py | **0** |
| 客户留言, SKU, 库存数量, 商城, AI报价, AI 选品 | .tsx, .ts, .py | **0** |
| cart, payment, checkout, purchase, order transaction | .tsx, .ts, .py | **0** |

### 7.2 模块功能边界确认

| 功能 | 状态 | 说明 |
|------|------|------|
| 在线购买 | ❌ 未实现 | 无购买按钮/流程 |
| 在线支付 | ❌ 未实现 | 无支付接口/回调 |
| 购物车 | ❌ 未实现 | 无购物车数据/逻辑 |
| 客户留言 | ❌ 未实现 | 无留言表/API |
| 商品订单 | ❌ 未实现 | 无商品订单表/流程 |
| 复杂库存 | ❌ 未实现 | 无库存字段/管理 |
| 多规格 SKU | ❌ 未实现 | 无 SKU 表/字段 |
| AI 报价 | ❌ 未实现 | 无 AI 接口调用 |
| 微信小程序 | ❌ 未实现 | 无小程序代码 |
| 商城系统 | ❌ 未实现 | 完全不存在 |
| 展示橱窗 + 电话咨询 | ✅ 已实现 | 仅此功能 |
| 后台发布/编辑/下架 | ✅ 已实现 | CRUD 管理 |
| 状态枚举展示 | ✅ 已实现 | 在售/已售/下架 |

### 7.3 判定

**完全符合展示橱窗边界。零范围膨胀。** ✅

---

## 8. Security Review

### 8.1 JWT 保护

| 检查项 | 结果 |
|--------|------|
| 后台写接口必须 JWT | ✅ PASS |
| /api/admin/used-appliances (GET/POST/PATCH) 全部需要 JWT | ✅ PASS |
| /api/upload/used 需要 JWT | ✅ PASS |
| 公开接口只读 | ✅ PASS（GET /api/used-appliances 无写操作） |
| 未登录返回 401 | ✅ PASS |

### 8.2 图片上传安全

| 检查项 | 结果 |
|--------|------|
| MIME 类型校验 | ✅ PASS（image/jpeg, image/png, image/webp） |
| 扩展名校验 | ✅ PASS（双重校验） |
| 文件大小限制 | ✅ PASS（5MB） |
| 文件数量限制 | ✅ PASS（5张） |
| 随机文件名 | ✅ PASS（secrets.token_urlsafe(16)） |
| 无路径穿越 | ✅ PASS（文件名由后端生成，不拼接用户输入） |
| 保存到 uploads/used/ | ✅ PASS |

### 8.3 前端安全

| 检查项 | 结果 |
|--------|------|
| 无 dangerouslySetInnerHTML | ✅ PASS（全局搜索 0 命中） |

### 8.4 敏感信息

| 检查项 | 结果 |
|--------|------|
| jdianwxiu.cn 硬编码 | ✅ PASS（0 命中） |
| 127.0.0.1 硬编码（代码中） | ⚠️ 仅 CORS 配置 `allow_origins=["http://localhost:5173"]`（开发用途，生产环境同源不受影响，预存） |
| SECRET_KEY 暴露到源码 | ⚠️ config.py 默认值 "please-change-this-to-a-long-random-secret"（预存，README 和部署文档明确要求修改） |
| ADMIN_PASSWORD 暴露到源码 | ⚠️ config.py 默认值 "ChangeThisStrongPassword123!"（预存，README 和部署文档明确要求修改） |
| .env 文件跟踪 | ✅ .env 在 .gitignore 中（行 14: `backend/.env`） |
| repair.db 文件跟踪 | ✅ data/*.db 在 .gitignore 中（行 17-19） |
| uploads 文件跟踪 | ✅ backend/uploads/ 在 .gitignore 中（行 22） |
| backups 文件跟踪 | ✅ backups/ 在 .gitignore 中（行 40） |
| 无新建大型依赖 | ✅ PASS |

### 8.5 Git 跟踪验证

```
git ls-files 仅返回: backend/.env.example（模板文件，合规）
未跟踪: .env, repair.db, uploads/*, backups/*
```

---

## 9. Regression Review

### 9.1 v1.1 原有功能回归

基于实施报告和代码审查确认（v1.3 未修改核心流程）：

| 公开页面 | 结果 |
|---------|------|
| /repair 可打开 | ✅ PASS（路由未修改） |
| /repair 可提交报修 | ✅ PASS（RepairForm.tsx 仅增加入口链接） |
| /repair 图片上传正常 | ✅ PASS（/api/public/upload 未修改） |
| /pricing 可打开 | ✅ PASS（路由未修改） |
| /warranty/t/:token 友好错误 | ✅ PASS（路由未修改） |

| 后台 | 结果 |
|------|------|
| /admin 可登录 | ✅ PASS（认证逻辑未修改） |
| /admin/dashboard 正常 | ✅ PASS（仅增加入口链接） |
| /admin/orders 正常 | ✅ PASS（订单管理未修改） |
| 订单详情正常 | ✅ PASS |
| Excel 导出正常 | ✅ PASS（/api/export/orders 未修改） |
| 图片预览正常 | ✅ PASS（ImagePreviewModal 组件未修改） |
| 修改密码仍正常 | ✅ PASS（/admin/profile 仅增加入口链接） |

| 后端 API | 结果 |
|---------|------|
| /api/health 正常 | ✅ PASS（main.py health 端点未修改） |
| /api/public/submit 正常 | ✅ PASS（public.py 未修改） |
| /api/orders 需 JWT | ✅ PASS（orders.py 未修改） |
| /api/export/orders 需 JWT | ✅ PASS（export.py 未修改） |

### 9.2 数据库验证

| 检查项 | 结果 |
|--------|------|
| orders 表未修改 | ✅ PASS |
| users 表未修改 | ✅ PASS |
| repair_logs 表未修改 | ✅ PASS |
| 业务逻辑未修改 | ✅ PASS |

---

## 10. Documentation Review

| 文档 | 检查项 | 结果 |
|------|--------|------|
| CLAUDE.md | 更新 v1.3 状态为 "✅ 完成" | ✅ PASS |
| CLAUDE.md | 继续提醒不得扩展成商城 | ✅ PASS（行 149: "二手家电展示只允许保持展示橱窗能力，不得扩展在线交易"） |
| README.md | 说明 /used 和 /admin/used-appliances | ✅ PASS |
| README.md | 说明 v1.3 只做展示橱窗 | ✅ PASS |
| docs/USED_APPLIANCES_MODULE_PLAN.md | 状态从 candidate 更新为 implemented | ✅ PASS（行 5: "当前状态：已实现"） |
| docs/USED_APPLIANCES_MODULE_PLAN.md | 保留边界：只做展示橱窗 | ✅ PASS（行 6: "模块定位：二手家电信息展示橱窗，不是商城系统"） |
| docs/USED_APPLIANCES_IMPLEMENTATION_REPORT.md | 完整记录实现和测试 | ✅ PASS |
| docs/API_SPEC.md | 记录新增 API | ✅ PASS（行 96-406 详细记录） |
| docs/DB_SCHEMA.md | 记录 used_appliances 表 | ✅ PASS（行 134-164 详细记录） |
| docs/DECISIONS.md | 记录 D-064/D-065/D-066/D-067 | ✅ PASS |
| docs/DECISIONS.md | 明确不做商城/支付/购物车 | ✅ PASS（D-064） |
| docs/DECISIONS.md | 记录 price 用 TEXT | ✅ PASS（D-066） |
| docs/DECISIONS.md | 记录 status 下架代替硬删除 | ✅ PASS（D-065） |
| docs/PROGRESS.md | 更新 v1.3 进度 | ✅ PASS |
| docs/TODO.md | v1.3 标记为已完成 | ✅ PASS（行 85-91） |
| docs/TODO.md | 未误写成商城开发 | ✅ PASS |
| docs/RELEASE_NOTES.md | v1.3 版本记录 | ✅ PASS（行 141-182） |

---

## 11. Findings

### Critical

**无。**

### High

**无。**

### Medium

| # | 发现 | 文件 | 说明 |
|---|------|------|------|
| M-1 | config.py SECRET_KEY 默认值未加启动校验 | `backend/app/config.py:11` | 如果部署时未创建 .env 或未覆盖默认值，JWT 可用已知密钥伪造。**预存问题（v1.0 已存在），非 v1.3 引入**。README 明确要求修改。 |
| M-2 | config.py ADMIN_PASSWORD 默认值未加启动校验 | `backend/app/config.py:20` | 同上。**预存问题，非 v1.3 引入**。 |

### Low

| # | 发现 | 文件 | 说明 |
|---|------|------|------|
| L-1 | CORS origin 硬编码 | `backend/app/main.py:27` | `allow_origins=["http://localhost:5173"]` 硬编码。生产环境前端同源部署，无实际影响。**预存问题**。 |
| L-2 | 公开二手家电接口无限频 | `backend/app/routers/used_appliances.py` | GET /api/used-appliances 为纯查询接口，无写操作，请求压力低，不做限频可接受。 |
| L-3 | 孤儿图片无自动清理 | `backend/uploads/used/` | 后台上传图片后若未保存商品可能产生孤儿文件。已知并通过 D-067 记录接受。v1.3 不要求实现。 |

---

## 12. Final Recommendation

### 12.1 审计结论

**PASS** — v1.3 二手家电展示橱窗模块可以通过审计，可以打 v1.3 tag 并进入灰度上线。

### 12.2 理由

1. 模块完整实现：数据库表、6 个 API 端点、图片上传、公开页面、后台管理、入口位置均已完成。
2. 严格保持 "展示橱窗 + 电话咨询" 边界：零商城/支付/购物车/留言/SKU/库存膨胀。
3. 安全合规：后台 API 全部 JWT 保护，图片上传类型/大小/数量限制正确，无敏感文件泄露。
4. 不破坏 v1.0/v1.1：原有报修、订单、保修、定价等流程未被修改。
5. 文档完整同步：CLAUDE.md、README.md、API_SPEC.md、DB_SCHEMA.md、DECISIONS.md 等均已更新。
6. 测试全部通过：unittest PASS、compileall PASS、lint PASS、build PASS。

### 12.3 测试结果汇总

| 测试项 | 结果 |
|--------|------|
| `python -m unittest tests.test_used_appliances_api -v` | ✅ 1 test PASS |
| `python -m compileall app` | ✅ PASS |
| `npm run lint` | ✅ PASS（无输出） |
| `npm run build` | ✅ PASS（148ms，347.8 kB JS + 23.0 kB CSS） |
| 全局关键词范围扫描 | ✅ 0 命中（3 组全部 clean） |
| Git 敏感文件检查 | ✅ 仅 .env.example 被跟踪 |

### 12.4 优先建议（非阻塞）

1. **部署前确认 .env 已覆盖默认值**（SECRET_KEY 和 ADMIN_PASSWORD）— 预存问题，README 已有明确说明。
2. 长期可考虑在 config.py 启动时校验默认值未被使用。
3. 孤儿图片清理在 v1.3+ 运维阶段按需添加。

### 12.5 是否可以打 v1.3 tag

**可以。** 建议 tag: `v1.3.0`，message: "feat: 二手家电展示橱窗 — 公开 /used + 后台 /admin/used-appliances，只做展示+电话咨询".

### 12.6 是否可以灰度上线

**可以。** 需确保：
- 后端 `.env` 已配置真实密钥和密码
- `npm run build` 产物已部署到 `backend/app/static/`
- 上传目录 `backend/uploads/used/` 存在且可写
- Caddy 反向代理已配置 HTTPS

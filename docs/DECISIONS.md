# 设计决策记录

## 架构决策

### D-001: FastAPI 统一服务 vs 前后端分离

**决策：** 采用 FastAPI 统一服务架构。

**理由：**
- 极简部署，单进程运行
- 无 CORS 问题
- 适合小店场景，后续云服务器只需一个进程
- 开发环境仍用 Vite dev server + FastAPI 分开运行

**备选方案：** 前后端分离部署（Nginx + FastAPI），部署复杂度翻倍，对本项目过度工程化。

### D-002: React + Vite TSX vs 纯 HTML vs Vue

**决策：** 采用 React + Vite + TypeScript。

**理由：**
- 组件化开发，状态管理方便
- TypeScript 类型安全
- Vite 构建速度快

**备选方案：** 纯 HTML/CSS/JS（无构建工具，更简单但维护性差）、Vue 3 CDN（轻量但生态略小）。

### D-003: SQLite vs PostgreSQL

**决策：** 采用 SQLite。

**理由：**
- 零配置，单文件数据库
- 小店场景并发极低，完全够用
- 备份只需复制文件

**后续：** 如果数据量增长或需要多用户并发，可迁移到 PostgreSQL。

### D-004: JWT 30 天有效期

**决策：** access_token 有效期设为 30 天。

**理由：**
- 使用者是舅舅一个人，不需要频繁登录
- 24 小时过期会降低使用意愿
- 安全风险可接受（单人使用、非公网敏感系统）

### D-005: 单管理员账号

**决策：** 第一版只支持单管理员，不做注册和多用户。

**理由：**
- 只有舅舅一个人使用
- users 表预留 role 和 is_active 字段，方便后续扩展

### D-006: 公开/后台上传分离

**决策：** 客户报修图片走 `/api/public/upload`（无需登录），后台维修图片走 `/api/upload`（需 JWT）。

**理由：**
- 客户不需要登录就能上传故障照片
- 公开接口需额外限制（文件类型、大小、数量、随机文件名）

### D-007: scheduled_at 独立字段

**决策：** 保留 `preferred_time`（客户文本输入），新增 `scheduled_at`（老板确认的标准时间）。

**理由：**
- 不解析客户的自然语言时间描述
- 今日预约、时间排序等查询基于 `scheduled_at` 精确查询

### D-008: 状态枚举集中管理

**决策：** 订单状态和回访状态在 `constants.py` / `constants.ts` 中集中定义。

**理由：**
- 避免状态值散落在多个文件
- 前后端保持一致

### D-009: warranty_token 使用 secrets.token_urlsafe(16)

**决策：** 保修 token 使用随机不可猜测的字符串，不使用 UUID 或 order_no。

**理由：**
- 不可猜测，保护客户隐私
- 生成后保持稳定，不随刷新重新生成

### D-010: 生产构建使用 Vite outDir 直接输出

**决策：** `vite.config.ts` 设置 `build.outDir: "../backend/app/static"`，构建直接输出到后端静态目录。

**理由：**
- 无需手动复制步骤
- `build.emptyOutDir: true` 自动清理旧文件

## Phase 1 实现决策

### D-011: 登录接口使用 JSON body

**决策：** `POST /api/auth/login` 使用 JSON body，不使用 form-data。

**理由：**
- 与项目其他接口风格一致
- 前端统一使用 JSON 请求

### D-012: 使用 pydantic-settings 管理配置

**决策：** 使用 pydantic-settings 的 BaseSettings 替代 python-dotenv 直接读取。

**理由：**
- 自动类型验证
- 支持 .env 文件和环境变量
- 与 FastAPI/Pydantic 生态一致
- BASE_DIR 使用 Path.resolve() 确保 Windows 路径稳定

### D-013: SPA fallback 未构建时返回 JSON 提示

**决策：** 当 static/index.html 不存在时，前端路由返回 JSON 提示而非 404。

**理由：**
- 开发阶段前端未构建时，后端仍可独立启动
- 提示信息清晰，引导开发者运行 npm run build
- 不影响 /api/* 和 /uploads/* 的正常路由

## Phase 2 实现决策

### D-014: bcrypt 5.0.0 与 passlib 不兼容

**决策：** seed.py 直接使用 `bcrypt.hashpw()` 而非 `passlib.hash.bcrypt.hash()`。

**理由：**
- bcrypt 5.0.0 移除了 `__about__` 属性，passlib 依赖该属性检测版本
- 直接调用 bcrypt 原生 API 避免兼容性问题
- Phase 3 实现认证时同样使用 bcrypt 直接调用

**影响：** requirements.txt 中 passlib 保留但不用于 bcrypt 操作。

### D-015: seed.py 重复运行策略

**决策：** 每次运行 seed.py 时清空 orders 和 repair_logs 后重新插入，users 表只在管理员不存在时插入。

**理由：**
- 避免重复运行导致数据无限累积
- 管理员账号不覆盖，避免密码 hash 被重置
- 测试数据可随时重置到已知状态

## Phase 3 实现决策

### D-016: 认证实现直接使用 bcrypt，不使用 passlib

**决策：** auth.py 直接 import bcrypt，使用 `bcrypt.hashpw()` / `bcrypt.checkpw()`。

**理由：**
- bcrypt 5.0.0 移除了 `__about__` 属性，passlib 依赖该属性检测版本
- 直接调用 bcrypt 原生 API 完全避免兼容性问题
- requirements.txt 中 passlib[bcrypt] 保留但不用于实际认证

### D-017: 管理员自动创建在 main.py startup 事件中

**决策：** `_ensure_admin()` 在 `on_startup()` 中调用，init_db() 之后执行。

**理由：**
- 确保表已创建后再检查 users 表
- 只在 users 表为空时创建，不覆盖已有账号
- 与 seed.py 策略一致（seed.py 也不覆盖已有管理员）

## Phase 4 实现决策

### D-018: 图片上传使用 MIME 类型 + 扩展名双重校验

**决策：** 同时校验 `content_type`（MIME type）和文件扩展名。

**理由：**
- 单独校验 MIME type 可被伪造
- 双重校验提高安全性
- 禁止 svg/html/js/exe/zip/pdf 等危险文件类型

### D-019: 图片 temp → orders 移动策略

**决策：** 客户提交报修时，后端将 `uploads/orders/temp/` 下的图片移动到 `uploads/orders/`。

**理由：**
- 先上传再提交，分两步降低单次请求复杂度
- 移动而非复制，避免 temp 目录无限膨胀
- 文件名冲突时重新生成随机名
- 移动失败返回 400，不创建半成品订单

### D-020: 保修接口隐私边界

**决策：** `/api/warranty/{token}` 只返回 11 个公开字段，严禁返回客户手机号、地址、收费等。

**理由：**
- 保修凭证是公开页面，客户可分享
- 隐私字段只在后台订单详情中可见
- Pydantic response_model 强制约束返回字段

## Phase 5 实现决策

### D-021: 订单列表 GET /api/orders 使用 Query alias

**决策：** `status` 筛选参数使用 `Query(None, alias="status")` 避免与 Python 关键字冲突。

**理由：**
- `status` 是 Python 内置函数名
- 使用 alias 保持 API 参数名不变，内部变量名用 `status_filter`

### D-022: PATCH 不允许修改客户原始字段

**决策：** OrderUpdateRequest 只允许修改维修相关字段，不允许修改 customer_name、phone、address 等。

**理由：**
- 客户信息由客户自己提交，后台不应随意修改
- 避免误操作导致客户信息丢失
- 如需修改客户信息，后续可单独开放接口

## Phase 6 实现决策

### D-023: 筛选逻辑抽取为 query_utils.py

**决策：** 将订单筛选逻辑抽取到 `app/query_utils.py` 的 `apply_order_filters()` 函数。

**理由：**
- orders.py 的列表接口和 export.py 的导出接口需要相同的筛选逻辑
- 避免代码重复
- 修改筛选规则只需改一处

## Phase 7 实现决策

### D-024: Tailwind CSS v4 使用 @tailwindcss/vite 插件

**决策：** 使用 `@tailwindcss/vite` 插件，`index.css` 中只写 `@import "tailwindcss"`。

**理由：**
- Tailwind CSS v4 不再需要 `tailwind.config.js`
- 通过 Vite 插件集成，配置更简洁
- 无需手动配置 `content` 路径

### D-025: 前端使用相对路径，不硬编码后端地址

**决策：** axios client 的 `baseURL` 为空字符串，Vite proxy 转发 `/api` 和 `/uploads`。

**理由：**
- 开发环境由 Vite proxy 转发到 localhost:8000
- 生产环境由 FastAPI 统一服务，同源
- 前端代码中不出现 `http://localhost:8000`

## Phase 8 实现决策

### D-026: ImageUploader 先上传后提交

**决策：** 图片选择后立即调用 `/api/public/upload` 上传到 temp 目录，提交报修时只传路径。

**理由：**
- 分离上传和提交逻辑，降低单次请求复杂度
- 上传失败不影响表单填写
- 用户可以删除已上传的图片再重新选择

## Phase 12 最终交付决策

### D-027: v1.0 不包含 Caddy/systemd 配置文件

**决策：** README 中提供 Caddy 和 systemd 配置建议，但不包含实际配置文件。

**理由：**
- 部署环境因人而异
- 避免配置文件误导
- 用户可根据建议自行配置

### D-028: v1.0 不包含保修二维码下载

**决策：** 当前只提供保修链接文本，不生成二维码图片。

**理由：**
- 二维码生成需要额外依赖
- 链接文本已足够分享
- v1.2 计划实现二维码生成与下载

### D-029: v1.0 店铺信息来自 .env

**决策：** 店铺名称和电话在 .env 中配置，后端通过 `GET /api/public/shop-info` 只暴露 `shop_name` 和 `shop_phone` 给前端展示。

**理由：**
- 避免增加数据库字段和管理接口
- 小店场景信息变更频率极低
- 避免后台“我的”页面硬编码电话与 `.env` 不一致
- v1.2 计划实现数据库化的店铺信息编辑

### D-030: audit fixes 中 /uploads 无条件挂载

**决策：** 应用导入阶段同步创建 `UPLOAD_DIR`，并使用 `StaticFiles(..., check_dir=False)` 挂载 `/uploads`。

**理由：**
- `backend/uploads/` 被 `.gitignore` 排除，fresh deploy 首次启动时目录可能不存在
- startup 创建目录发生在 mount 之后，条件挂载会导致首次启动 `/uploads/*` 不可访问
- `/uploads/*` 必须返回静态文件 404，不应被 SPA fallback 返回 React HTML

### D-031: 图片路径字段存储为 JSON 数组字符串

**决策：** `image_paths` 和 `repair_images` 统一写入合法 JSON 数组字符串；读取响应时优先 `json.loads()`，对历史 Python list 字符串使用 `ast.literal_eval()` 做安全兼容，失败则按空数组处理。

**理由：**
- `str(list)` 不是合法 JSON，后续 `json.loads()` 会失败
- DB schema 已明确图片路径字段是 JSON 数组字符串
- `ast.literal_eval()` 只解析 Python 字面量，不执行任意代码，可用于有限历史兼容

### D-032: 认证直接依赖 bcrypt

**决策：** `backend/requirements.txt` 直接声明 `bcrypt`，认证逻辑继续直接使用 `bcrypt.hashpw()` / `bcrypt.checkpw()`，不依赖 passlib 调用 bcrypt。

**理由：**
- bcrypt 5.0.0 与 passlib 的版本探测存在兼容问题
- 项目认证代码已经直接 import bcrypt
- 直接声明依赖避免仅通过 `passlib[bcrypt]` 间接安装导致依赖关系不清晰

### D-033: 实施计划与设计文档归档到项目内 docs

**决策：** 将外层 `E:/claude code project 1/docs/IMPLEMENTATION_PLAN.md` 和 `E:/claude code project 1/docs/superpowers/specs/2026-05-03-repair-order-system-design.md` 复制到项目内 `docs/` 对应路径。

**理由：**
- 后续 agent 从项目根目录进入时能直接读取完整上下文
- 保留外层原文件，避免破坏既有工作流

## Mobile Hotfix 决策

### D-034: 手机号校验前后端双重

**决策：** 前端 inputMode + maxLength + 正则，后端 Pydantic field_validator。

**理由：** 前端校验提升体验，后端校验保证安全。

### D-035: 定位功能可选增强

**决策：** 定位功能不替代手填地址，定位失败不阻止提交。

**理由：** HTTP 局域网环境下 Geolocation API 可能不可用，不能因此阻断报修流程。

### D-036: 复制功能两级 fallback

**决策：** 优先 navigator.clipboard，失败用 execCommand，再失败显示可手动复制文本。

**理由：** 非 HTTPS 环境下 clipboard API 不可用，必须有降级方案。

### D-037: 保修链接使用 window.location.origin

**决策：** 保修链接基于当前页面 origin 生成，不硬编码 localhost。

**理由：** 手机访问时 origin 是局域网 IP，硬编码 localhost 会导致链接在手机上不可用。

## Mobile Hotfix 第二轮决策

### D-038: 手机号校验采用字段级即时提示

**决策：** 输入过程中实时显示字段级错误（输入框下方红色文字），不用 alert 弹窗作为主要提示。提交时兜底校验并滚动到第一个错误字段。

**理由：** 即时反馈让用户在输入过程中就知道问题，比提交后才提示体验更好。alert 弹窗在手机端体验差。

### D-039: 希望上门时间采用日期+时间段选择

**决策：** 将原来的自由文本输入改为 input type="date" + 时间段按钮组（上午/下午/晚上/都可以）。选择结果拼接为 preferred_time 文本保存，不自动写入 scheduled_at。

**理由：** 手机端日期选择器体验好，时间段按钮比自由文本更规范。scheduled_at 仍由老板后台手动确认。

## Mobile Hotfix 第三轮决策

### D-040: 用户可编辑的日期字段不允许选择昨天或更早日期

**决策：** preferred_date、scheduled_at、completed_at、warranty_until 的 min 属性设为今天，后端同步校验。

**理由：** 过去日期在业务上无意义，前端限制提升体验，后端校验保证安全。

### D-041: 家电类型"其他"时复用 brand_model 引导填写

**决策：** appliance_type 为"其他"时，brand_model 变为必填，label 改为"具体家电类型 / 品牌型号"，不新增数据库字段。

**理由：** 最小改动，不增加数据库复杂度，复用已有字段满足需求。

## Mobile Hotfix 第四轮决策

### D-042: datetime 字段不能早于当前时刻

**决策：** scheduled_at 和 completed_at 不仅不能早于今天，还不能早于当前时刻。

**理由：** 预约过去时间在业务上无意义。

### D-043: 客户报修页今天不能选已过去的时间段

**决策：** 如果选择今天，上午/下午/晚上/都可以 按当前时间判断是否已过。

**理由：** 避免客户预约已经过去的时间段。

### D-044: 保修凭证只在订单已完成且设置保修截止日期后生成

**决策：** warranty_token 只在 status=="已完成" 且 warranty_until 非空时生成。未完成订单即使有历史 token 也不返回保修信息。

**理由：** 保修建立在维修完成的基础上，预约阶段不应有保修凭证。

## Mobile Hotfix 第五轮决策

### D-045: 前端 parseImagePaths 兼容多种格式

**决策：** 创建 `frontend/src/utils/images.ts`，`parseImagePaths()` 兼容 JSON 数组字符串和历史 Python list 字符串。

**理由：** 数据库中 image_paths 可能存在两种格式：合法 JSON 和 Python list 字符串。前端必须兼容两者。

## Mobile Hotfix 第六轮决策

### D-046: 图片预览采用轻量自建 modal

**决策：** 新增 `ImagePreviewModal` 组件，fixed 覆盖 + 半透明背景 + X 关闭按钮，不引入第三方图片预览库。

**理由：** 需求简单，自建组件可控，避免引入额外依赖。

### D-047: Excel 导出入口位于 /admin/orders

**决策：** 在订单列表页筛选区下方增加"导出 Excel"按钮，按当前筛选条件导出。

**理由：** 后端接口已有，前端只需加入口，方便老板随时导出。

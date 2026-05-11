# Release Notes

## v1.0 (2026-05-03)

首次发布。家电维修工单系统核心功能完整可用。

### 已完成功能

**客户端：**
- 报修表单（姓名、手机、小区、地址、家电类型、品牌型号、故障描述、希望上门时间、是否紧急）
- 图片上传（jpg/png/webp，最多 5 张，单张 5MB）
- 提交成功页（工单编号、师傅电话、安全提示）
- 保修查询页（扫码查看保修凭证，只展示公开字段）

**老板后台：**
- 登录（JWT 鉴权，30 天有效，5 次失败锁定 5 分钟）
- 首页统计（今日预约、新报修、待回访、本月已完成、本月收入）
- 订单列表（状态筛选、回访筛选、关键词搜索、日期筛选、加载更多）
- 订单详情（完整信息展示、编辑维修记录、设置保修、一键拨打、复制地址）
- 今日预约（基于 scheduled_at）
- 待回访（标记已回访/客户有问题/无需回访）
- Excel 导出（支持筛选）
- 我的页面（退出登录）

**技术特性：**
- FastAPI 统一服务，单进程部署
- SQLite 零配置数据库
- JWT + bcrypt 安全认证
- React + Vite + TypeScript + Tailwind CSS
- 手机端优先设计
- SPA fallback，前端路由刷新不 404

### 测试通过项

- 公开报修流程
- 登录/锁定/退出流程
- 订单管理（筛选+搜索+更新+日志+保修 token）
- 今日预约
- 待回访
- 保修查询隐私边界
- Excel 导出
- 移动端布局
- SPA 刷新

### Audit Fixes（2026-05-03）

Codex 独立审计结论 **PASS_WITH_FIXES**，8 项修复已完成并通过复审（**PASS**）：

- `/uploads` fresh deploy 首次启动挂载
- `image_paths` 统一使用 JSON 数组字符串存储
- `npm run lint` 修复
- `bcrypt` 直接声明为依赖
- `/admin/profile` 店铺信息从后端 `.env` 读取
- `CLAUDE.md` 冲突进度表清理
- 实施计划和设计文档归档到项目内 `docs/`
- 标准端口 smoke test 通过

### Mobile Hotfix（2026-05-03，七轮）

真机试用前修复，共七轮：

| 轮次 | 修复内容 |
|------|---------|
| 1 | 手机号校验、称呼支持、定位功能、保修链接、复制地址、复制保修链接 |
| 2 | 手机号即时校验、日期+时间段选择 |
| 3 | 日期不能选过去、家电类型"其他"引导 |
| 4 | 日期时间不能早于当前时点、保修凭证仅完成后触发 |
| 5 | 客户上传图片后台显示 |
| 6 | 图片弹层预览、Excel 导出入口 |
| 7 | 浏览器标题修正为"家电维修工单系统" |

### 已知限制

- 登录失败锁定使用内存存储，服务重启后清空
- SQLite 适合小店场景，不适合高并发
- 公开上传只校验 MIME type 和扩展名，未校验真实图片内容

### 下一版本计划

**v1.1（稳定性优先）：** ✅ 已完成（2026-05-03），见下方

**v1.2：**
- 店铺信息编辑
- 保修二维码生成与下载

---

## v1.1 (2026-05-03)

稳定性、安全、备份和轻量维护增强。

### 新增功能

**备份脚本：**
- `scripts/backup.py` 一键备份数据库和图片
- 支持 `--zip` 压缩、`--keep N` 保留份数
- 备份前检查磁盘空间和源路径

**临时图片清理：**
- `scripts/cleanup_temp_images.py` 清理 temp 目录过期文件
- 只清理 7 天以上的临时图片（可自定义天数）
- `--dry-run` 模式只预览不删除
- 安全边界：绝不触碰正式订单图片

**公开接口限频：**
- `/api/public/upload`：10 次/分钟/IP
- `/api/public/submit`：5 次/分钟/IP + 3 次/10 分钟/手机号
- 内存滑动窗口实现，无外部依赖

**修改密码：**
- `/admin/profile` 页面可修改管理员密码
- 旧密码验证 + bcrypt 更新
- 修改成功后强制退出登录

### 已知限制

- 公开接口限频数据存内存，服务重启后清空
- 修改密码后旧 JWT Token 在 30 天有效期内仍可用

### 测试结果

14/14 端点 PASS，`npm run build` PASS，`npm run lint` 无新增错误。

### 文件变更

| 操作 | 文件 |
|------|------|
| 新建 | `scripts/backup.py` |
| 新建 | `scripts/cleanup_temp_images.py` |
| 新建 | `backend/app/rate_limit.py` |
| 新建 | `backend/app/routers/password.py` |
| 修改 | `.gitignore`（添加 `backups/`） |
| 修改 | `backend/app/routers/public.py`（限频） |
| 修改 | `backend/app/main.py`（注册路由） |
| 修改 | `backend/app/schemas.py`（ChangePasswordRequest） |
| 修改 | `frontend/src/api/auth.ts`（changePassword API） |
| 修改 | `frontend/src/pages/AdminProfile.tsx`（修改密码 UI） |

---

## v1.3 (2026-05-04)

二手家电展示橱窗。定位为“后台发布 + 客户浏览 + 电话咨询”，不是商城系统。

### 新增功能

**客户端：**
- `/used` 公开二手家电页面
- 只展示在售商品
- 商品图片页内预览
- 电话咨询按钮
- 明确展示“页面信息仅供参考，以电话沟通确认为准”的免责声明

**老板后台：**
- `/admin/used-appliances` 二手家电管理
- 支持全部 / 在售 / 已售 / 下架筛选
- 支持新增、编辑、上传图片
- 支持快捷标记在售、已售、下架
- dashboard 和 profile 增加管理入口，BottomNav 保持三栏

**后端：**
- 新增 `used_appliances` 表
- 新增公开接口 `/api/used-appliances`
- 新增后台接口 `/api/admin/used-appliances`
- 新增后台图片上传 `/api/upload/used`

### 明确未做

- 未做在线购买
- 未做购物车
- 未做在线支付
- 未做商品订单系统
- 未做客户留言
- 未做复杂库存和多规格 SKU
- 未做 AI 报价、AI 选品或微信小程序

### 测试结果

- 后端 used appliances unittest PASS
- 后端 compileall PASS
- 前端 lint PASS
- 前端 build PASS

### 审计与修复（2026-05-04）

独立审计结论 **PASS**。审计期间修复 2 个 bug：

- 修复后台上传按钮点击无反应（`<label>` 隐式关联改为 `useRef` 编程式触发）
- 修复公开页多图预览只显示第一张（`ImagePreviewModal` 支持 gallery 翻页）

修复后 lint/build/unittest 回归全部 PASS。

---

## v1.4.1 (2026-05-11)

企业微信机器人来单提示。定位为“在现有默认关闭 Webhook 能力上增加轻量 provider”，不扩展为短信、微信服务号、小程序、派单系统或复杂消息中心。

### 新增功能

- 新增 `ORDER_WEBHOOK_PROVIDER`，支持 `generic` 和 `wecom`。
- `generic` 保持原有 JSON payload 行为。
- `wecom` 发送企业微信机器人 markdown 消息。
- 企业微信消息只包含工单号、服务类型、家电类型、区域摘要、紧急程度和可选后台链接。
- 新增 `ORDER_WECOM_INCLUDE_PRIVATE_FIELDS`，显式开启后企业微信消息额外包含客户姓名、手机号、完整地址和故障/清洗描述。
- `APP_BASE_URL` 为空时，企业微信消息不拼接后台链接。
- 后台“我的”页面系统版本显示从 v1.1 更新为 v1.4。

### 隐私与失败隔离

- 企业微信默认不发送客户姓名、手机号、完整地址、完整故障描述；内部接单群可用 `ORDER_WECOM_INCLUDE_PRIVATE_FIELDS=true` 显式开启。
- 企业微信通知不发送保修 token、最终收费、维修结果、配件、图片或内部备注。
- `ORDER_WEBHOOK_ENABLED=false` 时完全不发送外部请求。
- Webhook URL 为空、请求失败或返回异常时只写 warning 日志，不影响客户下单成功。
- Webhook URL 仍只放在后端 `.env`，不得提交到 GitHub 或写入前端。

### 测试结果

- 新增后端 unittest 覆盖企业微信 markdown payload、隐私字段、空 URL/请求失败隔离和 generic 回归。

---

## v1.4 (2026-05-05)

服务类型与新订单提醒。定位为“维修/清洗分类 + 老板后台打开期间提醒 + 可选外部 Webhook”，不是派单系统或复杂消息中心。

### 新增功能

**客户端：**
- 报修表单顶部新增服务类型：维修 / 清洗
- `service_type` 独立提交，不混入 `appliance_type`
- 选择“维修”时描述字段显示“故障描述”
- 选择“清洗”时描述字段显示“清洗需求”

**老板后台：**
- 订单列表、订单详情显示服务类型
- 订单列表支持服务类型筛选
- Excel 导出增加“服务类型”列
- 后台页面打开期间每 25 秒轮询新订单
- 发现新订单后显示顶部红色提醒、尝试播放提示音、页面标题闪烁

**后端：**
- `service_type` 后端强校验，只允许 维修 / 清洗
- 历史订单默认兼容为 维修，读取响应时对空值兜底
- 新增 `/api/orders/notifications/new` 轻量轮询接口，返回 `count`、`latest_id`、`orders`
- 新增默认关闭的通用 Webhook 新单通知
- Webhook payload 只发送脱敏摘要，不发送完整手机号或完整地址
- Webhook 失败只记录日志，不影响客户下单成功

### 明确未做

- 未做派单、抢单
- 未做师傅定位、排班
- 未接短信
- 未做微信小程序
- 未做跨设备未读状态
- 未做复杂消息中心

### 测试结果

- 后端 v1.4 unittest PASS
- 后端 compileall PASS
- 前端 node test PASS
- 前端 lint PASS
- 前端 build PASS

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

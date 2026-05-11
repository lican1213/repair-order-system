# 待办事项

## v1.0 开发 — 已完成

- [x] Phase 0: 项目上下文与基础文件
- [x] Phase 1: 后端项目骨架
- [x] Phase 2: 数据库与模型
- [x] Phase 3: 认证系统
- [x] Phase 4: 公开报修与保修接口
- [x] Phase 5: 后台订单 API
- [x] Phase 6: 文件上传与导出
- [x] Phase 7: 前端项目骨架
- [x] Phase 8: 客户公开页面
- [x] Phase 9: 老板后台页面
- [x] Phase 10: 生产构建与静态托管
- [x] Phase 11: 测试与验收
- [x] Phase 12: 文档与交付

## v1.0 audit fixes — 已完成，已通过 Codex 复审

- [x] 修复 fresh deploy 下 `/uploads` 首次启动挂载风险
- [x] 修复 `image_paths` 非 JSON 存储，并兼容历史脏数据读取
- [x] 修复 `npm run lint` 失败
- [x] 在 `backend/requirements.txt` 直接声明 `bcrypt`
- [x] `/admin/profile` 店铺名称和电话改为来自后端 `.env`
- [x] 清理 `CLAUDE.md` 冲突进度表
- [x] 归档 `IMPLEMENTATION_PLAN.md` 和设计文档到项目内 `docs/`
- [x] 使用标准端口 `8000 + 5173` 完成 smoke test
- [x] Codex 复审：PASS（2026-05-03）

## Mobile Hotfix — 已完成（七轮）

- [x] 第一轮：手机号校验、称呼、定位、保修链接、复制地址、复制保修链接
- [x] 第二轮：手机号即时校验 + 日期+时间段选择
- [x] 第三轮：日期不能选过去 + 家电类型"其他"引导
- [x] 第四轮：日期时间不能早于当前时点 + 保修凭证仅完成后触发
- [x] 第五轮：客户上传图片后台显示
- [x] 第六轮：图片弹层预览 + Excel 导出入口
- [x] 第七轮：浏览器标题修正

## 线上灰度轻量内容更新 — 已完成

- [x] 静态清洗服务价格表页面 `/pricing`（2026-05-04）
- [x] `/repair` 报修页增加“查看清洗价格表”入口（2026-05-04）
- [x] 确认本轮不改后端 API、不改数据库、不做自动报价、在线支付或后台价格管理

## 真机试用 — 待执行

- [ ] 确认测试设备（舅舅手机型号和浏览器）
- [ ] 确认网络环境（手机和服务器同一局域网）
- [ ] 按 `docs/REAL_DEVICE_TEST_PLAN.md` 执行 14 项测试
- [ ] 记录试用发现的问题

## v1.1（稳定性优先）— ✅ 已完成（2026-05-03）

> 详细计划见 `docs/V1_1_PLAN.md`

### Phase 1：备份脚本
- [x] 创建 `scripts/backup.py`（备份 repair.db + uploads/，可选 zip 压缩，可选保留份数）
- [x] `backups/` 目录加入 `.gitignore`

### Phase 2：临时图片清理
- [x] 创建 `scripts/cleanup_temp_images.py`（清理 uploads/orders/temp/ 下超过 7 天的文件，支持 --dry-run）

### Phase 3：公开接口限频
- [x] 创建 `backend/app/rate_limit.py`（内存滑动窗口限频器）
- [x] 修改 `backend/app/routers/public.py`（upload 10次/分/IP，submit 5次/分/IP + 3次/10分/手机号）

### Phase 4：修改密码
- [x] 创建 `backend/app/routers/password.py`（POST /api/auth/change-password）
- [x] 修改 `backend/app/main.py`（注册 password 路由）
- [x] 修改 `backend/app/schemas.py`（新增 ChangePasswordRequest）
- [x] 修改 `frontend/src/api/auth.ts`（新增 changePassword API）
- [x] 修改 `frontend/src/pages/AdminProfile.tsx`（增加修改密码 UI）

### Phase 5：回归测试与文档更新
- [x] 全量回归测试（14/14 端点 PASS，scripts PASS，build PASS，lint 无新增错误）
- [x] 更新 README.md、RELEASE_NOTES.md、API_SPEC.md、PROGRESS.md、TODO.md、DECISIONS.md、CLAUDE.md、AGENTS.md

## v1.2

- [ ] 店铺信息编辑（名称、电话，从 .env 迁移到数据库）
- [ ] 保修二维码生成与下载

## v1.3（二手家电展示橱窗）— ✅ 已完成（2026-05-04）

- [x] 二手家电展示橱窗规划：见 `docs/USED_APPLIANCES_MODULE_PLAN.md`
- [x] 后台 admin 发布、编辑、标记在售/已售/下架：`/admin/used-appliances`
- [x] 客户公开页面 `/used` 查看在售二手家电
- [x] 后台图片上传 `/api/upload/used`
- [x] 坚持电话咨询，不做在线交易、支付、购物车、客户留言、复杂库存或多规格 SKU

## v1.4（服务类型与新单提醒）— ✅ 已完成（2026-05-05）

- [x] `service_type` 独立业务字段（维修/清洗），全链路一致
- [x] 客户表单顶部服务类型选择，维修显示"故障描述"，清洗显示"清洗需求"
- [x] 后台列表、详情、首页卡片、Excel导出显示服务类型
- [x] 列表支持 service_type 筛选
- [x] 后台打开期间新单轮询提醒（`/api/orders/notifications/new`）
- [x] 新单提醒：红色提醒条、标题闪烁、音频尝试
- [x] Webhook 默认关闭，失败只写日志，payload 脱敏
- [x] 旧库兼容：自动补列 + 兜底"维修"
- [x] 独立审计 PASS_WITH_FIXES（1 项 High 已在 v1.4.1 修复）
- [x] 修复 High：通知接口裁剪客户 PII

## v1.4.1（企业微信机器人来单提示）— ✅ 已完成（2026-05-11）

- [x] `ORDER_WEBHOOK_PROVIDER=wecom` 企业微信机器人 markdown 通知
- [x] `ORDER_WECOM_INCLUDE_PRIVATE_FIELDS=true` 显式开启完整接单信息
- [x] generic provider 保持脱敏摘要，不泄露 `_private`
- [x] Webhook URL 为空或请求失败不影响客户下单
- [x] 前端 `NewOrderNotificationResponse.orders` 改为摘要类型
- [x] 后端与前端复检通过

## 安全与部署

- [ ] 生产环境 HTTPS（Caddy 自动证书）
- [ ] Caddy 反向代理配置
- [ ] systemd 服务管理

## 已知限制（非 bug）

- 登录失败锁定使用内存存储，服务重启后清空
- SQLite 适合小店场景，不适合高并发
- 公开接口限频数据存内存，服务重启后清空（可接受行为，D-057）
- 修改密码后旧 JWT Token 在 30 天有效期内仍可用（已知限制，D-055）
- 清洗价格表当前是静态前端页面，价格为起步参考价；自动报价、后台价格管理、在线支付继续不做，后续有真实需求再评估
- 二手家电展示已作为 v1.3 实现；边界是展示橱窗 + 电话咨询，不做商城和交易闭环
- 店铺信息编辑暂未实现，当前展示信息来自 .env（v1.2）
- 保修二维码下载暂未实现，当前只提供保修链接（v1.2）
- 公开上传只校验 MIME type 和扩展名，未校验真实图片内容（后续安全增强）

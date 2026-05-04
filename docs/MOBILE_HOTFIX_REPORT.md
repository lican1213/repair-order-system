# v1.0 Mobile Hotfix Report

## 修复项清单

| # | 问题 | 修复方式 | 状态 |
|---|------|---------|------|
| 1 | 手机号必须 11 位 | 前端限制 inputMode="numeric" + maxLength=11 + 正则校验；后端 Pydantic field_validator 校验 | 完成 |
| 2 | 客户姓名支持称呼 | 前端 label 改为"姓名 / 称呼"，placeholder 改为"例如：刘小姐、任先生、张老板" | 完成 |
| 3 | 地址定位功能 | 新增 latitude/longitude/location_address 字段；前端 Geolocation API；后端 ALTER TABLE 补列 | 完成 |
| 4 | 保修链接不可用 | 使用 buildWarrantyUrl(token) 生成基于 window.location.origin 的绝对 URL；增加"打开保修页"按钮 | 完成 |
| 5 | 复制地址不可用 | 创建 clipboard.ts 工具函数，navigator.clipboard + execCommand fallback | 完成 |
| 6 | 复制保修链接不可用 | 复用 copyText 工具函数，失败时显示可手动复制的链接文本 | 完成 |

## 修改文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/src/utils/clipboard.ts` | 新建 | copyText 兼容函数 |
| `frontend/src/utils/url.ts` | 新建 | buildWarrantyUrl 函数 |
| `frontend/src/pages/RepairForm.tsx` | 修改 | 手机号校验、称呼 label、定位按钮 |
| `frontend/src/pages/OrderDetail.tsx` | 修改 | 复制地址/保修链接兼容、保修链接打开、定位链接显示 |
| `frontend/src/types/order.ts` | 修改 | 新增 latitude/longitude/location_address |
| `frontend/src/types/public.ts` | 修改 | RepairSubmitRequest 新增定位字段 |
| `backend/app/schemas.py` | 修改 | 手机号校验、定位字段 |
| `backend/app/models.py` | 修改 | 新增 latitude/longitude/location_address 列 |
| `backend/app/database.py` | 修改 | 新增 ensure_order_location_columns 迁移函数 |
| `backend/app/routers/public.py` | 修改 | 保存定位数据 |

## 数据库字段变化

orders 表新增 3 个可选字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| latitude | REAL | 纬度 |
| longitude | REAL | 经度 |
| location_address | TEXT | 定位地址文本 |

通过 `ensure_order_location_columns()` 在启动时自动 ALTER TABLE 补列，无需手动迁移。

## 手机号校验说明

**前端：**
- `inputMode="numeric"` 限制数字键盘
- `maxLength={11}` 限制长度
- 正则 `/^\d{11}$/` 校验纯数字
- 以 1 开头校验

**后端：**
- Pydantic `field_validator("phone")` 校验
- 必须 11 位纯数字、以 1 开头
- 不符合返回 422

## 定位功能说明

**实现方式：**
- 前端调用 `navigator.geolocation.getCurrentPosition`
- 成功后保存 latitude/longitude
- 提交报修时一并传给后端

**HTTPS 限制：**
- 浏览器 Geolocation API 要求 HTTPS 或 localhost
- HTTP 局域网访问（如 http://192.168.x.x:8000）可能无法获取定位
- 定位失败不阻止提交，显示"定位失败，请手动填写地址"

**后台展示：**
- 订单详情页如果有经纬度，显示"查看定位"链接
- 链接指向高德地图 `https://uri.amap.com/marker?position={lng},{lat}`

## 复制功能兼容方案

`clipboard.ts` 实现两级 fallback：

1. 优先使用 `navigator.clipboard.writeText`（需要 HTTPS/localhost）
2. 失败时使用 `document.execCommand('copy')` + textarea 临时元素
3. 两级都失败时，页面显示可手动复制的文本

## 保修链接修复方式

- 使用 `buildWarrantyUrl(token)` 生成绝对 URL
- 基于 `window.location.origin`，不硬编码 localhost
- 手机访问时自动使用局域网 IP（如 http://192.168.x.x:8000）
- 增加"打开保修页"按钮，使用 `window.open(url, '_blank')`

## 测试命令和结果

```
问题 1 手机号: 10位→422, 11位→200, 不以1开头→422 ✓
问题 2 称呼: "刘小姐"→200 ✓
问题 3 定位: 带经纬度→200, DB 存储正确 ✓
问题 4 保修: warranty_token 存在, 保修查询 200 ✓
问题 5 复制: clipboard.ts + fallback 实现 ✓
问题 6 保修链接: buildWarrantyUrl 使用 origin ✓
```

## 是否可以再次进入手机真机试用

**可以。** 全部 6 个问题已修复，回归测试通过，原有流程未受影响。

---

# Mobile Hotfix 第二轮 (2026-05-03)

## 修复项清单

| # | 问题 | 修复方式 | 状态 |
|---|------|---------|------|
| 1 | 手机号校验交互优化 | 字段级即时提示 + 提交时兜底校验 + 滚动到错误字段 | 完成 |
| 2 | 希望上门时间改为日期+时间段选择 | input date + 时间段按钮组，拼接保存到 preferred_time | 完成 |

## 修改文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/src/pages/RepairForm.tsx` | 修改 | 手机号即时校验、日期+时间段选择器 |

## 手机号校验说明

**交互方式：**
- 输入过程中实时校验，在输入框下方显示红色错误文字
- 非空但不足 11 位："请输入 11 位手机号"
- 不以 1 开头："手机号格式不正确"
- 提交时为空："请填写手机号"
- 不用 alert 弹窗作为主要提示
- 提交失败自动滚动到第一个错误字段
- 提交按钮不因手机号未满 11 位而禁用

## 希望上门时间选择说明

**UI：**
- 日期：input type="date"，手机浏览器调出系统日期选择器
- 时间段：4 个大按钮（上午 8:00-12:00 / 下午 12:00-18:00 / 晚上 18:00-21:00 / 都可以）
- 选中高亮蓝色，可再次点击取消

**数据流：**
- 前端拼接为 `preferred_time = "2026-05-04 上午 8:00-12:00"`
- 提交给后端保存到 preferred_time 字段
- 不自动写入 scheduled_at
- scheduled_at 仍由老板后台手动确认

## 测试命令和结果

```
手机号校验:
- 10 位手机号 → 422 ✓
- 不以 1 开头 → 422 ✓
- 合法 11 位 → 200 ✓

希望上门时间:
- preferred_time = "2026-05-04 上午 8:00-12:00" ✓
- scheduled_at = None（未自动填充）✓

npm run build: 无 TS 错误 ✓
```

## 是否可以继续手机真机试用

**可以。** 两个体验问题已修复，回归测试通过。

---

# Mobile Hotfix 第三轮 (2026-05-03)

## 修复项清单

| # | 问题 | 修复方式 | 状态 |
|---|------|---------|------|
| 1 | 所有日期不能选过去 | 前端 min={today} + 后端 model_validator 校验 | 完成 |
| 2 | 家电类型"其他"引导 | 前端动态 label/placeholder + 必填校验，后端同步校验 | 完成 |

## 修改文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/src/utils/date.ts` | 新建 | getTodayDateString, isPastDate, toDateInputValue |
| `frontend/src/pages/RepairForm.tsx` | 修改 | 日期 min 限制、"其他"家电引导、brand_model 必填 |
| `frontend/src/pages/OrderDetail.tsx` | 修改 | scheduled_at/warranty_until min 限制、前端日期校验 |
| `backend/app/schemas.py` | 修改 | RepairSubmitRequest + OrderUpdateRequest 日期校验、"其他"品牌必填 |
| `backend/app/routers/orders.py` | 修改 | warranty_until 不能早于 completed_at 校验 |

## 日期限制说明

**前端：** input type="date" 的 min 属性设为今天（本地日期，非 UTC）。

**后端：**
- preferred_time 解析开头 YYYY-MM-DD，早于今天返回 422
- scheduled_at 早于今天返回 422
- completed_at 早于今天返回 422
- warranty_until 早于今天返回 422
- warranty_until 早于 completed_at 返回 422

## "其他"家电类型引导说明

**前端：** appliance_type 为"其他"时：
- 显示提示文字引导填写具体类型
- brand_model label 变为"具体家电类型 / 品牌型号 *"
- placeholder 变为示例文字
- 空值时阻止提交

**后端：** appliance_type 为"其他"且 brand_model 为空时返回 422。

## 测试结果

```
日期限制:
- 昨天 preferred_time → 422 ✓
- 今天 preferred_time → 200 ✓
- 无 preferred_time → 200 ✓
- PATCH scheduled_at 昨天 → 422 ✓
- PATCH completed_at 昨天 → 422 ✓
- PATCH warranty_until 昨天 → 422 ✓
- PATCH warranty_until 明天 → 200 ✓

其他家电:
- 其他无品牌 → 422 ✓
- 其他有品牌 → 200 ✓
- 空调无品牌 → 200 ✓

npm run build: 无 TS 错误 ✓
```

## 是否可以继续手机真机试用

**可以。** 两个问题已修复，回归测试通过。

---

# Mobile Hotfix 第四轮 (2026-05-03)

## 修复项清单

| # | 问题 | 修复方式 | 状态 |
|---|------|---------|------|
| 1 | 日期时间不能早于当前时点 | datetime-local min + isPastDateTime 校验 + 红字提示 | 完成 |
| 2 | 今天不能选已过去时间段 | isPastPreferredSlot 校验 + 禁用按钮 + 红字提示 | 完成 |
| 3 | 保修凭证只在订单完成后触发 | 后端 warranty_token 仅在 status=="已完成" 时生成 + warranty.py 检查状态 | 完成 |

## 修改文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/src/utils/date.ts` | 修改 | 新增 getCurrentDateTimeLocalString, isPastDateTime, isPastPreferredSlot, getTodaySlotHint, validateWarrantyDate |
| `frontend/src/pages/RepairForm.tsx` | 修改 | 日期时间段实时校验 + 红字提示 + 禁用已过时间段按钮 |
| `frontend/src/pages/OrderDetail.tsx` | 修改 | datetime 实时校验 + 红字提示 + 保修凭证显示逻辑 |
| `backend/app/schemas.py` | 修改 | preferred_time 今天时间段校验 + scheduled_at/completed_at 当前时刻校验 |
| `backend/app/routers/orders.py` | 修改 | warranty_token 仅在 status=="已完成" 时生成 |
| `backend/app/routers/warranty.py` | 修改 | 只返回已完成订单的保修凭证 |

## 测试结果

```
日期时间:
- 昨天 preferred_time → 422 ✓
- 明天 preferred_time → 200 ✓
- scheduled_at 过去 → 422 ✓
- completed_at 过去 → 422 ✓
- warranty_until 昨天 → 422 ✓

保修凭证:
- 未完成订单设置 warranty_until → token=None ✓
- 改为已完成 → token 自动生成 ✓
- 已完成订单保修查询 → 200 ✓
- 未完成订单保修查询 → 404 ✓
- 重复 PATCH → token 不变 ✓

npm run build: 无 TS 错误 ✓
```

## 是否可以继续手机真机试用

**可以。** 三个问题已修复，回归测试通过。

---

# Mobile Hotfix 第五轮 (2026-05-03)

## 修复项清单

| # | 问题 | 修复方式 | 状态 |
|---|------|---------|------|
| 1 | 客户上传图片后台不显示 | 新增 parseImagePaths + OrderDetail 显示客户图片区域 | 完成 |

## 修改文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/src/utils/images.ts` | 新建 | parseImagePaths 兼容 JSON 和 Python list 格式 |
| `frontend/src/pages/OrderDetail.tsx` | 修改 | 新增"客户上传图片"区域，缩略图可点击大图 |

## 问题原因

OrderDetail.tsx 没有任何代码显示客户上传的图片。image_paths 在数据库中存储为 JSON 数组字符串，但前端从未解析和渲染。

## 后端 image_paths 保存/返回方式

- 保存：`json.dumps(final_image_paths, ensure_ascii=False)`
- 返回：OrderResponse.image_paths 为字符串
- 前端解析：`parseImagePaths()` 兼容 JSON 和历史 Python list 格式

## 前端图片解析/显示方式

- `parseImagePaths()` 先尝试 JSON.parse，失败则用正则提取 `/uploads/` 路径
- 图片以 3 列网格缩略图展示
- 点击缩略图在新标签页打开原图
- 无图片时显示"暂无客户上传图片"

## 历史数据兼容

已验证数据库中存在 Python list 格式的历史数据（WX20260503014），`parseImagePaths` 的正则回退可正确解析。

## 测试结果

```
上传图片 → temp 路径 ✓
提交报修 → 图片移动到 orders/ ✓
DB image_paths → 合法 JSON ✓
API 返回 image_paths → 正确 ✓
图片 URL 可访问 → 200 ✓
npm run build → 无 TS 错误 ✓
```

## 是否可以继续手机真机试用

**可以。** 问题已修复，回归测试通过。

---

# Mobile Hotfix 第六轮 (2026-05-03)

## 修复项清单

| # | 问题 | 修复方式 | 状态 |
|---|------|---------|------|
| 1 | 图片点击打开新窗口体验差 | 新增 ImagePreviewModal 弹层预览组件 | 完成 |
| 2 | 后台无 Excel 导出入口 | OrderList 增加导出按钮，按筛选条件导出 | 完成 |

## 修改文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/src/components/ImagePreviewModal.tsx` | 新建 | 图片弹层预览组件 |
| `frontend/src/pages/OrderDetail.tsx` | 修改 | 图片改为弹层预览 |
| `frontend/src/api/orders.ts` | 修改 | 新增 exportOrders 函数 |
| `frontend/src/pages/OrderList.tsx` | 修改 | 新增导出 Excel 按钮 |

## 测试结果

```
npm run build: 无 TS 错误 ✓
```

## 是否可以继续手机真机试用

**可以。** 两个修改已完成，build 通过。

---

# Mobile Hotfix 第七轮 (2026-05-03)

## 修复项清单

| # | 问题 | 修复方式 | 状态 |
|---|------|---------|------|
| 1 | 浏览器标题显示 "frontend" | index.html title 改为"家电维修工单系统"，lang 改为 zh-CN | 完成 |

## 修改文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/index.html` | 修改 | title 改为"家电维修工单系统"，lang 改为 zh-CN |

## 测试结果

```
npm run build: 无错误 ✓
build 后 index.html title: 家电维修工单系统 ✓
源代码中无用户可见的 frontend/Vite/React 默认字样 ✓
```

## 是否可以继续手机真机试用

**可以。** 标题问题已修复。

---

# 部署前简化：移除定位入口 (2026-05-04)

## 调整内容

- 客户报修页移除"获取当前位置"入口，不再调用浏览器 Geolocation API。
- 后台订单详情不再显示经纬度、地图识别地址或"查看定位"按钮。
- 地址流程调整为客户手填小区和详细地址，师傅上门前电话确认。
- `latitude`、`longitude`、`location_address` 数据库字段保留，用于历史兼容和未来扩展。

## 调整原因

当前服务附近小区，师傅上门前必然电话沟通地址。定位、地图权限、HTTPS、微信浏览器兼容、地图 Key 和逆地理编码维护成本高于当前收益，因此 v1.1 正式部署版不依赖定位能力。

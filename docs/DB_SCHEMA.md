# 数据库 Schema

**数据库：** SQLite
**文件路径：** `backend/data/repair.db`

---

## orders 表

工单主表。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 自增主键 |
| order_no | TEXT | UNIQUE, NOT NULL | 工单编号，格式 WX20260503001 |
| customer_name | TEXT | NOT NULL | 客户姓名 |
| phone | TEXT | NOT NULL | 手机号 |
| community | TEXT | NOT NULL | 小区名称 |
| address | TEXT | NOT NULL | 详细地址 |
| appliance_type | TEXT | NOT NULL | 家电类型 |
| brand_model | TEXT | | 品牌型号，可选 |
| fault_description | TEXT | NOT NULL | 故障描述 |
| preferred_time | TEXT | | 客户填写的希望上门时间（文本） |
| scheduled_at | DATETIME | | 老板确认的实际上门时间 |
| is_urgent | BOOLEAN | DEFAULT 0 | 是否紧急 |
| image_paths | TEXT | | 客户上传图片路径，JSON 数组字符串 |
| status | TEXT | DEFAULT '新报修' | 订单状态 |
| followup_status | TEXT | DEFAULT '未回访' | 回访状态 |
| repair_result | TEXT | | 维修结果 |
| parts_used | TEXT | | 更换配件 |
| final_fee | REAL | | 收费金额 |
| remark | TEXT | | 备注 |
| repair_images | TEXT | | 维修后图片路径，JSON 数组字符串 |
| warranty_until | TEXT | | 保修截止日期 |
| warranty_token | TEXT | UNIQUE | 保修查询 token |
| warranty_note | TEXT | | 保修说明 |
| source | TEXT | DEFAULT '扫码报修' | 订单来源 |
| latitude | REAL | | 纬度（兼容字段；当前前端不主动采集，保留用于未来扩展） |
| longitude | REAL | | 经度（兼容字段；当前前端不主动采集，保留用于未来扩展） |
| location_address | TEXT | | 定位地址文本（兼容字段；当前前端不主动采集，保留用于未来扩展） |
| completed_at | DATETIME | | 实际维修完成时间 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

### 索引

| 索引名 | 字段 | 类型 |
|--------|------|------|
| ix_orders_order_no | order_no | UNIQUE |
| ix_orders_warranty_token | warranty_token | UNIQUE |
| ix_orders_phone | phone | 普通 |
| ix_orders_status | status | 普通 |
| ix_orders_followup_status | followup_status | 普通 |
| ix_orders_scheduled_at | scheduled_at | 普通 |
| ix_orders_created_at | created_at | 普通 |

### order_no 生成规则

格式：`WX` + `YYYYMMDD` + 三位当日序号

```
WX20260503001
WX20260503002
WX20260503003
```

后端生成逻辑：
1. 获取当天日期
2. 查询当天已有最大序号
3. 最大序号 + 1
4. UNIQUE 约束防重复

### warranty_token 生成规则

```python
import secrets
token = secrets.token_urlsafe(16)
# 结果类似: 8f3k29ad7xq92m4pz
```

在设置 `warranty_until` 且 `warranty_token` 为空时自动生成。生成后不随更新重新生成。

### 图片路径存储规则

`image_paths` 和 `repair_images` 必须存储为合法 JSON 数组字符串，例如：

```json
["/uploads/orders/abc.jpg"]
```

历史 Python list 字符串读取时做兼容解析；无法安全解析时按空数组处理。

---

## users 表

管理员账号表。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 自增主键 |
| username | TEXT | UNIQUE, NOT NULL | 用户名 |
| password_hash | TEXT | NOT NULL | bcrypt 哈希密码 |
| role | TEXT | DEFAULT 'admin' | 角色 |
| is_active | BOOLEAN | DEFAULT 1 | 是否启用 |
| last_login_at | DATETIME | | 最后登录时间 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

### 初始化规则

首次启动时 users 表为空，从 .env 读取 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 创建管理员。后续启动不覆盖。

---

## repair_logs 表

状态变更日志。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PK, AUTOINCREMENT | 自增主键 |
| order_id | INTEGER | FK → orders.id, NOT NULL | 关联工单 |
| old_status | TEXT | | 原状态 |
| new_status | TEXT | NOT NULL | 新状态 |
| note | TEXT | | 变更备注 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 变更时间 |

### 写入规则

当 PATCH /api/orders/{id} 修改了 `status` 字段时，自动写入 repair_logs。状态未变化时不写入。

---

## 状态枚举

### 订单状态

| 值 | 说明 |
|----|------|
| 新报修 | 客户刚提交，待处理 |
| 已联系 | 老板已联系客户 |
| 已预约 | 已确认上门时间 |
| 已上门 | 师傅已到达客户处 |
| 已完成 | 维修完成 |
| 需复查 | 需要再次上门检查 |
| 未成交 | 未达成交易 |

### 回访状态

| 值 | 说明 |
|----|------|
| 未回访 | 待回访 |
| 已回访 | 已完成回访 |
| 客户有问题 | 回访发现客户仍有问题 |
| 无需回访 | 不需要回访 |

### 家电类型

空调 / 冰箱 / 洗衣机 / 热水器 / 燃气灶 / 电视 / 微波炉 / 油烟机 / 其他

---

## ER 关系

```
orders 1 ──── N repair_logs
  │
  └── warranty_token (独立查询入口)
```

users 表独立，不与 orders 直接关联（单管理员场景）。

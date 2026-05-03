"""
测试数据初始化脚本。

重复运行策略：
- 清空 orders 和 repair_logs 后重新插入
- users 表只在管理员不存在时插入，不重复覆盖
"""

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# 确保能 import app 模块
sys.path.insert(0, str(Path(__file__).resolve().parent))

import bcrypt as _bcrypt

from app.config import settings
from app.database import SessionLocal, init_db
from app.models import Order, RepairLog, User
from app.utils import generate_warranty_token


def seed():
    init_db()
    db = SessionLocal()

    try:
        # --- 管理员 ---
        existing_admin = db.query(User).filter(User.username == settings.ADMIN_USERNAME).first()
        if not existing_admin:
            admin = User(
                username=settings.ADMIN_USERNAME,
                password_hash=_bcrypt.hashpw(settings.ADMIN_PASSWORD.encode(), _bcrypt.gensalt()).decode(),
                role="admin",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            print(f"[seed] 创建管理员: {settings.ADMIN_USERNAME}")
        else:
            print(f"[seed] 管理员已存在: {settings.ADMIN_USERNAME}，跳过")

        # --- 清空测试数据 ---
        db.query(RepairLog).delete()
        db.query(Order).delete()
        db.commit()
        print("[seed] 已清空 orders 和 repair_logs")

        # --- 测试工单 ---
        now = datetime.now(timezone.utc)
        today = now.strftime("%Y%m%d")

        test_orders = [
            # 1. 新报修 - 空调
            {
                "order_no": f"WX{today}001",
                "customer_name": "张三",
                "phone": "13800138001",
                "community": "阳光小区",
                "address": "3号楼2单元501",
                "appliance_type": "空调",
                "brand_model": "格力 KFR-35GW",
                "fault_description": "不制冷，外机异响",
                "preferred_time": "明天上午",
                "is_urgent": True,
                "status": "新报修",
                "source": "扫码报修",
            },
            # 2. 新报修 - 冰箱
            {
                "order_no": f"WX{today}002",
                "customer_name": "李四",
                "phone": "13800138002",
                "community": "绿城花园",
                "address": "12栋1单元102",
                "appliance_type": "冰箱",
                "brand_model": "海尔 BCD-218",
                "fault_description": "不制冷，冷藏室温度高",
                "preferred_time": "今天下午",
                "is_urgent": False,
                "status": "新报修",
                "source": "扫码报修",
            },
            # 3. 已联系 - 洗衣机
            {
                "order_no": f"WX{today}003",
                "customer_name": "王五",
                "phone": "13800138003",
                "community": "金色家园",
                "address": "5栋3单元602",
                "appliance_type": "洗衣机",
                "brand_model": "小天鹅 TG80",
                "fault_description": "脱水时震动剧烈，有异响",
                "preferred_time": "后天全天",
                "is_urgent": False,
                "status": "已联系",
                "source": "扫码报修",
            },
            # 4. 已预约 - 热水器
            {
                "order_no": f"WX{today}004",
                "customer_name": "赵六",
                "phone": "13800138004",
                "community": "阳光小区",
                "address": "8栋1单元301",
                "appliance_type": "热水器",
                "brand_model": "美的 F6032",
                "fault_description": "水温不稳定，忽冷忽热",
                "preferred_time": "明天下午",
                "scheduled_at": now + timedelta(days=1, hours=8),
                "is_urgent": False,
                "status": "已预约",
                "source": "扫码报修",
            },
            # 5. 已上门 - 燃气灶
            {
                "order_no": f"WX{today}005",
                "customer_name": "孙七",
                "phone": "13800138005",
                "community": "绿城花园",
                "address": "2栋2单元401",
                "appliance_type": "燃气灶",
                "brand_model": "方太 JZY-T",
                "fault_description": "点火困难，火焰小",
                "preferred_time": "今天上午",
                "scheduled_at": now - timedelta(hours=2),
                "is_urgent": True,
                "status": "已上门",
                "source": "扫码报修",
            },
            # 6. 已完成 - 空调
            {
                "order_no": f"WX{today}006",
                "customer_name": "周八",
                "phone": "13800138006",
                "community": "金色家园",
                "address": "10栋1单元201",
                "appliance_type": "空调",
                "brand_model": "美的 KFR-26GW",
                "fault_description": "漏水，室内机滴水",
                "preferred_time": "3天前",
                "scheduled_at": now - timedelta(days=3),
                "completed_at": now - timedelta(days=3, hours=-2),
                "repair_result": "疏通排水管，更换接水盘",
                "parts_used": "接水盘 x1",
                "final_fee": 180.0,
                "warranty_until": (now + timedelta(days=27)).strftime("%Y-%m-%d"),
                "warranty_token": generate_warranty_token(),
                "warranty_note": "同一故障保修30天",
                "status": "已完成",
                "followup_status": "未回访",
                "source": "扫码报修",
            },
            # 7. 已完成 - 洗衣机
            {
                "order_no": f"WX{today}007",
                "customer_name": "吴九",
                "phone": "13800138007",
                "community": "阳光小区",
                "address": "1栋1单元101",
                "appliance_type": "洗衣机",
                "brand_model": "海尔 EG80",
                "fault_description": "不排水，显示E2错误",
                "preferred_time": "5天前",
                "scheduled_at": now - timedelta(days=5),
                "completed_at": now - timedelta(days=5, hours=-1),
                "repair_result": "清理排水泵异物",
                "parts_used": "无",
                "final_fee": 120.0,
                "warranty_until": (now + timedelta(days=25)).strftime("%Y-%m-%d"),
                "warranty_token": generate_warranty_token(),
                "warranty_note": "同一故障保修30天",
                "status": "已完成",
                "followup_status": "已回访",
                "source": "扫码报修",
            },
            # 8. 已完成 - 冰箱
            {
                "order_no": f"WX{today}008",
                "customer_name": "郑十",
                "phone": "13800138008",
                "community": "绿城花园",
                "address": "6栋3单元502",
                "appliance_type": "冰箱",
                "brand_model": "西门子 KA92",
                "fault_description": "压缩机不停机，冷藏室结冰",
                "preferred_time": "一周前",
                "scheduled_at": now - timedelta(days=7),
                "completed_at": now - timedelta(days=7, hours=-2),
                "repair_result": "更换温控器",
                "parts_used": "温控器 x1",
                "final_fee": 280.0,
                "warranty_until": (now + timedelta(days=23)).strftime("%Y-%m-%d"),
                "warranty_token": generate_warranty_token(),
                "warranty_note": "同一故障保修30天",
                "status": "已完成",
                "followup_status": "客户有问题",
                "source": "扫码报修",
            },
            # 9. 需复查 - 热水器
            {
                "order_no": f"WX{today}009",
                "customer_name": "钱十一",
                "phone": "13800138009",
                "community": "金色家园",
                "address": "3栋2单元302",
                "appliance_type": "热水器",
                "brand_model": "万和 JSQ24",
                "fault_description": "打不着火，显示E1",
                "preferred_time": "2天前",
                "scheduled_at": now - timedelta(days=2),
                "completed_at": now - timedelta(days=2, hours=-1),
                "repair_result": "更换点火器，但客户反映仍有偶发问题",
                "parts_used": "点火器 x1",
                "final_fee": 200.0,
                "status": "需复查",
                "source": "扫码报修",
            },
            # 10. 未成交 - 电视
            {
                "order_no": f"WX{today}010",
                "customer_name": "冯十二",
                "phone": "13800138010",
                "community": "阳光小区",
                "address": "7栋1单元401",
                "appliance_type": "电视",
                "brand_model": "海信 LED55",
                "fault_description": "屏幕一半亮一半暗",
                "preferred_time": "明天上午",
                "is_urgent": False,
                "status": "未成交",
                "remark": "客户觉得维修费太高，决定换新电视",
                "source": "扫码报修",
            },
            # 11. 新报修 - 微波炉
            {
                "order_no": f"WX{today}011",
                "customer_name": "陈十三",
                "phone": "13800138011",
                "community": "绿城花园",
                "address": "9栋2单元102",
                "appliance_type": "微波炉",
                "brand_model": "松下 NN-SM3",
                "fault_description": "不加热，转盘不转",
                "preferred_time": "明天下午",
                "is_urgent": False,
                "status": "新报修",
                "source": "扫码报修",
            },
            # 12. 已联系 - 油烟机
            {
                "order_no": f"WX{today}012",
                "customer_name": "褚十四",
                "phone": "13800138012",
                "community": "金色家园",
                "address": "2栋1单元601",
                "appliance_type": "油烟机",
                "brand_model": "老板 CXW-200",
                "fault_description": "吸力变小，噪音大",
                "preferred_time": "周末",
                "is_urgent": False,
                "status": "已联系",
                "source": "扫码报修",
            },
            # 13. 已预约 - 空调 (今天)
            {
                "order_no": f"WX{today}013",
                "customer_name": "卫十五",
                "phone": "13800138013",
                "community": "阳光小区",
                "address": "4栋3单元202",
                "appliance_type": "空调",
                "brand_model": "格力 KFR-50LW",
                "fault_description": "制热效果差，外机结霜",
                "preferred_time": "今天下午",
                "scheduled_at": now + timedelta(hours=3),
                "is_urgent": False,
                "status": "已预约",
                "source": "扫码报修",
            },
            # 14. 已完成 - 无保修 (老单)
            {
                "order_no": f"WX{(now - timedelta(days=10)).strftime('%Y%m%d')}001",
                "customer_name": "蒋十六",
                "phone": "13800138014",
                "community": "绿城花园",
                "address": "11栋1单元301",
                "appliance_type": "燃气灶",
                "brand_model": "华帝 JZT-B",
                "fault_description": "火焰发黄，有异味",
                "preferred_time": "10天前",
                "scheduled_at": now - timedelta(days=10),
                "completed_at": now - timedelta(days=10, hours=-1),
                "repair_result": "清理燃烧器，调整风门",
                "parts_used": "无",
                "final_fee": 80.0,
                "warranty_until": (now + timedelta(days=20)).strftime("%Y-%m-%d"),
                "warranty_token": generate_warranty_token(),
                "warranty_note": "同一故障保修30天",
                "status": "已完成",
                "followup_status": "无需回访",
                "source": "扫码报修",
            },
            # 15. 已完成 - 客户有问题
            {
                "order_no": f"WX{(now - timedelta(days=3)).strftime('%Y%m%d')}002",
                "customer_name": "沈十七",
                "phone": "13800138015",
                "community": "金色家园",
                "address": "6栋2单元501",
                "appliance_type": "洗衣机",
                "brand_model": "西门子 WM12",
                "fault_description": "门锁打不开",
                "preferred_time": "3天前",
                "scheduled_at": now - timedelta(days=3),
                "completed_at": now - timedelta(days=3, hours=-1),
                "repair_result": "更换门锁",
                "parts_used": "门锁总成 x1",
                "final_fee": 320.0,
                "warranty_until": (now + timedelta(days=27)).strftime("%Y-%m-%d"),
                "warranty_token": generate_warranty_token(),
                "warranty_note": "同一故障保修30天",
                "status": "已完成",
                "followup_status": "客户有问题",
                "remark": "客户反映新门锁偶尔还是有卡顿",
                "source": "扫码报修",
            },
        ]

        for order_data in test_orders:
            order = Order(**order_data)
            db.add(order)

        db.commit()
        print(f"[seed] 创建 {len(test_orders)} 条测试工单")

        # --- 维修日志 ---
        orders = db.query(Order).all()
        logs = []
        for order in orders:
            if order.status in ("已联系", "已预约", "已上门", "已完成", "需复查", "未成交"):
                logs.append(RepairLog(
                    order_id=order.id,
                    old_status="新报修",
                    new_status="已联系",
                    note="已电话联系客户确认故障情况",
                ))
            if order.status in ("已预约", "已上门", "已完成", "需复查"):
                logs.append(RepairLog(
                    order_id=order.id,
                    old_status="已联系",
                    new_status="已预约",
                    note=f"已确认上门时间",
                ))
            if order.status in ("已上门", "已完成", "需复查"):
                logs.append(RepairLog(
                    order_id=order.id,
                    old_status="已预约",
                    new_status="已上门",
                    note="师傅已到达客户处",
                ))
            if order.status in ("已完成", "需复查"):
                logs.append(RepairLog(
                    order_id=order.id,
                    old_status="已上门",
                    new_status="已完成",
                    note="维修完成",
                ))
            if order.status == "需复查":
                logs.append(RepairLog(
                    order_id=order.id,
                    old_status="已完成",
                    new_status="需复查",
                    note="客户反映仍有问题，需再次上门",
                ))
            if order.status == "未成交":
                logs.append(RepairLog(
                    order_id=order.id,
                    old_status="新报修",
                    new_status="未成交",
                    note="客户放弃维修",
                ))

        for log in logs:
            db.add(log)

        db.commit()
        print(f"[seed] 创建 {len(logs)} 条维修日志")

        print("[seed] 完成")

    finally:
        db.close()


if __name__ == "__main__":
    seed()

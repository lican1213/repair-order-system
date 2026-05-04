import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'

interface PriceItem {
  name: string
  price: string
  note?: string
}

interface PriceGroup {
  title: string
  items: PriceItem[]
}

const PRICE_GROUPS: PriceGroup[] = [
  {
    title: '空调类清洗',
    items: [
      { name: '挂机空调内机除菌高温杀毒清洗', price: '50 元/台次起' },
      { name: '方形柜机内机除菌高温杀毒清洗', price: '100 元/台次起' },
      { name: '方形柜机开背清洗', price: '150 元/台次起' },
      { name: '圆柱柜机深度拆洗', price: '180 元/台次起' },
      { name: '中央空调出风口除菌杀毒清洗', price: '50 元/台次' },
      { name: '中央空调进风口除菌杀毒清洗', price: '50 元/台次起' },
      { name: '风管机空调深度清洗', price: '300 元/台次' },
      { name: '制冷机组深度清洗', price: '200 元/台次' },
    ],
  },
  {
    title: '波轮洗衣机',
    items: [
      { name: '普通波轮洗衣机拆洗', price: '120 元/台次' },
      { name: '小天鹅波轮洗衣机、海尔变频双动力波轮洗衣机、卡萨帝波轮洗衣机拆洗', price: '150 元/台次' },
    ],
  },
  {
    title: '滚筒洗衣机',
    items: [
      { name: '普通滚筒洗衣机深度拆洗', price: '220 元/台次' },
      { name: '带烘干功能洗衣机深度拆洗', price: '260 元/台次' },
      { name: '大肚婆类洗衣机深度拆洗', price: '260 元/台次起' },
      { name: '海尔水晶、卡萨帝、西门子、博世滚筒洗衣机普通款深度拆洗', price: '300 元/台次' },
      { name: '卡扣款滚筒洗衣机深度拆洗', price: '350 元/台次' },
      { name: '热熔桶滚筒洗衣机深度拆洗', price: '600 元/台次', note: '需时约两天' },
      { name: '双层滚筒洗衣机深度拆洗', price: '500 元/台次' },
    ],
  },
  {
    title: '热水器类',
    items: [
      { name: '储水式热水器 50L / 60L 深度拆洗', price: '120 元/台次' },
      { name: '储水式热水器 80L 深度拆洗', price: '150 元/台次' },
      { name: '史密斯、阿里斯顿、林内等外国品牌 50L / 60L 深度拆洗', price: '180 元/台次' },
      { name: '史密斯、阿里斯顿、林内等外国品牌 80L 深度拆洗', price: '200 元/台次' },
      { name: '燃气热水器深度打循环清洗', price: '150 元/台次' },
    ],
  },
  {
    title: '油烟机类',
    items: [
      { name: '普通顶吸油烟机上门清洗', price: '120 元/台', note: '春节前除外' },
      { name: '普通顶吸油烟机拉店泡洗', price: '200 元/台' },
      { name: '普通侧吸油烟机上门清洗', price: '120 元/台', note: '春节前除外' },
      { name: '普通侧吸油烟机拉店泡洗', price: '200 元/台' },
      { name: '普通电动门油烟机上门清洗', price: '150 元/台', note: '春节前除外' },
      { name: '普通电动门油烟机拉店泡洗', price: '200 元/台' },
      { name: '复杂电动门油烟机上门清洗', price: '180 元/台', note: '春节前除外' },
      { name: '复杂电动门油烟机拉店泡洗', price: '260 元/台' },
    ],
  },
  {
    title: '冰箱类',
    items: [
      { name: '200L 左右及 200L 以内冰箱高温杀毒清洗', price: '120 元/台' },
      { name: '250L 以上冰箱高温杀毒清洗', price: '150 元/台次' },
      { name: '商用冰箱深度高温杀毒清洗', price: '180 元/台次' },
    ],
  },
  {
    title: '暖气类',
    items: [
      { name: '地暖脉冲清洗', price: '99 元/户' },
      { name: '地暖射弹清洗', price: '40 元/路', note: '三路起步' },
      { name: '铸铁暖气片清洗', price: '200 元/组' },
      { name: '铜铝暖气片清洗', price: '200 元/户' },
    ],
  },
]

const DISCLAIMER = '以上价格为起步参考价，具体费用以师傅电话沟通或现场检查确认为准。特殊品牌、复杂结构、拆装难度较高、距离较远或节假日服务时，价格可能调整。'

export default function PricingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <main className="max-w-lg mx-auto px-4 py-5">
        <header className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900">清洗服务价格表</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            以下价格为起步参考价，具体费用以师傅电话沟通或现场检查确认为准。
          </p>
        </header>

        <section className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm leading-6 text-amber-900">{DISCLAIMER}</p>
        </section>

        <div className="space-y-4">
          {PRICE_GROUPS.map((group) => (
            <section key={group.title} className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-3">
                <h2 className="text-base font-semibold text-gray-900">{group.title}</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {group.items.map((item) => (
                  <div key={`${group.title}-${item.name}`} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 text-sm leading-6 text-gray-800">{item.name}</p>
                      <p className="shrink-0 text-right text-sm font-semibold leading-6 text-blue-700">{item.price}</p>
                    </div>
                    {item.note && <p className="mt-1 text-xs leading-5 text-gray-500">{item.note}</p>}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-5 rounded-lg border border-gray-200 bg-white p-4">
          <p className="mb-4 text-sm leading-6 text-gray-600">{DISCLAIMER}</p>
          <Button type="button" fullWidth onClick={() => navigate('/repair')}>
            我要报修 / 预约清洗
          </Button>
        </section>
      </main>
    </div>
  )
}

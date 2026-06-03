import { useNavigate } from 'react-router-dom'
import { IconTag, IconChevronRight } from '../components/icons'

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
    <div className="min-h-screen bg-cream pb-12">
      <header className="rounded-b-[28px] bg-gradient-to-br from-amber-400 via-orange-400 to-orange-500 px-5 pb-9 pt-6 text-white shadow-sm">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            onClick={() => navigate('/repair')}
            className="mb-3 inline-flex min-h-[36px] items-center gap-1 text-sm font-medium text-white/90 active:text-white"
          >
            <IconChevronRight className="h-4 w-4 rotate-180" />
            返回报修
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/25 backdrop-blur-sm">
              <IconTag className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">清洗服务价格表</h1>
              <p className="mt-0.5 text-sm text-white/90">起步参考价 · 以电话或现场确认为准</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-5 max-w-lg px-4">
        <section className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm leading-6 text-amber-900">{DISCLAIMER}</p>
        </section>

        <div className="space-y-4">
          {PRICE_GROUPS.map((group) => (
            <section key={group.title} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-orange-100/70">
              <div className="flex items-center gap-2 border-b border-orange-50 bg-orange-50/40 px-4 py-3">
                <span className="h-4 w-1.5 rounded-full bg-brand-400" />
                <h2 className="text-base font-semibold text-gray-900">{group.title}</h2>
              </div>
              <div className="divide-y divide-orange-50">
                {group.items.map((item) => (
                  <div key={`${group.title}-${item.name}`} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 text-sm leading-6 text-gray-800">{item.name}</p>
                      <p className="shrink-0 text-right text-sm font-bold leading-6 text-brand-600">{item.price}</p>
                    </div>
                    {item.note && <p className="mt-1 text-xs leading-5 text-gray-500">{item.note}</p>}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100/70">
          <p className="mb-4 text-sm leading-6 text-gray-500">{DISCLAIMER}</p>
          <button
            type="button"
            onClick={() => navigate('/repair')}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-base font-semibold text-white shadow-lg shadow-orange-500/30 transition active:scale-[0.99]"
          >
            我要报修 / 预约清洗
          </button>
        </section>
      </main>
    </div>
  )
}

import { useLocation, Link } from 'react-router-dom'
import Button from '../components/Button'
import { IconCheck, IconPhone } from '../components/icons'

export default function RepairSuccess() {
  const location = useLocation()
  const state = location.state as { order_no?: string; shop_phone?: string } | null

  if (!state?.order_no) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">未找到提交信息，请重新报修</p>
          <Link to="/repair">
            <Button tone="warm">返回报修首页</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
          <IconCheck className="h-9 w-9" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">报修已提交</h1>
        <p className="text-sm text-gray-500 mb-6">师傅会尽快与您电话联系</p>

        <div className="bg-white rounded-2xl p-4 mb-4 text-left shadow-sm ring-1 ring-orange-100/70">
          <div className="mb-3 border-b border-orange-50 pb-3">
            <span className="text-sm text-gray-500">工单编号</span>
            <div className="text-lg font-mono font-bold text-gray-900">{state.order_no}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">师傅联系电话</span>
            <div className="text-lg">
              <a href={`tel:${state.shop_phone}`} className="font-bold text-brand-600">
                {state.shop_phone}
              </a>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-6 text-left">
          <p className="text-sm leading-6 text-amber-800">
            <strong>安全提示：</strong>如有漏电、烧焦味、燃气泄漏、严重漏水或跳闸，请先断电或关闭阀门，不要自行拆修，等待师傅联系。
          </p>
        </div>

        <a
          href={`tel:${state.shop_phone}`}
          className="mb-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-base font-semibold text-white shadow-lg shadow-orange-500/30 transition active:scale-[0.99]"
        >
          <IconPhone className="h-5 w-5" />
          一键拨打师傅电话
        </a>

        <Link to="/repair">
          <Button variant="secondary" tone="warm" fullWidth>
            返回报修首页
          </Button>
        </Link>
      </div>
    </div>
  )
}

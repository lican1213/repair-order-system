import { useLocation, Link } from 'react-router-dom'
import Button from '../components/Button'

export default function RepairSuccess() {
  const location = useLocation()
  const state = location.state as { order_no?: string; shop_phone?: string } | null

  if (!state?.order_no) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">未找到提交信息，请重新报修</p>
          <Link to="/repair">
            <Button>返回报修首页</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-xl font-bold mb-6">报修已提交</h1>

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 text-left">
          <div className="mb-3">
            <span className="text-sm text-gray-500">工单编号</span>
            <div className="text-lg font-mono font-bold">{state.order_no}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">师傅联系电话</span>
            <div className="text-lg">
              <a href={`tel:${state.shop_phone}`} className="text-blue-600 font-bold">
                {state.shop_phone}
              </a>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 text-left">
          <p className="text-sm text-yellow-800">
            <strong>安全提示：</strong>如有漏电、烧焦味、燃气泄漏、严重漏水或跳闸，请先断电或关闭阀门，不要自行拆修，等待师傅联系。
          </p>
        </div>

        <a href={`tel:${state.shop_phone}`}>
          <Button fullWidth className="mb-3">
            📞 一键拨打师傅电话
          </Button>
        </a>

        <Link to="/repair">
          <Button variant="secondary" fullWidth>
            返回报修首页
          </Button>
        </Link>
      </div>
    </div>
  )
}

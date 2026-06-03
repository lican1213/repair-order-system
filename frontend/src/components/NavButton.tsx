import { useState } from 'react'
import BottomSheet from './BottomSheet'
import { buildAmapSearchUrl, buildBaiduSearchUrl, buildOrderAddress } from '../utils/maps'

interface NavButtonProps {
  community: string
  address: string
  className?: string
}

export default function NavButton({ community, address, className = '' }: NavButtonProps) {
  const [open, setOpen] = useState(false)
  const fullAddress = buildOrderAddress(community, address)

  const openMap = (provider: 'amap' | 'baidu') => {
    const url = provider === 'amap'
      ? buildAmapSearchUrl(fullAddress)
      : buildBaiduSearchUrl(fullAddress)
    window.open(url, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        🧭 导航
      </button>

      <BottomSheet open={open} title="选择地图" onClose={() => setOpen(false)}>
        <div className="mb-4 rounded-2xl bg-gray-50 px-3 py-3 text-sm text-gray-600">
          {fullAddress}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => openMap('amap')}
            className="min-h-[48px] rounded-2xl bg-emerald-50 px-4 text-sm font-medium text-emerald-700"
          >
            高德地图
          </button>
          <button
            type="button"
            onClick={() => openMap('baidu')}
            className="min-h-[48px] rounded-2xl bg-blue-50 px-4 text-sm font-medium text-blue-700"
          >
            百度地图
          </button>
        </div>
      </BottomSheet>
    </>
  )
}

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import ImagePreviewModal from '../components/ImagePreviewModal'
import { getPublicUsedAppliance } from '../api/usedAppliances'
import { getShopInfo } from '../api/public'
import type { UsedAppliance } from '../types/usedAppliance'
import type { ShopInfoResponse } from '../types/public'
import { canUseNativeShare, shareOrCopy } from '../utils/share'
import { IconPhone } from '../components/icons'

const DISCLAIMER = '二手家电价格、成色和库存变动较快，页面信息仅供参考。具体价格、成色、配送、安装和售后说明以电话沟通确认为准。'

export default function UsedApplianceDetail() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<UsedAppliance | null>(null)
  const [shopInfo, setShopInfo] = useState<ShopInfoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    Promise.all([
      getPublicUsedAppliance(Number(id)),
      getShopInfo(),
    ])
      .then(([appliance, shop]) => {
        if (cancelled) return
        setItem(appliance)
        setShopInfo(shop)
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [id])

  const handleShare = async () => {
    if (!item) return

    const url = window.location.href
    const text = `${item.title} | ${item.category}${item.brand_model ? ` · ${item.brand_model}` : ''} | ${item.price || '电话咨询'}`
    const result = await shareOrCopy({ title: item.title, text, url }, url)
    if (result === 'copied') {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-gray-400">加载中...</p>
      </div>
    )
  }

  if (notFound || !item) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-800">商品不存在或已下架</p>
          <Link to="/used" className="mt-4 inline-block text-brand-600">返回二手家电列表</Link>
        </div>
      </div>
    )
  }

  const phone = item.contact_phone || shopInfo?.shop_phone || ''
  const shareText = `${item.title} | ${item.category}${item.brand_model ? ` · ${item.brand_model}` : ''} | ${item.price || '电话咨询'}`
  const shareData = { title: item.title, text: shareText, url: window.location.href }

  return (
    <div className="min-h-screen bg-cream pb-8">
      <div className="mx-auto max-w-lg">
        {/* Back bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <Link to="/used" className="text-sm font-medium text-brand-600">← 返回列表</Link>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 active:bg-gray-50"
          >
            {copied ? '已复制链接' : (canUseNativeShare(shareData) ? '分享' : '复制链接')}
          </button>
        </div>

        {/* Images */}
        {item.image_paths.length > 0 && (
          <div className="bg-gray-100">
            <button
              type="button"
              className="block w-full"
              onClick={() => setPreviewImages(item.image_paths)}
            >
              <img src={item.image_paths[0]} alt={item.title} className="w-full max-h-80 object-contain" />
            </button>
            {item.image_paths.length > 1 && (
              <div className="flex gap-1 px-4 py-2 overflow-x-auto">
                {item.image_paths.map((path, i) => (
                  <button
                    key={path}
                    type="button"
                    onClick={() => setPreviewImages(item.image_paths.slice(i).concat(item.image_paths.slice(0, i)))}
                    className="shrink-0"
                  >
                    <img src={path} alt={`${item.title} ${i + 1}`} className="h-16 w-16 object-cover rounded border" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {item.image_paths.length === 0 && (
          <div className="h-48 bg-gray-100 flex items-center justify-center text-gray-400">暂无图片</div>
        )}

        {/* Info */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold text-gray-900">{item.title}</h1>
            <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">在售</span>
          </div>

          <p className="text-sm text-gray-500">
            {item.category}{item.brand_model ? ` · ${item.brand_model}` : ''}
          </p>

          <p className="text-2xl font-bold text-red-600">{item.price || '电话咨询'}</p>

          {item.condition_note && (
            <div className="rounded-xl bg-orange-50/50 p-3">
              <p className="text-xs text-gray-400 mb-1">成色说明</p>
              <p className="text-sm text-gray-700">{item.condition_note}</p>
            </div>
          )}

          {item.description && (
            <div className="rounded-xl bg-orange-50/50 p-3">
              <p className="text-xs text-gray-400 mb-1">详细描述</p>
              <p className="text-sm text-gray-700 leading-6">{item.description}</p>
            </div>
          )}

          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-base font-semibold text-white shadow-lg shadow-orange-500/30 transition active:scale-[0.99]"
            >
              <IconPhone className="h-5 w-5" />
              电话咨询：{phone}
            </a>
          )}

          <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">{DISCLAIMER}</p>
        </div>
      </div>

      <ImagePreviewModal images={previewImages} alt={item.title} onClose={() => setPreviewImages([])} />
    </div>
  )
}

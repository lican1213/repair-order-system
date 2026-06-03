import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPublicUsedAppliances } from '../api/usedAppliances'
import { getShopInfo } from '../api/public'
import type { UsedAppliance } from '../types/usedAppliance'
import type { ShopInfoResponse } from '../types/public'
import { canUseNativeShare, shareOrCopy } from '../utils/share'
import { IconSofa, IconPhone } from '../components/icons'

const DISCLAIMER = '二手家电价格、成色和库存变动较快，页面信息仅供参考。具体价格、成色、配送、安装和售后说明以电话沟通确认为准。'

export default function UsedAppliancesPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<UsedAppliance[]>([])
  const [shopInfo, setShopInfo] = useState<ShopInfoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([getPublicUsedAppliances(), getShopInfo()])
      .then(([list, shop]) => {
        if (cancelled) return
        setItems(list.items)
        setShopInfo(shop)
      })
      .catch(() => {
        if (!cancelled) setError('二手家电列表加载失败，请稍后再试')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const shopPhone = shopInfo?.shop_phone || ''

  const buildShareData = (item: UsedAppliance) => {
    const url = `${window.location.origin}/used/${item.id}`
    const text = `${item.title} | ${item.category}${item.brand_model ? ` · ${item.brand_model}` : ''} | ${item.price || '电话咨询'}`
    return {
      url,
      data: { title: item.title, text, url },
    }
  }

  const handleShare = async (item: UsedAppliance) => {
    const { data, url } = buildShareData(item)
    const result = await shareOrCopy(data, url)
    if (result === 'copied') {
      setCopiedId(item.id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-cream pb-10">
      {/* 暖色头部 */}
      <header className="rounded-b-[28px] bg-gradient-to-br from-amber-400 via-orange-400 to-orange-500 px-5 pb-9 pt-7 text-white shadow-sm">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/25 backdrop-blur-sm">
              <IconSofa className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm text-white/90">{shopInfo?.shop_name || '家电维修服务'}</p>
              <h1 className="text-xl font-bold leading-tight">二手家电</h1>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/90">{DISCLAIMER}</p>
          {shopPhone && (
            <a
              href={`tel:${shopPhone}`}
              className="mt-3 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand-600 shadow-sm active:scale-[0.99]"
            >
              <IconPhone className="h-4 w-4" />
              电话咨询：{shopPhone}
            </a>
          )}
        </div>
      </header>

      <div className="mx-auto -mt-5 max-w-lg px-4">
        <div className="mb-4 grid grid-cols-2 gap-3">
          <Link
            to="/repair"
            className="flex min-h-[44px] items-center justify-center rounded-xl bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-orange-100 active:bg-orange-50"
          >
            返回报修
          </Link>
          <Link
            to="/pricing"
            className="flex min-h-[44px] items-center justify-center rounded-xl bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-orange-100 active:bg-orange-50"
          >
            清洗价格表
          </Link>
        </div>

        {loading && <p className="py-10 text-center text-gray-400">加载中...</p>}
        {error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-orange-100/70">
            <p className="font-medium text-gray-800">暂无在售二手家电</p>
            <p className="mt-2 text-sm text-gray-500">可电话咨询是否有新货。</p>
            {shopPhone && (
              <a
                href={`tel:${shopPhone}`}
                className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white active:bg-brand-600"
              >
                电话咨询
              </a>
            )}
          </div>
        )}

        <div className="flex flex-col gap-4">
          {items.map((item) => {
            const phone = item.contact_phone || shopPhone
            const mainImage = item.image_paths[0]
            const shareData = buildShareData(item).data
            return (
              <article key={item.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-orange-100/70">
                {mainImage ? (
                  <button
                    type="button"
                    className="block w-full bg-orange-50/40"
                    onClick={() => navigate(`/used/${item.id}`)}
                    aria-label={`查看${item.title}详情`}
                  >
                    <img src={mainImage} alt={item.title} className="h-52 w-full object-cover" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="flex h-40 w-full items-center justify-center bg-orange-50/40 text-sm text-gray-400"
                    onClick={() => navigate(`/used/${item.id}`)}
                  >
                    暂无图片
                  </button>
                )}

                <div className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{item.title}</h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {item.category}{item.brand_model ? ` · ${item.brand_model}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      在售
                    </span>
                  </div>

                  <p className="text-xl font-bold text-red-600">{item.price || '电话咨询'}</p>
                  {item.condition_note && <p className="mt-2 text-sm text-gray-700">{item.condition_note}</p>}
                  {item.description && <p className="mt-2 text-sm leading-6 text-gray-600">{item.description}</p>}

                  <div className="mt-4 flex gap-2">
                    {phone && (
                      <a
                        href={`tel:${phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white active:bg-brand-600"
                      >
                        <IconPhone className="h-4 w-4" />
                        电话咨询
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); void handleShare(item) }}
                      className="min-h-[44px] rounded-xl border border-orange-100 px-4 py-2 text-sm font-medium text-gray-700 active:bg-orange-50"
                    >
                      {copiedId === item.id ? '已复制链接' : (canUseNativeShare(shareData) ? '分享' : '复制链接')}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <p className="mt-6 rounded-2xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">{DISCLAIMER}</p>
      </div>
    </div>
  )
}

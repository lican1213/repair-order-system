import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPublicUsedAppliances } from '../api/usedAppliances'
import { getShopInfo } from '../api/public'
import type { UsedAppliance } from '../types/usedAppliance'
import type { ShopInfoResponse } from '../types/public'

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

  const handleShare = async (item: UsedAppliance) => {
    const url = `${window.location.origin}/used/${item.id}`

    if ('share' in navigator) {
      const text = `${item.title} | ${item.category}${item.brand_model ? ` · ${item.brand_model}` : ''} | ${item.price || '电话咨询'}`
      try {
        await navigator.share({ title: item.title, text, url })
        return
      } catch {
        // User cancelled or share failed, fall through to copy
      }
    }

    // Copy link only
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(item.id)
      setTimeout(() => setCopiedId(null), 2000)
      return
    } catch {
      // Fall through to legacy method
    }

    const ta = document.createElement('textarea')
    ta.value = url
    ta.style.cssText = 'position:fixed;left:-9999px'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    setCopiedId(item.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="mx-auto max-w-lg p-4">
        <header className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-700">{shopInfo?.shop_name || '家电维修服务'}</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">二手家电</h1>
          <p className="mt-2 text-sm leading-6 text-gray-700">{DISCLAIMER}</p>
          {shopPhone && (
            <a
              href={`tel:${shopPhone}`}
              className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white active:bg-emerald-700"
            >
              电话咨询：{shopPhone}
            </a>
          )}
        </header>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <Link
            to="/repair"
            className="flex min-h-[44px] items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 active:bg-gray-50"
          >
            返回报修
          </Link>
          <Link
            to="/pricing"
            className="flex min-h-[44px] items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 active:bg-gray-50"
          >
            清洗价格表
          </Link>
        </div>

        {loading && <p className="py-10 text-center text-gray-400">加载中...</p>}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
            <p className="font-medium text-gray-800">暂无在售二手家电</p>
            <p className="mt-2 text-sm text-gray-500">可电话咨询是否有新货。</p>
            {shopPhone && (
              <a
                href={`tel:${shopPhone}`}
                className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
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
            return (
              <article key={item.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                {mainImage ? (
                  <button
                    type="button"
                    className="block w-full bg-gray-100"
                    onClick={() => navigate(`/used/${item.id}`)}
                    aria-label={`查看${item.title}详情`}
                  >
                    <img src={mainImage} alt={item.title} className="h-52 w-full object-cover" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="flex h-40 w-full items-center justify-center bg-gray-100 text-sm text-gray-400"
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
                        className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white active:bg-blue-700"
                      >
                        电话咨询
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); void handleShare(item) }}
                      className="min-h-[44px] rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 active:bg-gray-50"
                    >
                      {copiedId === item.id ? '已复制链接' : ('share' in navigator ? '分享' : '复制链接')}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <p className="mt-6 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">{DISCLAIMER}</p>
      </div>
    </div>
  )
}

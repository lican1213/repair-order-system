import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BottomNav from '../components/BottomNav'
import Button from '../components/Button'
import ImagePreviewModal from '../components/ImagePreviewModal'
import Input from '../components/Input'
import Select from '../components/Select'
import TextArea from '../components/TextArea'
import {
  createUsedAppliance,
  deleteUsedAppliance,
  getAdminUsedAppliances,
  updateUsedAppliance,
  uploadUsedApplianceImages,
} from '../api/usedAppliances'
import { getShopInfo } from '../api/public'
import { useAuth } from '../hooks/useAuth'
import { USED_APPLIANCE_CATEGORIES, USED_APPLIANCE_STATUSES } from '../utils/constants'
import { canManageUsedAppliances } from '../utils/permissions'
import type {
  UsedAppliance,
  UsedAppliancePayload,
  UsedApplianceStatus,
  UsedApplianceUpdatePayload,
} from '../types/usedAppliance'
import type { ShopInfoResponse } from '../types/public'

const emptyForm: UsedAppliancePayload = {
  title: '',
  category: '洗衣机',
  brand_model: '',
  price: '',
  condition_note: '',
  description: '',
  image_paths: [],
  status: '在售',
  contact_phone: '',
}

const statusOptions = ['全部', ...USED_APPLIANCE_STATUSES]

function getApiMessage(err: unknown): string {
  return (
    (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
    '操作失败，请重试'
  )
}

export default function AdminUsedAppliances() {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<UsedAppliance[]>([])
  const [statusFilter, setStatusFilter] = useState('全部')
  const [keyword, setKeyword] = useState('')
  const [form, setForm] = useState<UsedAppliancePayload>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [shopInfo, setShopInfo] = useState<ShopInfoResponse | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canManage = canManageUsedAppliances(user?.role)

  const loadItems = useCallback(async (): Promise<UsedAppliance[]> => {
    const result = await getAdminUsedAppliances({
      status: statusFilter === '全部' ? undefined : statusFilter,
      keyword: keyword.trim() || undefined,
      page_size: 100,
    })
    return result.items
  }, [keyword, statusFilter])

  useEffect(() => {
    if (authLoading) return
    if (!canManage) return

    let cancelled = false

    void loadItems()
      .then((loadedItems) => {
        if (!cancelled) setItems(loadedItems)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getApiMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [authLoading, canManage, loadItems])

  useEffect(() => {
    let cancelled = false
    void getShopInfo().then((info) => {
      if (!cancelled) setShopInfo(info)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const formTitle = useMemo(() => (editingId ? '编辑二手家电' : '新增二手家电'), [editingId])

  const updateForm = (field: keyof UsedAppliancePayload, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setMessage('')
    setError('')
  }

  const resetForm = () => {
    setForm({
      ...emptyForm,
      contact_phone: shopInfo?.shop_phone || '',
    })
    setEditingId(null)
    setMessage('')
    setError('')
  }

  const startEdit = (item: UsedAppliance) => {
    setEditingId(item.id)
    setForm({
      title: item.title,
      category: item.category,
      brand_model: item.brand_model || '',
      price: item.price || '',
      condition_note: item.condition_note || '',
      description: item.description || '',
      image_paths: item.image_paths,
      status: item.status,
      contact_phone: item.contact_phone || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const fileArray = Array.from(files)
    if ((form.image_paths?.length || 0) + fileArray.length > 5) {
      setError('最多上传 5 张图片')
      return
    }

    for (const file of fileArray) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError(`不支持的文件类型: ${file.name}`)
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`文件过大: ${file.name}，最大 5MB`)
        return
      }
    }

    setUploading(true)
    setError('')
    try {
      const result = await uploadUsedApplianceImages(fileArray)
      updateForm('image_paths', [...(form.image_paths || []), ...result.paths])
    } catch (err: unknown) {
      setError(getApiMessage(err))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeImage = (path: string) => {
    updateForm('image_paths', (form.image_paths || []).filter((item) => item !== path))
  }

  const buildPayload = (): UsedAppliancePayload => ({
    title: form.title.trim(),
    category: form.category,
    brand_model: form.brand_model?.trim() || null,
    price: form.price?.trim() || null,
    condition_note: form.condition_note?.trim() || null,
    description: form.description?.trim() || null,
    image_paths: form.image_paths || [],
    status: form.status,
    contact_phone: form.contact_phone?.trim() || null,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    const payload = buildPayload()
    if (payload.title.length < 2) {
      setError('标题至少 2 个字')
      return
    }
    if (!payload.category) {
      setError('请选择类别')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateUsedAppliance(editingId, payload as UsedApplianceUpdatePayload)
        setMessage('已保存修改')
      } else {
        await createUsedAppliance(payload)
        setMessage('已新增二手家电')
      }
      resetForm()
      setItems(await loadItems())
    } catch (err: unknown) {
      setError(getApiMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const quickStatus = async (item: UsedAppliance, nextStatus: UsedApplianceStatus) => {
    setError('')
    setMessage('')
    try {
      await updateUsedAppliance(item.id, { status: nextStatus })
      setMessage(`已将”${item.title}”标记为${nextStatus}`)
      setItems(await loadItems())
    } catch (err: unknown) {
      setError(getApiMessage(err))
    }
  }

  const handleDelete = async (item: UsedAppliance) => {
    if (!window.confirm(`确定删除”${item.title}”？删除后不可恢复。`)) return
    setError('')
    setMessage('')
    try {
      await deleteUsedAppliance(item.id)
      setMessage(`已删除”${item.title}”`)
      setItems(await loadItems())
    } catch (err: unknown) {
      setError(getApiMessage(err))
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="p-4 text-center text-gray-400">加载中...</div>
        <BottomNav />
      </div>
    )
  }

  if (!canManage) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="p-4">
          <h1 className="mb-4 text-lg font-bold">二手家电管理</h1>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            当前账号无权限管理二手家电。
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="mx-auto max-w-3xl p-4">
        <h1 className="mb-4 text-lg font-bold">二手家电管理</h1>

        <form onSubmit={handleSubmit} className="mb-5 rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-bold text-gray-900">{formTitle}</h2>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-sm text-blue-600">
                取消编辑
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="标题 *" value={form.title} onChange={(e) => updateForm('title', e.target.value)} placeholder="如：二手海尔 8kg 洗衣机" maxLength={80} />
            <Select label="类别 *" options={USED_APPLIANCE_CATEGORIES} value={form.category} onChange={(e) => updateForm('category', e.target.value)} />
            <Input label="品牌型号" value={form.brand_model || ''} onChange={(e) => updateForm('brand_model', e.target.value)} placeholder="如：海尔 XQB80" maxLength={80} />
            <Input label="价格" value={form.price || ''} onChange={(e) => updateForm('price', e.target.value)} placeholder="如：800元起 / 面议" maxLength={30} />
            <Input label="成色说明" value={form.condition_note || ''} onChange={(e) => updateForm('condition_note', e.target.value)} placeholder="如：八成新，正常使用" maxLength={200} />
            <Input label="联系电话" value={form.contact_phone || ''} onChange={(e) => updateForm('contact_phone', e.target.value)} placeholder={shopInfo?.shop_phone || '留空则电话咨询时使用店铺电话'} maxLength={30} />
            <Select label="状态" options={[...USED_APPLIANCE_STATUSES]} value={form.status} onChange={(e) => updateForm('status', e.target.value as UsedApplianceStatus)} />
          </div>

          <div className="mt-3">
            <TextArea label="详细描述" value={form.description || ''} onChange={(e) => updateForm('description', e.target.value)} placeholder="补充说明，具体仍以电话沟通确认为准" maxLength={1000} />
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-gray-700">商品图片（最多 5 张）</label>
            {(form.image_paths?.length || 0) < 5 && (
              <div
                role="button"
                tabIndex={0}
                className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 active:bg-gray-50"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
              >
                {uploading ? '上传中...' : '点击上传图片'}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={uploading}
              onChange={(e) => void handleUpload(e.target.files)}
              className="hidden"
            />
            {(form.image_paths || []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(form.image_paths || []).map((path) => (
                  <div key={path} className="relative">
                    <button type="button" onClick={() => setPreviewSrc(path)} className="block">
                      <img src={path} alt="二手家电图片" className="h-20 w-20 rounded-lg border object-cover" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(path)}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white"
                      aria-label="移除图片"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          {message && <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>}

          <Button type="submit" fullWidth disabled={saving || uploading} className="mt-4">
            {saving ? '保存中...' : editingId ? '保存修改' : '新增二手家电'}
          </Button>
        </form>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 grid gap-3 sm:grid-cols-[160px_1fr]">
            <Select label="状态筛选" options={statusOptions} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
            <Input label="搜索" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="标题、品牌型号、成色" />
          </div>

          {loading && <p className="py-8 text-center text-gray-400">加载中...</p>}
          {!loading && items.length === 0 && <p className="py-8 text-center text-gray-400">暂无二手家电</p>}

          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <article key={item.id} className="rounded-lg border border-gray-200 p-3">
                <div className="flex gap-3">
                  {item.image_paths[0] ? (
                    <button type="button" onClick={() => setPreviewSrc(item.image_paths[0])} className="shrink-0">
                      <img src={item.image_paths[0]} alt={item.title} className="h-20 w-20 rounded-lg object-cover" />
                    </button>
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                      无图
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-gray-900">{item.title}</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {item.category}{item.brand_model ? ` · ${item.brand_model}` : ''}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                        item.status === '在售'
                          ? 'bg-emerald-100 text-emerald-700'
                          : item.status === '已售'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-red-600">{item.price || '电话咨询'}</p>
                    {item.condition_note && <p className="mt-1 text-sm text-gray-600">{item.condition_note}</p>}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2">
                  <button type="button" onClick={() => startEdit(item)} className="min-h-[40px] rounded-lg border border-gray-200 text-sm text-gray-700">
                    编辑
                  </button>
                  {USED_APPLIANCE_STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={item.status === status}
                      onClick={() => void quickStatus(item, status)}
                      className="min-h-[40px] rounded-lg border border-gray-200 text-sm text-gray-700 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      {status}
                    </button>
                  ))}
                </div>
                {item.status === '下架' && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(item)}
                    className="mt-2 w-full min-h-[40px] rounded-lg border border-red-200 text-sm text-red-600 active:bg-red-50"
                  >
                    删除商品
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>

      <ImagePreviewModal src={previewSrc} alt="二手家电图片" onClose={() => setPreviewSrc(null)} />
      <BottomNav />
    </div>
  )
}

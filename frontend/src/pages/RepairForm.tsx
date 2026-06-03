import { useState, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Input from '../components/Input'
import Select from '../components/Select'
import TextArea from '../components/TextArea'
import ImageUploader from '../components/ImageUploader'
import {
  IconWrench,
  IconSparkles,
  IconUser,
  IconMapPin,
  IconClock,
  IconCamera,
  IconTag,
  IconSofa,
  IconChevronRight,
  IconFlame,
} from '../components/icons'
import { APPLIANCE_TYPES, SERVICE_TYPES } from '../utils/constants'
import { getTodayDateString, isPastDate, isPastPreferredSlot, getTodaySlotHint } from '../utils/date'
import { getFaultDescriptionCopy } from '../utils/orderCopy'
import { submitRepair } from '../api/public'
import type { ServiceType } from '../types/order'

const TIME_SLOTS = [
  '上午 8:00-12:00',
  '下午 12:00-18:00',
  '晚上 18:00-21:00',
  '都可以',
]

export default function RepairForm() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imagePaths, setImagePaths] = useState<string[]>([])

  const [form, setForm] = useState<{
    customer_name: string
    phone: string
    community: string
    address: string
    service_type: ServiceType
    appliance_type: string
    brand_model: string
    fault_description: string
    is_urgent: boolean
  }>({
    customer_name: '',
    phone: '',
    community: '',
    address: '',
    service_type: SERVICE_TYPES[0],
    appliance_type: APPLIANCE_TYPES[0],
    brand_model: '',
    fault_description: '',
    is_urgent: false,
  })

  const [preferredDate, setPreferredDate] = useState('')
  const [preferredSlot, setPreferredSlot] = useState('')

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({})

  // 日期/时间段实时错误（useMemo 派生，见下方）

  // 实时校验日期和时间段（纯派生，用 useMemo）
  const dateError = useMemo(() => {
    if (preferredDate && isPastDate(preferredDate)) return '不能选择过去日期'
    return ''
  }, [preferredDate])

  const slotError = useMemo(() => {
    if (preferredSlot && preferredDate && isPastPreferredSlot(preferredDate, preferredSlot))
      return '不能选择已经过去的时间段'
    if (preferredSlot && !preferredDate) return '请先选择日期'
    return ''
  }, [preferredDate, preferredSlot])

  const update = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const getPhoneError = (phone: string): string => {
    if (!phone) return ''
    if (phone.length < 11) return '请输入 11 位手机号'
    if (!phone.startsWith('1')) return '手机号格式不正确'
    return ''
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 11)
    update('phone', val)
  }

  const scrollToFirstError = () => {
    const firstErrorField = Object.keys(fieldErrors)[0]
    if (firstErrorField && fieldRefs.current[firstErrorField]) {
      fieldRefs.current[firstErrorField]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const errors: Record<string, string> = {}

    if (!form.customer_name.trim()) errors.customer_name = '请填写姓名/称呼'
    if (!form.phone.trim()) {
      errors.phone = '请填写手机号'
    } else if (form.phone.length < 11) {
      errors.phone = '请输入 11 位手机号'
    } else if (!form.phone.startsWith('1')) {
      errors.phone = '手机号格式不正确'
    }
    if (!form.community.trim()) errors.community = '请填写小区'
    if (!form.address.trim()) errors.address = '请填写详细地址'
    const faultCopy = getFaultDescriptionCopy(form.service_type)
    if (!form.fault_description.trim()) errors.fault_description = faultCopy.error
    if (form.appliance_type === '其他' && !form.brand_model.trim()) errors.brand_model = '选择"其他"时，请填写具体家电类型或品牌型号'

    // 日期/时间段校验
    if (preferredDate && isPastDate(preferredDate)) {
      errors.preferred_date = '不能选择过去日期'
    }
    if (preferredSlot && preferredDate && isPastPreferredSlot(preferredDate, preferredSlot)) {
      errors.preferred_slot = '不能选择已经过去的时间段'
    }
    if (preferredSlot && !preferredDate) {
      errors.preferred_slot = '请先选择日期'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setTimeout(scrollToFirstError, 100)
      return
    }

    let preferredTime = ''
    if (preferredDate && preferredSlot) {
      preferredTime = `${preferredDate} ${preferredSlot}`
    } else if (preferredDate) {
      preferredTime = preferredDate
    }

    setLoading(true)
    try {
      const res = await submitRepair({
        ...form,
        brand_model: form.brand_model || undefined,
        preferred_time: preferredTime || undefined,
        image_paths: imagePaths,
      })
      navigate('/repair/success', {
        state: { order_no: res.order_no, shop_phone: res.shop_phone },
      })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(typeof msg === 'string' ? msg : '提交失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const phoneError = getPhoneError(form.phone)
  const todaySlotHint = getTodaySlotHint(preferredDate)
  const faultCopy = getFaultDescriptionCopy(form.service_type)
  // 判断时间段是否应禁用
  const isSlotDisabled = (slot: string) => {
    if (preferredDate !== getTodayDateString()) return false
    return isPastPreferredSlot(preferredDate, slot)
  }

  return (
    <div className="min-h-screen bg-cream pb-12">
      {/* 暖色渐变头部 */}
      <header className="rounded-b-[28px] bg-gradient-to-br from-amber-400 via-orange-400 to-orange-500 px-5 pb-9 pt-7 text-white shadow-sm">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/25 backdrop-blur-sm">
            <IconWrench className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">家电报修 · 清洗</h1>
            <p className="mt-0.5 text-sm text-white/90">填一下信息，师傅尽快联系您</p>
          </div>
        </div>
      </header>

      <div className="mx-auto -mt-5 max-w-lg px-4">
        {/* 快捷入口 */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <Link
            to="/pricing"
            className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-orange-100 active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-brand-500">
              <IconTag className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-800">清洗价格表</span>
              <span className="mt-0.5 block truncate text-xs text-gray-400">起步价参考</span>
            </span>
          </Link>

          <Link
            to="/used"
            className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-orange-100 active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-brand-500">
              <IconSofa className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-800">二手家电</span>
              <span className="mt-0.5 block truncate text-xs text-gray-400">在售展示 · 电话咨询</span>
            </span>
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 服务类型 */}
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100/70">
            <label className="mb-3 block text-base font-semibold text-gray-800">想要什么服务？</label>
            <div className="grid grid-cols-2 gap-3">
              {SERVICE_TYPES.map((serviceType) => {
                const active = form.service_type === serviceType
                const Icon = serviceType === '清洗' ? IconSparkles : IconWrench
                return (
                  <button
                    key={serviceType}
                    type="button"
                    onClick={() => update('service_type', serviceType)}
                    className={`flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 text-base font-semibold transition-colors ${
                      active
                        ? 'border-brand-500 bg-brand-500 text-white shadow-sm shadow-orange-500/25'
                        : 'border-orange-100 bg-orange-50/40 text-gray-600 active:bg-orange-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {serviceType}
                  </button>
                )
              })}
            </div>
          </section>

          {/* 联系方式 */}
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100/70">
            <div className="mb-3 flex items-center gap-2 text-gray-800">
              <IconUser className="h-5 w-5 text-brand-500" />
              <h2 className="text-base font-semibold">联系方式</h2>
            </div>
            <div className="flex flex-col gap-4">
              {/* 姓名/称呼 */}
              <div ref={(el) => { fieldRefs.current.customer_name = el }}>
                <Input tone="warm" label="姓名 / 称呼 *" placeholder="例如：刘小姐、任先生、张老板" value={form.customer_name} onChange={(e) => update('customer_name', e.target.value)} />
                {fieldErrors.customer_name && <p className="text-red-600 text-sm mt-1">{fieldErrors.customer_name}</p>}
              </div>

              {/* 手机号 */}
              <div ref={(el) => { fieldRefs.current.phone = el }}>
                <Input tone="warm" label="手机号 *" placeholder="11位手机号" type="tel" inputMode="numeric" maxLength={11} value={form.phone} onChange={handlePhoneChange} />
                {phoneError && <p className="text-red-600 text-sm mt-1">{phoneError}</p>}
                {fieldErrors.phone && !phoneError && <p className="text-red-600 text-sm mt-1">{fieldErrors.phone}</p>}
              </div>

              {/* 小区 */}
              <div ref={(el) => { fieldRefs.current.community = el }}>
                <Input tone="warm" label="小区 *" placeholder="小区名称，例如：阳光小区" value={form.community} onChange={(e) => update('community', e.target.value)} />
                {fieldErrors.community && <p className="text-red-600 text-sm mt-1">{fieldErrors.community}</p>}
              </div>

              {/* 详细地址 */}
              <div ref={(el) => { fieldRefs.current.address = el }}>
                <Input tone="warm" label="详细地址 *" placeholder="楼栋-单元-门牌号，例如：3号楼2单元501" value={form.address} onChange={(e) => update('address', e.target.value)} />
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-gray-400">
                  <IconMapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  师傅上门前会电话确认地址，请保持电话畅通。
                </p>
                {fieldErrors.address && <p className="text-red-600 text-sm mt-1">{fieldErrors.address}</p>}
              </div>
            </div>
          </section>

          {/* 设备与问题 */}
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100/70">
            <div className="mb-3 flex items-center gap-2 text-gray-800">
              <IconWrench className="h-5 w-5 text-brand-500" />
              <h2 className="text-base font-semibold">设备与问题</h2>
            </div>
            <div className="flex flex-col gap-4">
              {/* 家电类型 */}
              <div>
                <Select tone="warm" label="家电类型 *" options={APPLIANCE_TYPES} value={form.appliance_type} onChange={(e) => update('appliance_type', e.target.value)} />
                {form.appliance_type === '其他' && (
                  <p className="text-xs text-gray-500 mt-1">你选择了"其他"，请在下方填写具体家电类型和品牌型号，例如：净水器、小厨宝、消毒柜、破壁机等。</p>
                )}
              </div>

              {/* 品牌型号 */}
              <div ref={(el) => { fieldRefs.current.brand_model = el }}>
                <Input
                  tone="warm"
                  label={form.appliance_type === '其他' ? '具体家电类型 / 品牌型号 *' : '品牌型号（可选）'}
                  placeholder={form.appliance_type === '其他' ? '例如：净水器 小米 MRH112；小厨宝 美的 F05' : '如：格力 KFR-35GW'}
                  value={form.brand_model} onChange={(e) => update('brand_model', e.target.value)}
                />
                {fieldErrors.brand_model && <p className="text-red-600 text-sm mt-1">{fieldErrors.brand_model}</p>}
              </div>

              {/* 故障描述 */}
              <div ref={(el) => { fieldRefs.current.fault_description = el }}>
                <TextArea tone="warm" label={faultCopy.label} placeholder={faultCopy.placeholder} value={form.fault_description} onChange={(e) => update('fault_description', e.target.value)} />
                {fieldErrors.fault_description && <p className="text-red-600 text-sm mt-1">{fieldErrors.fault_description}</p>}
              </div>
            </div>
          </section>

          {/* 希望上门时间：日期 + 时间段 */}
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100/70">
            <div className="mb-3 flex items-center gap-2 text-gray-800">
              <IconClock className="h-5 w-5 text-brand-500" />
              <h2 className="text-base font-semibold">希望上门时间<span className="ml-1 text-xs font-normal text-gray-400">可选</span></h2>
            </div>

            <input type="date" value={preferredDate} min={getTodayDateString()}
              onChange={(e) => { setPreferredDate(e.target.value); setPreferredSlot('') }}
              className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-base mb-2 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-300" />
            {dateError && <p className="text-red-600 text-sm mt-1">{dateError}</p>}

            {todaySlotHint && <p className="text-red-600 text-sm mt-1 mb-2">{todaySlotHint}</p>}

            <div className="grid grid-cols-2 gap-2">
              {TIME_SLOTS.map((slot) => {
                const disabled = isSlotDisabled(slot)
                return (
                  <button key={slot} type="button"
                    disabled={disabled}
                    onClick={() => { if (!disabled) setPreferredSlot(preferredSlot === slot ? '' : slot) }}
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      disabled
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : preferredSlot === slot
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'bg-white text-gray-600 border-orange-100 active:bg-orange-50'
                    }`}>
                    {slot}
                  </button>
                )
              })}
            </div>
            {slotError && <p className="text-red-600 text-sm mt-1">{slotError}</p>}
            {fieldErrors.preferred_slot && !slotError && <p className="text-red-600 text-sm mt-1">{fieldErrors.preferred_slot}</p>}

            {/* 紧急 */}
            <label className={`mt-3 flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border-2 px-3 transition-colors ${
              form.is_urgent ? 'border-brand-500 bg-orange-50' : 'border-orange-100 bg-white'
            }`}>
              <input type="checkbox" checked={form.is_urgent} onChange={(e) => update('is_urgent', e.target.checked)} className="h-5 w-5 accent-brand-500" />
              <IconFlame className={`h-5 w-5 ${form.is_urgent ? 'text-brand-500' : 'text-gray-400'}`} />
              <span className="text-base text-gray-700">紧急（需尽快上门）</span>
            </label>
          </section>

          {/* 上传照片 */}
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100/70">
            <div className="mb-3 flex items-center gap-2 text-gray-800">
              <IconCamera className="h-5 w-5 text-brand-500" />
              <h2 className="text-base font-semibold">上传照片<span className="ml-1 text-xs font-normal text-gray-400">可选，最多 5 张</span></h2>
            </div>
            <ImageUploader maxFiles={5} hideLabel tone="warm" onChange={(paths) => setImagePaths(paths)} />
          </section>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-base font-semibold text-white shadow-lg shadow-orange-500/30 transition active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? '提交中…' : `提交${form.service_type}申请`}
            {!loading && <IconChevronRight className="h-5 w-5" />}
          </button>
        </form>
      </div>
    </div>
  )
}

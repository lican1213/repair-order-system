import { useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Input from '../components/Input'
import Select from '../components/Select'
import TextArea from '../components/TextArea'
import ImageUploader from '../components/ImageUploader'
import { APPLIANCE_TYPES } from '../utils/constants'
import { getTodayDateString, isPastDate, isPastPreferredSlot, getTodaySlotHint } from '../utils/date'
import { submitRepair } from '../api/public'

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

  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    community: '',
    address: '',
    appliance_type: APPLIANCE_TYPES[0],
    brand_model: '',
    fault_description: '',
    is_urgent: false,
  })

  const [preferredDate, setPreferredDate] = useState('')
  const [preferredSlot, setPreferredSlot] = useState('')

  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [locationAddress, setLocationAddress] = useState<string | null>(null)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle')

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

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('fail')
      return
    }
    setLocationStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
        setLocationAddress(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`)
        setLocationStatus('ok')
      },
      () => setLocationStatus('fail'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
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
    if (!form.fault_description.trim()) errors.fault_description = '请描述故障'
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
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        location_address: locationAddress ?? undefined,
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
  // 判断时间段是否应禁用
  const isSlotDisabled = (slot: string) => {
    if (preferredDate !== getTodayDateString()) return false
    return isPastPreferredSlot(preferredDate, slot)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-lg mx-auto p-4">
        <h1 className="text-xl font-bold mb-6 text-center">报修申请</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 姓名/称呼 */}
          <div ref={(el) => { fieldRefs.current.customer_name = el }}>
            <Input label="姓名 / 称呼 *" placeholder="例如：刘小姐、任先生、张老板" value={form.customer_name} onChange={(e) => update('customer_name', e.target.value)} />
            {fieldErrors.customer_name && <p className="text-red-600 text-sm mt-1">{fieldErrors.customer_name}</p>}
          </div>

          {/* 手机号 */}
          <div ref={(el) => { fieldRefs.current.phone = el }}>
            <Input label="手机号 *" placeholder="11位手机号" type="tel" inputMode="numeric" maxLength={11} value={form.phone} onChange={handlePhoneChange} />
            {phoneError && <p className="text-red-600 text-sm mt-1">{phoneError}</p>}
            {fieldErrors.phone && !phoneError && <p className="text-red-600 text-sm mt-1">{fieldErrors.phone}</p>}
          </div>

          {/* 小区 */}
          <div ref={(el) => { fieldRefs.current.community = el }}>
            <Input label="小区 *" placeholder="小区名称" value={form.community} onChange={(e) => update('community', e.target.value)} />
            {fieldErrors.community && <p className="text-red-600 text-sm mt-1">{fieldErrors.community}</p>}
          </div>

          {/* 详细地址 */}
          <div ref={(el) => { fieldRefs.current.address = el }}>
            <Input label="详细地址 *" placeholder="楼栋-单元-门牌号" value={form.address} onChange={(e) => update('address', e.target.value)} />
            {fieldErrors.address && <p className="text-red-600 text-sm mt-1">{fieldErrors.address}</p>}
          </div>

          {/* 定位按钮 */}
          <div>
            <button type="button" onClick={handleGetLocation} disabled={locationStatus === 'loading'}
              className="min-h-[44px] w-full px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-500 transition-colors">
              {locationStatus === 'loading' ? '获取定位中...' : locationStatus === 'ok' ? '已获取定位 ✓' : '获取当前位置（可选）'}
            </button>
            {locationStatus === 'ok' && latitude != null && longitude != null && (
              <p className="text-xs text-green-600 mt-1">定位: {latitude.toFixed(6)}, {longitude.toFixed(6)}</p>
            )}
            {locationStatus === 'fail' && <p className="text-xs text-gray-400 mt-1">定位失败，请手动填写地址</p>}
          </div>

          {/* 家电类型 */}
          <div>
            <Select label="家电类型 *" options={APPLIANCE_TYPES} value={form.appliance_type} onChange={(e) => update('appliance_type', e.target.value)} />
            {form.appliance_type === '其他' && (
              <p className="text-xs text-gray-500 mt-1">你选择了"其他"，请在下方填写具体家电类型和品牌型号，例如：净水器、小厨宝、消毒柜、破壁机等。</p>
            )}
          </div>

          {/* 品牌型号 */}
          <div ref={(el) => { fieldRefs.current.brand_model = el }}>
            <Input
              label={form.appliance_type === '其他' ? '具体家电类型 / 品牌型号 *' : '品牌型号（可选）'}
              placeholder={form.appliance_type === '其他' ? '例如：净水器 小米 MRH112；小厨宝 美的 F05' : '如：格力 KFR-35GW'}
              value={form.brand_model} onChange={(e) => update('brand_model', e.target.value)}
            />
            {fieldErrors.brand_model && <p className="text-red-600 text-sm mt-1">{fieldErrors.brand_model}</p>}
          </div>

          {/* 故障描述 */}
          <div ref={(el) => { fieldRefs.current.fault_description = el }}>
            <TextArea label="故障描述 *" placeholder="请描述家电故障情况" value={form.fault_description} onChange={(e) => update('fault_description', e.target.value)} />
            {fieldErrors.fault_description && <p className="text-red-600 text-sm mt-1">{fieldErrors.fault_description}</p>}
          </div>

          {/* 希望上门时间：日期 + 时间段 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">希望上门时间（可选）</label>

            <input type="date" value={preferredDate} min={getTodayDateString()}
              onChange={(e) => { setPreferredDate(e.target.value); setPreferredSlot('') }}
              className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-base mb-2" />
            {dateError && <p className="text-red-600 text-sm mt-1">{dateError}</p>}

            {todaySlotHint && <p className="text-red-600 text-sm mt-1 mb-2">{todaySlotHint}</p>}

            <div className="grid grid-cols-2 gap-2">
              {TIME_SLOTS.map((slot) => {
                const disabled = isSlotDisabled(slot)
                return (
                  <button key={slot} type="button"
                    disabled={disabled}
                    onClick={() => { if (!disabled) setPreferredSlot(preferredSlot === slot ? '' : slot) }}
                    className={`min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      disabled
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : preferredSlot === slot
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}>
                    {slot}
                  </button>
                )
              })}
            </div>
            {slotError && <p className="text-red-600 text-sm mt-1">{slotError}</p>}
            {fieldErrors.preferred_slot && !slotError && <p className="text-red-600 text-sm mt-1">{fieldErrors.preferred_slot}</p>}
          </div>

          {/* 紧急 */}
          <label className="flex items-center gap-3 min-h-[44px]">
            <input type="checkbox" checked={form.is_urgent} onChange={(e) => update('is_urgent', e.target.checked)} className="w-5 h-5" />
            <span className="text-base">紧急（需尽快上门）</span>
          </label>

          <ImageUploader maxFiles={5} onChange={(paths) => setImagePaths(paths)} />

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? '提交中...' : '提交报修'}
          </Button>
        </form>
      </div>
    </div>
  )
}

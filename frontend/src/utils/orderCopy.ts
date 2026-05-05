import type { ServiceType } from '../types/order'

export function getFaultDescriptionCopy(serviceType: ServiceType) {
  if (serviceType === '清洗') {
    return {
      label: '清洗需求 *',
      placeholder: '请描述清洗需求，例如：空调挂机 1 台、油烟机重油污',
      error: '请描述清洗需求',
    }
  }

  return {
    label: '故障描述 *',
    placeholder: '请描述家电故障情况',
    error: '请描述故障',
  }
}

export function getNewOrderAlertTitle(count: number) {
  return `有 ${count} 个新订单`
}

/**
 * 解析 image_paths 字段，兼容多种格式：
 * - null / undefined / ""
 * - 合法 JSON 数组字符串: '["/uploads/orders/a.jpg"]'
 * - 历史 Python list 字符串: "['/uploads/orders/a.jpg']"
 */
export function parseImagePaths(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean) as string[]
  if (typeof value !== 'string') return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as string[]).filter(Boolean) : []
  } catch {
    // 兼容历史 Python list 字符串
    const matches = value.match(/\/uploads\/[^'"\]]+/g)
    return matches ?? []
  }
}

export function buildOrderAddress(community: string, address: string): string {
  return `${community} ${address}`.trim()
}

export function buildAmapSearchUrl(address: string): string {
  const keyword = encodeURIComponent(address.trim())
  return `https://uri.amap.com/search?keyword=${keyword}&src=repair-order-system&coordinate=gaode&callnative=1`
}

export function buildBaiduSearchUrl(address: string): string {
  const query = encodeURIComponent(address.trim())
  return `https://api.map.baidu.com/geocoder?address=${query}&output=html&src=repair-order-system`
}

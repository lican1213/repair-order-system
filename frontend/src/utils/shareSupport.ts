type ShareNavigator = {
  share?: (data?: ShareData) => Promise<void>
  canShare?: (data?: ShareData) => boolean
  userAgent?: string
  maxTouchPoints?: number
}

const MOBILE_USER_AGENT = /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i

export function canUseNativeShare(
  data: ShareData,
  nav: ShareNavigator | undefined = typeof navigator === 'undefined' ? undefined : navigator,
): boolean {
  if (!nav || typeof nav.share !== 'function') return false

  const userAgent = nav.userAgent || ''
  const isMobile = MOBILE_USER_AGENT.test(userAgent)
  const isIpadDesktopMode = /Macintosh/i.test(userAgent) && (nav.maxTouchPoints || 0) > 1
  if (!isMobile && !isIpadDesktopMode) return false

  if (typeof nav.canShare === 'function') {
    try {
      return nav.canShare(data)
    } catch {
      return false
    }
  }

  return true
}

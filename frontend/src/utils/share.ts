import { copyText } from './clipboard'
import { canUseNativeShare } from './shareSupport'

export { canUseNativeShare } from './shareSupport'

export async function shareOrCopy(data: ShareData, copyValue: string): Promise<'shared' | 'copied' | 'failed'> {
  if (canUseNativeShare(data)) {
    try {
      await navigator.share(data)
      return 'shared'
    } catch {
      // User cancelled or native share failed; copy the link instead.
    }
  }

  return await copyText(copyValue) ? 'copied' : 'failed'
}

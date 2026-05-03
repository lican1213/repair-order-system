import { useEffect, useCallback } from 'react'

interface ImagePreviewModalProps {
  src: string | null
  alt?: string
  onClose: () => void
}

export default function ImagePreviewModal({ src, alt, onClose }: ImagePreviewModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (src) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [src, handleKeyDown])

  if (!src) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* 关闭按钮 */}
      <button
        type="button"
        onClick={onClose}
        aria-label="关闭图片预览"
        className="fixed top-4 right-4 z-50 w-11 h-11 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded-full text-white text-2xl font-bold transition-colors"
      >
        ×
      </button>

      {/* 图片 */}
      <img
        src={src}
        alt={alt || '图片预览'}
        className="max-h-[85vh] max-w-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          const parent = target.parentElement
          if (parent && !parent.querySelector('.error-msg')) {
            const msg = document.createElement('p')
            msg.className = 'error-msg text-white text-center'
            msg.textContent = '图片加载失败'
            parent.appendChild(msg)
          }
        }}
      />
    </div>
  )
}

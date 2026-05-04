import { useEffect, useCallback, useMemo, useState } from 'react'

interface ImagePreviewModalProps {
  src?: string | null
  images?: string[]
  alt?: string
  onClose: () => void
}

export default function ImagePreviewModal({ src, images, alt, onClose }: ImagePreviewModalProps) {
  const imageList = useMemo(
    () => (images && images.length > 0 ? images : src ? [src] : []),
    [images, src]
  )
  const [index, setIndex] = useState(0)
  const hasMultiple = imageList.length > 1

  // Clamp index to valid range
  const safeIndex = imageList.length > 0 ? Math.min(index, imageList.length - 1) : 0

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + imageList.length) % imageList.length)
  }, [imageList.length])

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % imageList.length)
  }, [imageList.length])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (hasMultiple && e.key === 'ArrowLeft') goPrev()
      if (hasMultiple && e.key === 'ArrowRight') goNext()
    },
    [onClose, hasMultiple, goPrev, goNext]
  )

  useEffect(() => {
    if (imageList.length > 0) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [imageList.length, handleKeyDown])

  if (imageList.length === 0) return null

  const currentSrc = imageList[safeIndex]

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="关闭图片预览"
        className="fixed top-4 right-4 z-50 w-11 h-11 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded-full text-white text-2xl font-bold transition-colors"
      >
        ×
      </button>

      {/* Counter */}
      {hasMultiple && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
          {safeIndex + 1} / {imageList.length}
        </div>
      )}

      {/* Image + Arrows row */}
      <div className="flex items-center gap-2 max-w-full" onClick={(e) => e.stopPropagation()}>
        {/* Prev arrow */}
        {hasMultiple && (
          <button
            type="button"
            onClick={goPrev}
            aria-label="上一张"
            className="shrink-0 w-11 h-11 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded-full text-white text-2xl font-bold transition-colors"
          >
            ‹
          </button>
        )}

        {/* Image */}
        <img
          key={currentSrc}
          src={currentSrc}
          alt={alt || '图片预览'}
          className="min-w-0 flex-1 max-h-[85vh] max-w-full object-contain rounded-lg"
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

        {/* Next arrow */}
        {hasMultiple && (
          <button
            type="button"
            onClick={goNext}
            aria-label="下一张"
            className="shrink-0 w-11 h-11 flex items-center justify-center bg-white/20 hover:bg-white/40 rounded-full text-white text-2xl font-bold transition-colors"
          >
            ›
          </button>
        )}
      </div>
    </div>
  )
}

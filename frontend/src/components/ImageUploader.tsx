import { useState } from 'react'
import { uploadPublicImages } from '../api/public'

interface ImageUploaderProps {
  maxFiles?: number
  maxFileSizeMB?: number
  onChange?: (paths: string[]) => void
}

export default function ImageUploader({
  maxFiles = 5,
  maxFileSizeMB = 5,
  onChange,
}: ImageUploaderProps) {
  const [previews, setPreviews] = useState<{ url: string; path: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFiles = async (files: FileList) => {
    setError('')
    const fileArray = Array.from(files)

    // 检查总数量
    if (previews.length + fileArray.length > maxFiles) {
      setError(`最多上传 ${maxFiles} 张图片`)
      return
    }

    // 前端校验
    for (const file of fileArray) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError(`不支持的文件类型: ${file.name}`)
        return
      }
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        setError(`文件过大: ${file.name}，最大 ${maxFileSizeMB}MB`)
        return
      }
    }

    setUploading(true)
    try {
      const result = await uploadPublicImages(fileArray)
      const newPreviews = fileArray.map((file, i) => ({
        url: URL.createObjectURL(file),
        path: result.paths[i],
      }))
      const updated = [...previews, ...newPreviews]
      setPreviews(updated)
      onChange?.(updated.map((p) => p.path))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setError(msg || '上传失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = (index: number) => {
    URL.revokeObjectURL(previews[index].url)
    const updated = previews.filter((_, i) => i !== index)
    setPreviews(updated)
    onChange?.(updated.map((p) => p.path))
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">
        上传照片（可选，最多 {maxFiles} 张）
      </label>

      {previews.length < maxFiles && (
        <label className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 cursor-pointer hover:border-blue-400 hover:text-blue-500 transition-colors">
          {uploading ? '上传中...' : '点击选择图片'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={uploading}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
        </label>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {previews.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {previews.map((item, i) => (
            <div key={i} className="relative">
              <img
                src={item.url}
                alt={`预览 ${i + 1}`}
                className="w-20 h-20 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => handleDelete(i)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

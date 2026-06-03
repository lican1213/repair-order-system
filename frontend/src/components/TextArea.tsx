import { type TextareaHTMLAttributes } from 'react'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  tone?: 'blue' | 'warm'
}

export default function TextArea({ label, tone = 'blue', className = '', ...props }: TextAreaProps) {
  const focus =
    tone === 'warm'
      ? 'focus:ring-brand-400 focus:border-brand-300'
      : 'focus:ring-blue-500 focus:border-transparent'
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <textarea
        className={`min-h-[88px] px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 ${focus} resize-y ${className}`}
        {...props}
      />
    </div>
  )
}

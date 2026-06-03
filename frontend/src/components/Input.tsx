import { type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  tone?: 'blue' | 'warm'
}

export default function Input({ label, tone = 'blue', className = '', ...props }: InputProps) {
  const focus =
    tone === 'warm'
      ? 'focus:ring-brand-400 focus:border-brand-300'
      : 'focus:ring-blue-500 focus:border-transparent'
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <input
        className={`min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 ${focus} ${className}`}
        {...props}
      />
    </div>
  )
}

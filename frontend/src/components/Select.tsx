import { type SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: string[]
  tone?: 'blue' | 'warm'
}

export default function Select({ label, options, tone = 'blue', className = '', ...props }: SelectProps) {
  const focus =
    tone === 'warm'
      ? 'focus:ring-brand-400 focus:border-brand-300'
      : 'focus:ring-blue-500 focus:border-transparent'
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <select
        className={`min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 ${focus} ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  )
}

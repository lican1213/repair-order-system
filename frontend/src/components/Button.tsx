import { type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  tone?: 'blue' | 'warm'
  fullWidth?: boolean
}

export default function Button({
  variant = 'primary',
  tone = 'blue',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base = 'min-h-[44px] px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const palettes = {
    blue: {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
      secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 active:bg-gray-400',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    },
    warm: {
      primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700',
      secondary: 'bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    },
  }
  const variants = palettes[tone]
  const width = fullWidth ? 'w-full' : ''

  return (
    <button
      className={`${base} ${variants[variant]} ${width} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

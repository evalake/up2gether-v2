import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'danger' | 'subtle'
type Size = 'sm' | 'md' | 'lg'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const styles: Record<Variant, string> = {
  primary:
    'border-nerv-orange/80 bg-nerv-orange/15 text-nerv-orange hover:bg-nerv-orange hover:text-nerv-bg hover:shadow-[0_0_20px_rgba(255,102,0,0.4)]',
  subtle:
    'border-nerv-orange/30 bg-transparent text-nerv-orange hover:bg-nerv-orange/10 hover:border-nerv-orange/60',
  ghost:
    'border-nerv-line bg-transparent text-nerv-text hover:border-nerv-orange/60 hover:text-nerv-orange',
  danger:
    'border-nerv-red/60 bg-nerv-red/10 text-nerv-red hover:bg-nerv-red hover:text-nerv-bg',
}

const sizes: Record<Size, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      className={`rounded-sm border font-medium uppercase tracking-wider transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  )
}

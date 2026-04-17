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
    'border-up-orange/80 bg-up-orange/15 text-up-orange hover:bg-up-orange hover:text-up-bg hover:shadow-[0_0_20px_rgba(255,102,0,0.4)]',
  subtle:
    'border-up-orange/30 bg-transparent text-up-orange hover:bg-up-orange/10 hover:border-up-orange',
  ghost:
    'border-up-line bg-transparent text-up-text hover:border-up-orange hover:text-up-orange',
  danger:
    'border-up-red/60 bg-up-red/10 text-up-red hover:bg-up-red hover:text-up-bg',
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
      className={`rounded-sm border font-medium uppercase tracking-wider transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  )
}

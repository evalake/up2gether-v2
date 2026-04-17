import { forwardRef, type InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, className = '', ...rest },
  ref,
) {
  return (
    <label className="block">
      {label && (
        <div className="mb-1.5 text-xs uppercase tracking-wider text-up-dim">{label}</div>
      )}
      <input
        ref={ref}
        {...rest}
        className={`w-full rounded-sm border border-up-line bg-black/50 px-3 py-2 text-sm text-up-text placeholder:text-up-dim transition-colors focus-visible:border-up-orange focus-visible:bg-black/70 focus-visible:outline-none ${className}`}
      />
      {error && <p className="mt-1 text-xs text-up-red">! {error}</p>}
    </label>
  )
})

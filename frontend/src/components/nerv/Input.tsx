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
        <div className="mb-1.5 text-xs uppercase tracking-wider text-nerv-dim">{label}</div>
      )}
      <input
        ref={ref}
        {...rest}
        className={`w-full rounded-sm border border-nerv-line bg-black/50 px-3 py-2 text-sm text-nerv-text placeholder:text-nerv-dim/60 transition-colors focus:border-nerv-orange focus:bg-black/70 focus:outline-none ${className}`}
      />
      {error && <p className="mt-1 text-xs text-nerv-red">! {error}</p>}
    </label>
  )
})

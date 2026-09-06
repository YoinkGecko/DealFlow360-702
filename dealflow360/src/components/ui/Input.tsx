import { cn } from '../../lib/utils'

export function Input({
  label,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-[var(--color-text)]">{label}</label>
      )}
      <input
        className={cn(
          'w-full px-3 py-2 text-sm border rounded-md transition-colors',
          'bg-[var(--color-input-bg)] text-[var(--color-input-text)] border-[var(--color-input-border)]',
          'placeholder:text-[var(--color-input-placeholder)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/25 focus:border-[var(--color-brand)]',
          error && 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]/25 focus:border-[var(--color-danger)]',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  )
}

export function Select({
  label,
  options,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  options: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-[var(--color-text)]">{label}</label>
      )}
      <select
        className={cn(
          'w-full px-3 py-2 text-sm border rounded-md',
          'bg-[var(--color-input-bg)] text-[var(--color-input-text)] border-[var(--color-input-border)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/25 focus:border-[var(--color-brand)]',
          className,
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

export function Checkbox({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
      <input
        type="checkbox"
        className="mt-0.5 rounded border-[var(--color-input-border)] text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
        {...props}
      />
      {label}
    </label>
  )
}

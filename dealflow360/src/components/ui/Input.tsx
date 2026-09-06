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
        <label className="block text-sm font-medium text-[#1a1d21]">{label}</label>
      )}
      <input
        className={cn(
          'w-full px-3 py-2 text-sm border rounded-md bg-white transition-colors',
          'border-[#e8eaed] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20 focus:border-[#1565C0]',
          error && 'border-[#c62828] focus:ring-[#c62828]/20 focus:border-[#c62828]',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-[#c62828]">{error}</p>}
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
        <label className="block text-sm font-medium text-[#1a1d21]">{label}</label>
      )}
      <select
        className={cn(
          'w-full px-3 py-2 text-sm border rounded-md bg-white border-[#e8eaed]',
          'focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20 focus:border-[#1565C0]',
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
    <label className="flex items-start gap-2 text-sm text-[#6b7280] cursor-pointer">
      <input
        type="checkbox"
        className="mt-0.5 rounded border-[#e8eaed] text-[#1565C0] focus:ring-[#1565C0]"
        {...props}
      />
      {label}
    </label>
  )
}

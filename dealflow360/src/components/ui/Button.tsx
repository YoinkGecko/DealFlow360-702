import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  primary: 'bg-[#1565C0] text-white hover:bg-[#0d47a1] border border-transparent',
  secondary: 'bg-white text-[#1a1d21] border border-[#e8eaed] hover:bg-[#f5f6f8]',
  ghost: 'bg-transparent text-[#6b7280] hover:bg-[#f5f6f8] border border-transparent',
  danger: 'bg-[#c62828] text-white hover:bg-[#b71c1c] border border-transparent',
  outline: 'bg-transparent text-[#1565C0] border border-[#1565C0] hover:bg-[#e3f2fd]',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

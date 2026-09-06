import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_0.9fr] bg-[var(--color-bg)]">
      {/* Marketing — left on desktop */}
      <div className="hidden lg:flex flex-col justify-center px-12 xl:px-16 py-16 bg-[var(--color-bg-subtle)] border-r border-[var(--color-border)] relative">
        <button
          type="button"
          onClick={toggleTheme}
          className="absolute top-6 left-6 p-2 rounded-md border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-hover)]"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <h2 className="text-2xl font-semibold text-[var(--color-text)] max-w-md">
          Run quotes to cash in one place
        </h2>
        <ul className="mt-8 space-y-4 text-[var(--color-text-secondary)] text-sm max-w-md">
          {[
            'Faster approvals with automatic routing',
            'Real-time inventory visibility across warehouses',
            'One workspace for quotes, fulfillment, and billing',
            'Customer portal for negotiations and confirmation',
          ].map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-brand)] shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Form — right on desktop, full width on mobile */}
      <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-14 xl:px-20 py-12 lg:py-16 bg-[var(--color-surface)] relative">
        <button
          type="button"
          onClick={toggleTheme}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-md border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-hover)]"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto lg:mr-0">
          {children}
        </div>
      </div>
    </div>
  )
}

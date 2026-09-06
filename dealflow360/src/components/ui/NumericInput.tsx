import { useEffect, useState, type InputHTMLAttributes } from 'react'

interface NumericInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number
  onChange: (value: number) => void
  /** Value used when the field is cleared on blur. Defaults to 0. */
  emptyValue?: number
  integer?: boolean
  /** When true, onChange only fires on blur (good for inline table edits). */
  commitOnBlurOnly?: boolean
}

export function NumericInput({
  value,
  onChange,
  emptyValue = 0,
  integer = false,
  commitOnBlurOnly = false,
  min,
  max,
  className,
  onBlur,
  onFocus,
  ...props
}: NumericInputProps) {
  const [text, setText] = useState(String(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) {
      setText(String(value))
    }
  }, [value, focused])

  const clamp = (n: number) => {
    let result = n
    if (min !== undefined && result < Number(min)) result = Number(min)
    if (max !== undefined && result > Number(max)) result = Number(max)
    return result
  }

  const parse = (raw: string) => {
    if (raw === '' || raw === '-') return emptyValue
    const n = integer ? parseInt(raw, 10) : parseFloat(raw)
    return Number.isNaN(n) ? emptyValue : clamp(n)
  }

  const commit = (raw: string) => {
    const n = parse(raw)
    onChange(n)
    setText(String(n))
  }

  const pattern = integer ? /^-?\d*$/ : /^-?\d*\.?\d*$/

  return (
    <input
      {...props}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      className={className}
      value={text}
      onFocus={(e) => {
        setFocused(true)
        onFocus?.(e)
      }}
      onChange={(e) => {
        const v = e.target.value
        if (v !== '' && !pattern.test(v)) return
        setText(v)
        if (!commitOnBlurOnly && v !== '' && v !== '-' && !v.endsWith('.')) {
          const n = integer ? parseInt(v, 10) : parseFloat(v)
          if (!Number.isNaN(n)) onChange(clamp(n))
        }
      }}
      onBlur={(e) => {
        setFocused(false)
        commit(text)
        onBlur?.(e)
      }}
    />
  )
}

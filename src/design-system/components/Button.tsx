import type { ButtonHTMLAttributes, ReactNode } from 'react'

/**
 * Shared action primitive. UI-only: navigation and side effects belong to callers.
 * All interactive variants preserve native button keyboard behavior.
 */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  busy?: boolean
  children: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  busy = false,
  disabled,
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  const classes = ['wd-button', `wd-button--${variant}`, `wd-button--${size}`, className]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      {...props}
      type={type}
      className={classes}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {children}
    </button>
  )
}

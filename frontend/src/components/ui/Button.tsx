import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

type Variant = 'primary' | 'ghost' | 'quiet' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50'

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:bg-ink/85',
  ghost: 'border border-edge text-ink hover:bg-surface',
  quiet: 'text-muted hover:text-ink hover:bg-surface',
  danger: 'bg-bad text-paper hover:bg-bad/90',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

function classes(variant: Variant, size: Size, extra?: string) {
  return [base, variants[variant], sizes[size], extra].filter(Boolean).join(' ')
}

type Common = { variant?: Variant; size?: Size; className?: string; children: ReactNode }

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={classes(variant, size, className)} {...rest} />
}

export function ButtonLink({ variant = 'primary', size = 'md', className, ...rest }: Common & LinkProps) {
  return <Link className={classes(variant, size, className)} {...rest} />
}

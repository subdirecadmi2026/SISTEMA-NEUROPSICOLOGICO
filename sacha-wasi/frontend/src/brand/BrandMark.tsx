import type { SVGProps } from 'react'

type Props = {
  className?: string
  size?: number
} & SVGProps<SVGSVGElement>

/** Marca Sacha Wasi: hoja de selva + casa andina, verde oscuro y cobre. */
export function BrandMark({ className = 'h-10 w-10', size, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
      aria-hidden
      {...rest}
    >
      <rect width="64" height="64" rx="16" fill="#143D30" />
      <rect x="3" y="3" width="58" height="58" rx="14" stroke="#C4A574" strokeWidth="1.4" opacity="0.7" />
      <path d="M32 12l16 12v22c0 2.2-1.8 4-4 4H20c-2.2 0-4-1.8-4-4V24L32 12z" fill="#0C1F18" />
      <path d="M16 24.5L32 12.5 48 24.5" stroke="#C45C26" strokeWidth="2.2" strokeLinejoin="round" />
      <path
        d="M22 38c7-11 16-14 24-16-5 8-7 16-4 22-9-1-16-1-20-6z"
        fill="#2D6B52"
      />
      <path
        d="M24 28c5 3 8 8 10 14"
        stroke="#E8D5A8"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="32" cy="40" r="2" fill="#C45C26" />
    </svg>
  )
}

export function BrandWordmark({
  subtitle = 'ERP gastronómico',
  tone = 'onDark',
}: {
  subtitle?: string
  tone?: 'onDark' | 'onLight'
}) {
  const title = tone === 'onLight' ? 'text-forest-800' : 'text-cream-50'
  const cap = tone === 'onLight' ? 'text-clay-600' : 'text-copper-400'
  return (
    <div className="flex items-center gap-3">
      <BrandMark className="h-11 w-11 shrink-0 drop-shadow-sm" />
      <div>
        <p className={`font-display text-xl leading-none tracking-tight ${title}`}>Sacha Wasi</p>
        <p className={`mt-1 text-[11px] uppercase tracking-[0.22em] ${cap}`}>{subtitle}</p>
      </div>
    </div>
  )
}

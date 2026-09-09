import type { SVGProps } from 'react'

type Props = {
  className?: string
  size?: number
} & SVGProps<SVGSVGElement>

/** Sello Sacha Wasi: anillo de oro, hoja de selva sobre bosque oscuro. */
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
      <circle cx="32" cy="32" r="32" fill="#10291F" />
      <circle cx="32" cy="32" r="28.5" stroke="#C4A574" strokeWidth="1.4" />
      <circle cx="32" cy="32" r="25.5" stroke="#C4A574" strokeWidth="0.6" opacity="0.55" />
      <path
        d="M32 14c-2.2 7.4-10.8 12.8-14.2 21.2-2.2 5.4.6 12.2 7.4 14.4 2.4.8 4.6.6 6.8-.2"
        stroke="#E8D5A8"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M32 14c2.2 7.4 10.8 12.8 14.2 21.2 2.2 5.4-.6 12.2-7.4 14.4-2.4.8-4.6.6-6.8-.2"
        stroke="#E8D5A8"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M32 14v32" stroke="#C45C26" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M22 27c4.2 1.6 7.4 1.2 10-1.4M42 27c-4.2 1.6-7.4 1.2-10-1.4M24 36c3.6 1.2 6.2.8 8-1.8M40 36c-3.6 1.2-6.2.8-8-1.8"
        stroke="#2D6B52"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function BrandWordmark({
  subtitle = 'Cocina de la sierra',
  tone = 'onDark',
}: {
  subtitle?: string
  tone?: 'onDark' | 'onLight'
}) {
  const title = tone === 'onLight' ? 'text-forest-800' : 'text-cream-50'
  const cap = tone === 'onLight' ? 'text-clay-600' : 'text-copper-400'
  return (
    <div className="flex items-center gap-3">
      <BrandMark className="h-12 w-12 shrink-0" />
      <div>
        <p className={`font-display text-[1.65rem] leading-none tracking-tight ${title}`}>Sacha Wasi</p>
        <p className={`mt-1.5 text-[10px] font-medium uppercase tracking-[0.28em] ${cap}`}>{subtitle}</p>
      </div>
    </div>
  )
}

export function BrandMark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <rect x="6.5" y="9" width="5.5" height="15" rx="2.2" fill="currentColor" />
      <rect x="13.25" y="5.5" width="5.5" height="18.5" rx="2.2" fill="currentColor" opacity="0.55" />
      <rect x="20" y="12.5" width="5.5" height="11.5" rx="2.2" fill="var(--accent)" />
    </svg>
  )
}

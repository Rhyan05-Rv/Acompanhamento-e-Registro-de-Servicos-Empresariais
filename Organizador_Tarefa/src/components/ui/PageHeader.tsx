import type { ReactNode } from 'react'

export function PageHeader({
  titulo,
  subtitulo,
  children,
}: {
  titulo: ReactNode
  subtitulo?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="font-display text-[1.7rem] leading-tight font-semibold tracking-tight text-content">{titulo}</h1>
        {subtitulo && <p className="muted">{subtitulo}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

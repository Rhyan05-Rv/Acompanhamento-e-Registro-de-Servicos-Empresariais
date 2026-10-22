import { AlertTriangle, Clock3 } from 'lucide-react'
import type { Gargalo } from '../../types'
import { formatarHoras } from './utils'

export function GargalosPanel({
  gargalos,
  onAbrirEtapa,
  onAbrirAtividade,
}: {
  gargalos: Gargalo[]
  onAbrirEtapa: (gargalo: Gargalo) => void
  onAbrirAtividade: (id: string) => void
}) {
  return (
    <div className="card p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-sm text-content">Gargalos</h3>
        <p className="text-xs text-content-muted">Etapas com maior tempo médio parado</p>
      </div>

      {gargalos.length === 0 ? (
        <p className="text-sm text-content-subtle py-4">Nenhum gargalo: todas as etapas estão fluindo.</p>
      ) : (
        <ol className="space-y-2">
          {gargalos.map((gargalo, indice) => (
            <li key={`${gargalo.fluxoId}-${gargalo.etapaId}`} className="rounded-xl border border-border bg-surface-muted/60 p-3">
              <button
                type="button"
                onClick={() => onAbrirEtapa(gargalo)}
                className="w-full text-left group"
                title={`Abrir ${gargalo.etapa} no Kanban`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-content truncate group-hover:text-primary">
                      {indice + 1}. {gargalo.etapa}
                    </p>
                    <p className="text-xs text-content-subtle truncate">
                      {gargalo.fluxo} · {gargalo.operacao} · {gargalo.equipe}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-prio-alta">{formatarHoras(gargalo.tempoMedioHoras)}</p>
                    <p className="text-[11px] text-content-subtle">{gargalo.wip} cards</p>
                  </div>
                </div>
              </button>

              {gargalo.cardsParados.length > 0 && (
                <ul className="mt-2 space-y-1 border-t border-border pt-2">
                  {gargalo.cardsParados.slice(0, 3).map(card => (
                    <li key={card.id}>
                      <button
                        type="button"
                        onClick={() => onAbrirAtividade(card.id)}
                        className="w-full flex items-center justify-between gap-2 text-left text-xs text-content-muted hover:text-content transition-colors"
                      >
                        <span className="truncate">{card.titulo}</span>
                        <span className="shrink-0 inline-flex items-center gap-1">
                          <Clock3 className="w-3 h-3" /> {formatarHoras(card.horasNaEtapa)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {gargalo.bloqueadas > 0 && (
                <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-bloqueado">
                  <AlertTriangle className="w-3 h-3" /> {gargalo.bloqueadas} bloqueada(s)
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

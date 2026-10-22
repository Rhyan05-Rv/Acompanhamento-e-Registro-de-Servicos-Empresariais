import { Fragment } from 'react'
import { AlertTriangle, ArrowRight, Clock3 } from 'lucide-react'
import type { FluxoAnalytics } from '../../types'
import { classeCalor, formatarHoras } from './utils'

export function FluxoMapa({
  fluxos,
  onAbrirEtapa,
}: {
  fluxos: FluxoAnalytics[]
  onAbrirEtapa: (operacaoId: string, etapaId: string) => void
}) {
  if (fluxos.length === 0) {
    return <div className="card p-8 text-center text-sm text-content-subtle">Nenhum fluxo cadastrado nas operações visíveis.</div>
  }

  return (
    <div className="space-y-4">
      {fluxos.map(fluxo => (
        <div key={fluxo.fluxoId} className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-content truncate">{fluxo.fluxo}</h3>
              <p className="text-xs text-content-subtle truncate">
                {fluxo.operacao} · {fluxo.total} tarefas · {fluxo.progresso}% concluído
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-content-muted">
              <span>{fluxo.concluidas}/{fluxo.total}</span>
              <div className="w-24 h-1.5 bg-surface-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${fluxo.progresso}%` }} />
              </div>
            </div>
          </div>

          <div className="flex items-stretch gap-2 overflow-x-auto pt-1 pb-2 min-w-max">
            {fluxo.etapas.map((etapa, i) => (
              <Fragment key={etapa.etapaId}>
                <button
                  type="button"
                  onClick={() => onAbrirEtapa(fluxo.operacaoId, etapa.etapaId)}
                  title={`Abrir ${etapa.etapa} no Kanban`}
                  className={`w-52 shrink-0 text-left rounded-xl border p-3 transition hover:-translate-y-px hover:shadow-card ${classeCalor(etapa.tempoMedioHoras, etapa.wip)}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide opacity-85 truncate">
                      {etapa.ordem}. {etapa.etapa}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
                  </div>
                  <p className="text-[11px] opacity-75 mb-2 truncate">{etapa.equipe}</p>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">{etapa.wip} em andamento</span>
                    <span className="opacity-75">{etapa.concluidas} ok</span>
                  </div>

                  <div className="flex items-center gap-1 mt-2 text-xs">
                    <Clock3 className="w-3 h-3" />
                    {formatarHoras(etapa.tempoMedioHoras)} parado
                    {etapa.bloqueadas > 0 && (
                      <span className="ml-auto inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {etapa.bloqueadas}
                      </span>
                    )}
                  </div>
                </button>

                {i < fluxo.etapas.length - 1 && (
                  <div className="flex items-center text-content-subtle shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

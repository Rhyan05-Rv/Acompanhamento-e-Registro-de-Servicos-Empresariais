import { useState } from 'react'
import type { FluxoAnalytics } from '../../types'
import { classeCalor, formatarHoras } from './utils'

export function AgingHeatmap({
  fluxos,
  onAbrirEtapa,
}: {
  fluxos: FluxoAnalytics[]
  onAbrirEtapa: (operacaoId: string, etapaId: string) => void
}) {
  const [selecionado, setSelecionado] = useState('')
  const fluxo = fluxos.find(f => f.fluxoId === selecionado) ?? fluxos[0]

  if (!fluxo) return null

  const equipes = [...new Set(fluxo.etapas.flatMap(e => e.porEquipe.map(p => p.equipe)))]

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-sm text-content">Mapa de calor por equipe</h3>
          <p className="text-xs text-content-muted">WIP e tempo médio parado por etapa e equipe</p>
        </div>
        <select
          value={fluxo.fluxoId}
          onChange={e => setSelecionado(e.target.value)}
          className="input !w-auto !py-1.5 text-xs"
          aria-label="Selecionar fluxo"
        >
          {fluxos.map(f => (
            <option key={f.fluxoId} value={f.fluxoId}>
              {f.fluxo} · {f.operacao}
            </option>
          ))}
        </select>
      </div>

      {equipes.length === 0 ? (
        <p className="text-sm text-content-subtle py-4">Sem equipes com tarefas em andamento.</p>
      ) : (
        <div className="overflow-x-auto py-1">
          <table className="w-full min-w-max border-separate border-spacing-1">
            <thead>
              <tr>
                <th />
                {fluxo.etapas.map(etapa => (
                  <th key={etapa.etapaId} className="text-left px-2 py-1 text-[11px] font-semibold text-content-muted whitespace-nowrap">
                    {etapa.ordem}. {etapa.etapa}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {equipes.map(equipe => (
                <tr key={equipe}>
                  <td className="pr-2 text-xs text-content-muted whitespace-nowrap">{equipe}</td>
                  {fluxo.etapas.map(etapa => {
                    const celula = etapa.porEquipe.find(p => p.equipe === equipe)
                    return (
                      <td key={etapa.etapaId}>
                        <button
                          type="button"
                          onClick={() => onAbrirEtapa(fluxo.operacaoId, etapa.etapaId)}
                          title={`${equipe} · ${etapa.etapa}: ${celula?.wip ?? 0} cards, ${formatarHoras(celula?.tempoMedioHoras ?? 0)}`}
                          className={`w-full min-w-24 rounded-lg border px-2 py-1.5 text-left transition hover:-translate-y-px hover:shadow-soft ${classeCalor(celula?.tempoMedioHoras ?? 0, celula?.wip ?? 0)}`}
                        >
                          <span className="block text-xs font-semibold">
                            {celula?.wip ? `${celula.wip} card${celula.wip > 1 ? 's' : ''}` : '—'}
                          </span>
                          {!!celula?.wip && (
                            <span className="block text-[10px] opacity-80">{formatarHoras(celula.tempoMedioHoras)}</span>
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

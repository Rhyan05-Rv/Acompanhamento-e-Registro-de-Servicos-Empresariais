import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Layers, RefreshCw, Timer } from 'lucide-react'
import { api } from '../../services/api'
import { useAsync } from '../../hooks/useAsync'
import { Spinner } from '../ui/Spinner'
import { AtividadeDetalhe } from '../AtividadeDetalhe'
import { FluxoMapa } from './FluxoMapa'
import { TendenciaChart } from './TendenciaChart'
import { GargalosPanel } from './GargalosPanel'
import { AgingHeatmap } from './AgingHeatmap'

export function TorreControle({ operacaoId, periodo }: { operacaoId?: string; periodo?: string }) {
  const navigate = useNavigate()
  const [atividadeId, setAtividadeId] = useState<string | null>(null)

  const { data, loading, error, run } = useAsync(async () => {
    const [fluxo, serie] = await Promise.all([
      api.metricas.fluxo(operacaoId),
      api.metricas.serie(periodo || undefined, operacaoId),
    ])
    return { fluxo, serie }
  }, [operacaoId, periodo])

  function abrirEtapa(opId: string, etapaId: string) {
    navigate(`/operacoes/${opId}?aba=kanban&etapa=${etapaId}`)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-bloqueado">{error}</p>
        <button type="button" className="btn btn-secondary" onClick={run}>
          <RefreshCw className="w-4 h-4" /> Tentar novamente
        </button>
      </div>
    )
  }

  if (!data) return null

  const { fluxo, serie } = data
  const kpis = [
    { label: 'WIP atual', valor: serie.wipAtual, icon: Layers, cor: 'text-primary bg-primary-soft' },
    { label: 'Bloqueadas', valor: serie.bloqueadas, icon: AlertTriangle, cor: 'text-bloqueado bg-bloqueado-soft' },
    { label: 'Concluídas no período', valor: serie.totalConcluidas, icon: CheckCircle2, cor: 'text-concluido bg-concluido-soft' },
    { label: 'Lead time médio', valor: `${serie.leadTimeMedioDias}d`, icon: Timer, cor: 'text-execucao bg-execucao-soft' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-content-muted">
          Estado atual do fluxo e tendência do período selecionado.
        </p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={run}>
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 stagger">
        {kpis.map(kpi => (
          <div key={kpi.label} className="card p-4">
            <div className="flex items-start justify-between">
              <p className="text-xs text-content-muted">{kpi.label}</p>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${kpi.cor}`}>
                <kpi.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-content mt-2 tracking-tight tabular-nums">{kpi.valor}</p>
          </div>
        ))}
      </div>

      <FluxoMapa fluxos={fluxo.fluxos} onAbrirEtapa={abrirEtapa} />

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6 stagger">
        <TendenciaChart serie={serie} />
        <GargalosPanel
          gargalos={fluxo.gargalos}
          onAbrirEtapa={gargalo => abrirEtapa(gargalo.operacaoId, gargalo.etapaId)}
          onAbrirAtividade={setAtividadeId}
        />
      </div>

      <AgingHeatmap fluxos={fluxo.fluxos} onAbrirEtapa={abrirEtapa} />

      {atividadeId && (
        <AtividadeDetalhe
          atividadeId={atividadeId}
          onClose={() => setAtividadeId(null)}
          onChanged={run}
        />
      )}
    </div>
  )
}

import { AlertTriangle, CheckCircle2, Loader2, Sparkles, Timer } from 'lucide-react'
import type { ResumoIARadar, ResumoRadar } from '../../types'

export function ResumoCard({
  resumo,
  analiseIA,
  gerandoIA,
  onGerarIA,
}: {
  resumo: ResumoRadar
  analiseIA: ResumoIARadar | null
  gerandoIA: boolean
  onGerarIA: () => void
}) {
  const texto = analiseIA?.texto ?? resumo.texto
  const fonte = analiseIA ? (analiseIA.fonte === 'ia' ? 'IA' : 'Regras') : 'Regras'

  const stats = [
    { label: 'Críticas', valor: resumo.criticas, icon: AlertTriangle, cor: 'text-bloqueado' },
    { label: 'Vencidas', valor: resumo.vencidas, icon: Timer, cor: 'text-prio-alta' },
    { label: 'Bloqueadas', valor: resumo.bloqueadas, icon: AlertTriangle, cor: 'text-pendente' },
    { label: 'Sugestões', valor: resumo.sugestoes, icon: CheckCircle2, cor: 'text-primary' },
  ]

  return (
    <div className="card p-5 border-l-4 border-l-primary">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-content">Resumo do dia</h2>
            <span className={`badge ${analiseIA?.fonte === 'ia' ? 'bg-primary-soft text-primary' : 'bg-surface-muted text-content-muted'}`}>
              {fonte}
            </span>
          </div>
          <p className="text-sm text-content-muted mt-1 max-w-3xl">{texto}</p>
        </div>

        {resumo.iaDisponivel && (
          <button type="button" onClick={onGerarIA} disabled={gerandoIA} className="btn btn-secondary btn-sm shrink-0">
            {gerandoIA ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {analiseIA ? 'Gerar novamente' : 'Gerar análise com IA'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {stats.map(stat => (
          <div key={stat.label} className="rounded-lg bg-surface-muted/70 border border-border px-3 py-2">
            <p className="text-[11px] text-content-subtle">{stat.label}</p>
            <p className={`text-lg font-bold mt-0.5 tabular-nums ${stat.cor}`}>
              <stat.icon className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              {stat.valor}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

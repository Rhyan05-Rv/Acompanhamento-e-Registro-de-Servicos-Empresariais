import { Link } from 'react-router-dom'
import { ArrowRight, Radar as RadarIcon } from 'lucide-react'
import { api } from '../../services/api'
import { useAsync } from '../../hooks/useAsync'

const CLASSE_NIVEL = {
  critico: 'bg-bloqueado',
  alto: 'bg-prio-alta',
  medio: 'bg-pendente',
  baixo: 'bg-content-subtle',
}

export function RadarWidget({ operacaoId }: { operacaoId?: string }) {
  const { data } = useAsync(() => api.insights.risco(operacaoId, 3), [operacaoId])

  if (!data || data.itens.length === 0) return null

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
            <RadarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-content">Precisa de atenção hoje</h3>
            <p className="text-xs text-content-muted">Top riscos do Radar Operacional</p>
          </div>
        </div>
        <Link to="/radar" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Ver Radar <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <ul className="divide-y divide-border">
        {data.itens.map(item => (
          <li key={item.id}>
            <Link to="/radar" className="flex items-center gap-2 py-2 text-sm group">
              <span className={`w-2 h-2 rounded-full shrink-0 ${CLASSE_NIVEL[item.nivel]}`} title={item.nivel} />
              <span className="min-w-0 flex-1 truncate text-content group-hover:text-primary">{item.titulo}</span>
              <span className="text-xs text-content-subtle truncate hidden sm:block">{item.etapa ?? item.operacao}</span>
              <span className="text-xs font-semibold text-content tabular-nums">{item.score}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

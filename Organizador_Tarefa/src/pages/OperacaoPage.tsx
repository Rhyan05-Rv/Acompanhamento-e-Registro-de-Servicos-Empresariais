import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { api } from '../services/api'
import type { Departamento, Fluxo, Operacao } from '../types'
import { DashboardPage } from './DashboardPage'
import { KanbanPage } from './KanbanPage'
import { EquipesPage } from './EquipesPage'
import { CasosPage } from './CasosPage'
import { Boxes } from 'lucide-react'

const abas = [
  { id: 'visao', label: 'Visão geral' },
  { id: 'kanban', label: 'Kanban' },
  { id: 'equipes', label: 'Equipes' },
  { id: 'casos', label: 'Casos' },
] as const

type AbaId = (typeof abas)[number]['id']

export function OperacaoPage() {
  const { operacaoId } = useParams<{ operacaoId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [operacao, setOperacao] = useState<(Operacao & { departamentos: Departamento[]; fluxos: Fluxo[] }) | null>(null)

  const aba = (searchParams.get('aba') as AbaId) || 'visao'
  const etapaId = searchParams.get('etapa')
  const etapaNome = operacao?.fluxos.flatMap(f => f.etapas).find(e => e.id === etapaId)?.nome

  useEffect(() => {
    if (operacaoId) api.operacoes.get(operacaoId).then(setOperacao)
  }, [operacaoId])

  if (!operacaoId) return null

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 lg:px-8 pt-6 bg-surface border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-content-subtle">Operação</p>
            <h1 className="font-display text-xl font-semibold tracking-tight text-content truncate">{operacao?.nome ?? '...'}</h1>
          </div>
        </div>
        {operacao?.descricao && <p className="text-sm text-content-muted mt-1 ml-14">{operacao.descricao}</p>}
        <div className="flex gap-1 mt-4">
          {abas.map(a => (
            <button
              key={a.id}
              onClick={() => setSearchParams({ aba: a.id })}
              className={`tab ${aba === a.id ? 'tab-active' : ''}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {aba === 'visao' && <DashboardPage operacaoId={operacaoId} />}
        {aba === 'kanban' && (
          <KanbanPage
            operacaoId={operacaoId}
            titulo="Kanban"
            subtitulo="Escopado à operação"
            etapaAtualId={etapaId ?? undefined}
            etapaNome={etapaNome}
            onLimparEtapa={() => setSearchParams({ aba: 'kanban' })}
          />
        )}
        {aba === 'equipes' && <EquipesPage operacaoId={operacaoId} />}
        {aba === 'casos' && <CasosPage operacaoId={operacaoId} />}
      </div>
    </div>
  )
}

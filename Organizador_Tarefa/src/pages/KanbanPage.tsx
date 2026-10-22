import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import type { Atividade } from '../types'
import { LayoutGrid, List, Clock, ArrowRight, Plus } from 'lucide-react'
import { AtividadeDetalhe } from '../components/AtividadeDetalhe'
import { NovaAtividadeModal } from '../components/NovaAtividadeModal'
import { Spinner } from '../components/ui/Spinner'
import { STATUS, STATUS_ORDEM, PRIORIDADE } from '../theme/status'

const statusTransitions: Record<string, string[]> = {
  pendente: ['em_execucao', 'bloqueado'],
  em_execucao: ['revisao', 'concluido', 'bloqueado'],
  revisao: ['em_execucao', 'concluido'],
  bloqueado: ['pendente', 'em_execucao'],
  concluido: [],
}

interface Props {
  operacaoId?: string
  equipeId?: string
  titulo?: string
  subtitulo?: string
  etapaAtualId?: string
  etapaNome?: string
  onLimparEtapa?: () => void
}

export function KanbanPage({
  operacaoId,
  equipeId,
  titulo = 'Tarefas',
  subtitulo,
  etapaAtualId,
  etapaNome,
  onLimparEtapa,
}: Props) {
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [view, setView] = useState<'kanban' | 'lista'>('kanban')
  const [loading, setLoading] = useState(true)
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const [showNovaAtividade, setShowNovaAtividade] = useState(false)

  const carregar = useCallback(async () => {
    const data = await api.atividades.list({ operacaoId, equipeId, etapaAtualId })
    setAtividades(data)
  }, [operacaoId, equipeId, etapaAtualId])

  useEffect(() => {
    carregar().finally(() => setLoading(false))
  }, [carregar])

  async function moverStatus(id: string, novoStatus: string) {
    await api.atividades.updateStatus(id, novoStatus)
    setAtividades(prev => prev.map(a => (a.id === id ? { ...a, status: novoStatus as Atividade['status'] } : a)))
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-surface border-b border-border">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight text-content">{titulo}</h1>
          {subtitulo && <p className="text-xs text-content-muted">{subtitulo}</p>}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowNovaAtividade(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Nova Atividade
          </button>
          <div className="flex bg-surface-muted rounded-xl p-1 border border-border">
            <button
              onClick={() => setView('kanban')}
              className={`p-1.5 rounded-lg transition ${view === 'kanban' ? 'bg-surface shadow-soft text-primary' : 'text-content-muted hover:text-content'}`}
              title="Kanban"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('lista')}
              className={`p-1.5 rounded-lg transition ${view === 'lista' ? 'bg-surface shadow-soft text-primary' : 'text-content-muted hover:text-content'}`}
              title="Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {etapaAtualId && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-2 bg-primary-soft border-b border-border text-sm text-primary">
          <span className="truncate">
            Filtrando pela etapa <b>{etapaNome ?? 'selecionada'}</b>
          </span>
          {onLimparEtapa && (
            <button type="button" onClick={onLimparEtapa} className="btn btn-sm btn-secondary shrink-0">
              Limpar filtro
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner />
        </div>
      ) : view === 'kanban' ? (
        <div className="flex-1 flex gap-4 p-6 overflow-x-auto">
          {STATUS_ORDEM.map(status => {
            const config = STATUS[status]
            const itens = atividades.filter(a => a.status === status)
            return (
              <div key={status} className="flex-shrink-0 w-72">
                <div className={`rounded-t-xl px-3.5 py-2.5 border-t-2 ${config.border} ${config.soft}`}>
                  <h3 className="font-semibold text-sm text-content">{config.label}</h3>
                  <span className="text-xs text-content-muted">{itens.length} itens</span>
                </div>
                <div className="bg-surface-muted rounded-b-xl border border-t-0 border-border p-2 space-y-2 min-h-[200px]">
                  {itens.map(ativ => (
                    <div
                      key={ativ.id}
                      className="bg-surface rounded-xl p-3 border border-border shadow-soft hover:shadow-card transition-shadow cursor-pointer"
                      onClick={() => setSelecionada(ativ.id)}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-medium text-sm text-content flex-1">{ativ.titulo}</p>
                        <span
                          className={`w-2 h-2 rounded-full mt-1.5 ml-2 flex-shrink-0 ${PRIORIDADE[ativ.prioridade].dot}`}
                          title={PRIORIDADE[ativ.prioridade].label}
                        />
                      </div>
                      {ativ.etapaAtual && (
                        <p className="text-xs text-primary mb-1">
                          Etapa {ativ.etapaAtual.ordem}: {ativ.etapaAtual.nome}
                        </p>
                      )}
                      <p className="text-xs text-content-muted mb-2">
                        {ativ.responsavel.nome}
                        {ativ.equipe ? ` · ${ativ.equipe.nome}` : ''}
                      </p>
                      {ativ.prazoEstimado && (
                        <div className="flex items-center gap-1 text-xs text-content-subtle mb-2">
                          <Clock className="w-3 h-3" />
                          {new Date(ativ.prazoEstimado).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                      {statusTransitions[status].length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {statusTransitions[status].map(next => (
                            <button
                              key={next}
                              onClick={e => {
                                e.stopPropagation()
                                moverStatus(ativ.id, next)
                              }}
                              className="flex items-center gap-1 text-xs bg-surface border border-border rounded-lg px-1.5 py-0.5 hover:bg-primary-soft hover:border-primary/40 text-content-muted transition"
                            >
                              <ArrowRight className="w-3 h-3" />
                              {STATUS[next as Atividade['status']].label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {itens.length === 0 && (
                    <p className="text-xs text-content-subtle text-center py-6">Nenhum item</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex-1 p-6">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Etapa</th>
                  <th>Equipe</th>
                  <th>Responsável</th>
                  <th>Status</th>
                  <th>Prazo</th>
                </tr>
              </thead>
              <tbody>
                {atividades.map(ativ => (
                  <tr key={ativ.id} className="cursor-pointer" onClick={() => setSelecionada(ativ.id)}>
                    <td className="font-medium">{ativ.titulo}</td>
                    <td className="text-content-muted">
                      {ativ.etapaAtual ? `${ativ.etapaAtual.ordem}. ${ativ.etapaAtual.nome}` : '-'}
                    </td>
                    <td className="text-content-muted">{ativ.equipe?.nome ?? '-'}</td>
                    <td className="text-content-muted">{ativ.responsavel.nome}</td>
                    <td>
                      <span className={`badge ${STATUS[ativ.status].badge}`}>{STATUS[ativ.status].label}</span>
                    </td>
                    <td className="text-content-muted">
                      {ativ.prazoEstimado ? new Date(ativ.prazoEstimado).toLocaleDateString('pt-BR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selecionada && (
        <AtividadeDetalhe
          atividadeId={selecionada}
          onClose={() => setSelecionada(null)}
          onChanged={carregar}
        />
      )}

      {showNovaAtividade && (
        <NovaAtividadeModal
          operacaoId={operacaoId}
          onClose={() => setShowNovaAtividade(false)}
          onCreated={() => {
            setShowNovaAtividade(false)
            carregar()
          }}
        />
      )}
    </div>
  )
}

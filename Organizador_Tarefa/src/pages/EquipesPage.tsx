import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { useAsync } from '../hooks/useAsync'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'
import { STATUS } from '../theme/status'
import { Users, ArrowRight, Layers, Plus, X, Lock, Unlock } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Spinner } from '../components/ui/Spinner'

export function EquipesPage({ operacaoId }: { operacaoId: string }) {
  const { usuario } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const isGestor = usuario?.nivelAcesso === 'gestor'

  const { data, loading, error, run } = useAsync(
    async () => {
      const [d, f, a] = await Promise.all([
        api.departamentos.list(operacaoId),
        api.fluxos.list(operacaoId),
        api.atividades.list({ operacaoId }),
      ])
      return { equipes: d, fluxos: f, atividades: a }
    },
    [operacaoId],
  )
  const equipes = data?.equipes ?? []
  const fluxos = data?.fluxos ?? []
  const atividades = data?.atividades ?? []

  const [novaEquipe, setNovaEquipe] = useState('')
  const [novaEtapa, setNovaEtapa] = useState<Record<string, { nome: string; equipeId: string }>>({})

  async function executar(acao: () => Promise<unknown>, sucesso?: string) {
    try {
      await acao()
      await run()
      if (sucesso) toast(sucesso)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro', 'error')
    }
  }

  async function adicionarEquipe(e: React.FormEvent) {
    e.preventDefault()
    if (!novaEquipe.trim()) return
    await executar(async () => {
      await api.departamentos.create(novaEquipe.trim(), operacaoId)
      setNovaEquipe('')
    }, 'Equipe criada.')
  }

  async function adicionarEtapa(fluxoId: string) {
    const dados = novaEtapa[fluxoId]
    if (!dados?.nome || !dados?.equipeId) return
    await executar(async () => {
      await api.fluxos.adicionarEtapa(fluxoId, dados)
      setNovaEtapa(prev => ({ ...prev, [fluxoId]: { nome: '', equipeId: '' } }))
    }, 'Etapa adicionada.')
  }

  async function removerEquipe(id: string) {
    if (!(await confirm({ titulo: 'Remover equipe?', mensagem: 'As tarefas permanecem, mas a equipe será desvinculada.', confirmLabel: 'Remover' }))) return
    await executar(() => api.departamentos.remove(id), 'Equipe removida.')
  }

  async function removerEtapa(id: string) {
    if (!(await confirm({ titulo: 'Remover etapa?', confirmLabel: 'Remover' }))) return
    await executar(() => api.fluxos.removerEtapa(id), 'Etapa removida.')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader titulo="Equipes e fluxos" subtitulo="Departamentos e grades de trabalho desta operação." />
      {error && <p className="text-sm text-bloqueado">{error}</p>}

      <Link
        to={`/operacoes/${operacaoId}?aba=kanban`}
        className="card card-hover flex items-center justify-between p-4 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-content">Todas as equipes da operação</p>
            <p className="text-sm text-content-muted">Kanban consolidado — {atividades.length} tarefas</p>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-content-subtle transition-transform group-hover:translate-x-1 group-hover:text-primary" />
      </Link>

      {/* Equipes */}
      <div className="space-y-3">
        <h2 className="section-title">Equipes ({equipes.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {equipes.map(eq => {
            const total = atividades.filter(a => a.equipeId === eq.id).length
            return (
              <div key={eq.id} className="card p-4 border-l-4 border-l-primary">
                <div className="flex items-center justify-between mb-1">
                  <Link
                    to={`/operacoes/${operacaoId}/equipes/${eq.id}`}
                    className="flex items-center gap-2 text-content hover:text-primary transition-colors"
                  >
                    <Users className="w-4 h-4 text-content-muted" />
                    <p className="font-semibold">{eq.nome}</p>
                  </Link>
                  {isGestor && (
                    <button
                      onClick={() => removerEquipe(eq.id)}
                      title="Remover equipe"
                      className="text-content-subtle hover:text-bloqueado transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Link to={`/operacoes/${operacaoId}/equipes/${eq.id}`} className="text-sm text-content-muted hover:text-primary hover:underline">
                  {total} tarefa(s)
                </Link>
              </div>
            )
          })}
        </div>

        {isGestor && (
          <form onSubmit={adicionarEquipe} className="flex gap-2 max-w-md">
            <input
              value={novaEquipe}
              onChange={e => setNovaEquipe(e.target.value)}
              placeholder="Nova equipe (ex.: Embalagem)"
              className="input"
            />
            <button type="submit" className="btn btn-primary shrink-0">
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </form>
        )}
      </div>

      {/* Grade macro + gestão de etapas */}
      <div className="space-y-4">
        <h2 className="section-title">Grade dos fluxos (macro)</h2>
        {fluxos.map(fluxo => (
          <div key={fluxo.id} className="card p-5 overflow-x-auto">
            <p className="font-semibold text-content mb-3">{fluxo.nome}</p>
            <div className="flex items-stretch gap-2 min-w-max">
              {fluxo.etapas.map((et, i) => {
                const itens = atividades.filter(a => a.fluxoId === fluxo.id && a.etapaAtualId === et.id)
                return (
                  <div key={et.id} className="flex items-center gap-2">
                    <div className="w-56 bg-surface-muted border border-border rounded-xl p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-content">
                          {et.ordem}. {et.nome}
                        </p>
                        {isGestor && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                executar(
                                  () => api.fluxos.atualizarEtapa(et.id, !et.requerAprovacao),
                                  et.requerAprovacao
                                    ? 'Etapa não exige mais aprovação.'
                                    : 'Etapa passa a exigir aprovação.'
                                )
                              }
                              title={et.requerAprovacao ? 'Remover exigência de aprovação' : 'Exigir aprovação'}
                              className={et.requerAprovacao ? 'text-primary hover:text-content transition-colors' : 'text-content-subtle hover:text-primary transition-colors'}
                            >
                              {et.requerAprovacao ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => removerEtapa(et.id)}
                              title="Remover etapa"
                              className="text-content-subtle hover:text-bloqueado transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-content-subtle mb-2">{et.equipe?.nome}</p>
                      <div className="space-y-1">
                        {itens.map(a => (
                          <div key={a.id} className="bg-surface border border-border rounded-lg px-2 py-1 flex items-center justify-between">
                            <span className="text-xs text-content truncate">{a.titulo}</span>
                            <span className={`ml-2 badge ${STATUS[a.status].badge} !px-1.5 !py-0 !text-[10px]`}>
                              {STATUS[a.status].label.slice(0, 3)}
                            </span>
                          </div>
                        ))}
                        {itens.length === 0 && <p className="text-[11px] text-content-subtle">vazio</p>}
                      </div>
                    </div>
                    {i < fluxo.etapas.length - 1 && <ArrowRight className="w-4 h-4 text-content-subtle shrink-0" />}
                  </div>
                )
              })}

              {/* Adicionar etapa */}
              {isGestor && (
                <div className="flex items-center gap-2">
                  {fluxo.etapas.length > 0 && <ArrowRight className="w-4 h-4 text-content-subtle shrink-0" />}
                  <div className="w-56 bg-primary-soft border border-dashed border-primary/40 rounded-xl p-2.5 space-y-1">
                    <p className="text-[11px] text-primary font-medium">Nova etapa</p>
                    <input
                      value={novaEtapa[fluxo.id]?.nome ?? ''}
                      onChange={e =>
                        setNovaEtapa(prev => ({ ...prev, [fluxo.id]: { nome: e.target.value, equipeId: prev[fluxo.id]?.equipeId ?? '' } }))
                      }
                      placeholder="Nome da etapa"
                      className="input !px-2 !py-1 text-xs"
                    />
                    <select
                      value={novaEtapa[fluxo.id]?.equipeId ?? ''}
                      onChange={e =>
                        setNovaEtapa(prev => ({ ...prev, [fluxo.id]: { nome: prev[fluxo.id]?.nome ?? '', equipeId: e.target.value } }))
                      }
                      className="input !px-2 !py-1 text-xs"
                    >
                      <option value="">Equipe...</option>
                      {equipes.map(eq => (
                        <option key={eq.id} value={eq.id}>{eq.nome}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => adicionarEtapa(fluxo.id)}
                      className="btn btn-primary btn-sm w-full"
                    >
                      <Plus className="w-3 h-3" /> Adicionar etapa
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {fluxos.length === 0 && <p className="text-sm text-content-subtle">Nenhum fluxo cadastrado.</p>}
      </div>
    </div>
  )
}

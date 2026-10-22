import { useEffect, useState, useCallback } from 'react'
import type { AprovacaoEtapa, Atividade, Usuario } from '../types'
import { api } from '../services/api'
import { X, ArrowRight, ArrowLeft, Clock, Plus, Edit, Trash2, User, CheckCircle2, ShieldCheck, ShieldX } from 'lucide-react'
import { STATUS, STATUS_ORDEM, PRIORIDADE } from '../theme/status'
import { useAuth } from '../hooks/useAuth'
import { Modal } from './ui/Modal'

const acaoLabels: Record<string, string> = {
  criacao: 'criou a atividade',
  edicao: 'editou um campo',
  mudanca_status: 'alterou o status',
  avanco_etapa: 'avançou a etapa',
  retorno_etapa: 'retornou a etapa',
  exclusao: 'excluiu a atividade',
  aprovacao_etapa: 'decidiu a aprovação da etapa',
}

const acaoIcons: Record<string, typeof Clock> = {
  criacao: Plus,
  edicao: Edit,
  mudanca_status: ArrowRight,
  avanco_etapa: ArrowRight,
  retorno_etapa: ArrowLeft,
  exclusao: Trash2,
  aprovacao_etapa: ShieldCheck,
}

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR')

interface Props {
  atividadeId: string
  onClose: () => void
  onChanged: () => void
}

export function AtividadeDetalhe({ atividadeId, onClose, onChanged }: Props) {
  const { usuario } = useAuth()
  const [ativ, setAtiv] = useState<Atividade | null>(null)
  const [aprovacoes, setAprovacoes] = useState<AprovacaoEtapa[]>([])
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [novoResp, setNovoResp] = useState('')
  const [form, setForm] = useState({ titulo: '', descricao: '', prioridade: 'media', prazoEstimado: '' })

  const carregar = useCallback(async () => {
    const [data, aprovs] = await Promise.all([
      api.atividades.get(atividadeId),
      api.aprovacoes.list(atividadeId),
    ])
    setAtiv(data)
    setAprovacoes(aprovs)
    setForm({
      titulo: data.titulo,
      descricao: data.descricao ?? '',
      prioridade: data.prioridade,
      prazoEstimado: data.prazoEstimado ? data.prazoEstimado.slice(0, 10) : '',
    })
  }, [atividadeId])

  useEffect(() => {
    carregar().catch(e => setErro(e.message))
    api.usuarios.list().then(setUsuarios).catch(() => {})
  }, [carregar])

  async function executar(acao: () => Promise<unknown>) {
    setErro('')
    try {
      await acao()
      await carregar()
      onChanged()
      window.dispatchEvent(new Event('aprovacoes-change'))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro')
    }
  }

  async function salvarEdicao() {
    setSalvando(true)
    await executar(() =>
      api.atividades.edit(atividadeId, {
        titulo: form.titulo,
        descricao: form.descricao,
        prioridade: form.prioridade as Atividade['prioridade'],
        prazoEstimado: form.prazoEstimado ? new Date(form.prazoEstimado).toISOString() : null,
      })
    )
    setSalvando(false)
  }

  const etapaAprovacao = ativ
    ? ativ.fluxo?.etapas?.find(etapa => etapa.id === ativ.etapaAtualId) ?? ativ.etapaAtual
    : null
  const aprovacaoAtual = ativ ? aprovacoes.find(a => a.etapaId === ativ.etapaAtualId) : undefined

  async function decidirAprovacao(decisao: 'aprovada' | 'rejeitada') {
    if (!aprovacaoAtual) return
    let comentario: string | undefined
    if (decisao === 'rejeitada') {
      const motivo = window.prompt('Motivo da rejeição (opcional)')
      if (motivo === null) return
      comentario = motivo || undefined
    }
    await executar(() => api.aprovacoes.decidir(aprovacaoAtual.id, decisao, comentario))
  }

  return (
    <Modal
      onClose={onClose}
      size="3xl"
      title={
        ativ ? (
          <div>
            <span className="block">{ativ.titulo}</span>
            <span className={`badge mt-1 ${STATUS[ativ.status].badge}`}>{STATUS[ativ.status].label}</span>
            <span className={`badge mt-1 ml-2 ${PRIORIDADE[ativ.prioridade].badge}`}>
              {PRIORIDADE[ativ.prioridade].label}
            </span>
          </div>
        ) : (
          'Atividade'
        )
      }
    >
        {!ativ ? (
          <div className="py-8 text-center text-sm text-content-subtle">{erro || 'Carregando...'}</div>
        ) : (
          <>
            {erro && <p className="text-sm text-bloqueado bg-bloqueado-soft rounded-lg px-3 py-2 mb-3">{erro}</p>}

            {/* Metadados */}
            <div className="grid grid-cols-2 gap-2 text-sm text-content-muted mb-4">
              <p><User className="w-4 h-4 inline mr-1" />Principal: <b className="text-content">{ativ.responsavel.nome}</b></p>
              <p>Equipe: <b className="text-content">{ativ.equipe?.nome ?? '-'}</b></p>
              <p>Criado por: <b className="text-content">{ativ.criadoPor?.nome ?? '-'}</b> em {dataHora(ativ.createdAt)}</p>
              <p>Prazo: <b className="text-content">{ativ.prazoEstimado ? new Date(ativ.prazoEstimado).toLocaleDateString('pt-BR') : '-'}</b></p>
              {ativ.dataInicio && <p>Início: {dataHora(ativ.dataInicio)}</p>}
              {ativ.dataConclusao && <p>Fim: {dataHora(ativ.dataConclusao)}</p>}
              {ativ.tempoGastoMin != null && (
                <p>Tempo total: <b className="text-content">{Math.round(ativ.tempoGastoMin / 60)}h {ativ.tempoGastoMin % 60}min</b></p>
              )}
            </div>

            {/* Responsáveis */}
            <div className="card p-4 mb-4">
              <h3 className="text-sm font-semibold text-content mb-2">Responsáveis</h3>
              <ul className="space-y-1 mb-2">
                {(ativ.responsaveis ?? []).map(r => (
                  <li key={r.id} className="flex items-center justify-between text-sm">
                    <span className="text-content-muted">
                      {r.usuario.nome}
                      {r.usuario.id === ativ.responsavelId && <span className="text-xs text-primary"> · principal</span>}
                    </span>
                    {(ativ.responsaveis?.length ?? 0) > 1 && (
                      <button
                        onClick={() => executar(() => api.atividades.removerResponsavel(ativ.id, r.usuario.id))}
                        className="text-content-subtle hover:text-bloqueado transition-colors"
                        title="Remover responsável"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                ))}
                {(ativ.responsaveis ?? []).length === 0 && <li className="text-sm text-content-subtle">Nenhum.</li>}
              </ul>
              <div className="flex gap-2">
                <select
                  value={novoResp}
                  onChange={e => setNovoResp(e.target.value)}
                  className="input flex-1"
                >
                  <option value="">Adicionar responsável...</option>
                  {usuarios
                    .filter(u => !(ativ.responsaveis ?? []).some(r => r.usuario.id === u.id))
                    .map(u => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                </select>
                <button
                  onClick={() => {
                    if (!novoResp) return
                    executar(() => api.atividades.adicionarResponsavel(ativ.id, novoResp))
                    setNovoResp('')
                  }}
                  className="btn btn-primary shrink-0"
                >
                  Adicionar
                </button>
              </div>
            </div>

            {/* Grade da tarefa (micro) */}
            {ativ.fluxo?.etapas && ativ.fluxo.etapas.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-content mb-2">Grade da tarefa — {ativ.fluxo.nome}</h3>
                <div className="flex flex-wrap items-center gap-1">
                  {ativ.fluxo.etapas.map((et, i) => {
                    const atual = et.id === ativ.etapaAtualId
                    const concluida = et.ordem < (ativ.etapaAtual?.ordem ?? 0)
                    return (
                      <div key={et.id} className="flex items-center gap-1">
                        <div
                          className={`px-2 py-1 rounded-lg text-xs border ${
                            atual
                              ? 'bg-primary text-on-primary border-primary shadow-soft'
                              : concluida
                                ? 'bg-concluido-soft text-concluido border-concluido/40'
                                : 'bg-surface-muted text-content-muted border-border'
                          }`}
                        >
                          {et.ordem}. {et.nome}
                          <span className="block text-[10px] opacity-80">{et.equipe?.nome}</span>
                        </div>
                        {i < ativ.fluxo!.etapas!.length - 1 && <ArrowRight className="w-3 h-3 text-content-subtle" />}
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => executar(() => api.atividades.retornarEtapa(ativ.id))}
                    className="btn btn-secondary btn-sm"
                  >
                    <ArrowLeft className="w-3 h-3" /> Retornar etapa
                  </button>
                  <button
                    onClick={() => executar(() => api.atividades.avancarEtapa(ativ.id))}
                    className="btn btn-primary btn-sm"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Avançar para próxima equipe
                  </button>
                </div>
                <p className="text-xs text-content-subtle mt-1">Avanço liberado apenas com a etapa atual concluída.</p>
              </div>
            )}

            {/* Aprovação da etapa */}
            {ativ.fluxo && etapaAprovacao?.requerAprovacao && (
              <div className="card p-4 mb-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-content">Aprovação da etapa</h3>
                    <p className="text-xs text-content-muted">
                      {etapaAprovacao.ordem}. {etapaAprovacao.nome} exige aprovação de gestor.
                    </p>
                  </div>
                  <span
                    className={`badge ${
                      aprovacaoAtual?.status === 'aprovada'
                        ? 'bg-concluido-soft text-concluido'
                        : aprovacaoAtual?.status === 'rejeitada'
                          ? 'bg-bloqueado-soft text-bloqueado'
                          : aprovacaoAtual?.status === 'pendente'
                            ? 'bg-pendente-soft text-pendente'
                            : 'bg-surface-muted text-content-muted'
                    }`}
                  >
                    {aprovacaoAtual?.status === 'aprovada'
                      ? 'Aprovada'
                      : aprovacaoAtual?.status === 'rejeitada'
                        ? 'Rejeitada'
                        : aprovacaoAtual?.status === 'pendente'
                          ? 'Aguardando aprovação'
                          : 'Não solicitada'}
                  </span>
                </div>

                {aprovacaoAtual?.status === 'aprovada' && (
                  <p className="text-xs text-content-muted mt-2">
                    Aprovada por <b className="text-content">{aprovacaoAtual.decididoPor?.nome ?? 'gestor'}</b>
                    {aprovacaoAtual.decididoEm ? ` em ${dataHora(aprovacaoAtual.decididoEm)}` : ''}.
                  </p>
                )}

                {aprovacaoAtual?.status === 'rejeitada' && (
                  <p className="text-xs text-bloqueado mt-2">
                    Rejeitada por <b>{aprovacaoAtual.decididoPor?.nome ?? 'gestor'}</b>
                    {aprovacaoAtual.comentario ? `: ${aprovacaoAtual.comentario}` : '.'}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-3">
                  {(!aprovacaoAtual || aprovacaoAtual.status === 'rejeitada') && (
                    <button
                      type="button"
                      onClick={() => executar(() => api.aprovacoes.solicitar(atividadeId))}
                      className="btn btn-primary btn-sm"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Solicitar aprovação
                    </button>
                  )}

                  {aprovacaoAtual?.status === 'pendente' && usuario?.nivelAcesso === 'gestor' && (
                    <>
                      <button
                        type="button"
                        onClick={() => decidirAprovacao('aprovada')}
                        className="btn btn-primary btn-sm"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Aprovar
                      </button>
                      <button
                        type="button"
                        onClick={() => decidirAprovacao('rejeitada')}
                        className="btn btn-danger btn-sm"
                      >
                        <ShieldX className="w-3.5 h-3.5" /> Rejeitar
                      </button>
                    </>
                  )}

                  {aprovacaoAtual?.status === 'pendente' && usuario?.nivelAcesso !== 'gestor' && (
                    <p className="text-xs text-content-subtle">Aguardando decisão de um gestor.</p>
                  )}
                </div>
              </div>
            )}

            {/* Edição auditada */}
            <div className="card p-4 mb-4">
              <h3 className="text-sm font-semibold text-content mb-2">Editar (gera auditoria)</h3>
              <div className="space-y-2">
                <input
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  className="input"
                  placeholder="Título"
                />
                <textarea
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  className="input"
                  rows={2}
                  placeholder="Descrição"
                />
                <div className="flex flex-wrap gap-2">
                  <select
                    value={form.prioridade}
                    onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))}
                    className="input !w-auto"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                  <input
                    type="date"
                    value={form.prazoEstimado}
                    onChange={e => setForm(f => ({ ...f, prazoEstimado: e.target.value }))}
                    className="input !w-auto"
                  />
                  <select
                    value={ativ.status}
                    onChange={e => executar(() => api.atividades.updateStatus(ativ.id, e.target.value))}
                    className="input !w-auto ml-auto"
                  >
                    {STATUS_ORDEM.map(k => (
                      <option key={k} value={k}>{STATUS[k].label}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={salvarEdicao}
                  disabled={salvando}
                  className="btn btn-secondary"
                >
                  Salvar alterações
                </button>
              </div>
            </div>

            {/* Trilha de movimentações (autores) */}
            {ativ.movimentacoes && ativ.movimentacoes.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-content mb-2">Movimentações entre equipes</h3>
                <ul className="space-y-1 text-sm">
                  {ativ.movimentacoes.map(m => (
                    <li key={m.id} className="text-content-muted">
                      <b className="text-content">{m.movidoPor?.nome}</b>{' '}
                      {m.tipo === 'criacao'
                        ? `criou na etapa ${m.etapaDestino?.nome}`
                        : m.tipo === 'avanco'
                          ? `moveu ${m.etapaOrigem?.nome} → ${m.etapaDestino?.nome}`
                          : `retornou ${m.etapaOrigem?.nome} → ${m.etapaDestino?.nome}`}
                      <span className="text-xs text-content-subtle"> · {dataHora(m.timestamp)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Auditoria de edições */}
            <div>
              <h3 className="text-sm font-semibold text-content mb-2">Histórico (auditoria imutável)</h3>
              <div className="relative pl-5">
                <div className="absolute left-1.5 top-0 bottom-0 w-px bg-border" />
                {(ativ.historico ?? []).map(h => {
                  const Icon = acaoIcons[h.acaoExecutada] || Clock
                  return (
                    <div key={h.id} className="relative mb-3 last:mb-0">
                      <div className="absolute -left-4 top-0 w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center">
                        <Icon className="w-3 h-3 text-content-muted" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-content">
                          {acaoLabels[h.acaoExecutada] || h.acaoExecutada}
                          {h.campo && <span className="text-content-muted"> · {h.campo}</span>}
                        </p>
                        {(h.valorAnterior || h.valorNovo) && (
                          <p className="text-xs text-content-muted">
                            <span className="line-through">{h.valorAnterior ?? '∅'}</span> → <b className="text-content">{h.valorNovo ?? '∅'}</b>
                          </p>
                        )}
                        <p className="text-xs text-content-subtle">{dataHora(h.timestamp)}</p>
                      </div>
                    </div>
                  )
                })}
                {(ativ.historico ?? []).length === 0 && (
                  <p className="text-sm text-content-subtle">Sem registros.</p>
                )}
              </div>
            </div>
          </>
        )}
    </Modal>
  )
}

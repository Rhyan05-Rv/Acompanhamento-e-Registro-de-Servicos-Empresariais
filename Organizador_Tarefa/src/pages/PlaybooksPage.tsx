import { useEffect, useState } from 'react'
import { BookOpen, Loader2, Play, Plus, Trash2 } from 'lucide-react'
import { api } from '../services/api'
import type { Departamento, Fluxo, Operacao, Playbook, Prioridade } from '../types'
import { useAsync } from '../hooks/useAsync'
import { useConfirm } from '../hooks/useConfirm'
import { useToast } from '../hooks/useToast'
import { PageHeader } from '../components/ui/PageHeader'
import { Spinner } from '../components/ui/Spinner'
import { Modal } from '../components/ui/Modal'
import { Field } from '../components/ui/Field'
import { PRIORIDADE } from '../theme/status'

interface ItemForm {
  titulo: string
  prioridade: Prioridade
  equipeId: string
  etapaId: string
  offsetDias: number
}

const novoItem = (): ItemForm => ({ titulo: '', prioridade: 'media', equipeId: '', etapaId: '', offsetDias: 0 })

const FREQUENCIA_LABEL: Record<string, string> = {
  diaria: 'Diária',
  semanal: 'Semanal',
  mensal: 'Mensal',
}

export function PlaybooksPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [showNovo, setShowNovo] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [executando, setExecutando] = useState<string | null>(null)
  const [equipes, setEquipes] = useState<Departamento[]>([])
  const [fluxos, setFluxos] = useState<Fluxo[]>([])
  const [form, setForm] = useState({ nome: '', descricao: '', operacaoId: '', frequencia: '' })
  const [itens, setItens] = useState<ItemForm[]>([novoItem()])

  const { data, loading, error, run } = useAsync(async () => {
    const [playbooks, operacoes] = await Promise.all([api.playbooks.list(), api.operacoes.list()])
    return { playbooks, operacoes } as { playbooks: Playbook[]; operacoes: Operacao[] }
  }, [])

  useEffect(() => {
    if (!form.operacaoId) {
      setEquipes([])
      setFluxos([])
      return
    }
    Promise.all([
      api.departamentos.list(form.operacaoId),
      api.fluxos.list(form.operacaoId),
    ])
      .then(([departamentos, fluxosOperacao]) => {
        setEquipes(departamentos)
        setFluxos(fluxosOperacao)
      })
      .catch(() => {
        setEquipes([])
        setFluxos([])
      })
  }, [form.operacaoId])

  function fecharModal() {
    setShowNovo(false)
    setForm({ nome: '', descricao: '', operacaoId: '', frequencia: '' })
    setItens([novoItem()])
    setEquipes([])
    setFluxos([])
  }

  async function criarPlaybook(e: React.FormEvent) {
    e.preventDefault()
    if (!form.operacaoId) {
      toast('Selecione a operação do playbook.', 'error')
      return
    }
    if (itens.some(item => !item.titulo.trim())) {
      toast('Preencha o título de todas as tarefas.', 'error')
      return
    }

    setSalvando(true)
    try {
      await api.playbooks.create({
        nome: form.nome,
        descricao: form.descricao || undefined,
        operacaoId: form.operacaoId,
        frequencia: form.frequencia ? (form.frequencia as 'diaria' | 'semanal' | 'mensal') : null,
        itens: itens.map(item => ({
          titulo: item.titulo.trim(),
          prioridade: item.prioridade,
          equipeId: item.etapaId ? null : item.equipeId || null,
          etapaId: item.etapaId || null,
          offsetDias: Number(item.offsetDias) || 0,
        })),
      })
      toast('Playbook criado.')
      fecharModal()
      await run()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao criar playbook', 'error')
    } finally {
      setSalvando(false)
    }
  }

  async function executarPlaybook(playbook: Playbook) {
    const ok = await confirm({
      titulo: 'Executar playbook?',
      mensagem: `${playbook.itens.length} tarefa(s) serão criadas em "${playbook.operacao?.nome ?? 'operação'}".`,
      confirmLabel: 'Executar',
    })
    if (!ok) return

    setExecutando(playbook.id)
    try {
      const resultado = await api.playbooks.executar(playbook.id)
      toast(`${resultado.criadas} tarefa(s) criada(s) com sucesso.`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao executar playbook', 'error')
    } finally {
      setExecutando(null)
    }
  }

  async function excluirPlaybook(playbook: Playbook) {
    const ok = await confirm({
      titulo: 'Excluir playbook?',
      mensagem: `"${playbook.nome}" será removido. As tarefas já criadas permanecem.`,
      confirmLabel: 'Excluir',
    })
    if (!ok) return

    try {
      await api.playbooks.remove(playbook.id)
      toast('Playbook excluído.')
      await run()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir playbook', 'error')
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader titulo="Playbooks" subtitulo="Templates de operação para criar tarefas em um clique.">
        <button type="button" onClick={() => setShowNovo(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Novo playbook
        </button>
      </PageHeader>

      {error && <p className="text-sm text-bloqueado">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (data?.playbooks.length ?? 0) === 0 ? (
        <div className="card p-10 text-center">
          <BookOpen className="w-8 h-8 text-content-subtle mx-auto mb-3" />
          <p className="text-sm text-content-subtle">
            Nenhum playbook ainda. Crie um template com as tarefas padrão da sua operação.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
          {data!.playbooks.map(playbook => (
            <div key={playbook.id} className="card p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-semibold text-content truncate">{playbook.nome}</h2>
                  <p className="text-xs text-content-subtle truncate">
                    {playbook.operacao?.nome ?? 'Sem operação'} · {playbook.itens.length} tarefa(s) ·{' '}
                    {playbook.frequencia ? FREQUENCIA_LABEL[playbook.frequencia] : 'Manual'}
                  </p>
                  {playbook.frequencia && playbook.proximaEm && (
                    <p className="text-[11px] text-content-subtle mt-0.5">
                      Próxima execução: {new Date(playbook.proximaEm).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => excluirPlaybook(playbook)}
                  className="btn btn-ghost btn-sm shrink-0 text-content-subtle hover:text-bloqueado"
                  title="Excluir playbook"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {playbook.descricao && <p className="text-sm text-content-muted mt-2 line-clamp-2">{playbook.descricao}</p>}

              <ol className="mt-3 space-y-1 flex-1">
                {playbook.itens.map(item => (
                  <li key={item.id} className="flex items-center justify-between gap-2 text-xs text-content-muted">
                    <span className="truncate">
                      <b className="text-content-muted">{item.ordem + 1}.</b> {item.titulo}
                    </span>
                    <span className="shrink-0 text-content-subtle">
                      {item.etapa
                        ? `${item.etapa.fluxo?.nome ?? 'fluxo'} · ${item.etapa.nome}`
                        : item.equipe?.nome ?? 'sem equipe'}{' '}
                      · D+{item.offsetDias}
                    </span>
                  </li>
                ))}
              </ol>

              <button
                type="button"
                onClick={() => executarPlaybook(playbook)}
                disabled={executando === playbook.id}
                className="btn btn-primary btn-sm mt-4 self-start"
              >
                {executando === playbook.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Executar playbook
              </button>
            </div>
          ))}
        </div>
      )}

      {showNovo && (
        <Modal onClose={fecharModal} title="Novo playbook" size="2xl">
          <form onSubmit={criarPlaybook} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Nome *">
                <input
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="input"
                  placeholder="Ex.: Produção de bolo padrão"
                  required
                />
              </Field>
              <Field label="Operação *">
                <select
                  value={form.operacaoId}
                  onChange={e => setForm(f => ({ ...f, operacaoId: e.target.value }))}
                  className="input"
                  required
                >
                  <option value="">Selecione...</option>
                  {(data?.operacoes ?? []).map(operacao => (
                    <option key={operacao.id} value={operacao.id}>{operacao.nome}</option>
                  ))}
                </select>
              </Field>
              <Field label="Recorrência">
                <select
                  value={form.frequencia}
                  onChange={e => setForm(f => ({ ...f, frequencia: e.target.value }))}
                  className="input"
                >
                  <option value="">Manual</option>
                  <option value="diaria">Diária</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensal">Mensal</option>
                </select>
              </Field>
            </div>

            <Field label="Descrição">
              <input
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                className="input"
                placeholder="Opcional"
              />
            </Field>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-content-muted">Tarefas do playbook</p>
                <button
                  type="button"
                  onClick={() => setItens(prev => [...prev, novoItem()])}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar tarefa
                </button>
              </div>

              {itens.map((item, indice) => (
                <div key={indice} className="rounded-lg border border-border bg-surface-muted/60 p-2 space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={item.titulo}
                      onChange={e => setItens(prev => prev.map((i, idx) => (idx === indice ? { ...i, titulo: e.target.value } : i)))}
                      className="input flex-1"
                      placeholder={`Tarefa ${indice + 1}`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setItens(prev => prev.filter((_, idx) => idx !== indice))}
                      disabled={itens.length === 1}
                      className="btn btn-ghost btn-sm shrink-0 text-content-subtle hover:text-bloqueado"
                      title="Remover tarefa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <select
                      value={item.prioridade}
                      onChange={e => setItens(prev => prev.map((i, idx) => (idx === indice ? { ...i, prioridade: e.target.value as Prioridade } : i)))}
                      className="input !py-1.5 text-xs"
                      aria-label="Prioridade"
                    >
                      {Object.entries(PRIORIDADE).map(([chave, meta]) => (
                        <option key={chave} value={chave}>{meta.label}</option>
                      ))}
                    </select>
                    <select
                      value={item.etapaId}
                      onChange={e => setItens(prev => prev.map((i, idx) => (idx === indice ? { ...i, etapaId: e.target.value } : i)))}
                      className="input !py-1.5 text-xs"
                      aria-label="Etapa do fluxo"
                    >
                      <option value="">Sem etapa</option>
                      {fluxos.map(fluxo => (
                        <optgroup key={fluxo.id} label={fluxo.nome}>
                          {fluxo.etapas.map(etapa => (
                            <option key={etapa.id} value={etapa.id}>
                              {etapa.ordem}. {etapa.nome} · {etapa.equipe?.nome}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <select
                      value={item.equipeId}
                      onChange={e => setItens(prev => prev.map((i, idx) => (idx === indice ? { ...i, equipeId: e.target.value } : i)))}
                      className="input !py-1.5 text-xs"
                      aria-label="Equipe"
                      disabled={!!item.etapaId}
                      title={item.etapaId ? 'A equipe vem da etapa do fluxo' : undefined}
                    >
                      <option value="">Equipe (opcional)</option>
                      {equipes.map(equipe => (
                        <option key={equipe.id} value={equipe.id}>{equipe.nome}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 text-xs text-content-muted">
                      Prazo D+
                      <input
                        type="number"
                        min={0}
                        max={365}
                        value={item.offsetDias}
                        onChange={e => setItens(prev => prev.map((i, idx) => (idx === indice ? { ...i, offsetDias: Number(e.target.value) } : i)))}
                        className="input !py-1.5 text-xs"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={fecharModal} className="btn btn-secondary">Cancelar</button>
              <button type="submit" disabled={salvando} className="btn btn-primary">
                {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
                Criar playbook
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

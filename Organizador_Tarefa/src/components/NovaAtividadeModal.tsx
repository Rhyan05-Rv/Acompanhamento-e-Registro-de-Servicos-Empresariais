import { useState, useEffect } from 'react'
import { api } from '../services/api'
import type { Fluxo, Usuario } from '../types'
import { Modal } from './ui/Modal'
import { Field } from './ui/Field'
import { Spinner } from './ui/Spinner'

interface Props {
  onClose: () => void
  onCreated: () => void
  operacaoId?: string
}

export function NovaAtividadeModal({ onClose, onCreated, operacaoId }: Props) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [fluxos, setFluxos] = useState<Fluxo[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState<{
    titulo: string
    descricao: string
    prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
    prazoEstimado: string
    fluxoId: string
    etapaAtualId: string
    responsavelId: string
  }>({
    titulo: '',
    descricao: '',
    prioridade: 'media',
    prazoEstimado: '',
    fluxoId: '',
    etapaAtualId: '',
    responsavelId: '',
  })

  useEffect(() => {
    api.usuarios.list().then(setUsuarios)
    api.fluxos.list(operacaoId).then(setFluxos)
  }, [operacaoId])

  const fluxo = fluxos.find(f => f.id === form.fluxoId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      await api.atividades.create({
        titulo: form.titulo,
        descricao: form.descricao,
        prioridade: form.prioridade,
        prazoEstimado: form.prazoEstimado ? new Date(form.prazoEstimado).toISOString() : undefined,
        operacaoId,
        fluxoId: form.fluxoId || undefined,
        etapaAtualId: form.etapaAtualId || undefined,
        responsavelId: form.fluxoId ? undefined : form.responsavelId || undefined,
      })
      onCreated()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar atividade')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Nova Atividade">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Título *">
          <input
            type="text"
            value={form.titulo}
            onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
            className="input"
            required
          />
        </Field>

        <Field label="Descrição">
          <textarea
            value={form.descricao}
            onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
            className="input"
            rows={3}
          />
        </Field>

        <Field label="Fluxo (grade)">
          <select
            value={form.fluxoId}
            onChange={e => setForm(f => ({ ...f, fluxoId: e.target.value, etapaAtualId: '', responsavelId: '' }))}
            className="input"
          >
            <option value="">Sem fluxo (tarefa avulsa)</option>
            {fluxos.map(f => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
        </Field>

        {fluxo && (
          <div>
            <Field label="Etapa inicial *">
              <select
                value={form.etapaAtualId}
                onChange={e => setForm(f => ({ ...f, etapaAtualId: e.target.value }))}
                className="input"
                required
              >
                <option value="">Selecione...</option>
                {fluxo.etapas.map(et => (
                  <option key={et.id} value={et.id}>
                    {et.ordem}. {et.nome} ({et.equipe?.nome})
                  </option>
                ))}
              </select>
            </Field>
            <p className="text-xs text-content-subtle mt-1">O responsável é atribuído automaticamente pela equipe da etapa.</p>
          </div>
        )}

        {!fluxo && (
          <Field label="Responsável *">
            <select
              value={form.responsavelId}
              onChange={e => setForm(f => ({ ...f, responsavelId: e.target.value }))}
              className="input"
              required
            >
              <option value="">Selecione...</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>
                  {u.nome}{u.membros?.[0]?.departamento ? ` — ${u.membros[0].departamento.nome}` : ''}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Prioridade">
            <select
              value={form.prioridade}
              onChange={e => setForm(f => ({ ...f, prioridade: e.target.value as typeof f.prioridade }))}
              className="input"
            >
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </Field>
          <Field label="Prazo">
            <input
              type="date"
              value={form.prazoEstimado}
              onChange={e => setForm(f => ({ ...f, prazoEstimado: e.target.value }))}
              className="input"
            />
          </Field>
        </div>

        {erro && <p className="text-sm text-bloqueado bg-bloqueado-soft rounded-lg px-3 py-2">{erro}</p>}

        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading && <Spinner className="w-4 h-4 !border-2 !border-current" />}
            Criar
          </button>
        </div>
      </form>
    </Modal>
  )
}

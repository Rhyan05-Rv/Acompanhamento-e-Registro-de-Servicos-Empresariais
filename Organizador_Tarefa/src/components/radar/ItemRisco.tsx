import { useState } from 'react'
import { CalendarClock, Loader2, MoonStar, UserRoundCheck } from 'lucide-react'
import { api } from '../../services/api'
import { useConfirm } from '../../hooks/useConfirm'
import { useToast } from '../../hooks/useToast'
import { Modal } from '../ui/Modal'
import { PRIORIDADE } from '../../theme/status'
import type { ItemRadar, Prioridade } from '../../types'
import { formatarHoras } from '../torre/utils'

const SEVERIDADE = {
  critico: { label: 'Crítico', classe: 'bg-bloqueado-soft text-bloqueado border-l-bloqueado' },
  alto: { label: 'Alto', classe: 'bg-prio-alta-soft text-prio-alta border-l-prio-alta' },
  medio: { label: 'Médio', classe: 'bg-pendente-soft text-pendente border-l-pendente' },
  baixo: { label: 'Baixo', classe: 'bg-surface-muted text-content-muted border-l-border' },
}

export function ItemRisco({
  item,
  onChanged,
  onAbrir,
  onSonecar,
}: {
  item: ItemRadar
  onChanged: () => void
  onAbrir: (id: string) => void
  onSonecar: (id: string) => void
}) {
  const confirm = useConfirm()
  const toast = useToast()
  const [salvando, setSalvando] = useState(false)
  const [reagendando, setReagendando] = useState(false)
  const [dataPrazo, setDataPrazo] = useState(
    item.prazoEstimado ? new Date(item.prazoEstimado).toISOString().slice(0, 10) : ''
  )

  const severidade = SEVERIDADE[item.nivel]
  const prazoVencido = item.prazoEstimado ? new Date(item.prazoEstimado) < new Date() : false

  async function aplicarSugestao() {
    if (!item.sugestao) return

    const ok = await confirm({
      titulo: 'Reatribuir tarefa?',
      mensagem: `"${item.titulo}" passará de ${item.responsavel} para ${item.sugestao.nome} (${item.sugestao.cargaSugerida} tarefas abertas).`,
      confirmLabel: 'Reatribuir',
    })
    if (!ok) return

    setSalvando(true)
    try {
      await api.atividades.edit(item.id, { responsavelId: item.sugestao.usuarioId })
      toast('Responsável atualizado.')
      onChanged()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao reatribuir', 'error')
    } finally {
      setSalvando(false)
    }
  }

  async function mudarPrioridade(prioridade: Prioridade) {
    setSalvando(true)
    try {
      await api.atividades.edit(item.id, { prioridade })
      toast('Prioridade atualizada.')
      onChanged()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao priorizar', 'error')
    } finally {
      setSalvando(false)
    }
  }

  async function salvarPrazo() {
    if (!dataPrazo) return
    setSalvando(true)
    try {
      await api.atividades.edit(item.id, {
        prazoEstimado: new Date(`${dataPrazo}T12:00:00`).toISOString(),
      })
      toast('Prazo atualizado.')
      setReagendando(false)
      onChanged()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao reagendar', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <article className={`card p-4 border-l-4 ${severidade.classe.split(' ').filter(c => c.startsWith('border-l-')).join(' ')}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge ${severidade.classe.replace(/border-l-\S+/g, '').trim()}`}>{severidade.label}</span>
              <button
                type="button"
                onClick={() => onAbrir(item.id)}
                className="font-semibold text-sm text-content hover:text-primary transition-colors truncate text-left"
              >
                {item.titulo}
              </button>
            </div>
            <p className="text-xs text-content-subtle mt-1 truncate">
              {item.operacao}
              {item.fluxo ? ` · ${item.fluxo}` : ''}
              {item.etapa ? ` · ${item.etapa}` : ''}
              {item.equipe ? ` · ${item.equipe}` : ''}
            </p>
          </div>

          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-content tabular-nums">{item.score}</p>
            <p className="text-[11px] text-content-subtle">score de risco</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {item.motivos.map(motivo => (
            <span key={motivo} className="text-[11px] px-2 py-0.5 rounded-full bg-surface-muted border border-border text-content-muted">
              {motivo}
            </span>
          ))}
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-muted border border-border text-content-muted">
            {formatarHoras(item.horasNaEtapa)} na etapa
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
          <p className="text-xs text-content-muted">
            <b className="text-content">{item.responsavel}</b>
            {' · '}
            <span className={prazoVencido ? 'text-bloqueado font-medium' : ''}>
              {item.prazoEstimado
                ? `prazo ${new Date(item.prazoEstimado).toLocaleDateString('pt-BR')}`
                : 'sem prazo'}
            </span>
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            {item.sugestao && (
              <button
                type="button"
                onClick={aplicarSugestao}
                disabled={salvando}
                className="btn btn-primary btn-sm"
                title={`Carga atual ${item.sugestao.cargaAtual} → ${item.sugestao.cargaSugerida}`}
              >
                {salvando ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserRoundCheck className="w-3 h-3" />}
                Reatribuir para {item.sugestao.nome.split(' ')[0]}
              </button>
            )}

            <select
              value={item.prioridade}
              onChange={e => mudarPrioridade(e.target.value as Prioridade)}
              disabled={salvando}
              className="input !w-auto !py-1 text-xs"
              aria-label="Prioridade"
            >
              {Object.entries(PRIORIDADE).map(([chave, meta]) => (
                <option key={chave} value={chave}>{meta.label}</option>
              ))}
            </select>

            <button type="button" onClick={() => setReagendando(true)} className="btn btn-secondary btn-sm">
              <CalendarClock className="w-3 h-3" /> Prazo
            </button>

            <button
              type="button"
              onClick={() => onSonecar(item.id)}
              className="btn btn-ghost btn-sm"
              title="Dispensar por hoje"
            >
              <MoonStar className="w-3 h-3" /> Dispensar
            </button>
          </div>
        </div>
      </article>

      {reagendando && (
        <Modal onClose={() => setReagendando(false)} title="Reagendar tarefa" size="sm">
          <p className="text-sm text-content-muted mb-3">{item.titulo}</p>
          <input
            type="date"
            value={dataPrazo}
            onChange={e => setDataPrazo(e.target.value)}
            className="input mb-4"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setReagendando(false)} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="button" onClick={salvarPrazo} disabled={salvando || !dataPrazo} className="btn btn-primary">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Salvar prazo
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

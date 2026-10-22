import { useState } from 'react'
import { CheckCircle2, Clock3, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import type { AprovacaoPendente } from '../types'
import { api } from '../services/api'
import { useAsync } from '../hooks/useAsync'
import { useToast } from '../hooks/useToast'
import { PageHeader } from '../components/ui/PageHeader'
import { Spinner } from '../components/ui/Spinner'
import { AtividadeDetalhe } from '../components/AtividadeDetalhe'

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR')

export function AprovacoesPage() {
  const toast = useToast()
  const [processando, setProcessando] = useState<string | null>(null)
  const [atividadeAberta, setAtividadeAberta] = useState<string | null>(null)
  const { data, loading, error, run } = useAsync(() => api.aprovacoes.pendentes(), [])

  async function decidir(aprovacao: AprovacaoPendente, decisao: 'aprovada' | 'rejeitada') {
    let comentario: string | undefined
    if (decisao === 'rejeitada') {
      const motivo = window.prompt('Motivo da rejeição (opcional)')
      if (motivo === null) return
      comentario = motivo || undefined
    } else if (!window.confirm(`Aprovar "${aprovacao.atividade?.titulo ?? 'atividade'}"?`)) {
      return
    }

    setProcessando(aprovacao.id)
    try {
      await api.aprovacoes.decidir(aprovacao.id, decisao, comentario)
      toast(decisao === 'aprovada' ? 'Etapa aprovada.' : 'Etapa rejeitada.')
      await run()
      window.dispatchEvent(new Event('aprovacoes-change'))
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao decidir aprovação', 'error')
    } finally {
      setProcessando(null)
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1100px]">
      <PageHeader
        titulo="Aprovações"
        subtitulo="Etapas aguardando decisão de gestor."
      >
        <span className="badge bg-pendente-soft text-pendente">
          {data?.length ?? 0} pendente(s)
        </span>
      </PageHeader>

      {error && <p className="text-sm text-bloqueado">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="card p-10 text-center">
          <ShieldCheck className="w-8 h-8 text-content-subtle mx-auto mb-3" />
          <p className="text-sm text-content-subtle">Nenhuma aprovação pendente.</p>
        </div>
      ) : (
        <div className="space-y-3 stagger">
          {data!.map(aprovacao => (
            <article key={aprovacao.id} className="card p-4 border-l-4 border-l-pendente">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setAtividadeAberta(aprovacao.atividadeId)}
                    className="font-semibold text-sm text-content hover:text-primary transition-colors truncate text-left"
                  >
                    {aprovacao.atividade?.titulo ?? 'Atividade'}
                  </button>
                  <p className="text-xs text-content-subtle mt-1">
                    {aprovacao.atividade?.operacao?.nome ?? ''}
                    {' · '}
                    {aprovacao.etapa?.ordem}. {aprovacao.etapa?.nome ?? 'etapa'}
                    {aprovacao.atividade?.responsavel ? ` · ${aprovacao.atividade.responsavel.nome}` : ''}
                  </p>
                  <p className="text-xs text-content-subtle mt-1">
                    Solicitado por <b className="text-content-muted">{aprovacao.solicitadoPor?.nome ?? '-'}</b>
                    {' em '}{dataHora(aprovacao.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => decidir(aprovacao, 'aprovada')}
                    disabled={processando === aprovacao.id}
                    className="btn btn-primary btn-sm"
                  >
                    {processando === aprovacao.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Aprovar
                  </button>
                  <button
                    type="button"
                    onClick={() => decidir(aprovacao, 'rejeitada')}
                    disabled={processando === aprovacao.id}
                    className="btn btn-danger btn-sm"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Rejeitar
                  </button>
                </div>
              </div>

              <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-pendente">
                <Clock3 className="w-3 h-3" /> Aguardando decisão
              </p>
            </article>
          ))}
        </div>
      )}

      {atividadeAberta && (
        <AtividadeDetalhe
          atividadeId={atividadeAberta}
          onClose={() => setAtividadeAberta(null)}
          onChanged={() => {
            run()
            window.dispatchEvent(new Event('aprovacoes-change'))
          }}
        />
      )}
    </div>
  )
}

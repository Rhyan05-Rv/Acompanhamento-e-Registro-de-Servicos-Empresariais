import { useEffect, useState } from 'react'
import { Loader2, RefreshCw, RotateCcw } from 'lucide-react'
import { api } from '../services/api'
import type { Operacao, RadarResponse, ResumoIARadar, ResumoRadar } from '../types'
import { useAsync } from '../hooks/useAsync'
import { useToast } from '../hooks/useToast'
import { PageHeader } from '../components/ui/PageHeader'
import { Spinner } from '../components/ui/Spinner'
import { AtividadeDetalhe } from '../components/AtividadeDetalhe'
import { ResumoCard } from '../components/radar/ResumoCard'
import { ItemRisco } from '../components/radar/ItemRisco'

const CHAVE_SONECA = 'radar:soneca'

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

function carregarSoneca(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_SONECA) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

export function RadarPage() {
  const toast = useToast()
  const [operacaoId, setOperacaoId] = useState('')
  const [soneca, setSoneca] = useState<Record<string, string>>(carregarSoneca)
  const [analiseIA, setAnaliseIA] = useState<ResumoIARadar | null>(null)
  const [gerandoIA, setGerandoIA] = useState(false)
  const [atividadeAberta, setAtividadeAberta] = useState<string | null>(null)

  const { data, loading, error, run } = useAsync(async () => {
    const [radar, resumo, operacoes] = await Promise.all([
      api.insights.risco(operacaoId || undefined, 50),
      api.insights.resumo(operacaoId || undefined),
      api.operacoes.list(),
    ])
    return { radar, resumo, operacoes } as {
      radar: RadarResponse
      resumo: ResumoRadar
      operacoes: Operacao[]
    }
  }, [operacaoId])

  useEffect(() => {
    localStorage.setItem(CHAVE_SONECA, JSON.stringify(soneca))
  }, [soneca])

  const hoje = hojeISO()
  const itens = (data?.radar.itens ?? []).filter(item => soneca[item.id] !== hoje)
  const dispensados = Object.values(soneca).filter(data => data === hoje).length

  function sonecar(id: string) {
    setSoneca(prev => ({ ...prev, [id]: hoje }))
    toast('Item dispensado por hoje.')
  }

  function restaurarDispensados() {
    setSoneca(prev =>
      Object.fromEntries(Object.entries(prev).filter(([, data]) => data !== hoje))
    )
  }

  async function gerarIA() {
    setGerandoIA(true)
    try {
      const resultado = await api.insights.resumoIA(operacaoId || undefined)
      setAnaliseIA(resultado)
      if (resultado.fonte === 'ia') toast('Análise gerada com IA.')
      else toast('IA indisponível; resumo por regras exibido.', 'info')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao gerar análise', 'error')
    } finally {
      setGerandoIA(false)
    }
  }

  function trocarOperacao(valor: string) {
    setOperacaoId(valor)
    setAnaliseIA(null)
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1200px]">
      <PageHeader titulo="Radar Operacional" subtitulo="O que exige atenção hoje, por que e o que fazer.">
        <select
          value={operacaoId}
          onChange={e => trocarOperacao(e.target.value)}
          className="input !w-auto"
          aria-label="Filtrar por operação"
        >
          <option value="">Todas as operações</option>
          {(data?.operacoes ?? []).map(operacao => (
            <option key={operacao.id} value={operacao.id}>{operacao.nome}</option>
          ))}
        </select>
        <button type="button" onClick={run} className="btn btn-secondary" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Atualizar
        </button>
      </PageHeader>

      {error && (
        <div className="card p-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-bloqueado">{error}</p>
          <button type="button" className="btn btn-secondary" onClick={run}>Tentar novamente</button>
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : data ? (
        <>
          <ResumoCard
            resumo={data.resumo}
            analiseIA={analiseIA}
            gerandoIA={gerandoIA}
            onGerarIA={gerarIA}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-sm text-content">
              Fila de atenção {itens.length > 0 ? `(${itens.length})` : ''}
            </h2>
            {dispensados > 0 && (
              <button
                type="button"
                onClick={restaurarDispensados}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <RotateCcw className="w-3 h-3" /> Restaurar {dispensados} dispensado(s) hoje
              </button>
            )}
          </div>

          {itens.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-sm text-content-subtle">
                Nenhuma tarefa em risco no momento. O fluxo está sob controle.
              </p>
            </div>
          ) : (
            <div className="space-y-3 stagger">
              {itens.map(item => (
                <ItemRisco
                  key={item.id}
                  item={item}
                  onChanged={run}
                  onAbrir={setAtividadeAberta}
                  onSonecar={sonecar}
                />
              ))}
            </div>
          )}
        </>
      ) : null}

      {atividadeAberta && (
        <AtividadeDetalhe
          atividadeId={atividadeAberta}
          onClose={() => setAtividadeAberta(null)}
          onChanged={run}
        />
      )}
    </div>
  )
}

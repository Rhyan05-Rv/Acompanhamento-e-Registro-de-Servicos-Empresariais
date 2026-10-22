import { useState } from 'react'
import { api } from '../services/api'
import type { Atividade } from '../types'
import { ListChecks, Target, Timer, RotateCcw } from 'lucide-react'
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { useTheme } from '../hooks/useTheme'
import { useAsync } from '../hooks/useAsync'
import { chartColors } from '../theme/chart'
import { STATUS, STATUS_ORDEM, PRIORIDADE } from '../theme/status'
import { PageHeader } from '../components/ui/PageHeader'
import { Spinner } from '../components/ui/Spinner'
import { TorreControle } from '../components/torre/TorreControle'
import { RadarWidget } from '../components/radar/RadarWidget'

type Aba = 'geral' | 'andamento'

const POR_PAGINA = 20

function paginasVisiveis(atual: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const paginas: (number | '...')[] = [1]
  const inicio = Math.max(2, atual - 1)
  const fim = Math.min(total - 1, atual + 1)

  if (inicio > 2) paginas.push('...')
  for (let i = inicio; i <= fim; i++) paginas.push(i)
  if (fim < total - 1) paginas.push('...')
  paginas.push(total)

  return paginas
}

export function DashboardPage({ operacaoId }: { operacaoId?: string } = {}) {
  const { tema } = useTheme()
  const c = chartColors(tema)
  const [aba, setAba] = useState<Aba>('geral')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [periodo, setPeriodo] = useState('')
  const [pagina, setPagina] = useState(1)

  const { data, loading, error, run } = useAsync(async () => {
    const [atvs, met] = await Promise.all([
      api.atividades.list({ ...(filtroStatus ? { status: filtroStatus } : {}), operacaoId, ...(periodo ? { periodo } : {}) }),
      api.metricas.get(periodo || undefined, operacaoId),
    ])
    return { atividades: atvs, metricas: met }
  }, [filtroStatus, periodo, operacaoId])

  const atividades = data?.atividades ?? []
  const metricas = data?.metricas ?? null

  const totalPaginas = Math.max(1, Math.ceil(atividades.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const inicioPagina = (paginaAtual - 1) * POR_PAGINA
  const atividadesPagina = atividades.slice(inicioPagina, inicioPagina + POR_PAGINA)

  async function mudarStatus(id: string, novoStatus: string) {
    await api.atividades.updateStatus(id, novoStatus)
    await run()
  }

  const kpis = [
    {
      label: 'Total de tarefas',
      valor: metricas?.totalAtividades || 0,
      icon: ListChecks,
      cor: 'text-primary bg-primary-soft',
    },
    {
      label: 'Aderência a prazos',
      valor: `${metricas?.aderenciaPrazos || 0}%`,
      icon: Target,
      cor: 'text-concluido bg-concluido-soft',
    },
    {
      label: 'TMA médio',
      valor: `${metricas?.tmaMedio || 0}d`,
      icon: Timer,
      cor: 'text-execucao bg-execucao-soft',
    },
    {
      label: 'Retrabalho',
      valor: metricas?.retrabalho || 0,
      icon: RotateCcw,
      cor: 'text-prio-alta bg-prio-alta-soft',
    },
  ]

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader titulo="Dashboard" subtitulo="Visão consolidada das operações e do fluxo de trabalho.">
        {['', 'dia', 'semana', 'mes'].map(p => (
          <button
            key={p}
            onClick={() => {
              setPeriodo(p)
              setPagina(1)
            }}
            className={`pill ${periodo === p ? 'pill-active' : ''}`}
          >
            {p === '' ? 'Geral' : p === 'dia' ? 'Hoje' : p === 'semana' ? 'Semana' : 'Mês'}
          </button>
        ))}
      </PageHeader>

      {error && <p className="text-sm text-bloqueado">{error}</p>}

      {/* Abas */}
      <div className="flex gap-1 border-b border-border">
        {(['geral', 'andamento'] as Aba[]).map(t => (
          <button
            key={t}
            onClick={() => setAba(t)}
            className={`tab ${aba === t ? 'tab-active' : ''}`}
          >
            {t === 'geral' ? 'Visão Geral' : 'Torre de Controle'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : aba === 'geral' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger">
            {kpis.map(k => (
              <div key={k.label} className="card p-5">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-content-muted">{k.label}</p>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${k.cor}`}>
                    <k.icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-content mt-3 tracking-tight tabular-nums">{k.valor}</p>
              </div>
            ))}
          </div>

          <RadarWidget operacaoId={operacaoId} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stagger">
            <div className="card p-5">
              <h3 className="font-semibold text-sm text-content mb-4">Distribuição por Status</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={metricas?.porStatus.map(s => ({ ...s, name: STATUS[s.status as Atividade['status']]?.label || s.status })) || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={2}
                    dataKey="count"
                    stroke="none"
                  >
                    {metricas?.porStatus.map(s => (
                      <Cell key={s.status} fill={STATUS[s.status as Atividade['status']].chart} />
                    ))}
                  </Pie>
                  <Tooltip {...c.tooltip} />
                  <Legend wrapperStyle={{ fontSize: 12, color: c.muted }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-sm text-content mb-4">Carga por Responsável</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={metricas?.carga || []}>
                  <XAxis dataKey="responsavel" tick={c.tick} axisLine={{ stroke: c.border }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={c.tick} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: c.border, opacity: 0.3 }} {...c.tooltip} />
                  <Bar dataKey="quantidade" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-sm text-content mb-4">Carga por Equipe</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={metricas?.cargaPorEquipe || []}>
                  <XAxis dataKey="equipe" tick={c.tick} axisLine={{ stroke: c.border }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={c.tick} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: c.border, opacity: 0.3 }} {...c.tooltip} />
                  <Bar dataKey="quantidade" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-sm text-content mb-4">Distribuição por Prioridade</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={metricas?.porPrioridade.map(p => ({ ...p, name: PRIORIDADE[p.prioridade as Atividade['prioridade']]?.label || p.prioridade })) || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={2}
                    dataKey="count"
                    stroke="none"
                  >
                    {metricas?.porPrioridade.map(p => (
                      <Cell key={p.prioridade} fill={PRIORIDADE[p.prioridade as Atividade['prioridade']].chart} />
                    ))}
                  </Pie>
                  <Tooltip {...c.tooltip} />
                  <Legend wrapperStyle={{ fontSize: 12, color: c.muted }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setFiltroStatus('')
                setPagina(1)
              }}
              className={`pill ${!filtroStatus ? 'pill-active' : ''}`}
            >
              Todas
            </button>
            {STATUS_ORDEM.map(key => (
              <button
                key={key}
                onClick={() => {
                  setFiltroStatus(key)
                  setPagina(1)
                }}
                className={`pill ${filtroStatus === key ? 'pill-active' : ''}`}
              >
                {STATUS[key].label}
              </button>
            ))}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Responsável</th>
                  <th>Equipe</th>
                  <th>Etapa</th>
                  <th>Status</th>
                  <th>Prazo</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {atividadesPagina.map(ativ => (
                  <tr key={ativ.id}>
                    <td>
                      <p className="font-medium text-content">{ativ.titulo}</p>
                      {ativ.descricao && <p className="text-sm text-content-muted truncate max-w-xs">{ativ.descricao}</p>}
                    </td>
                    <td className="text-content-muted">{ativ.responsavel.nome}</td>
                    <td className="text-content-muted">{ativ.equipe?.nome ?? '-'}</td>
                    <td className="text-content-muted">
                      {ativ.etapaAtual ? `${ativ.etapaAtual.ordem}. ${ativ.etapaAtual.nome}` : '-'}
                    </td>
                    <td>
                      <span className={`badge ${STATUS[ativ.status].badge}`}>{STATUS[ativ.status].label}</span>
                    </td>
                    <td className="text-content-muted">
                      {ativ.prazoEstimado ? new Date(ativ.prazoEstimado).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td>
                      <select
                        value={ativ.status}
                        onChange={e => mudarStatus(ativ.id, e.target.value)}
                        className="input !py-1.5 !w-auto text-xs"
                      >
                        {STATUS_ORDEM.map(key => (
                          <option key={key} value={key}>{STATUS[key].label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {atividades.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-content-subtle py-8">Nenhuma tarefa encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {atividades.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-content-muted">
                Mostrando{' '}
                <b className="text-content">
                  {inicioPagina + 1}–{Math.min(inicioPagina + POR_PAGINA, atividades.length)}
                </b>{' '}
                de <b className="text-content">{atividades.length}</b> tarefas
              </p>

              {totalPaginas > 1 && (
                <nav aria-label="Paginação de tarefas" className="flex items-center gap-1">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    disabled={paginaAtual === 1}
                    onClick={() => setPagina(paginaAtual - 1)}
                  >
                    Anterior
                  </button>

                  {paginasVisiveis(paginaAtual, totalPaginas).map((p, i) =>
                    p === '...' ? (
                      <span key={`gap-${i}`} className="px-1 text-content-subtle">…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        aria-current={p === paginaAtual ? 'page' : undefined}
                        onClick={() => setPagina(p)}
                        className={`btn btn-sm min-w-9 ${p === paginaAtual ? 'btn-primary' : 'btn-secondary'}`}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    disabled={paginaAtual === totalPaginas}
                    onClick={() => setPagina(paginaAtual + 1)}
                  >
                    Próxima
                  </button>
                </nav>
              )}
            </div>
          )}
        </>
      ) : (
        <TorreControle operacaoId={operacaoId} periodo={periodo} />
      )}
    </div>
  )
}

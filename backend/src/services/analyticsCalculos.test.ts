import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  agruparSerie,
  entradaNaEtapa,
  horasNaEtapa,
  ranquearGargalos,
  resumirEtapas,
  type AtividadeAnalitica,
  type FluxoResumo,
  type MovimentacaoAnalitica,
} from './analyticsCalculos.js'

const agora = new Date(2026, 9, 21, 12, 0)

const atividade = (over: Partial<AtividadeAnalitica> = {}): AtividadeAnalitica => ({
  id: 'a1',
  titulo: 'Tarefa',
  status: 'em_execucao',
  createdAt: new Date(2026, 9, 21, 2, 0),
  dataInicio: null,
  dataConclusao: null,
  prazoEstimado: null,
  etapaAtualId: 'et2',
  ...over,
})

const mov = (timestamp: Date, etapaDestinoId = 'et2'): MovimentacaoAnalitica => ({
  atividadeId: 'a1',
  etapaDestinoId,
  timestamp,
})

test('usa a última movimentação para a etapa atual', () => {
  const movs = [mov(new Date(2026, 9, 20, 8, 0), 'et1'), mov(new Date(2026, 9, 21, 2, 0))]
  assert.equal(entradaNaEtapa(atividade(), movs).getHours(), 2)
  assert.equal(horasNaEtapa(atividade(), movs, agora), 10)
})

test('sem movimentação cai para dataInicio e depois createdAt', () => {
  const comInicio = atividade({ dataInicio: new Date(2026, 9, 21, 6, 0) })
  assert.equal(horasNaEtapa(comInicio, [], agora), 6)
  assert.equal(horasNaEtapa(atividade(), [], agora), 10)
})

test('resume WIP, concluídas, bloqueadas e tempo médio por etapa', () => {
  const etapas = [{ id: 'et2', nome: 'Forno', ordem: 1, equipe: { id: 'e1', nome: 'Forno' } }]
  const atividades = [
    atividade({ id: 'a1', createdAt: new Date(2026, 9, 21, 2, 0) }),
    atividade({ id: 'a2', createdAt: new Date(2026, 9, 21, 8, 0) }),
    atividade({ id: 'a3', status: 'concluido', createdAt: new Date(2026, 9, 20, 8, 0) }),
    atividade({ id: 'a4', status: 'bloqueado', createdAt: new Date(2026, 9, 21, 9, 0) }),
  ]

  const [resumo] = resumirEtapas(etapas, atividades, [], agora)
  assert.equal(resumo.wip, 3)
  assert.equal(resumo.concluidas, 1)
  assert.equal(resumo.bloqueadas, 1)
  assert.equal(resumo.tempoMedioHoras, 5.7)
  assert.equal(resumo.tempoMaxHoras, 10)
  assert.equal(resumo.porEquipe[0].wip, 3)
})

test('ranqueia gargalos por tempo médio e desempata por WIP', () => {
  const fluxo = (id: string, tempos: number[]): FluxoResumo => ({
    fluxoId: id,
    fluxo: `Fluxo ${id}`,
    operacaoId: 'op1',
    operacao: 'Operação',
    total: 0,
    concluidas: 0,
    progresso: 0,
    etapas: tempos.map((tempoMedioHoras, i) => ({
      etapaId: `${id}-et${i}`,
      etapa: `Etapa ${i}`,
      ordem: i + 1,
      equipe: 'Equipe',
      wip: 1,
      concluidas: 0,
      bloqueadas: 0,
      tempoMedioHoras,
      tempoMaxHoras: tempoMedioHoras,
      porEquipe: [],
    })),
  })

  const gargalos = ranquearGargalos([fluxo('a', [12, 72]), fluxo('b', [48])])
  assert.deepEqual(
    gargalos.map(g => g.tempoMedioHoras),
    [72, 48, 12]
  )
})

test('agrupa série semanal por criadas e concluídas', () => {
  const atividades = [
    atividade({ id: 'a1', createdAt: new Date(2026, 9, 21, 10, 0) }),
    atividade({
      id: 'a2',
      status: 'concluido',
      createdAt: new Date(2026, 9, 1, 10, 0),
      dataInicio: new Date(2026, 9, 18, 10, 0),
      dataConclusao: new Date(2026, 9, 19, 10, 0),
    }),
  ]

  const serie = agruparSerie(atividades, 'semana', agora)
  assert.equal(serie.pontos.length, 7)
  assert.equal(serie.totalCriadas, 1)
  assert.equal(serie.totalConcluidas, 1)
  assert.equal(serie.pontos[6].criadas, 1)
  assert.equal(serie.pontos[4].concluidas, 1)
  assert.equal(serie.leadTimeMedioDias, 1)
})

test('série diária usa 24 buckets por hora', () => {
  const serie = agruparSerie([atividade({ createdAt: new Date(2026, 9, 21, 10, 0) })], 'dia', agora)
  assert.equal(serie.pontos.length, 24)
  assert.equal(serie.pontos[10].criadas, 1)
})

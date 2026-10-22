import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  calcularRisco,
  montarResumo,
  sugerirResponsavel,
  type AtividadeRisco,
} from './insightsCalculos.js'

const agora = new Date(2026, 9, 21, 12, 0)

const base = (over: Partial<AtividadeRisco> = {}): AtividadeRisco => ({
  id: 'a1',
  titulo: 'Tarefa',
  status: 'em_execucao',
  prioridade: 'media',
  createdAt: new Date(2026, 9, 21, 10, 0),
  dataInicio: null,
  dataConclusao: null,
  prazoEstimado: null,
  etapaAtualId: 'et1',
  responsavelId: 'u1',
  ...over,
})

test('tarefa vencida, parada, bloqueada e com carga alta fica crítica', () => {
  const atividade = base({
    status: 'bloqueado',
    prioridade: 'urgente',
    prazoEstimado: new Date(2026, 9, 20, 12, 0),
    createdAt: new Date(2026, 9, 10, 12, 0),
  })

  const risco = calcularRisco(atividade, {
    agora,
    movimentacoes: [],
    cargaPorResponsavel: new Map([['u1', 9]]),
    casosAbertos: 1,
    retrabalhos: 1,
  })

  assert.equal(risco.nivel, 'critico')
  assert.equal(risco.score, 100)
  assert.ok(risco.motivos.some(m => m.includes('Prazo vencido')))
  assert.ok(risco.motivos.some(m => m.includes('Parado')))
})

test('tarefa tranquila tem risco baixo e sem motivos', () => {
  const risco = calcularRisco(base({ prioridade: 'baixa' }), {
    agora,
    movimentacoes: [],
    cargaPorResponsavel: new Map([['u1', 1]]),
    casosAbertos: 0,
    retrabalhos: 0,
  })

  assert.equal(risco.nivel, 'baixo')
  assert.equal(risco.score, 0)
  assert.deepEqual(risco.motivos, [])
})

test('sugere responsável com menor carga', () => {
  const sugestao = sugerirResponsavel(
    [
      { usuarioId: 'u1', nome: 'Atual', carga: 8, mesmaEquipe: true },
      { usuarioId: 'u2', nome: 'Colega', carga: 3, mesmaEquipe: true },
      { usuarioId: 'u3', nome: 'Outro', carga: 1, mesmaEquipe: false },
    ],
    { usuarioId: 'u1', carga: 8 }
  )

  assert.equal(sugestao?.usuarioId, 'u3')
  assert.equal(sugestao?.cargaSugerida, 1)
})

test('não sugere troca quando o atual já tem carga baixa', () => {
  const sugestao = sugerirResponsavel(
    [
      { usuarioId: 'u1', nome: 'Atual', carga: 1, mesmaEquipe: true },
      { usuarioId: 'u2', nome: 'Colega', carga: 2, mesmaEquipe: true },
    ],
    { usuarioId: 'u1', carga: 1 }
  )

  assert.equal(sugestao, null)
})

test('resumo determinístico cita contagens e gargalo', () => {
  const texto = montarResumo({
    total: 5,
    criticas: 2,
    altas: 2,
    medias: 1,
    vencidas: 3,
    bloqueadas: 1,
    sugestoes: 2,
    gargalo: { etapa: 'Forno', fluxo: 'Produção de Bolo', tempoMedioHoras: 72 },
  })

  assert.ok(texto.includes('5 tarefa'))
  assert.ok(texto.includes('2 crítica'))
  assert.ok(texto.includes('Forno'))
  assert.ok(texto.includes('2 sugestão'))
})

test('resumo vazio não inventa risco', () => {
  const texto = montarResumo({
    total: 0,
    criticas: 0,
    altas: 0,
    medias: 0,
    vencidas: 0,
    bloqueadas: 0,
    sugestoes: 0,
    gargalo: null,
  })

  assert.ok(texto.includes('Nenhuma tarefa em risco'))
})

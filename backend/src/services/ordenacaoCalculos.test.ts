import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ordenarPorPrioridade } from './ordenacaoCalculos.js'

const item = (prioridade: string, createdAt: string) => ({ prioridade, createdAt })

test('ordena urgente antes de alta, media e baixa', () => {
  const ordenado = ordenarPorPrioridade([
    item('baixa', '2026-10-01T00:00:00Z'),
    item('urgente', '2026-10-01T00:00:00Z'),
    item('media', '2026-10-01T00:00:00Z'),
    item('alta', '2026-10-01T00:00:00Z'),
  ])
  assert.deepEqual(
    ordenado.map(i => i.prioridade),
    ['urgente', 'alta', 'media', 'baixa']
  )
})

test('empate de prioridade mantém o mais recente primeiro', () => {
  const ordenado = ordenarPorPrioridade([
    item('alta', '2026-10-01T00:00:00Z'),
    item('alta', '2026-10-05T00:00:00Z'),
  ])
  assert.equal(ordenado[0].createdAt, '2026-10-05T00:00:00Z')
})

test('prioridade desconhecida vai para o fim', () => {
  const ordenado = ordenarPorPrioridade([
    item('desconhecida', '2026-10-05T00:00:00Z'),
    item('baixa', '2026-10-01T00:00:00Z'),
  ])
  assert.equal(ordenado[1].prioridade, 'desconhecida')
})

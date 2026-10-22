import assert from 'node:assert/strict'
import { test } from 'node:test'
import { proximaExecucao } from './recorrenciaCalculos.js'

const base = new Date(2026, 9, 21, 12, 0)

test('sem frequência não agenda', () => {
  assert.equal(proximaExecucao(null, base), null)
  assert.equal(proximaExecucao('invalida', base), null)
})

test('frequência diária avança um dia', () => {
  assert.equal(proximaExecucao('diaria', base)?.getDate(), 22)
})

test('frequência semanal avança sete dias', () => {
  assert.equal(proximaExecucao('semanal', base)?.getDate(), 28)
})

test('frequência mensal avança um mês', () => {
  const proxima = proximaExecucao('mensal', base)
  assert.equal(proxima?.getMonth(), 10)
  assert.equal(proxima?.getDate(), 21)
})

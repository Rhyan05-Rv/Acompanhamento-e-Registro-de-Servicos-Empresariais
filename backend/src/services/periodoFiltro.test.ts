import assert from 'node:assert/strict'
import { test } from 'node:test'
import { periodoFiltro } from './periodoFiltro.js'

const agora = new Date(2026, 9, 21, 15, 30)

test('sem período não filtra', () => {
  assert.deepEqual(periodoFiltro(undefined, agora), {})
})

test('dia começa à meia-noite do mesmo dia', () => {
  const filtro = periodoFiltro('dia', agora) as { createdAt: { gte: Date } }
  assert.equal(filtro.createdAt.gte.getFullYear(), 2026)
  assert.equal(filtro.createdAt.gte.getMonth(), 9)
  assert.equal(filtro.createdAt.gte.getDate(), 21)
  assert.equal(filtro.createdAt.gte.getHours(), 0)
})

test('semana recua sete dias', () => {
  const filtro = periodoFiltro('semana', agora) as { createdAt: { gte: Date } }
  assert.equal(filtro.createdAt.gte.getDate(), 14)
})

test('mês recua um mês', () => {
  const filtro = periodoFiltro('mes', agora) as { createdAt: { gte: Date } }
  assert.equal(filtro.createdAt.gte.getMonth(), 8)
  assert.equal(filtro.createdAt.gte.getDate(), 21)
})

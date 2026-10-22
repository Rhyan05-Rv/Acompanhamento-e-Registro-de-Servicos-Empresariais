import assert from 'node:assert/strict'
import { test } from 'node:test'
import { aprovacaoValida } from './aprovacaoCalculos.js'

const aprovada = (decididoEm: Date | null) => ({ status: 'aprovada', decididoEm })

test('sem aprovação não libera', () => {
  assert.equal(aprovacaoValida(null, null), false)
})

test('aprovação pendente ou rejeitada não libera', () => {
  assert.equal(aprovacaoValida({ status: 'pendente', decididoEm: null }, null), false)
  assert.equal(aprovacaoValida({ status: 'rejeitada', decididoEm: new Date() }, null), false)
})

test('aprovação anterior à entrada na etapa não libera', () => {
  const entrada = new Date(2026, 9, 21, 10, 0)
  const decisao = new Date(2026, 9, 20, 10, 0)
  assert.equal(aprovacaoValida(aprovada(decisao), entrada), false)
})

test('aprovação posterior à entrada na etapa libera', () => {
  const entrada = new Date(2026, 9, 21, 10, 0)
  const decisao = new Date(2026, 9, 21, 12, 0)
  assert.equal(aprovacaoValida(aprovada(decisao), entrada), true)
})

test('sem movimentação usa apenas o status aprovado', () => {
  assert.equal(aprovacaoValida(aprovada(new Date()), null), true)
})

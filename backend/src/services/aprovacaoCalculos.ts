export interface AprovacaoBase {
  status: string
  decididoEm: Date | null
}

export function aprovacaoValida(
  aprovacao: AprovacaoBase | null,
  entradaNaEtapa: Date | null
): boolean {
  if (!aprovacao || aprovacao.status !== 'aprovada' || !aprovacao.decididoEm) return false
  if (!entradaNaEtapa) return true
  return aprovacao.decididoEm.getTime() >= entradaNaEtapa.getTime()
}

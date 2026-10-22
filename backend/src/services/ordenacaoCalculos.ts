const PESO_PRIORIDADE: Record<string, number> = {
  urgente: 0,
  alta: 1,
  media: 2,
  baixa: 3,
}

export function ordenarPorPrioridade<T extends { prioridade: string; createdAt: string | Date }>(itens: T[]): T[] {
  return [...itens].sort((a, b) => {
    const pesoA = PESO_PRIORIDADE[a.prioridade] ?? 99
    const pesoB = PESO_PRIORIDADE[b.prioridade] ?? 99
    if (pesoA !== pesoB) return pesoA - pesoB
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

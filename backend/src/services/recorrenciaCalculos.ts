export type FrequenciaPlaybook = 'diaria' | 'semanal' | 'mensal'

export function proximaExecucao(
  frequencia: string | null | undefined,
  base: Date = new Date()
): Date | null {
  if (!frequencia) return null

  const proxima = new Date(base)
  if (frequencia === 'diaria') proxima.setDate(proxima.getDate() + 1)
  else if (frequencia === 'semanal') proxima.setDate(proxima.getDate() + 7)
  else if (frequencia === 'mensal') proxima.setMonth(proxima.getMonth() + 1)
  else return null

  return proxima
}

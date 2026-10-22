export function periodoFiltro(periodo?: string, agora: Date = new Date()) {
  if (!periodo) return {}

  if (periodo === 'dia') {
    const inicio = new Date(agora)
    inicio.setHours(0, 0, 0, 0)
    return { createdAt: { gte: inicio } }
  }

  if (periodo === 'semana') {
    const inicio = new Date(agora)
    inicio.setDate(inicio.getDate() - 7)
    return { createdAt: { gte: inicio } }
  }

  if (periodo === 'mes') {
    const inicio = new Date(agora)
    inicio.setMonth(inicio.getMonth() - 1)
    return { createdAt: { gte: inicio } }
  }

  return {}
}

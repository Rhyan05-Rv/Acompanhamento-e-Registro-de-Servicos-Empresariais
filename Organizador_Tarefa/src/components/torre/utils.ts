export function formatarHoras(horas: number) {
  if (!Number.isFinite(horas) || horas <= 0) return '0h'
  if (horas < 1) return '<1h'
  if (horas < 24) return `${Math.round(horas)}h`

  const dias = horas / 24
  return `${dias >= 10 ? Math.round(dias) : dias.toFixed(1)}d`
}

export function classeCalor(horas: number, wip = 1) {
  if (wip === 0) return 'bg-surface-muted text-content-subtle border-border'
  if (horas >= 72) return 'bg-bloqueado-soft text-bloqueado border-bloqueado/30'
  if (horas >= 24) return 'bg-prio-alta-soft text-prio-alta border-prio-alta/30'
  if (horas >= 8) return 'bg-pendente-soft text-pendente border-pendente/30'
  return 'bg-primary-soft text-primary border-primary/20'
}

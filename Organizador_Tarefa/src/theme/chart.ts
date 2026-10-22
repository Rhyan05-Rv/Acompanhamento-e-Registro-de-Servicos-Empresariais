import type { Tema } from '../hooks/useTheme'

export function chartColors(tema: Tema) {
  const dark = tema === 'dark'
  const muted = dark ? '#a8a696' : '#6a6a5f'
  const border = dark ? '#35382a' : '#ddd7c9'
  const surface = dark ? '#1d1f17' : '#fffefa'
  return {
    muted,
    border,
    surface,
    tick: { fill: muted, fontSize: 12 },
    axis: { stroke: border },
    tooltip: {
      contentStyle: {
        background: surface,
        border: `1px solid ${border}`,
        borderRadius: 8,
        fontSize: 12,
        color: dark ? '#ebe8dc' : '#24251f',
      },
      labelStyle: { color: muted },
      itemStyle: { color: dark ? '#ebe8dc' : '#24251f' },
    },
  }
}

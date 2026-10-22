import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { SerieAnalytics } from '../../types'
import { useTheme } from '../../hooks/useTheme'
import { chartColors } from '../../theme/chart'

export function TendenciaChart({ serie }: { serie: SerieAnalytics }) {
  const { tema } = useTheme()
  const c = chartColors(tema)

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="font-semibold text-sm text-content">Tendência</h3>
          <p className="text-xs text-content-muted">Criadas × concluídas no período</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-content-muted">
          <span>Criadas <b className="text-content">{serie.totalCriadas}</b></span>
          <span>Concluídas <b className="text-content">{serie.totalConcluidas}</b></span>
          <span>Lead time <b className="text-content">{serie.leadTimeMedioDias}d</b></span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={serie.pontos} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="gradCriadas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.32} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradConcluidas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--concluido)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--concluido)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke={c.border} strokeDasharray="3 3" />
          <XAxis dataKey="rotulo" tick={c.tick} axisLine={{ stroke: c.border }} tickLine={false} />
          <YAxis allowDecimals={false} tick={c.tick} axisLine={false} tickLine={false} />
          <Tooltip {...c.tooltip} />
          <Legend wrapperStyle={{ fontSize: 12, color: c.muted }} />
          <Area
            type="monotone"
            dataKey="criadas"
            name="Criadas"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#gradCriadas)"
          />
          <Area
            type="monotone"
            dataKey="concluidas"
            name="Concluídas"
            stroke="var(--concluido)"
            strokeWidth={2}
            fill="url(#gradConcluidas)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

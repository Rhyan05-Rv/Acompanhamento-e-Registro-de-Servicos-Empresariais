import './env.js'
import express, { type ErrorRequestHandler } from 'express'
import cors from 'cors'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import authRoutes from './routes/auth.js'
import atividadeRoutes from './routes/atividades.js'
import usuarioRoutes from './routes/usuarios.js'
import metricasRoutes from './routes/metricas.js'
import departamentoRoutes from './routes/departamentos.js'
import fluxoRoutes from './routes/fluxos.js'
import casoRoutes from './routes/casos.js'
import empresaRoutes from './routes/empresas.js'
import operacaoRoutes from './routes/operacoes.js'
import insightsRoutes from './routes/insights.js'
import playbookRoutes from './routes/playbooks.js'
import aprovacaoRoutes from './routes/aprovacoes.js'
import { processarRecorrentes } from './services/playbookService.js'
import { responderErro } from './routes/httpError.js'

const obrigatorias = ['DATABASE_URL', 'JWT_SECRET'] as const
const faltando = obrigatorias.filter(chave => !process.env[chave])
if (faltando.length > 0) {
  console.error(`\n[config] Variáveis de ambiente ausentes: ${faltando.join(', ')}`)
  console.error('[config] Crie backend/.env a partir de backend/.env.example e reinicie o servidor.\n')
  process.exit(1)
}

const app = express()
const PORT = Number(process.env.PORT) || 3001

app.use((req, res, next) => {
  const requestId = randomUUID()
  res.locals.requestId = requestId
  res.setHeader('x-request-id', requestId)

  const inicio = performance.now()
  res.on('finish', () => {
    const duracao = Math.round(performance.now() - inicio)
    console.log(`[http] ${req.method} ${req.originalUrl} ${res.statusCode} ${duracao}ms rid=${requestId}`)
  })

  next()
})

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.resolve('uploads')))

app.use('/api/auth', authRoutes)
app.use('/api/empresas', empresaRoutes)
app.use('/api/operacoes', operacaoRoutes)
app.use('/api/atividades', atividadeRoutes)
app.use('/api/usuarios', usuarioRoutes)
app.use('/api/metricas', metricasRoutes)
app.use('/api/departamentos', departamentoRoutes)
app.use('/api/fluxos', fluxoRoutes)
app.use('/api/casos', casoRoutes)
app.use('/api/insights', insightsRoutes)
app.use('/api/playbooks', playbookRoutes)
app.use('/api/aprovacoes', aprovacaoRoutes)

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada', requestId: res.locals.requestId })
})

const tratarErro: ErrorRequestHandler = (err, _req, res, _next) => {
  responderErro(err, res)
}
app.use(tratarErro)

app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`)
})

const intervaloRecorrencias = setInterval(
  () => {
    processarRecorrentes().catch(err => console.error('[playbooks] recorrencias:', err))
  },
  5 * 60 * 1000
)
intervaloRecorrencias.unref()

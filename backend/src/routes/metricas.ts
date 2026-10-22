import { Router, Response } from 'express'
import { AuthRequest, authMiddleware } from '../middleware/auth.js'
import { getMetricas, getAndamento } from '../services/metricasService.js'
import { getFluxoAnalytics, getSerieAnalytics } from '../services/analyticsService.js'
import { assertAcessoOperacao, escopoOperacoes } from '../services/acesso.js'
import { responderErro } from './httpError.js'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { periodo, operacaoId } = req.query as { periodo?: string; operacaoId?: string }
    if (operacaoId) await assertAcessoOperacao(operacaoId, req.userId!, req.empresaId!, req.userLevel!)
    const ids = operacaoId ? null : await escopoOperacoes(req.userId!, req.empresaId!, req.userLevel!)
    return res.json(await getMetricas(req.empresaId!, periodo, operacaoId, ids))
  } catch (err) {
    return responderErro(err, res)
  }
})

router.get('/andamento', async (req: AuthRequest, res: Response) => {
  try {
    const { operacaoId } = req.query as { operacaoId?: string }
    if (operacaoId) await assertAcessoOperacao(operacaoId, req.userId!, req.empresaId!, req.userLevel!)
    const ids = operacaoId ? null : await escopoOperacoes(req.userId!, req.empresaId!, req.userLevel!)
    return res.json(await getAndamento(req.empresaId!, operacaoId, ids))
  } catch (err) {
    return responderErro(err, res)
  }
})

router.get('/fluxo', async (req: AuthRequest, res: Response) => {
  try {
    const { operacaoId } = req.query as { operacaoId?: string }
    return res.json(
      await getFluxoAnalytics(req.empresaId!, req.userId!, req.userLevel!, operacaoId)
    )
  } catch (err) {
    return responderErro(err, res)
  }
})

router.get('/serie', async (req: AuthRequest, res: Response) => {
  try {
    const { operacaoId, periodo } = req.query as { operacaoId?: string; periodo?: string }
    return res.json(
      await getSerieAnalytics(req.empresaId!, req.userId!, req.userLevel!, operacaoId, periodo)
    )
  } catch (err) {
    return responderErro(err, res)
  }
})

export default router

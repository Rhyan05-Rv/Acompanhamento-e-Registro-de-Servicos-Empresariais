import { Router, Response } from 'express'
import { AuthRequest, authMiddleware } from '../middleware/auth.js'
import { getRadar, getResumoRadar, getResumoIA } from '../services/insightsService.js'
import { responderErro } from './httpError.js'

const router = Router()
router.use(authMiddleware)

router.get('/risco', async (req: AuthRequest, res: Response) => {
  try {
    const { operacaoId, limite } = req.query as { operacaoId?: string; limite?: string }
    const parsed = Number(limite)
    return res.json(
      await getRadar(
        req.empresaId!,
        req.userId!,
        req.userLevel!,
        operacaoId,
        Number.isFinite(parsed) && parsed > 0 ? Math.min(100, parsed) : 20
      )
    )
  } catch (err) {
    return responderErro(err, res)
  }
})

router.get('/resumo', async (req: AuthRequest, res: Response) => {
  try {
    const { operacaoId } = req.query as { operacaoId?: string }
    return res.json(await getResumoRadar(req.empresaId!, req.userId!, req.userLevel!, operacaoId))
  } catch (err) {
    return responderErro(err, res)
  }
})

router.post('/resumo-ia', async (req: AuthRequest, res: Response) => {
  try {
    const { operacaoId } = req.query as { operacaoId?: string }
    return res.json(await getResumoIA(req.empresaId!, req.userId!, req.userLevel!, operacaoId))
  } catch (err) {
    return responderErro(err, res)
  }
})

export default router

import { Router, Response } from 'express'
import { z } from 'zod'
import { AuthRequest, authMiddleware, gestorOnly } from '../middleware/auth.js'
import { decidirAprovacao, listarAprovacoesPendentes } from '../services/aprovacaoService.js'
import { responderErro } from './httpError.js'

const router = Router()
router.use(authMiddleware)

const decisaoSchema = z.object({
  decisao: z.enum(['aprovada', 'rejeitada']),
  comentario: z.string().max(500).optional(),
})

router.get('/pendentes', gestorOnly, async (req: AuthRequest, res: Response) => {
  try {
    return res.json(await listarAprovacoesPendentes(req.empresaId!))
  } catch (err) {
    return responderErro(err, res)
  }
})

router.post('/:id/decidir', gestorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { decisao, comentario } = decisaoSchema.parse(req.body)
    return res.json(
      await decidirAprovacao(
        req.params.id as string,
        req.empresaId!,
        req.userId!,
        decisao,
        comentario
      )
    )
  } catch (err) {
    return responderErro(err, res)
  }
})

export default router

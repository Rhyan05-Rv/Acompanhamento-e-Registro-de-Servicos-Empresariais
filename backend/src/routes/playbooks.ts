import { Router, Response } from 'express'
import { z } from 'zod'
import { AuthRequest, authMiddleware, gestorOnly } from '../middleware/auth.js'
import {
  listarPlaybooks,
  criarPlaybook,
  excluirPlaybook,
  executarPlaybook,
  processarRecorrentes,
} from '../services/playbookService.js'
import { responderErro } from './httpError.js'

const router = Router()
router.use(authMiddleware)

const itemSchema = z.object({
  titulo: z.string().min(1),
  descricao: z.string().optional(),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).optional(),
  equipeId: z.string().uuid().nullable().optional(),
  etapaId: z.string().uuid().nullable().optional(),
  offsetDias: z.number().int().min(0).max(365).optional(),
})

const playbookSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional(),
  operacaoId: z.string().uuid(),
  frequencia: z.enum(['diaria', 'semanal', 'mensal']).nullable().optional(),
  itens: z.array(itemSchema).min(1),
})

router.get('/', gestorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { operacaoId } = req.query as { operacaoId?: string }
    return res.json(await listarPlaybooks(req.empresaId!, operacaoId))
  } catch (err) {
    return responderErro(err, res)
  }
})

router.post('/', gestorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const data = playbookSchema.parse(req.body)
    return res.status(201).json(await criarPlaybook(req.empresaId!, req.userId!, data))
  } catch (err) {
    return responderErro(err, res)
  }
})

router.delete('/:id', gestorOnly, async (req: AuthRequest, res: Response) => {
  try {
    await excluirPlaybook(req.empresaId!, req.params.id as string)
    return res.status(204).send()
  } catch (err) {
    return responderErro(err, res)
  }
})

router.post('/processar-recorrentes', gestorOnly, async (_req: AuthRequest, res: Response) => {
  try {
    return res.json(await processarRecorrentes())
  } catch (err) {
    return responderErro(err, res)
  }
})

router.post('/:id/executar', async (req: AuthRequest, res: Response) => {
  try {
    return res.status(201).json(
      await executarPlaybook(req.empresaId!, req.userId!, req.userLevel!, req.params.id as string)
    )
  } catch (err) {
    return responderErro(err, res)
  }
})

export default router

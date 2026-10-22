import { Router, Response } from 'express'
import { z } from 'zod'
import { AuthRequest, authMiddleware, gestorOnly } from '../middleware/auth.js'
import { listarFluxos, criarFluxo, adicionarEtapa, removerEtapa } from '../services/fluxoService.js'
import { atualizarEtapa } from '../services/etapaService.js'
import { assertAcessoOperacao, escopoOperacoes } from '../services/acesso.js'
import { responderErro } from './httpError.js'

const router = Router()
router.use(authMiddleware)

const fluxoSchema = z.object({
  operacaoId: z.string().uuid(),
  nome: z.string().min(1),
  descricao: z.string().optional(),
  etapas: z.array(z.object({ nome: z.string().min(1), equipeId: z.string().uuid() })).min(1),
})

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { operacaoId } = req.query as { operacaoId?: string }
    if (operacaoId) await assertAcessoOperacao(operacaoId, req.userId!, req.empresaId!, req.userLevel!)
    const ids = operacaoId ? null : await escopoOperacoes(req.userId!, req.empresaId!, req.userLevel!)
    return res.json(await listarFluxos(req.empresaId!, operacaoId, ids))
  } catch (err) {
    return responderErro(err, res)
  }
})

router.post('/', gestorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const data = fluxoSchema.parse(req.body)
    return res.status(201).json(await criarFluxo(req.empresaId!, data))
  } catch (err) {
    return responderErro(err, res)
  }
})

const etapaSchema = z.object({ nome: z.string().min(1), equipeId: z.string().uuid() })

router.post('/:id/etapas', gestorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const data = etapaSchema.parse(req.body)
    return res.status(201).json(await adicionarEtapa(req.empresaId!, req.params.id as string, data))
  } catch (err) {
    return responderErro(err, res)
  }
})

const atualizarEtapaSchema = z.object({ requerAprovacao: z.boolean() })

router.patch('/etapas/:etapaId', gestorOnly, async (req: AuthRequest, res: Response) => {
  try {
    const data = atualizarEtapaSchema.parse(req.body)
    return res.json(await atualizarEtapa(req.empresaId!, req.params.etapaId as string, data))
  } catch (err) {
    return responderErro(err, res)
  }
})

router.delete('/etapas/:etapaId', gestorOnly, async (req: AuthRequest, res: Response) => {
  try {
    await removerEtapa(req.empresaId!, req.params.etapaId as string)
    return res.status(204).send()
  } catch (err) {
    return responderErro(err, res)
  }
})

export default router

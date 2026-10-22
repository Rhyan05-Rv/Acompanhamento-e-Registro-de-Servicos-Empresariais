import { Router, Response } from 'express'
import { z } from 'zod'
import { AuthRequest, authMiddleware, gestorOnly } from '../middleware/auth.js'
import {
  listarAtividades,
  buscarAtividade,
  criarAtividade,
  editarAtividade,
  atualizarStatus,
  avancarEtapa,
  retornarEtapa,
  excluirAtividade,
  adicionarResponsavel,
  removerResponsavel,
} from '../services/atividadeService.js'
import { listarAprovacoes, solicitarAprovacao } from '../services/aprovacaoService.js'
import { responderErro } from './httpError.js'

const router = Router()
router.use(authMiddleware)

const prioridadeEnum = z.enum(['baixa', 'media', 'alta', 'urgente'])
const statusEnum = z.enum(['pendente', 'em_execucao', 'revisao', 'concluido', 'bloqueado'])

const createSchema = z.object({
  titulo: z.string().min(1),
  descricao: z.string().optional(),
  responsavelId: z.string().uuid().optional(),
  solicitanteId: z.string().uuid().optional(),
  prioridade: prioridadeEnum.default('media'),
  prazoEstimado: z.string().datetime().optional(),
  operacaoId: z.string().uuid().optional(),
  fluxoId: z.string().uuid().optional(),
  etapaAtualId: z.string().uuid().optional(),
})

const edicaoSchema = z.object({
  titulo: z.string().min(1).optional(),
  descricao: z.string().optional(),
  prioridade: prioridadeEnum.optional(),
  responsavelId: z.string().uuid().optional(),
  prazoEstimado: z.string().datetime().nullable().optional(),
})

const statusSchema = z.object({ status: statusEnum })

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const f = req.query as Record<string, string | undefined>
    const atividades = await listarAtividades(req.userId!, req.userLevel!, req.empresaId!, {
      status: f.status,
      responsavelId: f.responsavelId,
      prioridade: f.prioridade,
      operacaoId: f.operacaoId,
      equipeId: f.equipeId,
      fluxoId: f.fluxoId,
      etapaAtualId: f.etapaAtualId,
      periodo: f.periodo,
    })
    return res.json(atividades)
  } catch (err) {
    return responderErro(err, res)
  }
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const atividade = await buscarAtividade(req.params.id as string, req.empresaId!, req.userId!, req.userLevel!)
    if (!atividade) return res.status(404).json({ error: 'Atividade não encontrada' })
    return res.json(atividade)
  } catch (err) {
    return responderErro(err, res)
  }
})

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = createSchema.parse(req.body)
    return res.status(201).json(await criarAtividade(data, req.userId!, req.empresaId!, req.userLevel!))
  } catch (err) {
    return responderErro(err, res)
  }
})

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = edicaoSchema.parse(req.body)
    return res.json(await editarAtividade(req.params.id as string, data, req.userId!, req.empresaId!, req.userLevel!))
  } catch (err) {
    return responderErro(err, res)
  }
})

router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = statusSchema.parse(req.body)
    return res.json(await atualizarStatus(req.params.id as string, status, req.userId!, req.empresaId!, req.userLevel!))
  } catch (err) {
    return responderErro(err, res)
  }
})

router.post('/:id/avancar-etapa', async (req: AuthRequest, res: Response) => {
  try {
    return res.json(await avancarEtapa(req.params.id as string, req.userId!, req.empresaId!, req.userLevel!))
  } catch (err) {
    return responderErro(err, res)
  }
})

router.post('/:id/retornar-etapa', async (req: AuthRequest, res: Response) => {
  try {
    return res.json(await retornarEtapa(req.params.id as string, req.userId!, req.empresaId!, req.userLevel!))
  } catch (err) {
    return responderErro(err, res)
  }
})

const responsavelSchema = z.object({ usuarioId: z.string().uuid() })

router.post('/:id/responsaveis', async (req: AuthRequest, res: Response) => {
  try {
    const { usuarioId } = responsavelSchema.parse(req.body)
    return res.status(201).json(await adicionarResponsavel(req.params.id as string, usuarioId, req.userId!, req.empresaId!, req.userLevel!))
  } catch (err) {
    return responderErro(err, res)
  }
})

router.delete('/:id/responsaveis/:usuarioId', async (req: AuthRequest, res: Response) => {
  try {
    return res.json(await removerResponsavel(req.params.id as string, req.params.usuarioId as string, req.userId!, req.empresaId!, req.userLevel!))
  } catch (err) {
    return responderErro(err, res)
  }
})

router.get('/:id/aprovacoes', async (req: AuthRequest, res: Response) => {
  try {
    return res.json(
      await listarAprovacoes(req.params.id as string, req.empresaId!, req.userId!, req.userLevel!)
    )
  } catch (err) {
    return responderErro(err, res)
  }
})

router.post('/:id/aprovacoes', async (req: AuthRequest, res: Response) => {
  try {
    return res.status(201).json(
      await solicitarAprovacao(req.params.id as string, req.empresaId!, req.userId!, req.userLevel!)
    )
  } catch (err) {
    return responderErro(err, res)
  }
})

router.delete('/:id', gestorOnly, async (req: AuthRequest, res: Response) => {
  try {
    await excluirAtividade(req.params.id as string, req.userId!, req.empresaId!, req.userLevel!)
    return res.status(204).send()
  } catch (err) {
    return responderErro(err, res)
  }
})

export default router

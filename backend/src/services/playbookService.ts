import { prisma } from '../database/prisma.js'
import { AppError } from './errors.js'
import { assertAcessoOperacao, assertOperacaoDaEmpresa } from './acesso.js'
import { criarAtividade } from './atividadeService.js'

const includePlaybook = {
  operacao: { select: { id: true, nome: true } },
  itens: {
    orderBy: { ordem: 'asc' as const },
    include: { equipe: { select: { id: true, nome: true } } },
  },
}

export async function listarPlaybooks(empresaId: string, operacaoId?: string) {
  return prisma.playbook.findMany({
    where: { empresaId, ...(operacaoId ? { operacaoId } : {}) },
    include: includePlaybook,
    orderBy: { createdAt: 'desc' },
  })
}

export interface PlaybookInput {
  nome: string
  descricao?: string
  operacaoId: string
  itens: {
    titulo: string
    descricao?: string
    prioridade?: string
    equipeId?: string | null
    offsetDias?: number
  }[]
}

export async function criarPlaybook(
  empresaId: string,
  userId: string,
  data: PlaybookInput
) {
  if (data.itens.length === 0) throw new AppError('Adicione ao menos uma tarefa ao playbook')
  await assertOperacaoDaEmpresa(data.operacaoId, empresaId)

  for (const item of data.itens) {
    if (!item.equipeId) continue
    const equipe = await prisma.departamento.findFirst({
      where: { id: item.equipeId, operacaoId: data.operacaoId },
    })
    if (!equipe) throw new AppError('Equipe inválida para esta operação')
  }

  return prisma.playbook.create({
    data: {
      empresaId,
      criadoPorId: userId,
      operacaoId: data.operacaoId,
      nome: data.nome,
      descricao: data.descricao,
      itens: {
        create: data.itens.map((item, indice) => ({
          titulo: item.titulo,
          descricao: item.descricao,
          prioridade: item.prioridade ?? 'media',
          equipeId: item.equipeId ?? null,
          offsetDias: item.offsetDias ?? 0,
          ordem: indice,
        })),
      },
    },
    include: includePlaybook,
  })
}

export async function excluirPlaybook(empresaId: string, id: string) {
  const existe = await prisma.playbook.findFirst({ where: { id, empresaId } })
  if (!existe) throw new AppError('Playbook não encontrado', 404)
  await prisma.playbook.delete({ where: { id } })
  return { ok: true }
}

export async function executarPlaybook(
  empresaId: string,
  userId: string,
  nivel: string,
  id: string
) {
  const playbook = await prisma.playbook.findFirst({
    where: { id, empresaId },
    include: includePlaybook,
  })
  if (!playbook) throw new AppError('Playbook não encontrado', 404)
  if (!playbook.operacaoId) throw new AppError('O playbook precisa estar vinculado a uma operação')
  if (playbook.itens.length === 0) throw new AppError('Playbook sem tarefas')

  await assertAcessoOperacao(playbook.operacaoId, userId, empresaId, nivel)

  const membros = await prisma.operacaoMembro.findMany({
    where: { operacaoId: playbook.operacaoId },
    select: { usuarioId: true, departamentoId: true },
    orderBy: { id: 'asc' },
  })

  const porEquipe = new Map<string, string>()
  for (const membro of membros) {
    if (membro.departamentoId && !porEquipe.has(membro.departamentoId)) {
      porEquipe.set(membro.departamentoId, membro.usuarioId)
    }
  }

  const responsavelPadrao = membros[0]?.usuarioId
  if (!responsavelPadrao) throw new AppError('A operação não possui membros para receber as tarefas')

  for (const item of playbook.itens) {
    if (item.equipeId && !porEquipe.has(item.equipeId)) {
      throw new AppError(`A equipe "${item.equipe?.nome ?? 'selecionada'}" não possui membros vinculados`)
    }
  }

  let criadas = 0
  for (const item of playbook.itens) {
    const responsavelId = item.equipeId ? porEquipe.get(item.equipeId)! : responsavelPadrao
    const prazo = new Date()
    prazo.setDate(prazo.getDate() + item.offsetDias)
    prazo.setHours(12, 0, 0, 0)

    await criarAtividade(
      {
        titulo: item.titulo,
        descricao: item.descricao ?? undefined,
        responsavelId,
        prioridade: item.prioridade,
        prazoEstimado: prazo.toISOString(),
        operacaoId: playbook.operacaoId,
      },
      userId,
      empresaId,
      nivel
    )
    criadas++
  }

  return { criadas, operacaoId: playbook.operacaoId }
}

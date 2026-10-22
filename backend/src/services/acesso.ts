import { prisma } from '../database/prisma.js'
import { AppError } from './errors.js'

export { operacaoPermitida } from './escopoCalculos.js'

export async function operacoesAcessiveis(
  userId: string,
  empresaId: string,
  nivel: string
): Promise<{ todas: boolean; ids: string[] }> {
  if (nivel === 'gestor') return { todas: true, ids: [] }
  const membros = await prisma.operacaoMembro.findMany({
    where: { usuarioId: userId, operacao: { empresaId } },
    select: { operacaoId: true },
  })
  return { todas: false, ids: membros.map(m => m.operacaoId) }
}

export async function escopoOperacoes(
  userId: string,
  empresaId: string,
  nivel: string
): Promise<string[] | null> {
  const { todas, ids } = await operacoesAcessiveis(userId, empresaId, nivel)
  return todas ? null : ids
}

export async function assertOperacaoDaEmpresa(operacaoId: string, empresaId: string) {
  const operacao = await prisma.operacao.findFirst({ where: { id: operacaoId, empresaId } })
  if (!operacao) throw new AppError('Operação não encontrada', 404)
  return operacao
}

export async function escopoAnalitico(empresaId: string, userId: string, nivel: string, operacaoId?: string) {
  if (operacaoId) {
    await assertAcessoOperacao(operacaoId, userId, empresaId, nivel)
    return { operacaoId }
  }

  const ids = await escopoOperacoes(userId, empresaId, nivel)
  return ids ? { operacaoId: { in: ids } } : {}
}

export async function assertAcessoOperacao(operacaoId: string, userId: string, empresaId: string, nivel: string) {
  await assertOperacaoDaEmpresa(operacaoId, empresaId)
  if (nivel === 'gestor') return
  const acesso = await prisma.operacaoMembro.findUnique({
    where: { operacaoId_usuarioId: { operacaoId, usuarioId: userId } },
  })
  if (!acesso) throw new AppError('Sem acesso a esta operação', 403)
}

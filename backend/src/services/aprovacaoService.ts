import { prisma } from '../database/prisma.js'
import { AppError } from './errors.js'
import { assertAcessoOperacao } from './acesso.js'

const includeAprovacao = {
  etapa: { select: { id: true, nome: true, ordem: true, requerAprovacao: true } },
  solicitadoPor: { select: { id: true, nome: true } },
  decididoPor: { select: { id: true, nome: true } },
}

async function acharAtividade(id: string, empresaId: string, userId: string, nivel: string) {
  const atividade = await prisma.atividade.findFirst({
    where: { id, deletedAt: null, operacao: { empresaId } },
    include: { etapaAtual: true },
  })
  if (!atividade) throw new AppError('Atividade não encontrada', 404)
  await assertAcessoOperacao(atividade.operacaoId, userId, empresaId, nivel)
  return atividade
}

export async function listarAprovacoesPendentes(empresaId: string) {
  return prisma.aprovacaoEtapa.findMany({
    where: { status: 'pendente', atividade: { operacao: { empresaId } } },
    include: {
      ...includeAprovacao,
      atividade: {
        select: {
          id: true,
          titulo: true,
          operacao: { select: { id: true, nome: true } },
          etapaAtual: { select: { id: true, nome: true, ordem: true } },
          responsavel: { select: { id: true, nome: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })
}

export async function listarAprovacoes(
  atividadeId: string,
  empresaId: string,
  userId: string,
  nivel: string
) {
  await acharAtividade(atividadeId, empresaId, userId, nivel)
  return prisma.aprovacaoEtapa.findMany({
    where: { atividadeId },
    include: includeAprovacao,
    orderBy: { createdAt: 'desc' },
  })
}

export async function solicitarAprovacao(
  atividadeId: string,
  empresaId: string,
  userId: string,
  nivel: string
) {
  const atividade = await acharAtividade(atividadeId, empresaId, userId, nivel)
  if (!atividade.etapaAtualId || !atividade.etapaAtual) {
    throw new AppError('A atividade não pertence a um fluxo')
  }
  if (!atividade.etapaAtual.requerAprovacao) {
    throw new AppError('A etapa atual não exige aprovação')
  }

  const existente = await prisma.aprovacaoEtapa.findUnique({
    where: { atividadeId_etapaId: { atividadeId, etapaId: atividade.etapaAtualId } },
  })
  if (existente?.status === 'aprovada') {
    return prisma.aprovacaoEtapa.findUnique({
      where: { id: existente.id },
      include: includeAprovacao,
    })
  }

  return prisma.aprovacaoEtapa.upsert({
    where: { atividadeId_etapaId: { atividadeId, etapaId: atividade.etapaAtualId } },
    update: {
      status: 'pendente',
      solicitadoPorId: userId,
      decididoPorId: null,
      decididoEm: null,
      comentario: null,
    },
    create: {
      atividadeId,
      etapaId: atividade.etapaAtualId,
      solicitadoPorId: userId,
    },
    include: includeAprovacao,
  })
}

export async function decidirAprovacao(
  id: string,
  empresaId: string,
  userId: string,
  decisao: 'aprovada' | 'rejeitada',
  comentario?: string
) {
  const aprovacao = await prisma.aprovacaoEtapa.findFirst({
    where: { id, atividade: { operacao: { empresaId } } },
    include: { atividade: true },
  })
  if (!aprovacao) throw new AppError('Aprovação não encontrada', 404)
  if (aprovacao.status !== 'pendente') throw new AppError('Esta aprovação já foi decidida')

  const atualizada = await prisma.aprovacaoEtapa.update({
    where: { id },
    data: {
      status: decisao,
      decididoPorId: userId,
      decididoEm: new Date(),
      comentario: comentario ?? null,
    },
    include: includeAprovacao,
  })

  await prisma.historico.create({
    data: {
      atividadeId: aprovacao.atividadeId,
      usuarioId: userId,
      acaoExecutada: 'aprovacao_etapa',
      campo: 'aprovacao',
      valorAnterior: 'pendente',
      valorNovo: decisao,
      alteracaoEstado: `pendente → ${decisao}`,
    },
  })

  return atualizada
}

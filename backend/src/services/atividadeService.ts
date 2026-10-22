import { prisma } from '../database/prisma.js'
import { AppError } from './errors.js'
import { diferenciarEdicao } from './edicaoCalculos.js'
import { assertAcessoOperacao, operacoesAcessiveis } from './acesso.js'
import { periodoFiltro } from './periodoFiltro.js'
import { ordenarPorPrioridade } from './ordenacaoCalculos.js'
import { aprovacaoValida } from './aprovacaoCalculos.js'

const includeCard = {
  responsavel: { select: { id: true, nome: true, email: true } },
  responsaveis: { include: { usuario: { select: { id: true, nome: true, email: true } } } },
  solicitante: { select: { id: true, nome: true } },
  criadoPor: { select: { id: true, nome: true } },
  operacao: { select: { id: true, nome: true } },
  equipe: { select: { id: true, nome: true } },
  etapaAtual: { select: { id: true, nome: true, ordem: true, requerAprovacao: true } },
  fluxo: { select: { id: true, nome: true } },
}

const includeDetalhe = {
  ...includeCard,
  fluxo: {
    include: {
      etapas: {
        orderBy: { ordem: 'asc' } as const,
        include: { equipe: { select: { id: true, nome: true } } },
      },
    },
  },
  historico: { orderBy: { timestamp: 'desc' } as const },
  movimentacoes: {
    orderBy: { timestamp: 'desc' } as const,
    include: {
      etapaOrigem: { select: { id: true, nome: true, ordem: true } },
      etapaDestino: { select: { id: true, nome: true, ordem: true } },
      movidoPor: { select: { id: true, nome: true } },
    },
  },
  casos: { orderBy: { createdAt: 'desc' } as const },
}

async function registrarHistorico(
  atividadeId: string,
  usuarioId: string,
  acao: string,
  extra: { campo?: string; valorAnterior?: string | null; valorNovo?: string | null; alteracaoEstado?: string } = {}
) {
  await prisma.historico.create({
    data: {
      atividadeId,
      usuarioId,
      acaoExecutada: acao,
      campo: extra.campo ?? null,
      valorAnterior: extra.valorAnterior ?? null,
      valorNovo: extra.valorNovo ?? null,
      alteracaoEstado: extra.alteracaoEstado ?? null,
    },
  })
}

async function escolherResponsavel(equipeId: string): Promise<string> {
  const membro = await prisma.operacaoMembro.findFirst({
    where: { departamentoId: equipeId },
    orderBy: { id: 'asc' },
  })
  if (!membro) throw new AppError('Não há usuário vinculado à equipe de destino')
  return membro.usuarioId
}

export interface FiltrosAtividade {
  status?: string
  responsavelId?: string
  prioridade?: string
  operacaoId?: string
  equipeId?: string
  fluxoId?: string
  etapaAtualId?: string
  periodo?: string
}

export async function listarAtividades(
  userId: string,
  nivel: string,
  empresaId: string,
  filtros: FiltrosAtividade
) {
  const where: any = { deletedAt: null, operacao: { empresaId }, ...periodoFiltro(filtros.periodo) }

  if (filtros.operacaoId) {
    await assertAcessoOperacao(filtros.operacaoId, userId, empresaId, nivel)
    where.operacaoId = filtros.operacaoId
  } else if (nivel !== 'gestor') {
    const { ids } = await operacoesAcessiveis(userId, empresaId, nivel)
    where.operacaoId = { in: ids }
  }

  if (filtros.status) where.status = filtros.status
  if (filtros.responsavelId) where.responsavelId = filtros.responsavelId
  if (filtros.prioridade) where.prioridade = filtros.prioridade
  if (filtros.equipeId) where.equipeId = filtros.equipeId
  if (filtros.fluxoId) where.fluxoId = filtros.fluxoId
  if (filtros.etapaAtualId) where.etapaAtualId = filtros.etapaAtualId

  const atividades = await prisma.atividade.findMany({
    where,
    include: includeCard,
    orderBy: { createdAt: 'desc' },
  })

  return ordenarPorPrioridade(atividades)
}

export async function buscarAtividade(id: string, empresaId: string, userId: string, nivel: string) {
  const atividade = await prisma.atividade.findFirst({
    where: { id, deletedAt: null, operacao: { empresaId } },
    include: includeDetalhe,
  })
  if (atividade) await assertAcessoOperacao(atividade.operacaoId, userId, empresaId, nivel)
  return atividade
}

export interface AtividadeInput {
  titulo: string
  descricao?: string
  responsavelId?: string
  solicitanteId?: string
  prioridade?: string
  prazoEstimado?: string
  operacaoId?: string
  fluxoId?: string
  etapaAtualId?: string
}

export async function criarAtividade(data: AtividadeInput, userId: string, empresaId: string, nivel: string) {
  let operacaoId = data.operacaoId ?? null
  let equipeId: string | null = null
  let etapaAtualId: string | null = data.etapaAtualId ?? null
  let responsavelId = data.responsavelId ?? null

  if (etapaAtualId) {
    const etapa = await prisma.etapaFluxo.findUnique({ where: { id: etapaAtualId }, include: { fluxo: true } })
    if (!etapa) throw new AppError('Etapa inválida')
    operacaoId = etapa.fluxo.operacaoId
    equipeId = etapa.equipeId
    if (!responsavelId) responsavelId = await escolherResponsavel(etapa.equipeId)
  } else if (data.fluxoId) {
    const fluxo = await prisma.fluxo.findUnique({ where: { id: data.fluxoId } })
    if (!fluxo) throw new AppError('Fluxo inválido')
    operacaoId = fluxo.operacaoId
  }

  if (!operacaoId) throw new AppError('Informe a operação')
  await assertAcessoOperacao(operacaoId, userId, empresaId, nivel)

  if (!responsavelId) throw new AppError('Informe o responsável')
  if (!equipeId) {
    const membro = await prisma.operacaoMembro.findFirst({ where: { operacaoId, usuarioId: responsavelId } })
    equipeId = membro?.departamentoId ?? null
  }

  const atividade = await prisma.atividade.create({
    data: {
      operacaoId,
      titulo: data.titulo,
      descricao: data.descricao,
      responsavelId,
      solicitanteId: data.solicitanteId,
      criadoPorId: userId,
      prioridade: data.prioridade ?? 'media',
      prazoEstimado: data.prazoEstimado ? new Date(data.prazoEstimado) : null,
      fluxoId: data.fluxoId ?? null,
      etapaAtualId,
      equipeId,
    },
  })

  await prisma.atividadeResponsavel.create({ data: { atividadeId: atividade.id, usuarioId: responsavelId } })
  await registrarHistorico(atividade.id, userId, 'criacao')

  if (etapaAtualId) {
    await prisma.movimentacaoEtapa.create({
      data: {
        atividadeId: atividade.id,
        etapaOrigemId: null,
        etapaDestinoId: etapaAtualId,
        tipo: 'criacao',
        movidoPorId: userId,
      },
    })
  }

  return prisma.atividade.findUnique({ where: { id: atividade.id }, include: includeCard })
}

export interface EdicaoInput {
  titulo?: string
  descricao?: string
  prioridade?: string
  responsavelId?: string
  prazoEstimado?: string | null
}

async function acharAtividade(id: string, empresaId: string, userId: string, nivel: string) {
  const atividade = await prisma.atividade.findFirst({ where: { id, deletedAt: null, operacao: { empresaId } } })
  if (!atividade) throw new AppError('Atividade não encontrada', 404)
  await assertAcessoOperacao(atividade.operacaoId, userId, empresaId, nivel)
  return atividade
}

export async function editarAtividade(id: string, dados: EdicaoInput, userId: string, empresaId: string, nivel: string) {
  const atual = await acharAtividade(id, empresaId, userId, nivel)
  const { data, logs } = diferenciarEdicao(atual as any, dados)

  if (Object.keys(data).length === 0) {
    return prisma.atividade.findFirst({ where: { id }, include: includeCard })
  }

  if (data.responsavelId) {
    const usuario = await prisma.usuario.findFirst({ where: { id: data.responsavelId, empresaId } })
    if (!usuario) throw new AppError('Usuário não pertence à empresa')
  }

  const atividade = await prisma.atividade.update({ where: { id }, data, include: includeCard })

  if (data.responsavelId) {
    await prisma.atividadeResponsavel.upsert({
      where: { atividadeId_usuarioId: { atividadeId: id, usuarioId: data.responsavelId } },
      update: {},
      create: { atividadeId: id, usuarioId: data.responsavelId },
    })
  }

  for (const log of logs) {
    await registrarHistorico(id, userId, 'edicao', log)
  }
  return atividade
}

export async function atualizarStatus(id: string, status: string, userId: string, empresaId: string, nivel: string) {
  const atual = await acharAtividade(id, empresaId, userId, nivel)

  const agora = new Date()
  const data: any = { status }

  if (status === 'em_execucao' && !atual.dataInicio) data.dataInicio = agora
  if (status === 'concluido') {
    data.dataConclusao = agora
    if (atual.dataInicio) data.tempoGastoMin = Math.round((agora.getTime() - atual.dataInicio.getTime()) / 60000)
  } else if (atual.status === 'concluido') {
    data.dataConclusao = null
    data.tempoGastoMin = null
  }

  const atividade = await prisma.atividade.update({ where: { id }, data, include: includeCard })
  await registrarHistorico(id, userId, 'mudanca_status', {
    campo: 'status',
    valorAnterior: atual.status,
    valorNovo: status,
    alteracaoEstado: `${atual.status} → ${status}`,
  })
  return atividade
}

async function moverEtapa(id: string, userId: string, empresaId: string, nivel: string, direcao: 1 | -1) {
  const atividade = await prisma.atividade.findFirst({
    where: { id, deletedAt: null, operacao: { empresaId } },
    include: { etapaAtual: true, fluxo: { include: { etapas: { orderBy: { ordem: 'asc' } } } } },
  })
  if (!atividade) throw new AppError('Atividade não encontrada', 404)
  await assertAcessoOperacao(atividade.operacaoId, userId, empresaId, nivel)
  if (!atividade.fluxo || !atividade.etapaAtual) throw new AppError('Atividade não pertence a um fluxo')

  if (direcao === 1 && atividade.status !== 'concluido') {
    throw new AppError('Conclua a etapa atual antes de avançar')
  }

  if (direcao === 1 && atividade.etapaAtual.requerAprovacao) {
    const aprovacao = await prisma.aprovacaoEtapa.findUnique({
      where: {
        atividadeId_etapaId: {
          atividadeId: id,
          etapaId: atividade.etapaAtual.id,
        },
      },
    })
    const entrada = await prisma.movimentacaoEtapa.findFirst({
      where: { atividadeId: id, etapaDestinoId: atividade.etapaAtual.id },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    })
    const referencia = entrada?.timestamp ?? atividade.dataInicio ?? atividade.createdAt
    if (!aprovacaoValida(aprovacao, referencia)) {
      throw new AppError('Esta etapa exige aprovação antes de avançar')
    }
  }

  const etapas = atividade.fluxo.etapas
  const idx = etapas.findIndex(e => e.id === atividade.etapaAtualId)
  const destino = etapas[idx + direcao]
  if (!destino) {
    throw new AppError(direcao === 1 ? 'Esta já é a última etapa do fluxo' : 'Esta já é a primeira etapa do fluxo')
  }

  const responsavelId = await escolherResponsavel(destino.equipeId)
  const updated = await prisma.atividade.update({
    where: { id },
    data: {
      etapaAtualId: destino.id,
      equipeId: destino.equipeId,
      responsavelId,
      status: direcao === 1 ? 'pendente' : 'em_execucao',
      dataInicio: direcao === 1 ? null : new Date(),
      dataConclusao: null,
      tempoGastoMin: null,
    },
    include: includeCard,
  })

  await prisma.movimentacaoEtapa.create({
    data: {
      atividadeId: id,
      etapaOrigemId: atividade.etapaAtualId,
      etapaDestinoId: destino.id,
      tipo: direcao === 1 ? 'avanco' : 'retorno',
      movidoPorId: userId,
    },
  })
  await prisma.atividadeResponsavel.upsert({
    where: { atividadeId_usuarioId: { atividadeId: id, usuarioId: responsavelId } },
    update: {},
    create: { atividadeId: id, usuarioId: responsavelId },
  })
  await prisma.aprovacaoEtapa.deleteMany({
    where: { atividadeId: id, etapaId: { in: [atividade.etapaAtual.id, destino.id] } },
  })
  await registrarHistorico(id, userId, direcao === 1 ? 'avanco_etapa' : 'retorno_etapa', {
    campo: 'etapa',
    valorAnterior: atividade.etapaAtual.nome,
    valorNovo: destino.nome,
  })
  return updated
}

export function avancarEtapa(id: string, userId: string, empresaId: string, nivel: string) {
  return moverEtapa(id, userId, empresaId, nivel, 1)
}

export function retornarEtapa(id: string, userId: string, empresaId: string, nivel: string) {
  return moverEtapa(id, userId, empresaId, nivel, -1)
}

export async function adicionarResponsavel(atividadeId: string, usuarioId: string, userId: string, empresaId: string, nivel: string) {
  await acharAtividade(atividadeId, empresaId, userId, nivel)
  const usuario = await prisma.usuario.findFirst({ where: { id: usuarioId, empresaId } })
  if (!usuario) throw new AppError('Usuário não pertence à empresa')

  await prisma.atividadeResponsavel.upsert({
    where: { atividadeId_usuarioId: { atividadeId, usuarioId } },
    update: {},
    create: { atividadeId, usuarioId },
  })
  await registrarHistorico(atividadeId, userId, 'edicao', { campo: 'responsaveis', valorNovo: usuario.nome })
  return buscarAtividade(atividadeId, empresaId, userId, nivel)
}

export async function removerResponsavel(atividadeId: string, usuarioId: string, userId: string, empresaId: string, nivel: string) {
  const atividade = await acharAtividade(atividadeId, empresaId, userId, nivel)
  const total = await prisma.atividadeResponsavel.count({ where: { atividadeId } })
  if (total <= 1) throw new AppError('A tarefa precisa de ao menos um responsável')

  await prisma.atividadeResponsavel.deleteMany({ where: { atividadeId, usuarioId } })
  if (atividade.responsavelId === usuarioId) {
    const outro = await prisma.atividadeResponsavel.findFirst({ where: { atividadeId }, orderBy: { createdAt: 'asc' } })
    if (outro) {
      await prisma.atividade.update({ where: { id: atividadeId }, data: { responsavelId: outro.usuarioId } })
    }
  }
  await registrarHistorico(atividadeId, userId, 'edicao', { campo: 'responsaveis', valorAnterior: usuarioId })
  return buscarAtividade(atividadeId, empresaId, userId, nivel)
}

export async function excluirAtividade(id: string, userId: string, empresaId: string, nivel: string) {
  await acharAtividade(id, empresaId, userId, nivel)
  await registrarHistorico(id, userId, 'exclusao')
  return prisma.atividade.update({ where: { id }, data: { deletedAt: new Date() } })
}

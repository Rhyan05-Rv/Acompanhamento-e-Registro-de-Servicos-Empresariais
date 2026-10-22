import { prisma } from '../database/prisma.js'
import { escopoAnalitico } from './acesso.js'
import {
  agruparSerie,
  horasNaEtapa,
  ranquearGargalos,
  resumirEtapas,
  type MovimentacaoAnalitica,
} from './analyticsCalculos.js'

export async function getFluxoAnalytics(
  empresaId: string,
  userId: string,
  nivel: string,
  operacaoId?: string
) {
  const where = await escopoAnalitico(empresaId, userId, nivel, operacaoId)
  const agora = new Date()

  const [fluxos, atividades, movimentacoes] = await Promise.all([
    prisma.fluxo.findMany({
      where: { operacao: { empresaId }, ...where },
      include: {
        etapas: {
          orderBy: { ordem: 'asc' },
          include: { equipe: { select: { id: true, nome: true } } },
        },
        operacao: { select: { id: true, nome: true } },
      },
      orderBy: { nome: 'asc' },
    }),
    prisma.atividade.findMany({
      where: { deletedAt: null, operacao: { empresaId }, ...where },
      select: {
        id: true,
        titulo: true,
        status: true,
        createdAt: true,
        dataInicio: true,
        dataConclusao: true,
        prazoEstimado: true,
        etapaAtualId: true,
        fluxoId: true,
        responsavel: { select: { nome: true } },
        equipe: { select: { id: true, nome: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.movimentacaoEtapa.findMany({
      where: { atividade: { deletedAt: null, operacao: { empresaId }, ...where } },
      select: { atividadeId: true, etapaDestinoId: true, timestamp: true },
      orderBy: { timestamp: 'asc' },
    }),
  ])

  const todasMovs: MovimentacaoAnalitica[] = movimentacoes

  const fluxosResumo = fluxos.map(fluxo => {
    const atividadesFluxo = atividades.filter(a => a.fluxoId === fluxo.id)
    const etapas = resumirEtapas(fluxo.etapas, atividadesFluxo, todasMovs, agora)
    const concluidas = atividadesFluxo.filter(a => a.status === 'concluido').length

    return {
      fluxoId: fluxo.id,
      fluxo: fluxo.nome,
      operacaoId: fluxo.operacao.id,
      operacao: fluxo.operacao.nome,
      total: atividadesFluxo.length,
      concluidas,
      progresso: atividadesFluxo.length ? Math.round((concluidas / atividadesFluxo.length) * 100) : 0,
      etapas,
    }
  })

  const gargalos = ranquearGargalos(fluxosResumo, 5).map(gargalo => {
    const cards = atividades
      .filter(
        a =>
          a.fluxoId === gargalo.fluxoId &&
          a.etapaAtualId === gargalo.etapaId &&
          a.status !== 'concluido'
      )
      .map(a => ({
        id: a.id,
        titulo: a.titulo,
        responsavel: a.responsavel?.nome ?? 'Sem responsável',
        prazoEstimado: a.prazoEstimado?.toISOString() ?? null,
        horasNaEtapa: Math.round(horasNaEtapa(a, todasMovs, agora)),
        status: a.status,
      }))
      .sort((a, b) => b.horasNaEtapa - a.horasNaEtapa)
      .slice(0, 5)

    return { ...gargalo, cardsParados: cards }
  })

  return { fluxos: fluxosResumo, gargalos, geradoEm: agora.toISOString() }
}

export async function getSerieAnalytics(
  empresaId: string,
  userId: string,
  nivel: string,
  operacaoId?: string,
  periodo?: string
) {
  const where = await escopoAnalitico(empresaId, userId, nivel, operacaoId)
  const agora = new Date()

  const atividades = await prisma.atividade.findMany({
    where: { deletedAt: null, operacao: { empresaId }, ...where },
    select: {
      id: true,
      titulo: true,
      status: true,
      createdAt: true,
      dataInicio: true,
      dataConclusao: true,
      prazoEstimado: true,
      etapaAtualId: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return {
    ...agruparSerie(atividades, periodo, agora),
    wipAtual: atividades.filter(a => a.status !== 'concluido').length,
    bloqueadas: atividades.filter(a => a.status === 'bloqueado').length,
    geradoEm: agora.toISOString(),
  }
}

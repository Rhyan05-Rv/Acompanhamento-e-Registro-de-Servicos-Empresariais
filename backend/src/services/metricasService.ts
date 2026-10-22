import { prisma } from '../database/prisma.js'
import { calcularAderenciaPrazos, calcularTma } from './metricasCalculos.js'
import { periodoFiltro } from './periodoFiltro.js'

export async function getMetricas(empresaId: string, periodo?: string, operacaoId?: string, operacaoIds?: string[] | null) {
  const where: any = { deletedAt: null, operacao: { empresaId }, ...periodoFiltro(periodo) }
  if (operacaoId) where.operacaoId = operacaoId
  else if (operacaoIds) where.operacaoId = { in: operacaoIds }

  const [totalAtividades, porStatus, porPrioridade, concluidas, abertas] = await Promise.all([
    prisma.atividade.count({ where }),
    prisma.atividade.groupBy({ by: ['status'], where, _count: true }),
    prisma.atividade.groupBy({ by: ['prioridade'], where, _count: true }),
    prisma.atividade.findMany({
      where: { ...where, status: 'concluido' },
      select: { prazoEstimado: true, dataInicio: true, dataConclusao: true },
    }),
    prisma.atividade.findMany({
      where: { ...where, status: { not: 'concluido' } },
      select: {
        responsavelId: true,
        responsavel: { select: { nome: true } },
        equipe: { select: { nome: true } },
      },
    }),
  ])

  const cargaMap = new Map<string, { responsavelId: string; responsavel: string; equipe: string; quantidade: number }>()
  for (const a of abertas) {
    const atual = cargaMap.get(a.responsavelId)
    if (atual) atual.quantidade++
    else
      cargaMap.set(a.responsavelId, {
        responsavelId: a.responsavelId,
        responsavel: a.responsavel?.nome ?? 'Desconhecido',
        equipe: a.equipe?.nome ?? 'Sem equipe',
        quantidade: 1,
      })
  }
  const carga = [...cargaMap.values()]

  const equipeMap = new Map<string, number>()
  for (const c of carga) equipeMap.set(c.equipe, (equipeMap.get(c.equipe) ?? 0) + c.quantidade)
  const cargaPorEquipe = [...equipeMap.entries()].map(([equipe, quantidade]) => ({ equipe, quantidade }))

  const retrabalho = await prisma.historico.count({
    where: {
      acaoExecutada: 'mudanca_status',
      alteracaoEstado: { endsWith: '→ revisao' },
      atividade: {
        operacao: { empresaId },
        ...(operacaoId ? { operacaoId } : operacaoIds ? { operacaoId: { in: operacaoIds } } : {}),
        ...periodoFiltro(periodo),
      },
    },
  })

  return {
    totalAtividades,
    aderenciaPrazos: calcularAderenciaPrazos(concluidas),
    tmaMedio: calcularTma(concluidas),
    porStatus: porStatus.map(s => ({ status: s.status, count: s._count })),
    porPrioridade: porPrioridade.map(p => ({ prioridade: p.prioridade, count: p._count })),
    carga,
    cargaPorEquipe,
    retrabalho,
  }
}

export async function getAndamento(empresaId: string, operacaoId?: string, operacaoIds?: string[] | null) {
  const escopo = operacaoId ? { operacaoId } : operacaoIds ? { operacaoId: { in: operacaoIds } } : {}
  const atividades = await prisma.atividade.findMany({
    where: { deletedAt: null, operacao: { empresaId }, ...escopo },
    select: {
      status: true,
      operacaoId: true,
      fluxoId: true,
      equipe: { select: { id: true, nome: true } },
      etapaAtual: { select: { id: true, ordem: true, nome: true } },
    },
  })

  const equipeMap = new Map<string, any>()
  for (const a of atividades) {
    const key = a.equipe?.id ?? 'sem-equipe'
    if (!equipeMap.has(key)) {
      equipeMap.set(key, {
        equipe: a.equipe?.nome ?? 'Sem equipe',
        total: 0,
        concluidas: 0,
        emExecucao: 0,
        pendentes: 0,
        bloqueadas: 0,
        revisao: 0,
      })
    }
    const item = equipeMap.get(key)
    item.total++
    if (a.status === 'concluido') item.concluidas++
    else if (a.status === 'em_execucao') item.emExecucao++
    else if (a.status === 'pendente') item.pendentes++
    else if (a.status === 'bloqueado') item.bloqueadas++
    else if (a.status === 'revisao') item.revisao++
  }
  const porEquipe = [...equipeMap.values()].map(e => ({
    ...e,
    progresso: e.total ? Math.round((e.concluidas / e.total) * 100) : 0,
  }))

  const fluxos = await prisma.fluxo.findMany({
    where: { operacao: { empresaId }, ...escopo },
    include: {
      etapas: { orderBy: { ordem: 'asc' }, include: { equipe: { select: { nome: true } } } },
    },
  })
  const porFluxo = fluxos.map(f => {
    const etapas = f.etapas.map(et => {
      const itens = atividades.filter(a => a.fluxoId === f.id && a.etapaAtual?.id === et.id)
      return {
        etapa: et.nome,
        ordem: et.ordem,
        equipe: et.equipe?.nome ?? '',
        total: itens.length,
        concluidas: itens.filter(a => a.status === 'concluido').length,
      }
    })
    const total = etapas.reduce((s, e) => s + e.total, 0)
    const concluidas = etapas.reduce((s, e) => s + e.concluidas, 0)
    return {
      fluxo: f.nome,
      etapas,
      total,
      concluidas,
      progresso: total ? Math.round((concluidas / total) * 100) : 0,
    }
  })

  return { porEquipe, porFluxo }
}

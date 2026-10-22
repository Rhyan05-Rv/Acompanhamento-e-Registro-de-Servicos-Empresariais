import { prisma } from '../database/prisma.js'
import { escopoAnalitico } from './acesso.js'
import { horasNaEtapa, type MovimentacaoAnalitica } from './analyticsCalculos.js'
import {
  calcularRisco,
  montarResumo,
  sugerirResponsavel,
  type AtividadeRisco,
  type CandidatoResponsavel,
  type NivelRisco,
  type SugestaoResponsavel,
} from './insightsCalculos.js'

export interface ItemRadar {
  id: string
  titulo: string
  operacaoId: string
  operacao: string
  fluxo: string | null
  etapa: string | null
  equipe: string | null
  responsavelId: string
  responsavel: string
  status: string
  prioridade: string
  prazoEstimado: string | null
  horasNaEtapa: number
  score: number
  nivel: NivelRisco
  motivos: string[]
  sugestao: SugestaoResponsavel | null
}

export interface ResumoRadar {
  total: number
  criticas: number
  altas: number
  medias: number
  vencidas: number
  bloqueadas: number
  sugestoes: number
  gargalo: { etapa: string; fluxo: string; tempoMedioHoras: number } | null
  texto: string
  iaDisponivel: boolean
  geradoEm: string
}

interface DadosRadar {
  itens: ItemRadar[]
  resumo: ResumoRadar
}

const cacheIA = new Map<string, { texto: string; expira: number }>()

async function carregarRadar(
  empresaId: string,
  userId: string,
  nivel: string,
  operacaoId?: string
): Promise<DadosRadar> {
  const where = await escopoAnalitico(empresaId, userId, nivel, operacaoId)
  const escopoOperacaoId = (where as { operacaoId?: unknown }).operacaoId
  const agora = new Date()

  const [atividades, movimentacoes, membros] = await Promise.all([
    prisma.atividade.findMany({
      where: { deletedAt: null, operacao: { empresaId }, ...where, status: { not: 'concluido' } },
      select: {
        id: true,
        titulo: true,
        status: true,
        prioridade: true,
        createdAt: true,
        dataInicio: true,
        dataConclusao: true,
        prazoEstimado: true,
        etapaAtualId: true,
        operacaoId: true,
        responsavelId: true,
        responsavel: { select: { nome: true } },
        equipe: { select: { id: true, nome: true } },
        etapaAtual: { select: { id: true, nome: true, ordem: true } },
        fluxo: { select: { id: true, nome: true } },
        operacao: { select: { id: true, nome: true } },
        casos: { where: { status: { not: 'resolvido' } }, select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.movimentacaoEtapa.findMany({
      where: { atividade: { deletedAt: null, operacao: { empresaId }, ...where } },
      select: { atividadeId: true, etapaDestinoId: true, timestamp: true, tipo: true },
      orderBy: { timestamp: 'asc' },
    }),
    prisma.operacaoMembro.findMany({
      where: {
        operacao: { empresaId },
        ...(escopoOperacaoId ? { operacaoId: escopoOperacaoId as any } : {}),
      },
      select: {
        operacaoId: true,
        usuarioId: true,
        departamentoId: true,
        usuario: { select: { nome: true } },
      },
    }),
  ])

  const cargaPorResponsavel = new Map<string, number>()
  for (const atividade of atividades) {
    cargaPorResponsavel.set(
      atividade.responsavelId,
      (cargaPorResponsavel.get(atividade.responsavelId) ?? 0) + 1
    )
  }

  const membrosPorEquipe = new Map<string, CandidatoResponsavel[]>()
  const membrosPorOperacao = new Map<string, CandidatoResponsavel[]>()
  for (const membro of membros) {
    const candidato: CandidatoResponsavel = {
      usuarioId: membro.usuarioId,
      nome: membro.usuario.nome,
      carga: cargaPorResponsavel.get(membro.usuarioId) ?? 0,
      mesmaEquipe: false,
    }

    const chaveEquipe = `${membro.operacaoId}|${membro.departamentoId ?? ''}`
    const listaEquipe = membrosPorEquipe.get(chaveEquipe) ?? []
    listaEquipe.push(candidato)
    membrosPorEquipe.set(chaveEquipe, listaEquipe)

    const listaOperacao = membrosPorOperacao.get(membro.operacaoId) ?? []
    listaOperacao.push(candidato)
    membrosPorOperacao.set(membro.operacaoId, listaOperacao)
  }

  const itens: ItemRadar[] = atividades.map(atividade => {
    const movsAtividade = movimentacoes.filter(m => m.atividadeId === atividade.id)
    const risco = calcularRisco(atividade as AtividadeRisco, {
      agora,
      movimentacoes: movsAtividade as MovimentacaoAnalitica[],
      cargaPorResponsavel,
      casosAbertos: atividade.casos.length,
      retrabalhos: movsAtividade.filter(m => m.tipo === 'retorno').length,
    })

    const cargaAtual = cargaPorResponsavel.get(atividade.responsavelId) ?? 0
    const chaveEquipe = `${atividade.operacaoId}|${atividade.equipe?.id ?? ''}`
    const candidatos =
      membrosPorEquipe.get(chaveEquipe) ??
      membrosPorOperacao.get(atividade.operacaoId) ??
      []

    return {
      id: atividade.id,
      titulo: atividade.titulo,
      operacaoId: atividade.operacaoId,
      operacao: atividade.operacao?.nome ?? '',
      fluxo: atividade.fluxo?.nome ?? null,
      etapa: atividade.etapaAtual?.nome ?? null,
      equipe: atividade.equipe?.nome ?? null,
      responsavelId: atividade.responsavelId,
      responsavel: atividade.responsavel?.nome ?? 'Sem responsável',
      status: atividade.status,
      prioridade: atividade.prioridade,
      prazoEstimado: atividade.prazoEstimado?.toISOString() ?? null,
      horasNaEtapa: Math.round(horasNaEtapa(atividade, movsAtividade as MovimentacaoAnalitica[], agora)),
      score: risco.score,
      nivel: risco.nivel,
      motivos: risco.motivos,
      sugestao: sugerirResponsavel(candidatos, {
        usuarioId: atividade.responsavelId,
        carga: cargaAtual,
      }),
    }
  })

  itens.sort((a, b) => b.score - a.score || a.horasNaEtapa - b.horasNaEtapa)

  const porEtapa = new Map<string, { etapa: string; fluxo: string; total: number; horas: number }>()
  for (const item of itens) {
    if (!item.etapa) continue
    const chave = `${item.fluxo ?? ''}|${item.etapa}`
    const atual = porEtapa.get(chave) ?? { etapa: item.etapa, fluxo: item.fluxo ?? '', total: 0, horas: 0 }
    atual.total++
    atual.horas += item.horasNaEtapa
    porEtapa.set(chave, atual)
  }

  const gargalo =
    [...porEtapa.values()]
      .map(e => ({ etapa: e.etapa, fluxo: e.fluxo, tempoMedioHoras: Math.round(e.horas / e.total) }))
      .sort((a, b) => b.tempoMedioHoras - a.tempoMedioHoras)[0] ?? null

  const resumoBase = {
    total: itens.length,
    criticas: itens.filter(i => i.nivel === 'critico').length,
    altas: itens.filter(i => i.nivel === 'alto').length,
    medias: itens.filter(i => i.nivel === 'medio').length,
    vencidas: itens.filter(i => i.prazoEstimado && new Date(i.prazoEstimado) < agora).length,
    bloqueadas: itens.filter(i => i.status === 'bloqueado').length,
    sugestoes: itens.filter(i => i.sugestao).length,
    gargalo,
  }

  return {
    itens,
    resumo: {
      ...resumoBase,
      texto: montarResumo(resumoBase),
      iaDisponivel: Boolean(process.env.AI_API_KEY),
      geradoEm: agora.toISOString(),
    },
  }
}

export async function getRadar(
  empresaId: string,
  userId: string,
  nivel: string,
  operacaoId?: string,
  limite = 20
) {
  const { itens } = await carregarRadar(empresaId, userId, nivel, operacaoId)
  return {
    itens: itens.slice(0, Math.max(1, limite)),
    geradoEm: new Date().toISOString(),
  }
}

export async function getResumoRadar(
  empresaId: string,
  userId: string,
  nivel: string,
  operacaoId?: string
) {
  const { resumo } = await carregarRadar(empresaId, userId, nivel, operacaoId)
  return resumo
}

export async function getResumoIA(
  empresaId: string,
  userId: string,
  nivel: string,
  operacaoId?: string
) {
  const resumo = await getResumoRadar(empresaId, userId, nivel, operacaoId)
  if (!process.env.AI_API_KEY) {
    return { texto: resumo.texto, fonte: 'deterministico' as const, iaDisponivel: false }
  }

  const chave = `${empresaId}:${operacaoId ?? 'todas'}`
  const emCache = cacheIA.get(chave)
  if (emCache && emCache.expira > Date.now()) {
    return { texto: emCache.texto, fonte: 'ia' as const, iaDisponivel: true }
  }

  try {
    const base = (process.env.AI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')
    const resposta = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL ?? 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          {
            role: 'system',
            content:
              'Você é um analista de operações. Escreva um resumo curto, objetivo e em português do Brasil, sem inventar dados.',
          },
          { role: 'user', content: JSON.stringify(resumo) },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!resposta.ok) throw new Error(`status ${resposta.status}`)
    const json = (await resposta.json()) as { choices?: { message?: { content?: string } }[] }
    const texto = json.choices?.[0]?.message?.content?.trim()
    if (!texto) throw new Error('resposta vazia')

    cacheIA.set(chave, { texto, expira: Date.now() + 5 * 60 * 1000 })
    return { texto, fonte: 'ia' as const, iaDisponivel: true }
  } catch (err) {
    console.warn('[insights] resumo IA falhou:', err instanceof Error ? err.message : err)
    return { texto: resumo.texto, fonte: 'deterministico' as const, iaDisponivel: true }
  }
}

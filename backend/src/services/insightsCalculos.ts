import { horasNaEtapa, type AtividadeAnalitica, type MovimentacaoAnalitica } from './analyticsCalculos.js'

export type NivelRisco = 'critico' | 'alto' | 'medio' | 'baixo'

export interface AtividadeRisco extends AtividadeAnalitica {
  responsavelId: string
  etapaAtual?: { id: string; nome: string; ordem: number } | null
  fluxo?: { id: string; nome: string } | null
  operacao?: { id: string; nome: string } | null
}

export interface ContextoRisco {
  agora: Date
  movimentacoes: MovimentacaoAnalitica[]
  cargaPorResponsavel: Map<string, number>
  casosAbertos: number
  retrabalhos: number
}

export interface RiscoResultado {
  score: number
  nivel: NivelRisco
  motivos: string[]
}

export interface CandidatoResponsavel {
  usuarioId: string
  nome: string
  carga: number
  mesmaEquipe: boolean
}

export interface SugestaoResponsavel {
  usuarioId: string
  nome: string
  cargaAtual: number
  cargaSugerida: number
}

export interface ResumoRadarEntrada {
  total: number
  criticas: number
  altas: number
  medias: number
  vencidas: number
  bloqueadas: number
  sugestoes: number
  gargalo: { etapa: string; fluxo: string; tempoMedioHoras: number } | null
}

const PESO_PRIORIDADE: Record<string, number> = { urgente: 15, alta: 10, media: 4, baixa: 0 }
const DIA_MS = 24 * 60 * 60 * 1000

export function nivelRisco(score: number): NivelRisco {
  if (score >= 70) return 'critico'
  if (score >= 50) return 'alto'
  if (score >= 30) return 'medio'
  return 'baixo'
}

function descricaoTempo(horas: number) {
  if (horas >= 48) return `${Math.round(horas / 24)}d`
  return `${Math.round(horas)}h`
}

export function calcularRisco(atividade: AtividadeRisco, contexto: ContextoRisco): RiscoResultado {
  const motivos: string[] = []
  let score = 0

  const pesoPrioridade = PESO_PRIORIDADE[atividade.prioridade ?? 'media'] ?? 0
  score += pesoPrioridade
  if (atividade.prioridade === 'urgente') motivos.push('Prioridade urgente')

  if (atividade.prazoEstimado) {
    const dias = (atividade.prazoEstimado.getTime() - contexto.agora.getTime()) / DIA_MS
    if (dias < 0) {
      score += 40
      motivos.push(`Prazo vencido há ${Math.max(1, Math.ceil(-dias))}d`)
    } else if (dias <= 1) {
      score += 25
      motivos.push('Prazo vence em até 1 dia')
    } else if (dias <= 2) {
      score += 15
      motivos.push(`Prazo em ${Math.ceil(dias)}d`)
    }
  }

  const horas = horasNaEtapa(atividade, contexto.movimentacoes, contexto.agora)
  if (horas >= 72) {
    score += 25
    motivos.push(`Parado há ${descricaoTempo(horas)} nesta etapa`)
  } else if (horas >= 24) {
    score += 15
    motivos.push(`Parado há ${descricaoTempo(horas)} nesta etapa`)
  } else if (horas >= 8) {
    score += 8
    motivos.push(`Parado há ${descricaoTempo(horas)} nesta etapa`)
  }

  if (atividade.status === 'bloqueado') {
    score += 20
    motivos.push('Tarefa bloqueada')
  }

  if (contexto.casosAbertos > 0) {
    score += 10
    motivos.push(`${contexto.casosAbertos} caso(s) em aberto`)
  }

  const carga = contexto.cargaPorResponsavel.get(atividade.responsavelId) ?? 0
  if (carga > 8) {
    score += 12
    motivos.push(`Responsável com ${carga} tarefas abertas`)
  } else if (carga > 5) {
    score += 6
    motivos.push(`Responsável com ${carga} tarefas abertas`)
  }

  if (contexto.retrabalhos > 0) {
    score += 8
    motivos.push(`${contexto.retrabalhos} retorno(s) de etapa`)
  }

  const final = Math.min(100, score)
  return { score: final, nivel: nivelRisco(final), motivos: motivos.slice(0, 4) }
}

export function sugerirResponsavel(
  candidatos: CandidatoResponsavel[],
  atual: { usuarioId: string; carga: number }
): SugestaoResponsavel | null {
  const elegiveis = candidatos.filter(c => c.usuarioId !== atual.usuarioId)
  if (elegiveis.length === 0) return null

  const melhor = [...elegiveis].sort(
    (a, b) => a.carga - b.carga || Number(b.mesmaEquipe) - Number(a.mesmaEquipe)
  )[0]

  if (melhor.carga >= atual.carga && atual.carga < 5) return null

  return {
    usuarioId: melhor.usuarioId,
    nome: melhor.nome,
    cargaAtual: atual.carga,
    cargaSugerida: melhor.carga,
  }
}

export function montarResumo(dados: ResumoRadarEntrada): string {
  if (dados.total === 0) {
    return 'Nenhuma tarefa em risco no momento. O fluxo está sob controle.'
  }

  const partes: string[] = []
  partes.push(
    `${dados.total} tarefa(s) exigem atenção: ${dados.criticas} crítica(s), ${dados.altas} alta(s) e ${dados.medias} média(s).`
  )

  if (dados.vencidas > 0 || dados.bloqueadas > 0) {
    partes.push(`${dados.vencidas} com prazo vencido e ${dados.bloqueadas} bloqueada(s).`)
  }

  if (dados.gargalo) {
    const tempo = descricaoTempo(dados.gargalo.tempoMedioHoras)
    partes.push(
      `Maior gargalo: etapa ${dados.gargalo.etapa} (${dados.gargalo.fluxo}), com média de ${tempo} parado.`
    )
  }

  if (dados.sugestoes > 0) {
    partes.push(`Há ${dados.sugestoes} sugestão(ões) de redistribuição de carga.`)
  }

  return partes.join(' ')
}

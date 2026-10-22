export interface MovimentacaoAnalitica {
  atividadeId: string
  etapaDestinoId: string | null
  timestamp: Date
}

export interface AtividadeAnalitica {
  id: string
  titulo: string
  status: string
  prioridade?: string
  createdAt: Date
  dataInicio: Date | null
  dataConclusao: Date | null
  prazoEstimado: Date | null
  etapaAtualId: string | null
  responsavel?: { nome: string } | null
  equipe?: { id: string; nome: string } | null
}

export interface EtapaAnalitica {
  id: string
  nome: string
  ordem: number
  equipe?: { id: string; nome: string } | null
}

export interface EtapaResumo {
  etapaId: string
  etapa: string
  ordem: number
  equipe: string
  wip: number
  concluidas: number
  bloqueadas: number
  tempoMedioHoras: number
  tempoMaxHoras: number
  porEquipe: { equipe: string; wip: number; tempoMedioHoras: number }[]
}

export interface FluxoResumo {
  fluxoId: string
  fluxo: string
  operacaoId: string
  operacao: string
  total: number
  concluidas: number
  progresso: number
  etapas: EtapaResumo[]
}

export interface Gargalo {
  fluxoId: string
  fluxo: string
  operacaoId: string
  operacao: string
  etapaId: string
  etapa: string
  equipe: string
  wip: number
  bloqueadas: number
  tempoMedioHoras: number
  tempoMaxHoras: number
}

export interface PontoSerie {
  rotulo: string
  criadas: number
  concluidas: number
}

export interface SerieResumo {
  pontos: PontoSerie[]
  totalCriadas: number
  totalConcluidas: number
  leadTimeMedioDias: number
}

const HORA_MS = 60 * 60 * 1000
const DIA_MS = 24 * HORA_MS

const arredondar = (valor: number) => Math.round(valor * 10) / 10
const media = (valores: number[]) => (valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : 0)

function inicioDoDia(data: Date) {
  const inicio = new Date(data)
  inicio.setHours(0, 0, 0, 0)
  return inicio
}

export function entradaNaEtapa(atividade: AtividadeAnalitica, movimentacoes: MovimentacaoAnalitica[]): Date {
  const daAtividade = movimentacoes.filter(
    m => m.atividadeId === atividade.id && m.etapaDestinoId === atividade.etapaAtualId
  )
  if (daAtividade.length > 0) {
    return daAtividade.reduce((maior, m) => (m.timestamp > maior ? m.timestamp : maior), daAtividade[0].timestamp)
  }
  return atividade.dataInicio ?? atividade.createdAt
}

export function horasNaEtapa(
  atividade: AtividadeAnalitica,
  movimentacoes: MovimentacaoAnalitica[],
  agora: Date = new Date()
): number {
  const entrada = entradaNaEtapa(atividade, movimentacoes)
  return Math.max(0, (agora.getTime() - entrada.getTime()) / HORA_MS)
}

export function resumirEtapas(
  etapas: EtapaAnalitica[],
  atividades: AtividadeAnalitica[],
  movimentacoes: MovimentacaoAnalitica[],
  agora: Date = new Date()
): EtapaResumo[] {
  return etapas.map(etapa => {
    const cards = atividades.filter(a => a.etapaAtualId === etapa.id)
    const abertos = cards.filter(a => a.status !== 'concluido')
    const tempos = abertos.map(a => horasNaEtapa(a, movimentacoes, agora))

    const porEquipeMap = new Map<string, { wip: number; totalHoras: number }>()
    for (const card of abertos) {
      const chave = card.equipe?.nome ?? 'Sem equipe'
      const atual = porEquipeMap.get(chave) ?? { wip: 0, totalHoras: 0 }
      atual.wip++
      atual.totalHoras += horasNaEtapa(card, movimentacoes, agora)
      porEquipeMap.set(chave, atual)
    }

    return {
      etapaId: etapa.id,
      etapa: etapa.nome,
      ordem: etapa.ordem,
      equipe: etapa.equipe?.nome ?? 'Sem equipe',
      wip: abertos.length,
      concluidas: cards.length - abertos.length,
      bloqueadas: cards.filter(a => a.status === 'bloqueado').length,
      tempoMedioHoras: arredondar(media(tempos)),
      tempoMaxHoras: arredondar(tempos.length ? Math.max(...tempos) : 0),
      porEquipe: [...porEquipeMap.entries()].map(([equipe, dados]) => ({
        equipe,
        wip: dados.wip,
        tempoMedioHoras: arredondar(dados.totalHoras / dados.wip),
      })),
    }
  })
}

export function ranquearGargalos(fluxos: FluxoResumo[], limite = 5): Gargalo[] {
  return fluxos
    .flatMap(fluxo =>
      fluxo.etapas
        .filter(etapa => etapa.wip > 0)
        .map(etapa => ({
          fluxoId: fluxo.fluxoId,
          fluxo: fluxo.fluxo,
          operacaoId: fluxo.operacaoId,
          operacao: fluxo.operacao,
          etapaId: etapa.etapaId,
          etapa: etapa.etapa,
          equipe: etapa.equipe,
          wip: etapa.wip,
          bloqueadas: etapa.bloqueadas,
          tempoMedioHoras: etapa.tempoMedioHoras,
          tempoMaxHoras: etapa.tempoMaxHoras,
        }))
    )
    .sort((a, b) => b.tempoMedioHoras - a.tempoMedioHoras || b.wip - a.wip)
    .slice(0, limite)
}

interface ConfigSerie {
  inicio: Date
  passoMs: number
  total: number
  rotulo: (inicio: Date) => string
}

function configSerie(periodo: string | undefined, agora: Date): ConfigSerie {
  const rotuloDia = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

  if (periodo === 'dia') {
    return {
      inicio: inicioDoDia(agora),
      passoMs: HORA_MS,
      total: 24,
      rotulo: d => `${String(d.getHours()).padStart(2, '0')}h`,
    }
  }

  if (periodo === 'semana') {
    const inicio = inicioDoDia(agora)
    inicio.setDate(inicio.getDate() - 6)
    return { inicio, passoMs: DIA_MS, total: 7, rotulo: rotuloDia }
  }

  if (periodo === 'mes') {
    const inicio = inicioDoDia(agora)
    inicio.setDate(inicio.getDate() - 27)
    return { inicio, passoMs: 7 * DIA_MS, total: 4, rotulo: rotuloDia }
  }

  const inicio = inicioDoDia(agora)
  inicio.setDate(inicio.getDate() - 55)
  return { inicio, passoMs: 7 * DIA_MS, total: 8, rotulo: rotuloDia }
}

function indiceBucket(data: Date, config: ConfigSerie) {
  const indice = Math.floor((data.getTime() - config.inicio.getTime()) / config.passoMs)
  return indice >= 0 && indice < config.total ? indice : -1
}

export function agruparSerie(
  atividades: AtividadeAnalitica[],
  periodo?: string,
  agora: Date = new Date()
): SerieResumo {
  const config = configSerie(periodo, agora)
  const pontos: PontoSerie[] = Array.from({ length: config.total }, (_, i) => ({
    rotulo: config.rotulo(new Date(config.inicio.getTime() + i * config.passoMs)),
    criadas: 0,
    concluidas: 0,
  }))

  for (const atividade of atividades) {
    const criada = indiceBucket(atividade.createdAt, config)
    if (criada >= 0) pontos[criada].criadas++

    if (atividade.dataConclusao) {
      const concluida = indiceBucket(atividade.dataConclusao, config)
      if (concluida >= 0) pontos[concluida].concluidas++
    }
  }

  const concluidasNoPeriodo = atividades.filter(a => {
    if (!a.dataConclusao) return false
    return indiceBucket(a.dataConclusao, config) >= 0
  })

  const leadTimes = concluidasNoPeriodo
    .filter(a => a.dataInicio)
    .map(a => (a.dataConclusao!.getTime() - a.dataInicio!.getTime()) / DIA_MS)

  return {
    pontos,
    totalCriadas: pontos.reduce((s, p) => s + p.criadas, 0),
    totalConcluidas: pontos.reduce((s, p) => s + p.concluidas, 0),
    leadTimeMedioDias: arredondar(media(leadTimes)),
  }
}

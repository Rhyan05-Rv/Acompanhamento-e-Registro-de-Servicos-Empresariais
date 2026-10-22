export type NivelAcesso = 'operacional' | 'gestor'
export type StatusAtividade = 'pendente' | 'em_execucao' | 'revisao' | 'concluido' | 'bloqueado'
export type Prioridade = 'baixa' | 'media' | 'alta' | 'urgente'
export type StatusCaso = 'aberto' | 'em_analise' | 'resolvido'

export interface Empresa {
  id: string
  nome: string
}

export interface Operacao {
  id: string
  empresaId: string
  nome: string
  descricao?: string | null
  _count?: { departamentos: number; atividades: number; casos: number; membros: number }
}

export interface OperacaoMembro {
  id: string
  operacaoId: string
  usuarioId: string
  departamentoId?: string | null
  papel: string
  usuario?: { id: string; nome: string; email: string; funcao: string }
  departamento?: { id: string; nome: string } | null
}

export interface Usuario {
  id: string
  nome: string
  email: string
  funcao: string
  nivelAcesso: NivelAcesso
  empresaId: string
  empresa?: Empresa | null
  membros?: OperacaoMembro[]
}

export interface Departamento {
  id: string
  nome: string
  operacaoId: string
}

export interface EtapaFluxo {
  id: string
  nome: string
  ordem: number
  equipeId: string
  requerAprovacao?: boolean
  equipe?: { id: string; nome: string }
}

export interface Fluxo {
  id: string
  nome: string
  descricao?: string | null
  operacaoId: string
  etapas: EtapaFluxo[]
}

export interface Historico {
  id: string
  atividadeId: string
  usuarioId: string
  acaoExecutada: string
  campo?: string | null
  valorAnterior?: string | null
  valorNovo?: string | null
  alteracaoEstado?: string | null
  timestamp: string
}

export interface MovimentacaoEtapa {
  id: string
  atividadeId: string
  etapaOrigemId?: string | null
  etapaOrigem?: { id: string; nome: string; ordem: number } | null
  etapaDestinoId?: string | null
  etapaDestino?: { id: string; nome: string; ordem: number } | null
  tipo: 'criacao' | 'avanco' | 'retorno'
  movidoPorId: string
  movidoPor?: { id: string; nome: string }
  obs?: string | null
  timestamp: string
}

export interface Anexo {
  id: string
  casoId: string
  nome: string
  caminho: string
  mime?: string | null
  createdAt: string
}

export interface Caso {
  id: string
  operacaoId: string
  operacao?: Operacao | null
  titulo: string
  descricao: string
  status: StatusCaso
  atividadeId?: string | null
  atividade?: { id: string; titulo: string } | null
  equipeId?: string | null
  equipe?: Departamento | null
  registradoPorId: string
  registradoPor?: { id: string; nome: string }
  createdAt: string
  anexos: Anexo[]
}

export interface Atividade {
  id: string
  operacaoId: string
  operacao?: Operacao | null
  titulo: string
  descricao?: string | null
  responsavelId: string
  responsavel: { id: string; nome: string; email: string }
  responsaveis?: { id: string; usuario: { id: string; nome: string; email: string } }[]
  solicitanteId?: string | null
  solicitante?: { id: string; nome: string } | null
  criadoPorId?: string | null
  criadoPor?: { id: string; nome: string } | null
  equipeId?: string | null
  equipe?: Departamento | null
  fluxoId?: string | null
  fluxo?: { id: string; nome: string; etapas?: EtapaFluxo[] } | null
  etapaAtualId?: string | null
  etapaAtual?: { id: string; nome: string; ordem: number; requerAprovacao?: boolean } | null
  status: StatusAtividade
  prioridade: Prioridade
  prazoEstimado?: string | null
  dataInicio?: string | null
  dataConclusao?: string | null
  tempoGastoMin?: number | null
  createdAt: string
  historico?: Historico[]
  movimentacoes?: MovimentacaoEtapa[]
  casos?: Caso[]
}

export interface AuthResponse {
  token: string
  usuario: Usuario
}

export interface Metricas {
  totalAtividades: number
  aderenciaPrazos: number
  tmaMedio: number
  porStatus: { status: string; count: number }[]
  porPrioridade: { prioridade: string; count: number }[]
  carga: { responsavelId: string; responsavel: string; equipe: string; quantidade: number }[]
  cargaPorEquipe: { equipe: string; quantidade: number }[]
  retrabalho: number
}

export interface AndamentoEquipe {
  equipe: string
  total: number
  concluidas: number
  emExecucao: number
  pendentes: number
  bloqueadas: number
  revisao: number
  progresso: number
}

export interface AndamentoFluxo {
  fluxo: string
  total: number
  concluidas: number
  progresso: number
  etapas: { etapa: string; ordem: number; equipe: string; total: number; concluidas: number }[]
}

export interface Andamento {
  porEquipe: AndamentoEquipe[]
  porFluxo: AndamentoFluxo[]
}

export interface EtapaAnalytics {
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

export interface FluxoAnalytics {
  fluxoId: string
  fluxo: string
  operacaoId: string
  operacao: string
  total: number
  concluidas: number
  progresso: number
  etapas: EtapaAnalytics[]
}

export interface CardParado {
  id: string
  titulo: string
  responsavel: string
  prazoEstimado: string | null
  horasNaEtapa: number
  status: StatusAtividade
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
  cardsParados: CardParado[]
}

export interface FluxoAnalyticsResponse {
  fluxos: FluxoAnalytics[]
  gargalos: Gargalo[]
  geradoEm: string
}

export interface SeriePonto {
  rotulo: string
  criadas: number
  concluidas: number
}

export interface SerieAnalytics {
  pontos: SeriePonto[]
  totalCriadas: number
  totalConcluidas: number
  leadTimeMedioDias: number
  wipAtual: number
  bloqueadas: number
  geradoEm: string
}

export type NivelRisco = 'critico' | 'alto' | 'medio' | 'baixo'

export interface SugestaoResponsavel {
  usuarioId: string
  nome: string
  cargaAtual: number
  cargaSugerida: number
}

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
  status: StatusAtividade
  prioridade: Prioridade
  prazoEstimado: string | null
  horasNaEtapa: number
  score: number
  nivel: NivelRisco
  motivos: string[]
  sugestao: SugestaoResponsavel | null
}

export interface RadarResponse {
  itens: ItemRadar[]
  geradoEm: string
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

export interface ResumoIARadar {
  texto: string
  fonte: 'ia' | 'deterministico'
  iaDisponivel: boolean
}

export interface PlaybookItem {
  id: string
  playbookId: string
  titulo: string
  descricao?: string | null
  prioridade: Prioridade
  equipeId?: string | null
  equipe?: { id: string; nome: string } | null
  etapaId?: string | null
  etapa?: {
    id: string
    nome: string
    ordem: number
    equipeId: string
    equipe?: { id: string; nome: string } | null
    fluxo?: { id: string; nome: string } | null
  } | null
  offsetDias: number
  ordem: number
}

export interface Playbook {
  id: string
  empresaId: string
  operacaoId?: string | null
  operacao?: { id: string; nome: string } | null
  nome: string
  descricao?: string | null
  criadoPorId: string
  frequencia?: 'diaria' | 'semanal' | 'mensal' | null
  proximaEm?: string | null
  ultimaEm?: string | null
  ativa: boolean
  itens: PlaybookItem[]
  createdAt: string
}

export type StatusAprovacao = 'pendente' | 'aprovada' | 'rejeitada'

export interface AprovacaoEtapa {
  id: string
  atividadeId: string
  etapaId: string
  status: StatusAprovacao
  etapa?: { id: string; nome: string; ordem: number; requerAprovacao: boolean }
  solicitadoPor?: { id: string; nome: string }
  decididoPor?: { id: string; nome: string } | null
  comentario?: string | null
  createdAt: string
  decididoEm?: string | null
}

export interface AprovacaoPendente extends AprovacaoEtapa {
  atividade?: {
    id: string
    titulo: string
    operacao?: { id: string; nome: string }
    etapaAtual?: { id: string; nome: string; ordem: number } | null
    responsavel?: { id: string; nome: string }
  }
}

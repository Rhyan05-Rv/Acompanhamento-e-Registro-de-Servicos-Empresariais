import type { Prioridade, StatusAtividade, StatusCaso } from '../types'

interface Meta {
  label: string
  badge: string
  soft?: string
  dot?: string
  bar?: string
  border?: string
  chart?: string
}

export const STATUS: Record<StatusAtividade, Meta> = {
  pendente: {
    label: 'Pendente',
    badge: 'bg-pendente-soft text-pendente',
    soft: 'bg-pendente-soft',
    bar: 'bg-pendente',
    border: 'border-pendente',
    chart: 'var(--pendente)',
  },
  em_execucao: {
    label: 'Em Execução',
    badge: 'bg-execucao-soft text-execucao',
    soft: 'bg-execucao-soft',
    bar: 'bg-execucao',
    border: 'border-execucao',
    chart: 'var(--execucao)',
  },
  revisao: {
    label: 'Revisão',
    badge: 'bg-revisao-soft text-revisao',
    soft: 'bg-revisao-soft',
    bar: 'bg-revisao',
    border: 'border-revisao',
    chart: 'var(--revisao)',
  },
  concluido: {
    label: 'Concluído',
    badge: 'bg-concluido-soft text-concluido',
    soft: 'bg-concluido-soft',
    bar: 'bg-concluido',
    border: 'border-concluido',
    chart: 'var(--concluido)',
  },
  bloqueado: {
    label: 'Bloqueado',
    badge: 'bg-bloqueado-soft text-bloqueado',
    soft: 'bg-bloqueado-soft',
    bar: 'bg-bloqueado',
    border: 'border-bloqueado',
    chart: 'var(--bloqueado)',
  },
}

export const STATUS_ORDEM: StatusAtividade[] = [
  'pendente',
  'em_execucao',
  'revisao',
  'concluido',
  'bloqueado',
]

export const PRIORIDADE: Record<Prioridade, Meta> = {
  baixa: {
    label: 'Baixa',
    badge: 'bg-prio-baixa-soft text-prio-baixa',
    dot: 'bg-prio-baixa',
    chart: 'var(--prio-baixa)',
  },
  media: {
    label: 'Média',
    badge: 'bg-prio-media-soft text-prio-media',
    dot: 'bg-prio-media',
    chart: 'var(--prio-media)',
  },
  alta: {
    label: 'Alta',
    badge: 'bg-prio-alta-soft text-prio-alta',
    dot: 'bg-prio-alta',
    chart: 'var(--prio-alta)',
  },
  urgente: {
    label: 'Urgente',
    badge: 'bg-prio-urgente-soft text-prio-urgente',
    dot: 'bg-prio-urgente',
    chart: 'var(--prio-urgente)',
  },
}

export const CASO: Record<StatusCaso, Meta> = {
  aberto: { label: 'Aberto', badge: 'bg-bloqueado-soft text-bloqueado' },
  em_analise: { label: 'Em análise', badge: 'bg-pendente-soft text-pendente' },
  resolvido: { label: 'Resolvido', badge: 'bg-concluido-soft text-concluido' },
}

export const CASO_ORDEM: StatusCaso[] = ['aberto', 'em_analise', 'resolvido']

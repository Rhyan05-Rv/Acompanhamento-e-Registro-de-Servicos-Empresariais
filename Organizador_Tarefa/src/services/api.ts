import type {
  Andamento,
  AuthResponse,
  Atividade,
  Caso,
  Departamento,
  Empresa,
  EtapaFluxo,
  AprovacaoEtapa,
  AprovacaoPendente,
  Fluxo,
  FluxoAnalyticsResponse,
  Metricas,
  Operacao,
  OperacaoMembro,
  Playbook,
  RadarResponse,
  ResumoIARadar,
  ResumoRadar,
  SerieAnalytics,
  Usuario,
} from '../types'

export type { Andamento, Metricas } from '../types'

const BASE = '/api'

interface ErroApi {
  error?: string
  code?: string
  requestId?: string
}

function getToken() {
  return localStorage.getItem('token')
}

const isRotaAuth = (path: string) => path.startsWith('/auth/')

let requisicoesAtivas = 0
let timerCursor: number | undefined

function iniciarCursorCarregando() {
  if (typeof document === 'undefined') return

  requisicoesAtivas++
  if (requisicoesAtivas !== 1) return

  timerCursor = window.setTimeout(() => {
    document.documentElement.dataset.carregando = 'true'
  }, 120)
}

function finalizarCursorCarregando() {
  if (typeof document === 'undefined') return

  requisicoesAtivas = Math.max(0, requisicoesAtivas - 1)
  if (requisicoesAtivas > 0) return

  if (timerCursor !== undefined) window.clearTimeout(timerCursor)
  timerCursor = undefined
  delete document.documentElement.dataset.carregando
}

async function lerErro(res: Response, path: string, method: string, token: string | null): Promise<never> {
  const body = (await res.json().catch(() => null)) as ErroApi | null
  const requestId = body?.requestId ?? res.headers.get('x-request-id') ?? undefined
  const mensagem = body?.error || `HTTP ${res.status}`

  if (res.status === 401 && token && !isRotaAuth(path)) {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    if (window.location.pathname !== '/login') window.location.href = '/login'
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  if (res.status >= 500) {
    console.error(`[api] ${method} ${path} → ${res.status}`, {
      code: body?.code,
      requestId,
    })
  }

  throw new Error(requestId ? `${mensagem} (ref: ${requestId})` : mensagem)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  iniciarCursorCarregando()
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers })
  } catch {
    throw new Error('Não foi possível conectar à API. Verifique se o backend está rodando.')
  } finally {
    finalizarCursorCarregando()
  }

  if (!res.ok) return lerErro(res, path, options.method ?? 'GET', token)

  if (res.status === 204) return undefined as T
  return res.json()
}

function qs(params?: Record<string, string | undefined>) {
  const clean: Record<string, string> = {}
  for (const [k, v] of Object.entries(params ?? {})) if (v) clean[k] = v
  const query = new URLSearchParams(clean).toString()
  return query ? `?${query}` : ''
}

export const api = {
  auth: {
    login: (email: string, senha: string) =>
      request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) }),
    register: (data: { empresaNome: string; nome: string; email: string; senha: string; funcao?: string }) =>
      request<{ usuario: Usuario; empresa: Empresa }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  empresas: {
    atual: () => request<Empresa>('/empresas'),
  },
  operacoes: {
    list: () => request<Operacao[]>('/operacoes'),
    get: (id: string) => request<Operacao & { departamentos: Departamento[]; fluxos: Fluxo[] }>(`/operacoes/${id}`),
    create: (data: { nome: string; descricao?: string }) =>
      request<Operacao>('/operacoes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { nome: string; descricao?: string }) =>
      request<Operacao>(`/operacoes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    membros: (id: string) => request<OperacaoMembro[]>(`/operacoes/${id}/membros`),
    definirMembro: (id: string, data: { usuarioId: string; departamentoId?: string | null; papel?: string }) =>
      request<OperacaoMembro>(`/operacoes/${id}/membros`, { method: 'PUT', body: JSON.stringify(data) }),
    removerMembro: (id: string, usuarioId: string) =>
      request<void>(`/operacoes/${id}/membros/${usuarioId}`, { method: 'DELETE' }),
  },
  atividades: {
    list: (params?: {
      status?: string
      responsavelId?: string
      prioridade?: string
      operacaoId?: string
      equipeId?: string
      fluxoId?: string
      etapaAtualId?: string
      periodo?: string
    }) => request<Atividade[]>(`/atividades${qs(params)}`),
    get: (id: string) => request<Atividade>(`/atividades/${id}`),
    create: (data: Partial<Atividade>) =>
      request<Atividade>('/atividades', { method: 'POST', body: JSON.stringify(data) }),
    edit: (id: string, data: Partial<Atividade>) =>
      request<Atividade>(`/atividades/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    updateStatus: (id: string, status: string) =>
      request<Atividade>(`/atividades/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    avancarEtapa: (id: string) => request<Atividade>(`/atividades/${id}/avancar-etapa`, { method: 'POST' }),
    retornarEtapa: (id: string) => request<Atividade>(`/atividades/${id}/retornar-etapa`, { method: 'POST' }),
    adicionarResponsavel: (id: string, usuarioId: string) =>
      request<Atividade>(`/atividades/${id}/responsaveis`, { method: 'POST', body: JSON.stringify({ usuarioId }) }),
    removerResponsavel: (id: string, usuarioId: string) =>
      request<Atividade>(`/atividades/${id}/responsaveis/${usuarioId}`, { method: 'DELETE' }),
    delete: (id: string) => request<void>(`/atividades/${id}`, { method: 'DELETE' }),
  },
  usuarios: {
    list: () => request<Usuario[]>('/usuarios'),
    get: (id: string) => request<Usuario>(`/usuarios/${id}`),
    create: (data: { nome: string; email: string; senha: string; funcao: string; nivelAcesso?: string }) =>
      request<Usuario>('/usuarios', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Usuario>(`/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  departamentos: {
    list: (operacaoId?: string) => request<Departamento[]>(`/departamentos${qs({ operacaoId })}`),
    create: (nome: string, operacaoId: string) =>
      request<Departamento>('/departamentos', { method: 'POST', body: JSON.stringify({ nome, operacaoId }) }),
    update: (id: string, nome: string) =>
      request<Departamento>(`/departamentos/${id}`, { method: 'PATCH', body: JSON.stringify({ nome }) }),
    remove: (id: string) => request<void>(`/departamentos/${id}`, { method: 'DELETE' }),
  },
  fluxos: {
    list: (operacaoId?: string) => request<Fluxo[]>(`/fluxos${qs({ operacaoId })}`),
    create: (data: { operacaoId: string; nome: string; descricao?: string; etapas: { nome: string; equipeId: string }[] }) =>
      request<Fluxo>('/fluxos', { method: 'POST', body: JSON.stringify(data) }),
    adicionarEtapa: (fluxoId: string, data: { nome: string; equipeId: string }) =>
      request<EtapaFluxo>(`/fluxos/${fluxoId}/etapas`, { method: 'POST', body: JSON.stringify(data) }),
    removerEtapa: (etapaId: string) => request<void>(`/fluxos/etapas/${etapaId}`, { method: 'DELETE' }),
    atualizarEtapa: (etapaId: string, requerAprovacao: boolean) =>
      request<EtapaFluxo>(`/fluxos/etapas/${etapaId}`, {
        method: 'PATCH',
        body: JSON.stringify({ requerAprovacao }),
      }),
  },
  casos: {
    list: (params?: { status?: string; operacaoId?: string; equipeId?: string }) =>
      request<Caso[]>(`/casos${qs(params)}`),
    get: (id: string) => request<Caso>(`/casos/${id}`),
    create: (data: { titulo: string; descricao: string; operacaoId?: string; atividadeId?: string; equipeId?: string }) =>
      request<Caso>('/casos', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (id: string, status: string) =>
      request<Caso>(`/casos/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    uploadAnexo: async (id: string, arquivo: File) => {
      const form = new FormData()
      form.append('arquivo', arquivo)
      const token = getToken()
      const path = `/casos/${id}/anexos`

      let res: Response
      iniciarCursorCarregando()
      try {
        res = await fetch(`${BASE}${path}`, {
          method: 'POST',
          body: form,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
      } catch {
        throw new Error('Não foi possível conectar à API. Verifique se o backend está rodando.')
      } finally {
        finalizarCursorCarregando()
      }

      if (!res.ok) return lerErro(res, path, 'POST', token)
      return res.json()
    },
  },
  metricas: {
    get: (periodo?: string, operacaoId?: string) =>
      request<Metricas>(`/metricas${qs({ periodo, operacaoId })}`),
    andamento: (operacaoId?: string) => request<Andamento>(`/metricas/andamento${qs({ operacaoId })}`),
    fluxo: (operacaoId?: string) => request<FluxoAnalyticsResponse>(`/metricas/fluxo${qs({ operacaoId })}`),
    serie: (periodo?: string, operacaoId?: string) =>
      request<SerieAnalytics>(`/metricas/serie${qs({ periodo, operacaoId })}`),
  },
  insights: {
    risco: (operacaoId?: string, limite?: number) =>
      request<RadarResponse>(
        `/insights/risco${qs({ operacaoId, limite: limite ? String(limite) : undefined })}`
      ),
    resumo: (operacaoId?: string) => request<ResumoRadar>(`/insights/resumo${qs({ operacaoId })}`),
    resumoIA: (operacaoId?: string) =>
      request<ResumoIARadar>(`/insights/resumo-ia${qs({ operacaoId })}`, { method: 'POST' }),
  },
  playbooks: {
    list: (operacaoId?: string) => request<Playbook[]>(`/playbooks${qs({ operacaoId })}`),
    create: (data: {
      nome: string
      descricao?: string
      operacaoId: string
      frequencia?: 'diaria' | 'semanal' | 'mensal' | null
      itens: {
        titulo: string
        descricao?: string
        prioridade: string
        equipeId?: string | null
        etapaId?: string | null
        offsetDias: number
      }[]
    }) => request<Playbook>('/playbooks', { method: 'POST', body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/playbooks/${id}`, { method: 'DELETE' }),
    executar: (id: string) =>
      request<{ criadas: number; operacaoId: string }>(`/playbooks/${id}/executar`, {
        method: 'POST',
      }),
    processarRecorrentes: () =>
      request<{ executados: number; falhas: number }>('/playbooks/processar-recorrentes', {
        method: 'POST',
      }),
  },
  aprovacoes: {
    pendentes: () => request<AprovacaoPendente[]>('/aprovacoes/pendentes'),
    list: (atividadeId: string) =>
      request<AprovacaoEtapa[]>(`/atividades/${atividadeId}/aprovacoes`),
    solicitar: (atividadeId: string) =>
      request<AprovacaoEtapa>(`/atividades/${atividadeId}/aprovacoes`, { method: 'POST' }),
    decidir: (id: string, decisao: 'aprovada' | 'rejeitada', comentario?: string) =>
      request<AprovacaoEtapa>(`/aprovacoes/${id}/decidir`, {
        method: 'POST',
        body: JSON.stringify({ decisao, comentario }),
      }),
  },
}

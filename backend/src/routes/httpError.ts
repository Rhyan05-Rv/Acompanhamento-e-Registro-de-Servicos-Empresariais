import type { Response } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { AppError } from '../services/errors.js'

interface ErroApi {
  error: string
  code?: string
  details?: unknown
}

function logar(err: unknown, res: Response, status: number, code?: string) {
  const req = res.req
  const detalhe = {
    horario: new Date().toISOString(),
    requestId: res.locals?.requestId,
    metodo: req?.method,
    rota: req?.originalUrl,
    status,
    codigo: code,
    nome: err instanceof Error ? err.name : typeof err,
    mensagem: err instanceof Error ? err.message : String(err),
  }

  if (status >= 500) {
    console.error('[erro]', detalhe)
    if (err instanceof Error && err.stack) console.error(err.stack)
  } else {
    console.warn('[aviso]', detalhe)
  }
}

function responder(res: Response, status: number, body: ErroApi) {
  if (res.headersSent) return
  const requestId = res.locals?.requestId as string | undefined
  res.status(status).json({ ...body, ...(requestId ? { requestId } : {}) })
}

export function responderErro(err: unknown, res: Response) {
  if (res.headersSent) return

  if (err instanceof AppError) {
    logar(err, res, err.status)
    return responder(res, err.status, { error: err.message })
  }

  if (err instanceof z.ZodError) {
    logar(err, res, 400, 'VALIDACAO')
    return responder(res, 400, {
      error: 'Dados inválidos',
      code: 'VALIDACAO',
      details: err.errors,
    })
  }

  if (err instanceof SyntaxError && 'body' in err) {
    logar(err, res, 400, 'JSON_INVALIDO')
    return responder(res, 400, {
      error: 'JSON inválido no corpo da requisição',
      code: 'JSON_INVALIDO',
    })
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    logar(err, res, 503, 'DB_UNAVAILABLE')
    return responder(res, 503, {
      error: 'Banco de dados indisponível. Verifique DATABASE_URL e o arquivo do banco.',
      code: 'DB_UNAVAILABLE',
    })
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapa: Record<string, { status: number; error: string; code: string }> = {
      P2002: { status: 409, error: 'Registro duplicado', code: 'CONFLITO' },
      P2003: { status: 409, error: 'Registro referenciado não existe', code: 'CONFLITO' },
      P2025: { status: 404, error: 'Registro não encontrado', code: 'NAO_ENCONTRADO' },
    }
    const alvo = mapa[err.code] ?? { status: 500, error: 'Erro interno', code: 'INTERNO' }
    logar(err, res, alvo.status, err.code)
    return responder(res, alvo.status, { error: alvo.error, code: alvo.code })
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    logar(err, res, 400, 'DADOS_INVALIDOS')
    return responder(res, 400, {
      error: 'Dados inválidos para o banco',
      code: 'DADOS_INVALIDOS',
    })
  }

  logar(err, res, 500, 'INTERNO')
  responder(res, 500, { error: 'Erro interno', code: 'INTERNO' })
}

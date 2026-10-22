import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { registrarEmpresa, autenticar } from '../services/authService.js'
import { responderErro } from './httpError.js'

const router = Router()

function mascararEmail(email: string) {
  const [nome, dominio] = email.split('@')
  return `${nome.slice(0, 2)}***@${dominio ?? '?'}`
}

const registerSchema = z.object({
  empresaNome: z.string().min(1),
  nome: z.string().min(1),
  email: z.string().email(),
  senha: z.string().min(6),
  funcao: z.string().min(1).optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string(),
})

router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body)
    const result = await registrarEmpresa(data)
    if ('erro' in result) {
      return res.status(400).json({ error: result.erro })
    }
    console.info(
      `[auth] empresa cadastrada rid=${res.locals.requestId} empresa=${result.empresa.id} usuario=${result.usuario.id}`
    )
    return res.status(201).json(result)
  } catch (err) {
    return responderErro(err, res)
  }
})

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, senha } = loginSchema.parse(req.body)
    const result = await autenticar(email, senha)
    if (!result) {
      console.warn(`[auth] login recusado rid=${res.locals.requestId} email=${mascararEmail(email)}`)
      return res.status(401).json({ error: 'Email ou senha inválidos' })
    }
    console.info(
      `[auth] login ok rid=${res.locals.requestId} usuario=${result.usuario.id} empresa=${result.usuario.empresaId}`
    )
    return res.json(result)
  } catch (err) {
    return responderErro(err, res)
  }
})

export default router

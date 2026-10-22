import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AuthShell } from '../components/AuthShell'
import { Field } from '../components/ui/Field'
import { Loader2, LogIn } from 'lucide-react'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      await login(email, senha)
      navigate('/')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <h1 className="font-display text-[1.8rem] font-semibold leading-tight text-content mb-1">Bem-vindo de volta</h1>
      <p className="muted mb-6">Entre para continuar gerenciando suas operações.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="voce@empresa.com"
            className="input"
            required
          />
        </Field>

        <Field label="Senha">
          <input
            type="password"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            placeholder="••••••••"
            className="input"
            required
          />
        </Field>

        {erro && (
          <p className="text-sm text-bloqueado bg-bloqueado-soft rounded-lg px-3 py-2">{erro}</p>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          Entrar
        </button>
      </form>

      <div className="mt-6 p-3 rounded-xl bg-surface-muted border border-border">
        <p className="text-xs text-content-subtle text-center">
          Contas demo: <b className="text-content-muted">admin@aurora.com</b> ·{' '}
          <b className="text-content-muted">admin@beta.com</b> · senha 123456
        </p>
      </div>

      <p className="text-sm text-center mt-5 text-content-muted">
        Não tem conta?{' '}
        <Link to="/register" className="text-primary font-medium hover:underline">
          Cadastrar empresa
        </Link>
      </p>
    </AuthShell>
  )
}

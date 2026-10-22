import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { AuthShell } from '../components/AuthShell'
import { Field } from '../components/ui/Field'
import { Loader2, Building2 } from 'lucide-react'

export function RegistroPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ empresaNome: '', nome: '', email: '', senha: '', funcao: 'Gestor' })
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      await api.auth.register(form)
      await login(form.email, form.senha)
      navigate('/')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao cadastrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <h1 className="font-display text-[1.8rem] font-semibold leading-tight text-content mb-1">Cadastrar empresa</h1>
      <p className="muted mb-6">Cria a empresa e o usuário gestor inicial.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome da empresa">
          <input
            value={form.empresaNome}
            onChange={e => setForm(f => ({ ...f, empresaNome: e.target.value }))}
            placeholder="Ex.: Aurora Indústria"
            className="input"
            required
          />
        </Field>
        <Field label="Seu nome">
          <input
            value={form.nome}
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            placeholder="Nome completo"
            className="input"
            required
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="voce@empresa.com"
            className="input"
            required
          />
        </Field>
        <Field label="Senha">
          <input
            type="password"
            value={form.senha}
            onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
            placeholder="Mínimo 6 caracteres"
            className="input"
            minLength={6}
            required
          />
        </Field>

        {erro && (
          <p className="text-sm text-bloqueado bg-bloqueado-soft rounded-lg px-3 py-2">{erro}</p>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
          Criar empresa
        </button>
      </form>

      <p className="text-sm text-center mt-5 text-content-muted">
        Já tem conta?{' '}
        <Link to="/login" className="text-primary font-medium hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  )
}

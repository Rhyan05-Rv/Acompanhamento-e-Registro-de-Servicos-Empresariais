import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '../services/api'
import type { Atividade, Caso, Departamento, StatusCaso } from '../types'
import { Plus, Paperclip } from 'lucide-react'
import { CASO, CASO_ORDEM } from '../theme/status'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { Spinner } from '../components/ui/Spinner'

export function CasosPage({ operacaoId }: { operacaoId?: string } = {}) {
  const [casos, setCasos] = useState<Caso[]>([])
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [equipes, setEquipes] = useState<Departamento[]>([])
  const [filtro, setFiltro] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNovo, setShowNovo] = useState(false)
  const [selecionado, setSelecionado] = useState<Caso | null>(null)

  const carregar = useCallback(async () => {
    const [c, a, d] = await Promise.all([
      api.casos.list({ ...(filtro ? { status: filtro } : {}), operacaoId }),
      api.atividades.list({ operacaoId }),
      api.departamentos.list(operacaoId),
    ])
    setCasos(c)
    setAtividades(a)
    setEquipes(d)
  }, [filtro, operacaoId])

  useEffect(() => {
    carregar().finally(() => setLoading(false))
  }, [carregar])

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      <PageHeader titulo="Casos / Ocorrências" subtitulo="Registro de imprevistos operacionais.">
        <button onClick={() => setShowNovo(true)} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Novo caso
        </button>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {['', ...CASO_ORDEM].map(s => (
          <button
            key={s}
            onClick={() => setFiltro(s)}
            className={`pill ${filtro === s ? 'pill-active' : ''}`}
          >
            {s === '' ? 'Todos' : CASO[s as StatusCaso].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {casos.map(c => (
            <button
              key={c.id}
              onClick={() => setSelecionado(c)}
              className="text-left card card-hover p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-content">{c.titulo}</p>
                <span className={`badge ${CASO[c.status].badge}`}>{CASO[c.status].label}</span>
              </div>
              <p className="text-sm text-content-muted mt-1 line-clamp-2">{c.descricao}</p>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-content-subtle">
                <span>por {c.registradoPor?.nome}</span>
                <span>{new Date(c.createdAt).toLocaleString('pt-BR')}</span>
                {c.anexos.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Paperclip className="w-3 h-3" /> {c.anexos.length}
                  </span>
                )}
              </div>
            </button>
          ))}
          {casos.length === 0 && (
            <div className="card p-10 text-center lg:col-span-2">
              <p className="text-content-subtle">Nenhum caso registrado.</p>
            </div>
          )}
        </div>
      )}

      {showNovo && (
        <NovoCasoModal
          atividades={atividades}
          equipes={equipes}
          operacaoId={operacaoId}
          onClose={() => setShowNovo(false)}
          onCreated={() => {
            setShowNovo(false)
            carregar()
          }}
        />
      )}

      {selecionado && (
        <CasoDetalhe
          caso={selecionado}
          onClose={() => setSelecionado(null)}
          onChanged={async () => {
            await carregar()
            const atualizado = await api.casos.get(selecionado.id)
            setSelecionado(atualizado)
          }}
        />
      )}
    </div>
  )
}

function NovoCasoModal({
  atividades,
  equipes,
  operacaoId,
  onClose,
  onCreated,
}: {
  atividades: Atividade[]
  equipes: Departamento[]
  operacaoId?: string
  onClose: () => void
  onCreated: () => void
}) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [atividadeId, setAtividadeId] = useState('')
  const [equipeId, setEquipeId] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const caso = await api.casos.create({
        titulo,
        descricao,
        operacaoId,
        atividadeId: atividadeId || undefined,
        equipeId: equipeId || undefined,
      })
      if (arquivo) await api.casos.uploadAnexo(caso.id, arquivo)
      onCreated()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar caso')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Novo caso">
      <form onSubmit={submit} className="space-y-3">
        <input
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          placeholder="Título (ex.: Máquina explodiu)"
          className="input"
          required
        />
        <textarea
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
          placeholder="Descrição do ocorrido"
          className="input"
          rows={3}
          required
        />
        <select value={atividadeId} onChange={e => setAtividadeId(e.target.value)} className="input">
          <option value="">Tarefa afetada (opcional)</option>
          {atividades.map(a => (
            <option key={a.id} value={a.id}>{a.titulo}</option>
          ))}
        </select>
        <select value={equipeId} onChange={e => setEquipeId(e.target.value)} className="input">
          <option value="">Equipe afetada (opcional)</option>
          {equipes.map(eq => (
            <option key={eq.id} value={eq.id}>{eq.nome}</option>
          ))}
        </select>
        <input type="file" onChange={e => setArquivo(e.target.files?.[0] ?? null)} className="input !py-2 text-sm" />
        {erro && <p className="text-sm text-bloqueado bg-bloqueado-soft rounded-lg px-3 py-2">{erro}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading && <Spinner className="w-4 h-4 !border-2 !border-current" />} Registrar
          </button>
        </div>
      </form>
    </Modal>
  )
}

function CasoDetalhe({
  caso,
  onClose,
  onChanged,
}: {
  caso: Caso
  onClose: () => void
  onChanged: () => Promise<void>
}) {
  const [enviando, setEnviando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function mudarStatus(status: string) {
    await api.casos.updateStatus(caso.id, status)
    await onChanged()
  }

  async function enviarAnexo(file: File) {
    setEnviando(true)
    try {
      await api.casos.uploadAnexo(caso.id, file)
      await onChanged()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      onClose={onClose}
      size="xl"
      title={
        <div>
          <span className="block">{caso.titulo}</span>
          <span className={`badge mt-1 ${CASO[caso.status].badge}`}>{CASO[caso.status].label}</span>
        </div>
      }
    >
      <p className="text-sm text-content mb-3">{caso.descricao}</p>
      <div className="text-xs text-content-muted space-y-1 mb-4">
        <p>Registrado por <b className="text-content">{caso.registradoPor?.nome}</b> em {new Date(caso.createdAt).toLocaleString('pt-BR')}</p>
        {caso.equipe && <p>Equipe afetada: <b className="text-content">{caso.equipe.nome}</b></p>}
        {caso.atividade && <p>Tarefa afetada: <b className="text-content">{caso.atividade.titulo}</b></p>}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {CASO_ORDEM.map(s => (
          <button
            key={s}
            onClick={() => mudarStatus(s)}
            className={`btn btn-sm ${caso.status === s ? 'btn-primary' : 'btn-secondary'}`}
          >
            {CASO[s].label}
          </button>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-content mb-2">Anexos</h3>
        <ul className="space-y-1 mb-2">
          {caso.anexos.map(a => (
            <li key={a.id}>
              <a href={a.caminho} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                <Paperclip className="w-3 h-3" /> {a.nome}
              </a>
            </li>
          ))}
          {caso.anexos.length === 0 && <li className="text-sm text-content-subtle">Nenhum anexo.</li>}
        </ul>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) enviarAnexo(f)
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={enviando}
          className="btn btn-secondary btn-sm"
        >
          {enviando ? 'Enviando...' : 'Adicionar anexo'}
        </button>
      </div>
    </Modal>
  )
}

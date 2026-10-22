import { useCallback, useState, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from './confirm-context'
import { Modal } from '../components/ui/Modal'

interface Estado {
  opcoes: ConfirmOptions
  resolve: (valor: boolean) => void
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado | null>(null)

  const confirm = useCallback<ConfirmFn>(
    opcoes => new Promise<boolean>(resolve => setEstado({ opcoes, resolve })),
    [],
  )

  function fechar(valor: boolean) {
    estado?.resolve(valor)
    setEstado(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {estado && (
        <Modal onClose={() => fechar(false)} size="sm">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-bloqueado-soft text-bloqueado flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-content">{estado.opcoes.titulo}</h2>
              {estado.opcoes.mensagem && <p className="text-sm text-content-muted mt-1">{estado.opcoes.mensagem}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => fechar(false)} className="btn btn-secondary">Cancelar</button>
            <button
              onClick={() => fechar(true)}
              className={`btn ${estado.opcoes.danger === false ? 'btn-primary' : 'btn-danger-solid'}`}
            >
              {estado.opcoes.confirmLabel ?? 'Confirmar'}
            </button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  )
}

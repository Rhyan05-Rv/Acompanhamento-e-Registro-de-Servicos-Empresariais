import { KanbanSquare, GitBranch, ShieldCheck } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { BrandMark } from './Brand'

const destaques = [
  { icon: KanbanSquare, titulo: 'Kanban por equipe', texto: 'Fluxo de trabalho visual e ordenado.' },
  { icon: GitBranch, titulo: 'Grades e etapas', texto: 'Cada tarefa avança pela equipe certa.' },
  { icon: ShieldCheck, titulo: 'Auditoria imutável', texto: 'Histórico completo de cada mudança.' },
]

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-background">
      <aside className="auth-hero hidden lg:flex w-[46%] overflow-hidden text-white p-12 flex-col justify-between">
        <div className="auth-orb -top-28 -left-24 w-96 h-96 bg-[#a9c86e]/25" />
        <div className="auth-orb bottom-0 right-0 w-80 h-80 bg-[#a94a2f]/35" style={{ animationDelay: '-7s' }} />

        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/15">
            <BrandMark className="w-7 h-7" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">Organizador de Tarefas</span>
        </div>

        <div className="relative">
          <h2 className="font-display text-4xl font-semibold leading-[1.1] mb-4">
            Organize o trabalho,
            <br />
            impulsione a equipe.
          </h2>
          <p className="text-white/75 mb-8 max-w-sm">
            Centralize operações, equipes e tarefas em um fluxo claro — do pedido à entrega.
          </p>
          <ul className="space-y-4">
            {destaques.map(d => (
              <li key={d.titulo} className="flex items-start gap-3">
                <div className="w-9 h-9 shrink-0 rounded-lg bg-white/10 flex items-center justify-center border border-white/15">
                  <d.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{d.titulo}</p>
                  <p className="text-white/65 text-sm">{d.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-white/50 text-xs">
          © {new Date().getFullYear()} Organizador de Tarefas
        </p>
      </aside>

      <main className="flex-1 relative flex items-center justify-center p-6">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md animate-slide-up">{children}</div>
      </main>
    </div>
  )
}

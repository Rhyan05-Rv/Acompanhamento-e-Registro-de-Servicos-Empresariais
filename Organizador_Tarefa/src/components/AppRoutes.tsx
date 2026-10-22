import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AuthProvider } from '../context/AuthProvider'
import { ToastProvider } from '../context/ToastProvider'
import { ConfirmProvider } from '../context/ConfirmProvider'
import { api } from '../services/api'
import type { Operacao } from '../types'
import { LoginPage } from '../pages/LoginPage'
import { RegistroPage } from '../pages/RegistroPage'
import { ThemeToggle } from './ThemeToggle'
import { BrandMark } from './Brand'
import { FullPageSpinner } from './ui/Spinner'
import {
  LayoutDashboard,
  Boxes,
  Settings,
  LogOut,
  Building2,
  Menu,
  Radar,
  BookOpen,
  ShieldCheck,
} from 'lucide-react'

const DashboardPage = lazy(() => import('../pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const RadarPage = lazy(() => import('../pages/RadarPage').then(m => ({ default: m.RadarPage })))
const PlaybooksPage = lazy(() => import('../pages/PlaybooksPage').then(m => ({ default: m.PlaybooksPage })))
const AprovacoesPage = lazy(() => import('../pages/AprovacoesPage').then(m => ({ default: m.AprovacoesPage })))
const OperacoesPage = lazy(() => import('../pages/OperacoesPage').then(m => ({ default: m.OperacoesPage })))
const OperacaoPage = lazy(() => import('../pages/OperacaoPage').then(m => ({ default: m.OperacaoPage })))
const EquipeKanbanPage = lazy(() => import('../pages/EquipeKanbanPage').then(m => ({ default: m.EquipeKanbanPage })))
const AdminPage = lazy(() => import('../pages/AdminPage').then(m => ({ default: m.AdminPage })))

function navClass(isActive: boolean) {
  return `nav-link ${isActive ? 'nav-link-active' : ''}`
}

function Sidebar({ className = '', onNavigate }: { className?: string; onNavigate?: () => void }) {
  const { usuario, logout } = useAuth()
  const [operacoes, setOperacoes] = useState<Operacao[]>([])
  const [pendentes, setPendentes] = useState(0)

  useEffect(() => {
    api.operacoes.list().then(setOperacoes).catch(() => {})
  }, [])

  useEffect(() => {
    if (usuario?.nivelAcesso !== 'gestor') return

    const carregar = () => {
      api.aprovacoes
        .pendentes()
        .then(lista => setPendentes(lista.length))
        .catch(() => {})
    }

    carregar()
    window.addEventListener('aprovacoes-change', carregar)
    return () => window.removeEventListener('aprovacoes-change', carregar)
  }, [usuario?.nivelAcesso])

  return (
    <aside className={`w-64 shrink-0 bg-surface border-r border-border flex-col ${className}`}>
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary border border-primary/15 flex items-center justify-center">
            <BrandMark className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-sm text-content truncate">
              {usuario?.empresa?.nome ?? 'Organizador'}
            </h2>
            <p className="text-xs text-content-subtle flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Gestão de tarefas
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 pt-3">
        <NavLink to="/" end className={({ isActive }) => navClass(isActive)} onClick={onNavigate}>
          <LayoutDashboard className="w-4 h-4" />
          Dashboard geral
        </NavLink>
        <NavLink to="/radar" className={({ isActive }) => navClass(isActive)} onClick={onNavigate}>
          <Radar className="w-4 h-4" />
          Radar operacional
        </NavLink>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <div className="pt-2 pb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-content-subtle">
          Operações
        </div>
        <NavLink to="/operacoes" end className={({ isActive }) => navClass(isActive)} onClick={onNavigate}>
          <Boxes className="w-4 h-4" />
          Todas as operações
        </NavLink>
        {operacoes.map(op => (
          <NavLink
            key={op.id}
            to={`/operacoes/${op.id}`}
            className={({ isActive }) => navClass(isActive)}
            onClick={onNavigate}
          >
            <Boxes className="w-4 h-4" />
            <span className="truncate">{op.nome}</span>
          </NavLink>
        ))}

        {usuario?.nivelAcesso === 'gestor' && (
          <>
            <div className="pt-4 pb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-content-subtle">
              Gestão
            </div>
            <NavLink to="/aprovacoes" className={({ isActive }) => navClass(isActive)} onClick={onNavigate}>
              <ShieldCheck className="w-4 h-4" />
              Aprovações
              {pendentes > 0 && (
                <span className="ml-auto badge bg-pendente-soft text-pendente !px-2 !py-0">{pendentes}</span>
              )}
            </NavLink>
            <NavLink to="/playbooks" className={({ isActive }) => navClass(isActive)} onClick={onNavigate}>
              <BookOpen className="w-4 h-4" />
              Playbooks
            </NavLink>
            <NavLink to="/admin" className={({ isActive }) => navClass(isActive)} onClick={onNavigate}>
              <Settings className="w-4 h-4" />
              Administração
            </NavLink>
          </>
        )}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-primary-soft text-primary flex items-center justify-center text-xs font-bold uppercase">
            {usuario?.nome?.charAt(0) ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-content truncate">{usuario?.nome}</p>
            <p className="text-xs text-content-subtle capitalize">{usuario?.nivelAcesso}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={logout} className="nav-link flex-1 !text-bloqueado hover:!bg-bloqueado-soft">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}

function MobileTopBar({ onMenu }: { onMenu: () => void }) {
  const { usuario } = useAuth()
  return (
    <header className="lg:hidden flex items-center justify-between gap-2 px-4 py-3 bg-surface border-b border-border sticky top-0 z-30">
      <div className="flex items-center gap-2 min-w-0">
        <button className="btn-icon" onClick={onMenu} aria-label="Abrir menu">
          <Menu className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary border border-primary/15 flex items-center justify-center shrink-0">
          <BrandMark className="w-5 h-5" />
        </div>
        <span className="font-semibold text-sm truncate">{usuario?.empresa?.nome ?? 'Organizador'}</span>
      </div>
      <ThemeToggle />
    </header>
  )
}

function RequireGestor({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  if (usuario?.nivelAcesso !== 'gestor') return <Navigate to="/" replace />
  return <>{children}</>
}

function ProtectedLayout() {
  const { usuario } = useAuth()
  const [menu, setMenu] = useState(false)
  const location = useLocation()

  if (!usuario) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar className="hidden lg:flex h-screen sticky top-0" />

      {menu && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-[#12130b]/60 backdrop-blur-sm animate-fade-in" onClick={() => setMenu(false)} />
          <div className="absolute left-0 top-0 h-full animate-fade-in">
            <Sidebar className="flex h-full" onNavigate={() => setMenu(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <MobileTopBar onMenu={() => setMenu(true)} />
        <main className="flex-1 overflow-auto">
          <div key={location.pathname} className="h-full animate-page-in">
            <Suspense fallback={<FullPageSpinner />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegistroPage />} />
              <Route element={<ProtectedLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="radar" element={<RadarPage />} />
                <Route path="operacoes" element={<OperacoesPage />} />
                <Route path="operacoes/:operacaoId" element={<OperacaoPage />} />
                <Route path="operacoes/:operacaoId/equipes/:equipeId" element={<EquipeKanbanPage />} />
                <Route path="aprovacoes" element={<RequireGestor><AprovacoesPage /></RequireGestor>} />
                <Route path="playbooks" element={<RequireGestor><PlaybooksPage /></RequireGestor>} />
                <Route path="admin" element={<RequireGestor><AdminPage /></RequireGestor>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

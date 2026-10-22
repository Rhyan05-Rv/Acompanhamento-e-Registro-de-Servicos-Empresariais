import { useCallback, useEffect, useState } from 'react'

export type Tema = 'light' | 'dark'

const KEY = 'tema'
const EVENT = 'tema-change'

function aplicar(tema: Tema) {
  const root = document.documentElement
  root.classList.toggle('dark', tema === 'dark')
  root.style.colorScheme = tema
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', tema === 'dark' ? '#15160f' : '#f7f5ef')
}

function temaAtual(): Tema {
  try {
    const salvo = localStorage.getItem(KEY)
    if (salvo === 'light' || salvo === 'dark') return salvo
  } catch {
    /* ignora */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const [tema, setTemaState] = useState<Tema>(() =>
    typeof document === 'undefined' ? 'light' : temaAtual(),
  )

  useEffect(() => {
    const sincronizar = () => setTemaState(temaAtual())
    window.addEventListener(EVENT, sincronizar)
    return () => window.removeEventListener(EVENT, sincronizar)
  }, [])

  const setTema = useCallback((t: Tema) => {
    try {
      localStorage.setItem(KEY, t)
    } catch {
      /* ignora */
    }
    aplicar(t)
    setTemaState(t)
    window.dispatchEvent(new Event(EVENT))
  }, [])

  const toggle = useCallback(() => {
    setTema(temaAtual() === 'dark' ? 'light' : 'dark')
  }, [setTema])

  return { tema, setTema, toggle }
}

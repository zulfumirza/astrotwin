import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Lang } from '../engine/types'
import { fmt } from './findings'
import { UI, type UiKey } from './ui'

interface I18n {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: UiKey, params?: Record<string, string | number>) => string
}

const Ctx = createContext<I18n | null>(null)
const STORAGE_KEY = 'astrotwin:lang'

function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'tr') return stored
  } catch {
    /* ignore */
  }
  // English is the primary language: without a saved choice the app always
  // opens in EN (the browser language is deliberately not used). TR is opt-in.
  return 'en'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
    setLangState(next)
  }, [])

  const value = useMemo<I18n>(
    () => ({ lang, setLang, t: (key, params) => fmt(UI[lang][key] ?? UI.en[key] ?? key, params) }),
    [lang, setLang],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useI18n must be used within LangProvider')
  return ctx
}

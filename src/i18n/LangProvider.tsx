// The chosen language, saved in this browser. A first visit is always in
// English, whatever the browser language. <html lang> follows the choice.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CLINICAL } from '../content/indicators'
import type { ClinicalText } from '../content/indicators'
import { formatDate, formatUtc, num } from './format'
import type { Lang } from './format'
import { UI } from './ui'
import type { Dict } from './ui'

const KEY = 'crewvitals.lang.v1'

function loadLang(): Lang {
  try {
    return localStorage.getItem(KEY) === 'pt-BR' ? 'pt-BR' : 'en'
  } catch {
    return 'en'
  }
}

type LangContext = {
  lang: Lang
  setLang: (lang: Lang) => void
  /** Screen text. */
  t: Dict
  /** Clinical text from indicators.ts. */
  c: ClinicalText
  num: (value: number, decimals?: number) => string
  date: (iso: string) => string
  utc: (iso: string) => string
}

const Context = createContext<LangContext | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Storage unavailable: the choice lasts for this visit only.
    }
  }, [])

  const value = useMemo<LangContext>(
    () => ({
      lang,
      setLang,
      t: UI[lang],
      c: CLINICAL[lang],
      num: (v, decimals = 0) => num(v, lang, decimals),
      date: (iso) => formatDate(iso, lang),
      utc: (iso) => formatUtc(iso, lang),
    }),
    [lang, setLang],
  )
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useLang(): LangContext {
  const value = useContext(Context)
  if (!value) throw new Error('useLang must be used inside LangProvider')
  return value
}

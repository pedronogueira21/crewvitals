import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { demoMission } from '../lib/demo'
import { isISODate, missionDayOn, todayISO } from '../lib/mission'
import {
  clearAll,
  loadEntries,
  loadSettings,
  saveEntries,
  saveSettings,
  sortByDate,
} from '../lib/storage'
import type { Dict } from '../i18n/ui'
import type { Entry, Settings } from '../types'

/** Errors are codes; the screens turn them into words in the chosen language (see storeErrorText). */
export type StoreError =
  | { code: 'storage' }
  | { code: 'invalidDate' }
  | { code: 'futureStart' }
  | { code: 'startAfterFirst'; date: string }

type Result = { ok: true } | { ok: false; error: StoreError }

const STORAGE_ERROR: StoreError = { code: 'storage' }

type Store = {
  /** Entries sorted by date, oldest first. One entry per mission day. */
  entries: Entry[]
  settings: Settings
  /** Adds the entry, or replaces the entry already logged for that date. */
  saveEntry: (entry: Entry) => Result
  setMissionStart: (date: string) => Result
  setMissionSetting: (setting: Settings['setting']) => Result
  /** Deletes every entry and restarts the mission today. */
  clearData: () => void
  /** Replaces all data with 30 days of simulated crew data ending today. */
  loadDemo: () => Result
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>(loadEntries)
  const [settings, setSettings] = useState<Settings>(loadSettings)

  const saveEntry = useCallback(
    (entry: Entry): Result => {
      const next = sortByDate([...entries.filter((e) => e.date !== entry.date), entry])
      if (!saveEntries(next)) return { ok: false, error: STORAGE_ERROR }
      setEntries(next)
      return { ok: true }
    },
    [entries],
  )

  const setMissionStart = useCallback(
    (date: string): Result => {
      if (!isISODate(date)) return { ok: false, error: { code: 'invalidDate' } }
      if (date > todayISO()) return { ok: false, error: { code: 'futureStart' } }
      const first = entries[0]
      if (first && date > first.date) return { ok: false, error: { code: 'startAfterFirst', date: first.date } }
      const nextSettings = { ...settings, missionStart: date }
      const nextEntries = entries.map((e) => ({ ...e, missionDay: missionDayOn(e.date, date) }))
      if (!saveSettings(nextSettings) || !saveEntries(nextEntries)) {
        return { ok: false, error: STORAGE_ERROR }
      }
      setSettings(nextSettings)
      setEntries(nextEntries)
      return { ok: true }
    },
    [entries, settings],
  )

  const clearData = useCallback(() => {
    clearAll()
    setEntries([])
    setSettings(loadSettings())
  }, [])

  const setMissionSetting = useCallback(
    (setting: Settings['setting']): Result => {
      const next = { ...settings, setting }
      if (!saveSettings(next)) return { ok: false, error: STORAGE_ERROR }
      setSettings(next)
      return { ok: true }
    },
    [settings],
  )

  const loadDemo = useCallback((): Result => {
    const demo = demoMission(todayISO())
    const nextSettings = { ...settings, missionStart: demo.missionStart }
    if (!saveSettings(nextSettings) || !saveEntries(demo.entries)) {
      return { ok: false, error: STORAGE_ERROR }
    }
    setSettings(nextSettings)
    setEntries(demo.entries)
    return { ok: true }
  }, [settings])

  const store = useMemo(
    () => ({ entries, settings, saveEntry, setMissionStart, setMissionSetting, clearData, loadDemo }),
    [entries, settings, saveEntry, setMissionStart, setMissionSetting, clearData, loadDemo],
  )

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside StoreProvider')
  return store
}

/** The words for a store error. */
export function storeErrorText(error: StoreError, t: Dict, date: (iso: string) => string): string {
  switch (error.code) {
    case 'storage':
      return t.errors.storage
    case 'invalidDate':
      return t.errors.invalidDate
    case 'futureStart':
      return t.errors.futureStart
    case 'startAfterFirst':
      return t.errors.startAfterFirst(date(error.date))
  }
}

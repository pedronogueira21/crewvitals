import type { Entry, Settings } from '../types'
import { isISODate, todayISO } from './mission'

// Everything the app stores lives under these two keys, in this browser only.
const ENTRIES_KEY = 'crewvitals.entries.v1'
const SETTINGS_KEY = 'crewvitals.settings.v1'

const MISSION_SETTINGS: Settings['setting'][] = ['ISS', 'Lunar surface', 'Mars transit']

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function toEntry(raw: unknown): Entry | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (!isISODate(r.date) || typeof r.missionDay !== 'number') return null
  const mood = optionalNumber(r.mood)
  return {
    missionDay: r.missionDay,
    date: r.date,
    systolic: optionalNumber(r.systolic),
    diastolic: optionalNumber(r.diastolic),
    heartRate: optionalNumber(r.heartRate),
    glucose: optionalNumber(r.glucose),
    glucoseFasting: typeof r.glucoseFasting === 'boolean' ? r.glucoseFasting : undefined,
    temperatureC: optionalNumber(r.temperatureC),
    sleepHours: optionalNumber(r.sleepHours),
    mood: mood !== undefined && [1, 2, 3, 4, 5].includes(mood) ? (mood as Entry['mood']) : undefined,
    simulated: r.simulated === true,
  }
}

export function sortByDate(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date))
}

export function loadEntries(): Entry[] {
  const raw = read(ENTRIES_KEY)
  if (!Array.isArray(raw)) return []
  return sortByDate(raw.map(toEntry).filter((e): e is Entry => e !== null))
}

export function saveEntries(entries: Entry[]): boolean {
  return write(ENTRIES_KEY, entries)
}

export function loadSettings(): Settings {
  const raw = read(SETTINGS_KEY)
  if (typeof raw === 'object' && raw !== null) {
    const r = raw as Record<string, unknown>
    if (isISODate(r.missionStart)) {
      const setting = MISSION_SETTINGS.find((s) => s === r.setting) ?? 'ISS'
      return { missionStart: r.missionStart, setting }
    }
  }
  // First visit: the mission starts today, and is saved so the day counter advances.
  const fresh: Settings = { missionStart: todayISO(), setting: 'ISS' }
  write(SETTINGS_KEY, fresh)
  return fresh
}

export function saveSettings(settings: Settings): boolean {
  return write(SETTINGS_KEY, settings)
}

export function clearAll(): void {
  try {
    localStorage.removeItem(ENTRIES_KEY)
    localStorage.removeItem(SETTINGS_KEY)
  } catch {
    // Storage unavailable: nothing to clear.
  }
}

// Loads NASA data from the Pages Functions. When /api is not there (plain
// `npm run dev`, or a failed function), the browser reads the bundled snapshot
// and runs the same summarize code on it, labelled as a snapshot.
import { useEffect, useState } from 'react'
import {
  DONKI_SNAPSHOTS,
  DONKI_SNAPSHOT_WINDOW,
  SNAPSHOT_RETRIEVED,
  osdrSnapshot,
  parseStudies,
  radlabSnapshot,
  summarizeEnvironment,
  summarizeSpaceWeather,
} from './nasa'
import type { ApiResult, EnvironmentDose, EnvironmentId, SpaceWeather, Studies, StudyKeyword } from './nasa'

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(path)
  // A dev server or SPA fallback answers unknown paths with index.html.
  if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
    throw new Error(`${path}: no JSON (${res.status})`)
  }
  return res.json()
}

function isResult(v: unknown): v is ApiResult<unknown> {
  const r = v as ApiResult<unknown> | null
  return !!r && (r.mode === 'live' || r.mode === 'snapshot') && typeof r.retrieved === 'string' && !!r.data
}

async function load<T>(api: string, fromSnapshot: () => Promise<T>): Promise<ApiResult<T>> {
  try {
    const result = await getJson(api)
    if (isResult(result)) return result as ApiResult<T>
  } catch {
    // Fall through to the bundled snapshot.
  }
  return { mode: 'snapshot', retrieved: SNAPSHOT_RETRIEVED, data: await fromSnapshot() }
}

const loaders = {
  spaceWeather: () =>
    load<SpaceWeather>('/api/space-weather', async () =>
      summarizeSpaceWeather(await getJson(DONKI_SNAPSHOTS.flr), await getJson(DONKI_SNAPSHOTS.sep), DONKI_SNAPSHOT_WINDOW),
    ),
  radiation: (env: EnvironmentId) =>
    load<EnvironmentDose>(`/api/radiation?env=${env}`, async () =>
      summarizeEnvironment(await getJson(radlabSnapshot(env)), env),
    ),
  studies: (term: StudyKeyword) =>
    load<Studies>(`/api/studies?term=${encodeURIComponent(term)}`, async () =>
      parseStudies(await getJson(osdrSnapshot(term)), term),
    ),
}

// One request per key for the life of the page, shared by every panel.
const cache = new Map<string, Promise<ApiResult<unknown>>>()

export type Loaded<T> = { state: 'loading' } | { state: 'error' } | { state: 'ready'; result: ApiResult<T> }

function useLoad<T>(key: string, loader: () => Promise<ApiResult<T>>): Loaded<T> {
  const [loaded, setLoaded] = useState<{ key: string; value: Loaded<T> }>({ key, value: { state: 'loading' } })
  useEffect(() => {
    let alive = true
    if (!cache.has(key)) {
      const p = loader()
      p.catch(() => cache.delete(key)) // allow a retry on the next visit
      cache.set(key, p)
    }
    ;(cache.get(key) as Promise<ApiResult<T>>).then(
      (result) => alive && setLoaded({ key, value: { state: 'ready', result } }),
      () => alive && setLoaded({ key, value: { state: 'error' } }),
    )
    return () => {
      alive = false
    }
    // `loader` is derived from `key`, so `key` is the only dependency.
  }, [key])
  return loaded.key === key ? loaded.value : { state: 'loading' }
}

export const useSpaceWeather = () => useLoad('space-weather', loaders.spaceWeather)
export const useRadiation = (env: EnvironmentId) => useLoad(`radiation:${env}`, () => loaders.radiation(env))
export const useStudies = (term: StudyKeyword) => useLoad(`studies:${term}`, () => loaders.studies(term))

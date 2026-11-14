// Shared by the Pages Functions in /functions/api/. Not a route: it exports no
// onRequest handler.
import { SNAPSHOT_RETRIEVED } from '../../src/lib/nasa'
import type { ApiResult } from '../../src/lib/nasa'

export type Env = { ASSETS: { fetch: (input: Request | URL | string) => Promise<Response> } }
export type Context = { request: Request; env: Env; waitUntil?: (p: Promise<unknown>) => void }

const CACHE_SECONDS = 3600

function json(body: unknown, status: number, maxAge = 0): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': maxAge ? `public, max-age=${maxAge}` : 'no-store',
    },
  })
}

/** GET an upstream NASA URL as JSON, failing on a non-2xx status or after 10 s. */
export async function upstream(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`Upstream returned ${res.status}`)
  return res.json()
}

/**
 * Live data, cached for 1 hour with the Cache API. If the live call fails,
 * the bundled snapshot from /public/snapshots/ with mode "snapshot".
 */
export async function serve<T>(
  ctx: Context,
  live: () => Promise<T>,
  snapshot: (asset: (path: string) => Promise<unknown>) => Promise<T>,
): Promise<Response> {
  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default
  const key = new Request(ctx.request.url)
  const hit = await cache?.match(key)
  if (hit) return hit

  try {
    const body: ApiResult<T> = { mode: 'live', retrieved: new Date().toISOString().slice(0, 10), data: await live() }
    const res = json(body, 200, CACHE_SECONDS)
    if (cache) ctx.waitUntil?.(cache.put(key, res.clone()))
    return res
  } catch (liveError) {
    try {
      const asset = async (path: string) => {
        const res = await ctx.env.ASSETS.fetch(new URL(path, ctx.request.url))
        if (!res.ok) throw new Error(`Snapshot ${path} returned ${res.status}`)
        return res.json()
      }
      const body: ApiResult<T> = { mode: 'snapshot', retrieved: SNAPSHOT_RETRIEVED, data: await snapshot(asset) }
      console.warn('Serving snapshot:', String(liveError))
      return json(body, 200)
    } catch (snapshotError) {
      return json({ error: 'NASA data unavailable', detail: String(snapshotError) }, 502)
    }
  }
}

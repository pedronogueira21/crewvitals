// GET /api/space-weather: DONKI flares and SEP events of the last 7 days (SPEC 6.1).
import { DONKI_SNAPSHOTS, DONKI_SNAPSHOT_WINDOW, donkiUrl, summarizeSpaceWeather } from '../../src/lib/nasa'
import { serve, upstream } from '../_lib/serve'
import type { Context } from '../_lib/serve'

export const onRequestGet = (ctx: Context) => {
  const end = new Date()
  const start = new Date(end.getTime() - 7 * 86_400_000)
  const window = { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }

  return serve(
    ctx,
    async () => {
      const [flr, sep] = await Promise.all([
        upstream(donkiUrl('FLR', window.start, window.end)),
        upstream(donkiUrl('SEP', window.start, window.end)),
      ])
      return summarizeSpaceWeather(flr, sep, window)
    },
    async (asset) =>
      summarizeSpaceWeather(await asset(DONKI_SNAPSHOTS.flr), await asset(DONKI_SNAPSHOTS.sep), DONKI_SNAPSHOT_WINDOW),
  )
}

// GET /api/studies?term=<keyword>: OSDR study search (SPEC 6.2).
// Only the fixed keywords are accepted, so this is not an open proxy.
import { STUDY_KEYWORDS, isStudyKeyword, osdrSnapshot, osdrUrl, parseStudies } from '../../src/lib/nasa'
import { serve, upstream } from '../_lib/serve'
import type { Context } from '../_lib/serve'

export const onRequestGet = (ctx: Context) => {
  const term = new URL(ctx.request.url).searchParams.get('term')
  if (!isStudyKeyword(term)) {
    return new Response(JSON.stringify({ error: `term must be one of: ${STUDY_KEYWORDS.join(', ')}` }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    })
  }
  return serve(
    ctx,
    async () => parseStudies(await upstream(osdrUrl(term)), term),
    async (asset) => parseStudies(await asset(osdrSnapshot(term)), term),
  )
}

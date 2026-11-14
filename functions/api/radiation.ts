// GET /api/radiation?env=<id>: one measured day of absorbed dose rate from RadLab
// for one of six fixed environments (SPEC 6.3). Other values are rejected, so
// this is not an open proxy.
import { RADIATION_ENVIRONMENTS, environment, radlabSnapshot, radlabUrl, summarizeEnvironment } from '../../src/lib/nasa'
import { serve, upstream } from '../_lib/serve'
import type { Context } from '../_lib/serve'

export const onRequestGet = (ctx: Context) => {
  const env = environment(new URL(ctx.request.url).searchParams.get('env'))
  if (!env) {
    return new Response(
      JSON.stringify({ error: `env must be one of: ${RADIATION_ENVIRONMENTS.map((e) => e.id).join(', ')}` }),
      { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } },
    )
  }
  return serve(
    ctx,
    async () => summarizeEnvironment(await upstream(radlabUrl(env.id)), env.id),
    async (asset) => summarizeEnvironment(await asset(radlabSnapshot(env.id)), env.id),
  )
}

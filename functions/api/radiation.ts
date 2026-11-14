// GET /api/radiation: one measured day of DosTel dose rates aboard the ISS from RadLab (SPEC 6.3).
import { RADLAB_SNAPSHOT, RADLAB_URL, summarizeRadiation } from '../../src/lib/nasa'
import { serve, upstream } from '../_lib/serve'
import type { Context } from '../_lib/serve'

export const onRequestGet = (ctx: Context) =>
  serve(
    ctx,
    async () => summarizeRadiation(await upstream(RADLAB_URL)),
    async (asset) => summarizeRadiation(await asset(RADLAB_SNAPSHOT)),
  )

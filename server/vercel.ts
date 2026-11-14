// Vercel serverless adapter for the same API proxy that server.ts serves with
// Express. Bundled into api/[route].js by `npm run build:api` (the bundle is
// committed so Vercel needs no extra build step and no module resolution).
import { handleApi } from './handlers'

export default async function handler(req: any, res: any) {
  const route = String(req.query?.route ?? '')
  const query: Record<string, string> = {}
  for (const [k, v] of Object.entries(req.query ?? {})) {
    if (k !== 'route' && typeof v === 'string') query[k] = v
  }
  let body: unknown = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = undefined
    }
  }
  const result = await handleApi(route, query, body)
  res.setHeader('cache-control', 'no-store')
  res.status(result.status).json(result.body)
}

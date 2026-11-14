// AstroTwin server: API proxy (/api/*) + the web app on one port.
//   npm run dev    → Express + Vite middleware (HMR)
//   npm start      → Express serving ./dist (run `npm run build` first)
import 'dotenv/config'
import express from 'express'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { handleApi } from './server/handlers'

const prod = process.argv.includes('--prod') || process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT) || 3000
const root = import.meta.dirname

const app = express()
const httpServer = http.createServer(app)
app.disable('x-powered-by')
app.use(express.json({ limit: '100kb' }))

app.all('/api/:route', async (req, res) => {
  const query: Record<string, string> = {}
  for (const [k, v] of Object.entries(req.query)) if (typeof v === 'string') query[k] = v
  const result = await handleApi(req.params.route, query, req.body)
  res.status(result.status).set('cache-control', 'no-store').json(result.body)
})

if (prod) {
  const dist = path.join(root, 'dist')
  if (!fs.existsSync(dist)) {
    console.error('dist/ not found — run "npm run build" first.')
    process.exit(1)
  }
  app.use(express.static(dist, { index: false, maxAge: '1h' }))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
} else {
  const { createServer } = await import('vite')
  const vite = await createServer({
    server: { middlewareMode: true, hmr: { server: httpServer } },
    appType: 'spa',
  })
  app.use(vite.middlewares)
}

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`AstroTwin ${prod ? 'production' : 'dev'} server on http://localhost:${port}`)
})

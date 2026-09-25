import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'
import { existsSync, readFileSync } from 'node:fs'

// En producción, Vercel corre las funciones de /api. En desarrollo local,
// este plugin hace lo mismo para las rutas que lo necesiten, usando la
// llave de servicio local (que nunca se sube al repo).
const API_LOCALES = ['autorizacion-tutor']

function apiLocal() {
  return {
    name: 'api-local',
    apply: 'serve',
    configureServer(server) {
      if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY && existsSync('serviceAccountKey.json')) {
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY = readFileSync('serviceAccountKey.json', 'utf8')
      }
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        const nombre = url.pathname.replace(/^\/api\//, '')
        if (!url.pathname.startsWith('/api/') || !API_LOCALES.includes(nombre)) return next()

        let cuerpo = ''
        for await (const parte of req) cuerpo += parte
        req.body = cuerpo ? JSON.parse(cuerpo) : {}
        req.query = Object.fromEntries(url.searchParams)
        res.status = (codigo) => {
          res.statusCode = codigo
          return res
        }
        res.json = (datos) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(datos))
        }
        const { default: handler } = await server.ssrLoadModule(`/api/${nombre}.js`)
        await handler(req, res)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiLocal()],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: true,
  },
})

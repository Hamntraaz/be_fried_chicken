import { initDb } from './db'

function normalizeUrl(value = '') {
  return String(value || '').trim().replace(/\/$/, '')
}

export function setCors(req, res) {
  const requestOrigin = req.headers.origin || ''
  const frontendUrl = normalizeUrl(process.env.FRONTEND_URL)
  const origin = requestOrigin || frontendUrl || '*'

  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  res.setHeader('Access-Control-Max-Age', '86400')
}

export function ok(data = {}, status = 200) {
  return { status, data }
}

export function withApi(allowedMethods, handler) {
  return async function apiHandler(req, res) {
    setCors(req, res)

    if (req.method === 'OPTIONS') {
      return res.status(204).end()
    }

    if (!allowedMethods.includes(req.method)) {
      res.setHeader('Allow', allowedMethods.join(', '))
      return res.status(405).json({ success: false, message: `Method ${req.method} tidak diizinkan` })
    }

    try {
      await initDb()
      const result = await handler(req, res)
      if (res.writableEnded) return

      const status = result?.status || 200
      const data = result?.data ?? result ?? {}
      return res.status(status).json(data)
    } catch (error) {
      console.error('API Error:', error)
      return res.status(500).json({
        success: false,
        message: error?.message || 'Internal Server Error',
      })
    }
  }
}

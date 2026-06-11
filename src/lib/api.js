import { initDb, query } from './db'

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

function extractBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || ''
  const raw = String(header || '').replace(/^Bearer\s+/i, '').trim()
  return raw || ''
}

export async function getAuthUser(req) {
  const token = extractBearerToken(req)
  if (!token) return null

  // Demo token format: rafiza-token-<userId>-<timestamp>
  const match = token.match(/^rafiza-token-(\d+)(?:-|$)/)
  if (!match) return null

  const userId = Number(match[1])
  if (!userId) return null

  const rows = await query(`SELECT u.*, s.name AS supplier_name, w.name AS warehouse_name, b.name AS branch_name, c.name AS courier_name
    FROM rfz_users u
    LEFT JOIN rfz_suppliers s ON s.id = u.supplier_id
    LEFT JOIN rfz_warehouses w ON w.id = u.warehouse_id
    LEFT JOIN rfz_branches b ON b.id = u.branch_id
    LEFT JOIN rfz_couriers c ON c.id = u.courier_id
    WHERE u.id = ?
    LIMIT 1`, [userId])
  const user = rows[0]
  if (!user || user.status === 'Nonaktif') return null

  return {
    ...user,
    role: user.role === 'admin' ? 'warehouse' : user.role,
    courier_type: user.role === 'courier'
      ? (user.supplier_id ? 'supplier' : user.warehouse_id ? 'warehouse' : null)
      : null,
  }
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
      req.auth = await getAuthUser(req)
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

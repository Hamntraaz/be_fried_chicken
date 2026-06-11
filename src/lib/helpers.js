export function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: corsHeaders(),
  })
}

export function corsHeaders() {
  const origin = process.env.FRONTEND_URL || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

export async function readBody(request) {
  try { return await request.json() } catch { return {} }
}

export function makeId(prefix) {
  const now = Date.now().toString().slice(-6)
  const rand = Math.floor(Math.random() * 900 + 100)
  return `${prefix}-${now}${rand}`
}

export function mapMaterial(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    stock: Number(row.stock),
    minStock: Number(row.min_stock),
    unit: row.unit,
    supplier: row.supplier,
    status: Number(row.stock) < Number(row.min_stock) ? 'Menipis' : 'Aman',
  }
}

export function mapOrder(row) {
  return {
    id: row.id,
    material: row.material,
    qty: Number(row.qty),
    unit: row.unit,
    supplier: row.supplier,
    courier: row.courier || 'Belum ditugaskan',
    courierId: row.courier_id,
    status: row.status,
    priority: row.priority,
    eta: row.eta,
    createdAt: new Date(row.created_at).toLocaleString('id-ID'),
    branch: row.branch,
  }
}

export function mapCourier(row) {
  return {
    id: row.id,
    name: row.name,
    supplier: row.supplier,
    phone: row.phone,
    vehicle: row.vehicle,
    plate: row.plate,
    status: row.status,
  }
}

export function mapSupplier(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    phone: row.phone,
    address: row.address,
    status: row.status,
    score: row.score,
  }
}

export function mapDelivery(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    courierId: row.courier_id,
    pickup: row.pickup,
    destination: row.destination,
    material: row.material,
    status: row.status,
    eta: row.eta,
    distance: row.distance,
    progress: row.progress,
    latitude: row.latitude ? Number(row.latitude) : null,
    longitude: row.longitude ? Number(row.longitude) : null,
    proofPhoto: row.proof_photo,
    proofNote: row.proof_note,
  }
}

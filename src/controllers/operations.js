import { ok } from '../lib/api'
import { query } from '../lib/db'
import { formatDate, initials, makeCode, materialStatus, toNumber } from '../lib/helpers'

function safeRole(role) {
  if (role === 'admin') return 'warehouse'
  return role || 'warehouse'
}

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: safeRole(row.role),
    roleName: row.role_name,
    role_name: row.role_name,
    branch: row.branch,
    avatar: row.avatar || initials(row.name),
    description: row.description,
    supplier_id: row.supplier_id,
    courier_id: row.courier_id,
    warehouse_id: row.warehouse_id,
    branch_id: row.branch_id,
    status: row.status,
    supplier_name: row.supplier_name,
    warehouse_name: row.warehouse_name,
    branch_name: row.branch_name,
    courier_name: row.courier_name,
  }
}

function mapMaterial(row) {
  const stock = toNumber(row.stock)
  const minimumStock = toNumber(row.minimum_stock)
  return {
    id: row.id,
    code: row.code || `BB-${String(row.id).padStart(3, '0')}`,
    name: row.name,
    category: row.category,
    stock,
    minimum_stock: minimumStock,
    minStock: minimumStock,
    unit: row.unit,
    status: materialStatus(stock, minimumStock),
  }
}

function mapSupplier(row) {
  return {
    id: row.id,
    code: row.code || `SUP-${String(row.id).padStart(3, '0')}`,
    name: row.name,
    company_name: row.name,
    material_type: row.material_type,
    material_unit: row.material_unit,
    category: row.material_type,
    phone: row.phone,
    address: row.address,
    status: row.status,
    score: row.score,
  }
}

function mapWarehouse(row) {
  return {
    id: row.id,
    code: row.code || `WH-${String(row.id).padStart(3, '0')}`,
    name: row.name,
    warehouse_name: row.name,
    address: row.address,
    status: row.status,
  }
}

function mapBranch(row) {
  return {
    id: row.id,
    code: row.code || `CB-${String(row.id).padStart(3, '0')}`,
    name: row.name,
    branch_name: row.name,
    address: row.address,
    status: row.status,
  }
}

function mapCourier(row) {
  return {
    id: row.id,
    code: row.code || `KUR-${String(row.id).padStart(3, '0')}`,
    supplier_id: row.supplier_id,
    warehouse_id: row.warehouse_id,
    supplier_name: row.supplier_name || '-',
    warehouse_name: row.warehouse_name || '-',
    name: row.name,
    phone: row.phone,
    vehicle_plate: row.vehicle_plate,
    plate: row.vehicle_plate,
    status: row.status,
    initials: initials(row.name),
  }
}

function mapOrder(row) {
  const qty = toNumber(row.quantity)
  const unit = row.unit || row.material_unit || '-'
  const materialName = row.material_name || row.material_type || '-'
  return {
    id: row.id,
    code: row.code || `PO-RFZ-${String(row.id).padStart(3, '0')}`,
    material_id: row.material_id,
    supplier_id: row.supplier_id,
    warehouse_id: row.warehouse_id,
    courier_id: row.courier_id,
    material_name: materialName,
    material: materialName,
    supplier_name: row.supplier_name || '-',
    supplier: row.supplier_name || '-',
    warehouse_name: row.warehouse_name || '-',
    courier_name: row.courier_name || 'Belum ditugaskan',
    courier: row.courier_name || 'Belum ditugaskan',
    quantity: qty,
    qty,
    unit,
    items_text: `${materialName} ${qty} ${unit}`,
    status: row.status,
    notes: row.notes,
    ordered_at: formatDate(row.ordered_at),
    created_at: formatDate(row.ordered_at),
    createdAt: formatDate(row.ordered_at),
    destination_lat: row.destination_lat ? Number(row.destination_lat) : null,
    destination_lng: row.destination_lng ? Number(row.destination_lng) : null,
    destination_address: row.destination_address || row.warehouse_name || 'Gudang Rafiza',
  }
}

function mapDelivery(row) {
  return {
    id: row.id,
    code: row.code || `DLV-${String(row.id).padStart(3, '0')}`,
    order_id: row.order_id,
    order_code: row.order_code || '-',
    supplier_id: row.supplier_id,
    warehouse_id: row.warehouse_id,
    supplier_name: row.supplier_name || '-',
    warehouse_name: row.warehouse_name || '-',
    warehouse_id: row.warehouse_id,
    warehouse_name: row.warehouse_name || '-',
    courier_id: row.courier_id,
    courier_name: row.courier_name || 'Belum ditugaskan',
    status: row.status,
    pickup_role: 'supplier',
    pickup_label: row.supplier_name || 'Supplier',
    pickup_lat: row.pickup_lat ? Number(row.pickup_lat) : null,
    pickup_lng: row.pickup_lng ? Number(row.pickup_lng) : null,
    pickup_address: row.pickup_address || row.supplier_name || '-',
    destination_role: 'warehouse',
    destination_label: row.warehouse_name || 'Gudang',
    destination_lat: row.destination_lat ? Number(row.destination_lat) : null,
    destination_lng: row.destination_lng ? Number(row.destination_lng) : null,
    destination_address: row.destination_address || row.warehouse_name || 'Gudang Rafiza',
    current_lat: row.current_lat ? Number(row.current_lat) : null,
    current_lng: row.current_lng ? Number(row.current_lng) : null,
    latitude: row.current_lat ? Number(row.current_lat) : null,
    longitude: row.current_lng ? Number(row.current_lng) : null,
    recorded_at: formatDate(row.recorded_at || row.updated_at),
    progress: toNumber(row.progress),
    proof_photo: row.proof_photo,
    proof_note: row.proof_note,
    proof_uploaded_at: row.proof_uploaded_at ? formatDate(row.proof_uploaded_at) : null,
    reject_reason: row.reject_reason,
    reject_proof: row.reject_proof,
  }
}

function mapMovement(row) {
  return {
    id: row.id,
    material_id: row.material_id,
    material_name: row.material_name || '-',
    order_id: row.order_id,
    order_code: row.order_code || '-',
    movement_type: row.movement_type,
    source_type: row.source_type,
    quantity: toNumber(row.quantity),
    unit: row.unit,
    stock_before: toNumber(row.stock_before),
    stock_after: toNumber(row.stock_after),
    notes: row.notes,
    created_by: row.created_by,
    created_at: formatDate(row.created_at),
  }
}

function mapBranchStock(row) {
  return {
    id: row.id,
    branch_id: row.branch_id,
    branch_name: row.branch_name || '-',
    material_id: row.material_id,
    material_name: row.material_name || '-',
    category: row.category || '-',
    stock: toNumber(row.stock),
    unit: row.unit || row.material_unit || '-',
    updated_at: formatDate(row.updated_at),
    status: toNumber(row.stock) <= 0 ? 'Kosong' : toNumber(row.stock) <= 5 ? 'Menipis' : 'Aman',
  }
}

function mapBranchRequest(row) {
  return {
    id: row.id,
    code: row.code || `REQ-CB-${String(row.id).padStart(3, '0')}`,
    branch_id: row.branch_id,
    branch_name: row.branch_name || '-',
    warehouse_id: row.warehouse_id,
    warehouse_name: row.warehouse_name || 'Gudang Pusat',
    material_id: row.material_id,
    material_name: row.material_name || '-',
    quantity: toNumber(row.quantity),
    unit: row.unit || row.material_unit || '-',
    status: row.status,
    notes: row.notes,
    requested_by: row.requested_by,
    approved_by: row.approved_by,
    courier_id: row.courier_id,
    courier_name: row.courier_name || 'Belum ditugaskan',
    current_lat: row.current_lat ? Number(row.current_lat) : null,
    current_lng: row.current_lng ? Number(row.current_lng) : null,
    proof_photo: row.proof_photo,
    proof_note: row.proof_note,
    proof_uploaded_at: row.proof_uploaded_at ? formatDate(row.proof_uploaded_at) : null,
    delivered_at: row.delivered_at ? formatDate(row.delivered_at) : null,
    created_at: formatDate(row.created_at),
    updated_at: formatDate(row.updated_at),
  }
}

function mapBranchSale(row) {
  return {
    id: row.id,
    code: row.code || `SALE-${String(row.id).padStart(3, '0')}`,
    branch_id: row.branch_id,
    branch_name: row.branch_name || '-',
    material_id: row.material_id,
    material_name: row.material_name || '-',
    quantity: toNumber(row.quantity),
    unit: row.unit || row.material_unit || '-',
    notes: row.notes,
    created_by: row.created_by,
    created_at: formatDate(row.created_at),
  }
}

async function overviewRows() {
  const materials = await query('SELECT * FROM rfz_materials ORDER BY id')
  const suppliers = await query('SELECT * FROM rfz_suppliers ORDER BY id')
  const warehouses = await query('SELECT * FROM rfz_warehouses ORDER BY id')
  const branches = await query('SELECT * FROM rfz_branches ORDER BY id')
  const users = await query(`SELECT u.*, s.name AS supplier_name, w.name AS warehouse_name, b.name AS branch_name, c.name AS courier_name
    FROM rfz_users u
    LEFT JOIN rfz_suppliers s ON s.id = u.supplier_id
    LEFT JOIN rfz_warehouses w ON w.id = u.warehouse_id
    LEFT JOIN rfz_branches b ON b.id = u.branch_id
    LEFT JOIN rfz_couriers c ON c.id = u.courier_id
    ORDER BY u.id`)
  const couriers = await query(`SELECT c.*, s.name AS supplier_name, w.name AS warehouse_name FROM rfz_couriers c LEFT JOIN rfz_suppliers s ON s.id = c.supplier_id LEFT JOIN rfz_warehouses w ON w.id = c.warehouse_id ORDER BY c.id`)
  const orders = await query(`SELECT o.*, m.name AS material_name, s.name AS supplier_name, s.material_unit, w.name AS warehouse_name, c.name AS courier_name
    FROM rfz_orders o
    LEFT JOIN rfz_materials m ON m.id = o.material_id
    LEFT JOIN rfz_suppliers s ON s.id = o.supplier_id
    LEFT JOIN rfz_warehouses w ON w.id = o.warehouse_id
    LEFT JOIN rfz_couriers c ON c.id = o.courier_id
    ORDER BY o.ordered_at DESC, o.id DESC`)
  const deliveries = await query(`SELECT d.*, o.code AS order_code, o.supplier_id, o.warehouse_id, s.name AS supplier_name, w.name AS warehouse_name, c.name AS courier_name
    FROM rfz_deliveries d
    LEFT JOIN rfz_orders o ON o.id = d.order_id
    LEFT JOIN rfz_suppliers s ON s.id = o.supplier_id
    LEFT JOIN rfz_warehouses w ON w.id = o.warehouse_id
    LEFT JOIN rfz_couriers c ON c.id = d.courier_id
    ORDER BY d.updated_at DESC, d.id DESC`)
  const movements = await query(`SELECT mv.*, m.name AS material_name, o.code AS order_code
    FROM rfz_movements mv
    LEFT JOIN rfz_materials m ON m.id = mv.material_id
    LEFT JOIN rfz_orders o ON o.id = mv.order_id
    ORDER BY mv.created_at DESC, mv.id DESC
    LIMIT 100`)
  const branchStocks = await query(`SELECT bs.*, b.name AS branch_name, m.name AS material_name, m.category, m.unit AS material_unit
    FROM rfz_branch_stocks bs
    LEFT JOIN rfz_branches b ON b.id = bs.branch_id
    LEFT JOIN rfz_materials m ON m.id = bs.material_id
    ORDER BY b.name, m.name`)
  const branchRequests = await query(`SELECT br.*, b.name AS branch_name, w.name AS warehouse_name, m.name AS material_name, m.unit AS material_unit, c.name AS courier_name
    FROM rfz_branch_requests br
    LEFT JOIN rfz_branches b ON b.id = br.branch_id
    LEFT JOIN rfz_warehouses w ON w.id = br.warehouse_id
    LEFT JOIN rfz_materials m ON m.id = br.material_id
    LEFT JOIN rfz_couriers c ON c.id = br.courier_id
    ORDER BY br.created_at DESC, br.id DESC`)
  const branchSales = await query(`SELECT bsale.*, b.name AS branch_name, m.name AS material_name, m.unit AS material_unit
    FROM rfz_branch_sales bsale
    LEFT JOIN rfz_branches b ON b.id = bsale.branch_id
    LEFT JOIN rfz_materials m ON m.id = bsale.material_id
    ORDER BY bsale.created_at DESC, bsale.id DESC LIMIT 100`)
  const actorLocations = await query(`SELECT al.* FROM rfz_actor_locations al ORDER BY al.created_at DESC LIMIT 20`)

  return { materials, suppliers, warehouses, branches, users, couriers, orders, deliveries, movements, branchStocks, branchRequests, branchSales, actorLocations }
}

function buildNotifications({ orders, deliveries, branchRequests }) {
  const notifications = []
  for (const order of orders.slice(0, 8)) {
    if (String(order.status).includes('Menunggu Konfirmasi')) {
      notifications.push({ id: `supplier-${order.id}`, role: 'supplier', title: 'Pesanan baru', message: `${order.code} menunggu konfirmasi supplier.` })
    }
    if (String(order.status).includes('Konfirmasi Gudang')) {
      notifications.push({ id: `warehouse-${order.id}`, role: 'warehouse', title: 'Barang tiba', message: `${order.code} menunggu konfirmasi gudang.` })
    }
  }
  for (const delivery of deliveries.slice(0, 8)) {
    if (delivery.status === 'Menunggu Persetujuan Kurir') {
      notifications.push({ id: `courier-${delivery.id}`, role: 'courier', title: 'Tugas kurir baru', message: `${delivery.order_code} menunggu respons kurir.` })
    }
  }
  for (const request of branchRequests.slice(0, 8)) {
    if (request.status === 'Menunggu Persetujuan Gudang') {
      notifications.push({ id: `warehouse-branch-${request.id}`, role: 'warehouse', title: 'Permintaan cabang', message: `${request.code} dari ${request.branch_name} menunggu persetujuan.` })
    }
    if (['Dikirim ke Cabang', 'Disetujui Gudang'].includes(request.status)) {
      notifications.push({ id: `branch-${request.id}`, role: 'branch', title: 'Update request barang', message: `${request.code} berstatus ${request.status}.` })
    }
  }
  notifications.push({ id: 'manager-live', role: 'manager', title: 'Monitoring aktif', message: 'Data operasional tersinkron dengan MySQL.' })
  return notifications
}

export async function getOverview() {
  const rows = await overviewRows()
  const materials = rows.materials.map(mapMaterial)
  const suppliers = rows.suppliers.map(mapSupplier)
  const warehouses = rows.warehouses.map(mapWarehouse)
  const branches = rows.branches.map(mapBranch)
  const couriers = rows.couriers.map(mapCourier)
  const orders = rows.orders.map(mapOrder)
  const deliveries = rows.deliveries.map(mapDelivery)
  const movements = rows.movements.map(mapMovement)
  const users = rows.users.map(mapUser)
  const branch_stocks = rows.branchStocks.map(mapBranchStock)
  const branch_requests = rows.branchRequests.map(mapBranchRequest)
  const branch_sales = rows.branchSales.map(mapBranchSale)
  const lowStock = materials.filter((item) => item.status === 'Menipis').length
  const activeDeliveries = deliveries.filter((item) => !['Pengiriman Selesai', 'Pesanan Diterima', 'Selesai'].includes(item.status)).length
  const completedOrders = orders.filter((item) => ['Pesanan Diterima', 'Selesai'].includes(item.status)).length
  const pendingBranchRequests = branch_requests.filter((item) => item.status === 'Menunggu Persetujuan Gudang').length

  const data = {
    summary: {
      total_materials: materials.length,
      total_suppliers: suppliers.filter((item) => item.status !== 'Nonaktif').length,
      total_warehouses: warehouses.filter((item) => item.status !== 'Nonaktif').length,
      total_branches: branches.filter((item) => item.status !== 'Nonaktif').length,
      total_couriers: couriers.filter((item) => item.status !== 'Nonaktif').length,
      total_orders: orders.length,
      total_users: users.length,
      low_stock: lowStock,
      branch_low_stock: branch_stocks.filter((item) => item.status !== 'Aman').length,
      active_deliveries: activeDeliveries,
      completed_orders: completedOrders,
      pending_branch_requests: pendingBranchRequests,
      branch_sales: branch_sales.length,
    },
    materials,
    suppliers,
    couriers,
    orders,
    deliveries,
    movements,
    warehouses,
    branches,
    branch_stocks,
    branch_requests,
    branch_sales,
    users,
    actor_locations: rows.actorLocations.reduce((acc, item) => {
      const roleKey = item.role || item.user_id || item.id
      if (!acc[roleKey]) acc[roleKey] = item
      if (item.user_id && !acc[`user:${item.user_id}`]) acc[`user:${item.user_id}`] = item
      if (item.supplier_id && !acc[`supplier:${item.supplier_id}`]) acc[`supplier:${item.supplier_id}`] = item
      if (item.courier_id && !acc[`courier:${item.courier_id}`]) acc[`courier:${item.courier_id}`] = item
      if (item.warehouse_id && !acc[`warehouse:${item.warehouse_id}`]) acc[`warehouse:${item.warehouse_id}`] = item
      if (item.branch_id && !acc[`branch:${item.branch_id}`]) acc[`branch:${item.branch_id}`] = item
      return acc
    }, {}),
    notifications: buildNotifications({ orders, deliveries, branchRequests: branch_requests }),
    timeline: [
      { time: 'Now', title: 'Backend aktif', text: 'Data diambil dari MySQL Railway/Vercel.' },
      { time: 'Today', title: `${lowStock} stok gudang menipis`, text: 'Perlu dipantau oleh gudang.' },
      { time: 'Today', title: `${pendingBranchRequests} permintaan cabang`, text: 'Perlu diproses oleh gudang.' },
      { time: 'Today', title: `${activeDeliveries} pengiriman supplier aktif`, text: 'Kurir dapat update status dan lokasi.' },
    ],
  }

  return ok({ success: true, data })
}

export async function login(req) {
  const { email, password } = req.body || {}
  const rows = await query('SELECT * FROM rfz_users WHERE email = ? LIMIT 1', [email])
  const user = rows[0]

  if (!user || String(user.password) !== String(password || '') || user.status === 'Nonaktif') {
    return ok({ success: false, message: 'Email atau password salah' }, 401)
  }

  return ok({
    success: true,
    message: 'Login berhasil',
    token: `rafiza-token-${user.id}`,
    user: mapUser(user),
  })
}

export async function saveActorLocation(req) {
  const body = req.body || {}
  await query('INSERT INTO rfz_actor_locations (user_id, role, supplier_id, courier_id, warehouse_id, branch_id, latitude, longitude, accuracy) VALUES (?,?,?,?,?,?,?,?,?)', [
    body.user_id || body.userId || null,
    body.role || null,
    body.supplier_id || body.supplierId || null,
    body.courier_id || body.courierId || null,
    body.warehouse_id || body.warehouseId || null,
    body.branch_id || body.branchId || null,
    body.latitude || null,
    body.longitude || null,
    body.accuracy || null,
  ])
  return ok({ success: true, message: 'Lokasi berhasil disimpan' })
}

export async function createPurchaseOrder(req) {
  const body = req.body || {}
  const materialId = Number(body.material_id || body.materialId || 0)
  const supplierId = Number(body.supplier_id || body.supplierId || 0)
  const warehouseId = Number(body.warehouse_id || body.warehouseId || 1)
  const quantity = toNumber(body.quantity || body.qty, 0)

  if (!materialId || !supplierId || !quantity) {
    return ok({ success: false, message: 'Material, supplier, dan jumlah wajib diisi' }, 400)
  }

  const material = (await query('SELECT * FROM rfz_materials WHERE id=? LIMIT 1', [materialId]))[0]
  const supplier = (await query('SELECT * FROM rfz_suppliers WHERE id=? LIMIT 1', [supplierId]))[0]
  if (!material || !supplier) return ok({ success: false, message: 'Material atau supplier tidak ditemukan' }, 404)

  const code = makeCode('PO-RFZ')
  const result = await query(`INSERT INTO rfz_orders (code, material_id, supplier_id, warehouse_id, quantity, unit, status, notes, destination_lat, destination_lng, destination_address)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [
    code,
    materialId,
    supplierId,
    warehouseId || null,
    quantity,
    body.unit || supplier.material_unit || material.unit,
    'Menunggu Konfirmasi Supplier',
    body.notes || null,
    body.destination_lat || null,
    body.destination_lng || null,
    body.destination_address || null,
  ])

  return ok({ success: true, message: 'Purchase order berhasil dibuat', id: result.insertId, code })
}

export async function supplierConfirmOrder(req) {
  const body = req.body || {}
  const orderId = Number(body.order_id || body.orderId || 0)
  const courierId = Number(body.courier_id || body.courierId || 0)
  if (!orderId || !courierId) return ok({ success: false, message: 'Order dan kurir wajib dipilih' }, 400)

  const order = (await query('SELECT * FROM rfz_orders WHERE id=? LIMIT 1', [orderId]))[0]
  const courier = (await query('SELECT * FROM rfz_couriers WHERE id=? LIMIT 1', [courierId]))[0]
  if (!order || !courier) return ok({ success: false, message: 'Order atau kurir tidak ditemukan' }, 404)

  await query('UPDATE rfz_orders SET courier_id=?, status=? WHERE id=?', [courierId, 'Menunggu Persetujuan Kurir', orderId])

  const existing = (await query('SELECT * FROM rfz_deliveries WHERE order_id=? LIMIT 1', [orderId]))[0]
  if (existing) {
    await query(`UPDATE rfz_deliveries SET courier_id=?, status=?, pickup_lat=?, pickup_lng=?, pickup_address=?, progress=10, recorded_at=NOW() WHERE order_id=?`, [
      courierId,
      'Menunggu Persetujuan Kurir',
      body.pickup_lat || null,
      body.pickup_lng || null,
      body.pickup_address || 'Lokasi supplier',
      orderId,
    ])
  } else {
    await query(`INSERT INTO rfz_deliveries (code, order_id, courier_id, status, pickup_lat, pickup_lng, pickup_address, destination_lat, destination_lng, destination_address, progress, recorded_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW())`, [
      makeCode('DLV'),
      orderId,
      courierId,
      'Menunggu Persetujuan Kurir',
      body.pickup_lat || null,
      body.pickup_lng || null,
      body.pickup_address || 'Lokasi supplier',
      order.destination_lat || null,
      order.destination_lng || null,
      order.destination_address || 'Gudang Rafiza',
      10,
    ])
  }

  return ok({ success: true, message: 'Order berhasil dikonfirmasi dan dikirim ke kurir' })
}

export async function updateOrderStatus(req) {
  const body = req.body || {}
  const orderId = Number(body.order_id || body.orderId || 0)
  if (!orderId || !body.status) return ok({ success: false, message: 'Order dan status wajib diisi' }, 400)
  await query('UPDATE rfz_orders SET status=? WHERE id=?', [body.status, orderId])
  return ok({ success: true, message: 'Status order diperbarui' })
}

async function getBranchRequest(id) {
  return (await query('SELECT * FROM rfz_branch_requests WHERE id=? LIMIT 1', [Number(id || 0)]))[0]
}

function isBranchDeliveryBody(body = {}) {
  return body.delivery_type === 'branch_request' || body.type === 'branch_request' || body.request_id || body.requestId || body.branch_request_id
}

function branchRequestIdFromBody(body = {}) {
  return Number(body.request_id || body.requestId || body.branch_request_id || body.delivery_id || body.deliveryId || 0)
}

export async function courierTaskResponse(req) {
  const body = req.body || {}
  if (isBranchDeliveryBody(body)) {
    const requestId = branchRequestIdFromBody(body)
    const reqRow = await getBranchRequest(requestId)
    if (!reqRow) return ok({ success: false, message: 'Tugas cabang tidak ditemukan' }, 404)
    if (body.action === 'reject') {
      await query(`UPDATE rfz_branch_requests SET status='Ditolak Kurir', notes=CONCAT(COALESCE(notes,''), ?), updated_at=NOW() WHERE id=?`, [`
Alasan kurir: ${body.reason || '-'}`, requestId])
      if (reqRow.courier_id) await query(`UPDATE rfz_couriers SET status='Tersedia' WHERE id=?`, [reqRow.courier_id])
      return ok({ success: true, message: 'Tugas distribusi cabang ditolak' })
    }
    await query(`UPDATE rfz_branch_requests SET status='Tugas Diterima Kurir', updated_at=NOW() WHERE id=?`, [requestId])
    if (reqRow.courier_id) await query(`UPDATE rfz_couriers SET status='Dalam Pengiriman' WHERE id=?`, [reqRow.courier_id])
    return ok({ success: true, message: 'Tugas distribusi cabang diterima' })
  }

  const deliveryId = Number(body.delivery_id || body.deliveryId || 0)
  const delivery = (await query('SELECT * FROM rfz_deliveries WHERE id=? LIMIT 1', [deliveryId]))[0]
  if (!delivery) return ok({ success: false, message: 'Delivery tidak ditemukan' }, 404)

  if (body.action === 'reject') {
    await query(`UPDATE rfz_deliveries SET status='Ditolak Kurir', reject_reason=?, reject_proof=?, recorded_at=NOW() WHERE id=?`, [body.reason || null, body.proof || null, deliveryId])
    await query(`UPDATE rfz_orders SET status='Ditolak Kurir' WHERE id=?`, [delivery.order_id])
    return ok({ success: true, message: 'Tugas berhasil ditolak' })
  }

  await query(`UPDATE rfz_deliveries SET status='Tugas Diterima Kurir', progress=20, recorded_at=NOW() WHERE id=?`, [deliveryId])
  await query(`UPDATE rfz_orders SET status='Tugas Diterima Kurir' WHERE id=?`, [delivery.order_id])
  return ok({ success: true, message: 'Tugas berhasil diterima' })
}


export async function driverStart(req) {
  const body = req.body || {}
  if (isBranchDeliveryBody(body)) {
    const requestId = branchRequestIdFromBody(body)
    const reqRow = await getBranchRequest(requestId)
    if (!reqRow) return ok({ success: false, message: 'Tugas cabang tidak ditemukan' }, 404)
    await query(`UPDATE rfz_branch_requests SET status='Kurir Dalam Perjalanan', current_lat=?, current_lng=?, updated_at=NOW() WHERE id=?`, [body.latitude || null, body.longitude || null, requestId])
    if (reqRow.courier_id) await query(`UPDATE rfz_couriers SET status='Dalam Pengiriman' WHERE id=?`, [reqRow.courier_id])
    return ok({ success: true, message: 'Kurir gudang mulai mengirim barang ke cabang' })
  }

  const deliveryId = Number(body.delivery_id || body.deliveryId || 0)
  const delivery = (await query('SELECT * FROM rfz_deliveries WHERE id=? LIMIT 1', [deliveryId]))[0]
  if (!delivery) return ok({ success: false, message: 'Delivery tidak ditemukan' }, 404)

  await query(`UPDATE rfz_deliveries SET status='Kurir Dalam Perjalanan', current_lat=?, current_lng=?, progress=45, recorded_at=NOW() WHERE id=?`, [
    body.latitude || null,
    body.longitude || null,
    deliveryId,
  ])
  await query(`UPDATE rfz_orders SET status='Kurir Dalam Perjalanan' WHERE id=?`, [delivery.order_id])
  if (delivery.courier_id) await query(`UPDATE rfz_couriers SET status='Dalam Pengiriman' WHERE id=?`, [delivery.courier_id])
  return ok({ success: true, message: 'Kurir mulai pengiriman' })
}


export async function updateDeliveryLocation(req) {
  const body = req.body || {}
  if (isBranchDeliveryBody(body)) {
    const requestId = branchRequestIdFromBody(body)
    if (!requestId) return ok({ success: false, message: 'Request cabang wajib diisi' }, 400)
    await query(`UPDATE rfz_branch_requests SET current_lat=?, current_lng=?, updated_at=NOW() WHERE id=?`, [body.latitude || null, body.longitude || null, requestId])
    return ok({ success: true, message: 'Lokasi distribusi cabang diperbarui' })
  }

  const deliveryId = Number(body.delivery_id || body.deliveryId || 0)
  if (!deliveryId) return ok({ success: false, message: 'Delivery wajib diisi' }, 400)
  await query(`UPDATE rfz_deliveries SET current_lat=?, current_lng=?, progress=GREATEST(progress,60), recorded_at=NOW() WHERE id=?`, [
    body.latitude || null,
    body.longitude || null,
    deliveryId,
  ])
  return ok({ success: true, message: 'Lokasi pengiriman diperbarui' })
}


export async function driverArrived(req) {
  const body = req.body || {}
  if (isBranchDeliveryBody(body)) {
    const requestId = branchRequestIdFromBody(body)
    const reqRow = await getBranchRequest(requestId)
    if (!reqRow) return ok({ success: false, message: 'Tugas cabang tidak ditemukan' }, 404)
    await query(`UPDATE rfz_branch_requests SET status='Driver Sampai', current_lat=?, current_lng=?, updated_at=NOW() WHERE id=?`, [body.latitude || null, body.longitude || null, requestId])
    return ok({ success: true, message: 'Kurir sampai di cabang. Upload bukti foto untuk menyelesaikan.' })
  }

  const deliveryId = Number(body.delivery_id || body.deliveryId || 0)
  const delivery = (await query('SELECT * FROM rfz_deliveries WHERE id=? LIMIT 1', [deliveryId]))[0]
  if (!delivery) return ok({ success: false, message: 'Delivery tidak ditemukan' }, 404)

  await query(`UPDATE rfz_deliveries SET status='Driver Sampai', current_lat=?, current_lng=?, progress=90, recorded_at=NOW() WHERE id=?`, [
    body.latitude || null,
    body.longitude || null,
    deliveryId,
  ])
  await query(`UPDATE rfz_orders SET status='Driver Sampai' WHERE id=?`, [delivery.order_id])
  return ok({ success: true, message: 'Kurir tiba di gudang. Upload bukti foto untuk menyelesaikan.' })
}


export async function deliveryComplete(req) {
  const body = req.body || {}
  if (isBranchDeliveryBody(body)) {
    const requestId = branchRequestIdFromBody(body)
    const reqRow = await getBranchRequest(requestId)
    if (!reqRow) return ok({ success: false, message: 'Tugas cabang tidak ditemukan' }, 404)
    if (!body.proof_photo && !body.proofPhoto) return ok({ success: false, message: 'Bukti foto wajib diupload sebelum pengiriman selesai' }, 400)
    await query(`UPDATE rfz_branch_requests SET status='Menunggu Konfirmasi Cabang', current_lat=?, current_lng=?, proof_photo=?, proof_note=?, proof_uploaded_at=NOW(), delivered_at=NOW(), updated_at=NOW() WHERE id=?`, [
      body.latitude || null,
      body.longitude || null,
      body.proof_photo || body.proofPhoto || null,
      body.proof_note || body.proofNote || null,
      requestId,
    ])
    return ok({ success: true, message: 'Bukti distribusi cabang tersimpan, menunggu cabang menerima barang' })
  }

  const deliveryId = Number(body.delivery_id || body.deliveryId || 0)
  const delivery = (await query('SELECT * FROM rfz_deliveries WHERE id=? LIMIT 1', [deliveryId]))[0]
  if (!delivery) return ok({ success: false, message: 'Delivery tidak ditemukan' }, 404)
  if (!body.proof_photo && !body.proofPhoto) return ok({ success: false, message: 'Bukti foto wajib diupload sebelum pengiriman selesai' }, 400)

  await query(`UPDATE rfz_deliveries SET status='Menunggu Konfirmasi Gudang', current_lat=?, current_lng=?, proof_photo=?, proof_note=?, proof_uploaded_at=NOW(), progress=95, recorded_at=NOW() WHERE id=?`, [
    body.latitude || null,
    body.longitude || null,
    body.proof_photo || body.proofPhoto || null,
    body.proof_note || body.proofNote || null,
    deliveryId,
  ])
  await query(`UPDATE rfz_orders SET status='Menunggu Konfirmasi Gudang' WHERE id=?`, [delivery.order_id])
  return ok({ success: true, message: 'Bukti pengiriman tersimpan, menunggu konfirmasi gudang' })
}


export async function receiveOrder(req) {
  const body = req.body || {}
  const orderId = Number(body.order_id || body.orderId || 0)
  const order = (await query('SELECT * FROM rfz_orders WHERE id=? LIMIT 1', [orderId]))[0]
  if (!order) return ok({ success: false, message: 'Order tidak ditemukan' }, 404)

  const material = (await query('SELECT * FROM rfz_materials WHERE id=? LIMIT 1', [order.material_id]))[0]
  if (!material) return ok({ success: false, message: 'Material order tidak ditemukan' }, 404)

  const before = toNumber(material.stock)
  const qty = toNumber(order.quantity)
  const after = before + qty
  await query('UPDATE rfz_materials SET stock=? WHERE id=?', [after, material.id])
  await query(`INSERT INTO rfz_movements (material_id, order_id, movement_type, source_type, quantity, unit, stock_before, stock_after, notes, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?)`, [material.id, order.id, 'IN', 'Barang Masuk Supplier', qty, order.unit || material.unit, before, after, `Penerimaan ${order.code}`, body.created_by || 'Gudang'])
  await query(`UPDATE rfz_orders SET status='Pesanan Diterima' WHERE id=?`, [order.id])
  await query(`UPDATE rfz_deliveries SET status='Pengiriman Selesai', progress=100, recorded_at=NOW() WHERE order_id=?`, [order.id])
  if (order.courier_id) await query(`UPDATE rfz_couriers SET status='Tersedia' WHERE id=?`, [order.courier_id])

  return ok({ success: true, message: 'Barang berhasil diterima dan stok gudang bertambah' })
}

export async function assignCourier(req) {
  const body = req.body || {}
  req.body = { ...body, courier_id: body.courier_id || body.courierId, order_id: body.order_id || body.orderId }
  return supplierConfirmOrder(req)
}

export async function createCourier(req) {
  const body = req.body || {}
  const supplierId = Number(body.supplier_id || body.supplierId || 0) || null
  const warehouseId = Number(body.warehouse_id || body.warehouseId || 0) || null
  if (!supplierId && !warehouseId) return ok({ success: false, message: 'Supplier atau gudang wajib dipilih' }, 400)
  if (!body.name) return ok({ success: false, message: 'Nama kurir wajib diisi' }, 400)

  const code = makeCode('KUR')
  const result = await query(`INSERT INTO rfz_couriers (code, supplier_id, warehouse_id, name, phone, vehicle_plate, status) VALUES (?,?,?,?,?,?,?)`, [
    code,
    supplierId,
    warehouseId,
    body.name,
    body.phone || null,
    body.vehicle_plate || body.plate || null,
    'Tersedia',
  ])

  if (body.email) {
    await query(`INSERT INTO rfz_users (name,email,password,role,role_name,branch,avatar,description,supplier_id,courier_id,warehouse_id,status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE name=VALUES(name), password=VALUES(password), supplier_id=VALUES(supplier_id), warehouse_id=VALUES(warehouse_id), courier_id=VALUES(courier_id), status='Aktif'`, [
      body.name,
      body.email,
      body.password || '12345678',
      'courier',
      'Kurir',
      supplierId ? 'Kurir Mitra Supplier' : 'Kurir Gudang',
      initials(body.name),
      supplierId ? 'Akun kurir supplier.' : 'Akun kurir gudang untuk distribusi ke cabang.',
      supplierId,
      result.insertId,
      warehouseId,
      body.status || 'Aktif',
    ])
  }

  return ok({ success: true, message: 'Kurir berhasil dibuat', id: result.insertId, code })
}

export async function updateCourierStatus(req) {
  const body = req.body || {}
  const courierId = Number(body.courier_id || body.courierId || body.id || 0)
  if (!courierId || !body.status) return ok({ success: false, message: 'Kurir dan status wajib diisi' }, 400)
  await query('UPDATE rfz_couriers SET status=? WHERE id=?', [body.status, courierId])
  await query('UPDATE rfz_users SET status=? WHERE courier_id=?', [body.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif', courierId])
  return ok({ success: true, message: 'Status kurir diperbarui' })
}

export async function upsertMaterial(req) {
  const body = req.body || {}
  const id = Number(body.id || 0)
  const name = body.name || ''
  if (!name) return ok({ success: false, message: 'Nama bahan wajib diisi' }, 400)

  if (id) {
    await query(`UPDATE rfz_materials SET name=?, category=?, unit=?, stock=?, minimum_stock=? WHERE id=?`, [
      name,
      body.category || null,
      body.unit || 'Kg',
      toNumber(body.stock),
      toNumber(body.minimum_stock || body.minStock),
      id,
    ])
    return ok({ success: true, message: 'Material berhasil diperbarui', id })
  }

  const result = await query(`INSERT INTO rfz_materials (code, name, category, unit, stock, minimum_stock) VALUES (?,?,?,?,?,?)`, [
    makeCode('BB'),
    name,
    body.category || null,
    body.unit || 'Kg',
    toNumber(body.stock),
    toNumber(body.minimum_stock || body.minStock),
  ])
  return ok({ success: true, message: 'Material berhasil dibuat', id: result.insertId })
}

export async function recordProductionUsage(req) {
  const body = req.body || {}
  const materialId = Number(body.material_id || body.materialId || 0)
  const quantity = toNumber(body.quantity || body.qty, 0)
  if (!materialId || !quantity) return ok({ success: false, message: 'Material dan jumlah wajib diisi' }, 400)

  const material = (await query('SELECT * FROM rfz_materials WHERE id=? LIMIT 1', [materialId]))[0]
  if (!material) return ok({ success: false, message: 'Material tidak ditemukan' }, 404)
  const before = toNumber(material.stock)
  const after = Math.max(before - quantity, 0)
  await query('UPDATE rfz_materials SET stock=? WHERE id=?', [after, materialId])
  await query(`INSERT INTO rfz_movements (material_id, movement_type, source_type, quantity, unit, stock_before, stock_after, notes, created_by)
    VALUES (?,?,?,?,?,?,?,?,?)`, [materialId, 'OUT', 'Pemakaian Gudang', quantity, material.unit, before, after, body.notes || 'Pemakaian operasional gudang', body.created_by || 'Gudang'])

  return ok({ success: true, message: 'Pemakaian gudang berhasil dicatat' })
}

export async function createBranchRequest(req) {
  const body = req.body || {}
  const branchId = Number(body.branch_id || body.branchId || 0)
  const materialId = Number(body.material_id || body.materialId || 0)
  const quantity = toNumber(body.quantity || body.qty, 0)
  if (!branchId || !materialId || !quantity) return ok({ success: false, message: 'Cabang, barang, dan jumlah wajib diisi' }, 400)

  const material = (await query('SELECT * FROM rfz_materials WHERE id=? LIMIT 1', [materialId]))[0]
  if (!material) return ok({ success: false, message: 'Material tidak ditemukan' }, 404)

  const code = makeCode('REQ-CB')
  const result = await query(`INSERT INTO rfz_branch_requests (code, branch_id, warehouse_id, material_id, quantity, unit, status, notes, requested_by)
    VALUES (?,?,?,?,?,?,?,?,?)`, [
    code,
    branchId,
    Number(body.warehouse_id || body.warehouseId || 0) || null,
    materialId,
    quantity,
    body.unit || material.unit,
    'Menunggu Persetujuan Gudang',
    body.notes || null,
    body.requested_by || body.requestedBy || 'Cabang',
  ])
  return ok({ success: true, message: 'Permintaan cabang berhasil dikirim ke gudang', id: result.insertId, code })
}

export async function updateBranchRequest(req) {
  const body = req.body || {}
  const id = Number(body.id || body.request_id || body.requestId || 0)
  const action = body.action || 'approve'
  const requester = body.created_by || body.approved_by || body.user || 'Gudang'
  if (!id) return ok({ success: false, message: 'ID permintaan wajib diisi' }, 400)

  const reqRow = (await query('SELECT * FROM rfz_branch_requests WHERE id=? LIMIT 1', [id]))[0]
  if (!reqRow) return ok({ success: false, message: 'Permintaan cabang tidak ditemukan' }, 404)

  if (action === 'reject') {
    await query(`UPDATE rfz_branch_requests SET status='Ditolak Gudang', notes=CONCAT(COALESCE(notes,''), ?), approved_by=? WHERE id=?`, [`
Alasan: ${body.reason || body.notes || '-'}`, requester, id])
    return ok({ success: true, message: 'Permintaan cabang ditolak' })
  }

  if (action === 'approve') {
    await query(`UPDATE rfz_branch_requests SET status='Disetujui Gudang', approved_by=? WHERE id=?`, [requester, id])
    return ok({ success: true, message: 'Permintaan cabang disetujui' })
  }

  if (action === 'send' || action === 'process') {
    const courierId = Number(body.courier_id || body.courierId || 0)
    if (!courierId) return ok({ success: false, message: 'Pilih kurir gudang terlebih dahulu' }, 400)
    const material = (await query('SELECT * FROM rfz_materials WHERE id=? LIMIT 1', [reqRow.material_id]))[0]
    if (!material) return ok({ success: false, message: 'Material tidak ditemukan' }, 404)
    const before = toNumber(material.stock)
    const qty = toNumber(reqRow.quantity)
    if (before < qty) return ok({ success: false, message: `Stok gudang tidak cukup. Sisa stok ${before} ${material.unit || reqRow.unit}` }, 400)
    const after = before - qty
    await query('UPDATE rfz_materials SET stock=? WHERE id=?', [after, material.id])
    await query(`INSERT INTO rfz_movements (material_id, movement_type, source_type, quantity, unit, stock_before, stock_after, notes, created_by)
      VALUES (?,?,?,?,?,?,?,?,?)`, [material.id, 'OUT', 'Distribusi ke Cabang', qty, reqRow.unit || material.unit, before, after, `Pengiriman permintaan ${reqRow.code}`, requester])
    await query(`UPDATE rfz_branch_requests SET status='Menunggu Persetujuan Kurir', courier_id=?, approved_by=? WHERE id=?`, [courierId, requester, id])
    await query(`UPDATE rfz_couriers SET status='Ditugaskan' WHERE id=?`, [courierId])
    return ok({ success: true, message: 'Barang disiapkan dan tugas dikirim ke kurir gudang' })
  }

  if (action === 'receive') {
    const material = (await query('SELECT * FROM rfz_materials WHERE id=? LIMIT 1', [reqRow.material_id]))[0]
    await query(`INSERT INTO rfz_branch_stocks (branch_id, material_id, stock, unit)
      VALUES (?,?,?,?)
      ON DUPLICATE KEY UPDATE stock=stock+VALUES(stock), unit=VALUES(unit)`, [reqRow.branch_id, reqRow.material_id, toNumber(reqRow.quantity), reqRow.unit || material?.unit || '-'])
    await query(`UPDATE rfz_branch_requests SET status='Diterima Cabang' WHERE id=?`, [id])
    if (reqRow.courier_id) await query(`UPDATE rfz_couriers SET status='Tersedia' WHERE id=?`, [reqRow.courier_id])
    return ok({ success: true, message: 'Barang diterima cabang dan stok cabang bertambah' })
  }

  return ok({ success: false, message: 'Aksi permintaan tidak dikenal' }, 400)
}

export async function recordBranchSale(req) {
  const body = req.body || {}
  const branchId = Number(body.branch_id || body.branchId || 0)
  const materialId = Number(body.material_id || body.materialId || 0)
  const quantity = toNumber(body.quantity || body.qty, 0)
  if (!branchId || !materialId || !quantity) return ok({ success: false, message: 'Cabang, barang, dan jumlah penjualan wajib diisi' }, 400)

  const stock = (await query('SELECT * FROM rfz_branch_stocks WHERE branch_id=? AND material_id=? LIMIT 1', [branchId, materialId]))[0]
  if (!stock || toNumber(stock.stock) < quantity) return ok({ success: false, message: 'Stok cabang tidak cukup untuk dicatat sebagai penjualan' }, 400)

  await query('UPDATE rfz_branch_stocks SET stock=stock-? WHERE branch_id=? AND material_id=?', [quantity, branchId, materialId])
  const result = await query(`INSERT INTO rfz_branch_sales (code, branch_id, material_id, quantity, unit, notes, created_by) VALUES (?,?,?,?,?,?,?)`, [
    makeCode('SALE'), branchId, materialId, quantity, body.unit || stock.unit || '-', body.notes || null, body.created_by || 'Cabang'
  ])
  return ok({ success: true, message: 'Penjualan cabang berhasil dicatat dan stok berkurang', id: result.insertId })
}

export async function createManagedSupplier(req) {
  const body = req.body || {}
  const name = body.company_name || body.name
  if (!name || !body.material_type) return ok({ success: false, message: 'Nama supplier dan bahan baku wajib diisi' }, 400)

  const result = await query(`INSERT INTO rfz_suppliers (code, name, material_type, material_unit, phone, address, status, score) VALUES (?,?,?,?,?,?,?,?)`, [
    makeCode('SUP'), name, body.material_type, body.material_unit || 'Kg', body.phone || null, body.address || null, body.status || 'Aktif', body.score || 90,
  ])

  const existingMaterial = (await query('SELECT * FROM rfz_materials WHERE LOWER(name)=LOWER(?) LIMIT 1', [body.material_type]))[0]
  if (!existingMaterial) {
    await query(`INSERT INTO rfz_materials (code, name, category, unit, stock, minimum_stock) VALUES (?,?,?,?,?,?)`, [makeCode('BB'), body.material_type, 'Bahan Baku', body.material_unit || 'Kg', 0, 10])
  }

  if (body.email) {
    await query(`INSERT INTO rfz_users (name,email,password,role,role_name,branch,avatar,description,supplier_id,status)
      VALUES (?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE name=VALUES(name), password=VALUES(password), supplier_id=VALUES(supplier_id), status=VALUES(status)`, [
      name, body.email, body.password || '12345678', 'supplier', 'Supplier', name, 'SP', 'Akun supplier.', result.insertId, body.status || 'Aktif',
    ])
  }

  return ok({ success: true, message: 'Supplier dan akun berhasil dibuat', id: result.insertId })
}

export async function updateManagedSupplier(req) {
  const body = req.body || {}
  const id = Number(body.id || 0)
  const name = body.company_name || body.name
  if (!id || !name) return ok({ success: false, message: 'ID dan nama supplier wajib diisi' }, 400)

  await query(`UPDATE rfz_suppliers SET name=?, material_type=?, material_unit=?, phone=?, address=?, status=? WHERE id=?`, [
    name, body.material_type || null, body.material_unit || 'Kg', body.phone || null, body.address || null, body.status || 'Aktif', id,
  ])

  if (body.email) {
    if (body.password) {
      await query(`UPDATE rfz_users SET name=?, email=?, password=?, status=? WHERE role='supplier' AND supplier_id=?`, [name, body.email, body.password, body.status || 'Aktif', id])
    } else {
      await query(`UPDATE rfz_users SET name=?, email=?, status=? WHERE role='supplier' AND supplier_id=?`, [name, body.email, body.status || 'Aktif', id])
    }
  } else {
    await query(`UPDATE rfz_users SET name=?, status=? WHERE role='supplier' AND supplier_id=?`, [name, body.status || 'Aktif', id])
  }

  return ok({ success: true, message: 'Supplier berhasil diperbarui' })
}

export async function deleteManagedSupplier(req) {
  const id = Number(req.body?.id || 0)
  if (!id) return ok({ success: false, message: 'ID supplier wajib diisi' }, 400)
  await query(`UPDATE rfz_suppliers SET status='Nonaktif' WHERE id=?`, [id])
  await query(`UPDATE rfz_users SET status='Nonaktif' WHERE supplier_id=? AND role='supplier'`, [id])
  return ok({ success: true, message: 'Supplier berhasil dinonaktifkan' })
}

export async function createManagedWarehouse(req) {
  const body = req.body || {}
  const name = body.warehouse_name || body.name
  if (!name) return ok({ success: false, message: 'Nama gudang wajib diisi' }, 400)

  const result = await query(`INSERT INTO rfz_warehouses (code, name, address, status) VALUES (?,?,?,?)`, [makeCode('WH'), name, body.address || null, body.status || 'Aktif'])

  if (body.email) {
    await query(`INSERT INTO rfz_users (name,email,password,role,role_name,branch,avatar,description,warehouse_id,status)
      VALUES (?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE name=VALUES(name), password=VALUES(password), warehouse_id=VALUES(warehouse_id), status=VALUES(status)`, [
      body.admin_name || body.pic_name || `PIC ${name}`, body.email, body.password || '12345678', 'warehouse', 'Gudang', name, 'GD', 'Akun gudang.', result.insertId, body.status || 'Aktif',
    ])
  }

  return ok({ success: true, message: 'Gudang dan akun berhasil dibuat', id: result.insertId })
}

export async function updateManagedWarehouse(req) {
  const body = req.body || {}
  const id = Number(body.id || 0)
  const name = body.warehouse_name || body.name
  if (!id || !name) return ok({ success: false, message: 'ID dan nama gudang wajib diisi' }, 400)

  await query(`UPDATE rfz_warehouses SET name=?, address=?, status=? WHERE id=?`, [name, body.address || null, body.status || 'Aktif', id])
  const pic = body.admin_name || body.pic_name || `PIC ${name}`
  if (body.email) {
    if (body.password) await query(`UPDATE rfz_users SET name=?, email=?, password=?, branch=?, status=? WHERE role='warehouse' AND warehouse_id=?`, [pic, body.email, body.password, name, body.status || 'Aktif', id])
    else await query(`UPDATE rfz_users SET name=?, email=?, branch=?, status=? WHERE role='warehouse' AND warehouse_id=?`, [pic, body.email, name, body.status || 'Aktif', id])
  } else {
    await query(`UPDATE rfz_users SET name=?, branch=?, status=? WHERE role='warehouse' AND warehouse_id=?`, [pic, name, body.status || 'Aktif', id])
  }
  return ok({ success: true, message: 'Gudang berhasil diperbarui' })
}

export async function deleteManagedWarehouse(req) {
  const id = Number(req.body?.id || 0)
  if (!id) return ok({ success: false, message: 'ID gudang wajib diisi' }, 400)
  await query(`UPDATE rfz_warehouses SET status='Nonaktif' WHERE id=?`, [id])
  await query(`UPDATE rfz_users SET status='Nonaktif' WHERE warehouse_id=? AND role='warehouse'`, [id])
  return ok({ success: true, message: 'Gudang berhasil dinonaktifkan' })
}

export async function createManagedBranch(req) {
  const body = req.body || {}
  const name = body.branch_name || body.name
  if (!name) return ok({ success: false, message: 'Nama cabang wajib diisi' }, 400)

  const result = await query(`INSERT INTO rfz_branches (code, name, address, status) VALUES (?,?,?,?)`, [makeCode('CB'), name, body.address || null, body.status || 'Aktif'])

  if (body.email) {
    await query(`INSERT INTO rfz_users (name,email,password,role,role_name,branch,avatar,description,branch_id,status)
      VALUES (?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE name=VALUES(name), password=VALUES(password), branch_id=VALUES(branch_id), status=VALUES(status)`, [
      body.pic_name || `PIC ${name}`, body.email, body.password || '12345678', 'branch', 'Cabang', name, 'CB', 'Akun cabang untuk request stok dan penjualan.', result.insertId, body.status || 'Aktif',
    ])
  }

  return ok({ success: true, message: 'Cabang dan akun berhasil dibuat', id: result.insertId })
}

export async function updateManagedBranch(req) {
  const body = req.body || {}
  const id = Number(body.id || 0)
  const name = body.branch_name || body.name
  if (!id || !name) return ok({ success: false, message: 'ID dan nama cabang wajib diisi' }, 400)

  await query(`UPDATE rfz_branches SET name=?, address=?, status=? WHERE id=?`, [name, body.address || null, body.status || 'Aktif', id])
  const pic = body.pic_name || `PIC ${name}`
  if (body.email) {
    if (body.password) await query(`UPDATE rfz_users SET name=?, email=?, password=?, branch=?, status=? WHERE role='branch' AND branch_id=?`, [pic, body.email, body.password, name, body.status || 'Aktif', id])
    else await query(`UPDATE rfz_users SET name=?, email=?, branch=?, status=? WHERE role='branch' AND branch_id=?`, [pic, body.email, name, body.status || 'Aktif', id])
  } else {
    await query(`UPDATE rfz_users SET name=?, branch=?, status=? WHERE role='branch' AND branch_id=?`, [pic, name, body.status || 'Aktif', id])
  }
  return ok({ success: true, message: 'Cabang berhasil diperbarui' })
}

export async function deleteManagedBranch(req) {
  const id = Number(req.body?.id || 0)
  if (!id) return ok({ success: false, message: 'ID cabang wajib diisi' }, 400)
  await query(`UPDATE rfz_branches SET status='Nonaktif' WHERE id=?`, [id])
  await query(`UPDATE rfz_users SET status='Nonaktif' WHERE branch_id=? AND role='branch'`, [id])
  return ok({ success: true, message: 'Cabang berhasil dinonaktifkan' })
}

export async function updateManagedAccountStatus(req) {
  const body = req.body || {}
  const id = Number(body.id || 0)
  const status = body.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif'
  if (!id) return ok({ success: false, message: 'ID akun wajib diisi' }, 400)

  const user = (await query('SELECT * FROM rfz_users WHERE id=? LIMIT 1', [id]))[0]
  if (!user) return ok({ success: false, message: 'Akun tidak ditemukan' }, 404)
  if (user.role === 'manager' && status === 'Nonaktif') return ok({ success: false, message: 'Akun manager utama tidak boleh dinonaktifkan dari fitur ini' }, 400)

  await query('UPDATE rfz_users SET status=? WHERE id=?', [status, id])
  if (user.role === 'supplier' && user.supplier_id) await query('UPDATE rfz_suppliers SET status=? WHERE id=?', [status, user.supplier_id])
  if ((user.role === 'warehouse' || user.role === 'admin') && user.warehouse_id) await query('UPDATE rfz_warehouses SET status=? WHERE id=?', [status, user.warehouse_id])
  if (user.role === 'branch' && user.branch_id) await query('UPDATE rfz_branches SET status=? WHERE id=?', [status, user.branch_id])
  if (user.role === 'courier' && user.courier_id) await query('UPDATE rfz_couriers SET status=? WHERE id=?', [status === 'Aktif' ? 'Tersedia' : 'Nonaktif', user.courier_id])

  return ok({ success: true, message: `Akun berhasil ${status === 'Aktif' ? 'diaktifkan' : 'dinonaktifkan'}` })
}

function normalizeWaypoint(value) {
  if (Array.isArray(value)) {
    const lat = Number(value[0])
    const lng = Number(value[1])
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng]
  }
  if (value && typeof value === 'object') {
    const lat = Number(value.lat ?? value.latitude)
    const lng = Number(value.lng ?? value.longitude)
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng]
  }
  return null
}

export async function getMapsRoute(req) {
  const body = req.body || {}
  const waypoints = Array.isArray(body.waypoints) ? body.waypoints.map(normalizeWaypoint).filter(Boolean) : []
  if (waypoints.length < 2) return ok({ success: false, message: 'Minimal dua titik lokasi dibutuhkan untuk membuat rute' }, 400)

  const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';')
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&alternatives=true&steps=true`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8500)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'rafiza-operational-system/1.0' },
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return ok({ success: false, message: payload?.message || 'Routing OSRM tidak tersedia' }, 502)
    }

    const routes = Array.isArray(payload?.routes) ? payload.routes : []
    const mappedRoutes = routes
      .map((route) => ({
        distance_m: Number(route.distance || 0),
        duration_s: Number(route.duration || 0),
        geometry: Array.isArray(route?.geometry?.coordinates) ? route.geometry.coordinates.map(([lng, lat]) => [lat, lng]) : [],
        source: 'OSRM',
      }))
      .filter((route) => route.geometry.length > 0)
      .sort((a, b) => a.duration_s - b.duration_s)

    if (!mappedRoutes.length) return ok({ success: false, message: 'Rute jalan tidak ditemukan' }, 404)

    return ok({
      success: true,
      provider: 'OSRM Public Free',
      note: 'Rute dihitung berdasarkan jaringan jalan OSRM gratis. Jalur mengikuti aturan driving, termasuk jalan satu arah yang dikenali data OpenStreetMap.',
      route: mappedRoutes[0],
      alternatives: mappedRoutes,
    })
  } catch (error) {
    return ok({ success: false, message: error?.name === 'AbortError' ? 'Routing timeout' : 'Gagal mengambil rute OSRM' }, 502)
  } finally {
    clearTimeout(timeout)
  }
}

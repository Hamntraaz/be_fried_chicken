import { ok } from '../lib/api'
import { query } from '../lib/db'
import { formatDate, initials, makeCode, materialStatus, toNumber } from '../lib/helpers'

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    roleName: row.role_name,
    role_name: row.role_name,
    branch: row.branch,
    avatar: row.avatar || initials(row.name),
    description: row.description,
    supplier_id: row.supplier_id,
    courier_id: row.courier_id,
    warehouse_id: row.warehouse_id,
    status: row.status,
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

function mapCourier(row) {
  return {
    id: row.id,
    code: row.code || `KUR-${String(row.id).padStart(3, '0')}`,
    supplier_id: row.supplier_id,
    supplier_name: row.supplier_name || '-',
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
    destination_address: row.destination_address || row.warehouse_name || 'Gudang/Cabang Rafiza',
  }
}

function mapDelivery(row) {
  return {
    id: row.id,
    code: row.code || `DLV-${String(row.id).padStart(3, '0')}`,
    order_id: row.order_id,
    order_code: row.order_code || '-',
    courier_id: row.courier_id,
    courier_name: row.courier_name || 'Belum ditugaskan',
    status: row.status,
    pickup_address: row.pickup_address || row.supplier_name || '-',
    destination_address: row.destination_address || row.warehouse_name || 'Gudang/Cabang Rafiza',
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

async function overviewRows() {
  const materials = await query('SELECT * FROM rfz_materials ORDER BY id')
  const suppliers = await query('SELECT * FROM rfz_suppliers ORDER BY id')
  const warehouses = await query('SELECT * FROM rfz_warehouses ORDER BY id')
  const users = await query('SELECT * FROM rfz_users ORDER BY id')
  const couriers = await query(`SELECT c.*, s.name AS supplier_name FROM rfz_couriers c LEFT JOIN rfz_suppliers s ON s.id = c.supplier_id ORDER BY c.id`)
  const orders = await query(`SELECT o.*, m.name AS material_name, s.name AS supplier_name, s.material_unit, w.name AS warehouse_name, c.name AS courier_name
    FROM rfz_orders o
    LEFT JOIN rfz_materials m ON m.id = o.material_id
    LEFT JOIN rfz_suppliers s ON s.id = o.supplier_id
    LEFT JOIN rfz_warehouses w ON w.id = o.warehouse_id
    LEFT JOIN rfz_couriers c ON c.id = o.courier_id
    ORDER BY o.ordered_at DESC, o.id DESC`)
  const deliveries = await query(`SELECT d.*, o.code AS order_code, s.name AS supplier_name, w.name AS warehouse_name, c.name AS courier_name
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
  const actorLocations = await query(`SELECT al.* FROM rfz_actor_locations al ORDER BY al.created_at DESC LIMIT 20`)

  return { materials, suppliers, warehouses, users, couriers, orders, deliveries, movements, actorLocations }
}

function buildNotifications({ orders, deliveries }) {
  const notifications = []
  for (const order of orders.slice(0, 8)) {
    if (String(order.status).includes('Menunggu Konfirmasi')) {
      notifications.push({ id: `supplier-${order.id}`, role: 'supplier', title: 'Pesanan baru', message: `${order.code} menunggu konfirmasi supplier.` })
    }
    if (String(order.status).includes('Konfirmasi Gudang')) {
      notifications.push({ id: `admin-${order.id}`, role: 'admin', title: 'Barang tiba', message: `${order.code} menunggu konfirmasi gudang.` })
    }
  }
  for (const delivery of deliveries.slice(0, 8)) {
    if (delivery.status === 'Menunggu Persetujuan Kurir') {
      notifications.push({ id: `courier-${delivery.id}`, role: 'courier', title: 'Tugas kurir baru', message: `${delivery.order_code} menunggu respons kurir.` })
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
  const couriers = rows.couriers.map(mapCourier)
  const orders = rows.orders.map(mapOrder)
  const deliveries = rows.deliveries.map(mapDelivery)
  const movements = rows.movements.map(mapMovement)
  const users = rows.users.map(mapUser)
  const lowStock = materials.filter((item) => item.status === 'Menipis').length
  const activeDeliveries = deliveries.filter((item) => !['Pengiriman Selesai', 'Pesanan Diterima', 'Selesai'].includes(item.status)).length
  const completedOrders = orders.filter((item) => ['Pesanan Diterima', 'Selesai'].includes(item.status)).length

  const data = {
    summary: {
      total_materials: materials.length,
      total_suppliers: suppliers.filter((item) => item.status !== 'Nonaktif').length,
      total_warehouses: warehouses.filter((item) => item.status !== 'Nonaktif').length,
      total_couriers: couriers.filter((item) => item.status !== 'Nonaktif').length,
      total_orders: orders.length,
      total_users: users.length,
      low_stock: lowStock,
      active_deliveries: activeDeliveries,
      completed_orders: completedOrders,
    },
    materials,
    suppliers,
    couriers,
    orders,
    deliveries,
    movements,
    warehouses,
    users,
    actor_locations: rows.actorLocations.reduce((acc, item) => {
      acc[item.role || item.user_id || item.id] = item
      return acc
    }, {}),
    notifications: buildNotifications({ orders, deliveries }),
    timeline: [
      { time: 'Now', title: 'Backend aktif', text: 'Data diambil dari MySQL Railway.' },
      { time: 'Today', title: `${lowStock} stok menipis`, text: 'Perlu dipantau oleh admin gudang.' },
      { time: 'Today', title: `${activeDeliveries} pengiriman aktif`, text: 'Kurir dapat update status dan lokasi.' },
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
  await query('INSERT INTO rfz_actor_locations (user_id, role, latitude, longitude, accuracy) VALUES (?,?,?,?,?)', [
    body.user_id || body.userId || null,
    body.role || null,
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
      order.destination_address || 'Gudang/Cabang Rafiza',
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

export async function courierTaskResponse(req) {
  const body = req.body || {}
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
  const deliveryId = Number(body.delivery_id || body.deliveryId || 0)
  const delivery = (await query('SELECT * FROM rfz_deliveries WHERE id=? LIMIT 1', [deliveryId]))[0]
  if (!delivery) return ok({ success: false, message: 'Delivery tidak ditemukan' }, 404)

  await query(`UPDATE rfz_deliveries SET status='Menunggu Konfirmasi Gudang', current_lat=?, current_lng=?, progress=90, recorded_at=NOW() WHERE id=?`, [
    body.latitude || null,
    body.longitude || null,
    deliveryId,
  ])
  await query(`UPDATE rfz_orders SET status='Menunggu Konfirmasi Gudang' WHERE id=?`, [delivery.order_id])
  return ok({ success: true, message: 'Kurir tiba di gudang' })
}

export async function deliveryComplete(req) {
  const body = req.body || {}
  const deliveryId = Number(body.delivery_id || body.deliveryId || 0)
  const delivery = (await query('SELECT * FROM rfz_deliveries WHERE id=? LIMIT 1', [deliveryId]))[0]
  if (!delivery) return ok({ success: false, message: 'Delivery tidak ditemukan' }, 404)

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
    VALUES (?,?,?,?,?,?,?,?,?,?)`, [material.id, order.id, 'IN', 'Barang Masuk Supplier', qty, order.unit || material.unit, before, after, `Penerimaan ${order.code}`, body.created_by || 'Admin Gudang/Cabang'])
  await query(`UPDATE rfz_orders SET status='Pesanan Diterima' WHERE id=?`, [order.id])
  await query(`UPDATE rfz_deliveries SET status='Pengiriman Selesai', progress=100, recorded_at=NOW() WHERE order_id=?`, [order.id])
  if (order.courier_id) await query(`UPDATE rfz_couriers SET status='Tersedia' WHERE id=?`, [order.courier_id])

  return ok({ success: true, message: 'Barang berhasil diterima dan stok bertambah' })
}

export async function assignCourier(req) {
  const body = req.body || {}
  req.body = { ...body, courier_id: body.courier_id || body.courierId, order_id: body.order_id || body.orderId }
  return supplierConfirmOrder(req)
}

export async function createCourier(req) {
  const body = req.body || {}
  const supplierId = Number(body.supplier_id || body.supplierId || 0)
  if (!supplierId || !body.name) return ok({ success: false, message: 'Supplier dan nama kurir wajib diisi' }, 400)

  const code = makeCode('KUR')
  const result = await query(`INSERT INTO rfz_couriers (code, supplier_id, name, phone, vehicle_plate, status) VALUES (?,?,?,?,?,?)`, [
    code,
    supplierId,
    body.name,
    body.phone || null,
    body.vehicle_plate || body.plate || null,
    'Tersedia',
  ])

  if (body.email) {
    await query(`INSERT INTO rfz_users (name,email,password,role,role_name,branch,avatar,description,supplier_id,courier_id,status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE name=VALUES(name), password=VALUES(password), supplier_id=VALUES(supplier_id), courier_id=VALUES(courier_id), status='Aktif'`, [
      body.name,
      body.email,
      body.password || '12345678',
      'courier',
      'Kurir',
      'Kurir Mitra Supplier',
      initials(body.name),
      'Akun kurir supplier.',
      supplierId,
      result.insertId,
      'Aktif',
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
    VALUES (?,?,?,?,?,?,?,?,?)`, [materialId, 'OUT', 'Produksi Harian', quantity, material.unit, before, after, body.notes || 'Pemakaian produksi', body.created_by || 'Admin Gudang/Cabang'])

  return ok({ success: true, message: 'Pemakaian produksi berhasil dicatat' })
}

export async function createManagedSupplier(req) {
  const body = req.body || {}
  const name = body.company_name || body.name
  if (!name || !body.material_type) return ok({ success: false, message: 'Nama supplier dan bahan baku wajib diisi' }, 400)

  const result = await query(`INSERT INTO rfz_suppliers (code, name, material_type, material_unit, phone, address, status, score) VALUES (?,?,?,?,?,?,?,?)`, [
    makeCode('SUP'),
    name,
    body.material_type,
    body.material_unit || 'Kg',
    body.phone || null,
    body.address || null,
    body.status || 'Aktif',
    body.score || 90,
  ])

  const existingMaterial = (await query('SELECT * FROM rfz_materials WHERE LOWER(name)=LOWER(?) LIMIT 1', [body.material_type]))[0]
  if (!existingMaterial) {
    await query(`INSERT INTO rfz_materials (code, name, category, unit, stock, minimum_stock) VALUES (?,?,?,?,?,?)`, [makeCode('BB'), body.material_type, 'Bahan Baku', body.material_unit || 'Kg', 0, 10])
  }

  if (body.email) {
    await query(`INSERT INTO rfz_users (name,email,password,role,role_name,branch,avatar,description,supplier_id,status)
      VALUES (?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE name=VALUES(name), password=VALUES(password), supplier_id=VALUES(supplier_id), status='Aktif'`, [
      name,
      body.email,
      body.password || '12345678',
      'supplier',
      'Supplier',
      name,
      'SP',
      'Akun supplier.',
      result.insertId,
      'Aktif',
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
    name,
    body.material_type || null,
    body.material_unit || 'Kg',
    body.phone || null,
    body.address || null,
    body.status || 'Aktif',
    id,
  ])

  if (body.email) {
    const passwordUpdate = body.password ? ', password=?' : ''
    const params = body.password
      ? [name, body.email, body.password, id]
      : [name, body.email, id]
    await query(`UPDATE rfz_users SET name=?, email=?${passwordUpdate}, status='Aktif' WHERE role='supplier' AND supplier_id=?`, params)
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
      ON DUPLICATE KEY UPDATE name=VALUES(name), password=VALUES(password), warehouse_id=VALUES(warehouse_id), status='Aktif'`, [
      body.admin_name || `Admin ${name}`,
      body.email,
      body.password || '12345678',
      'admin',
      'Admin Gudang',
      name,
      'AG',
      'Akun admin gudang/cabang.',
      result.insertId,
      'Aktif',
    ])
  }

  return ok({ success: true, message: 'Gudang/cabang dan akun berhasil dibuat', id: result.insertId })
}

export async function updateManagedWarehouse(req) {
  const body = req.body || {}
  const id = Number(body.id || 0)
  const name = body.warehouse_name || body.name
  if (!id || !name) return ok({ success: false, message: 'ID dan nama gudang wajib diisi' }, 400)

  await query(`UPDATE rfz_warehouses SET name=?, address=?, status=? WHERE id=?`, [name, body.address || null, body.status || 'Aktif', id])
  if (body.email) {
    const passwordUpdate = body.password ? ', password=?' : ''
    const params = body.password
      ? [body.admin_name || `Admin ${name}`, body.email, body.password, id]
      : [body.admin_name || `Admin ${name}`, body.email, id]
    await query(`UPDATE rfz_users SET name=?, email=?${passwordUpdate}, branch=?, status='Aktif' WHERE role='admin' AND warehouse_id=?`, [...params.slice(0, params.length - 1), name, params[params.length - 1]])
  }
  return ok({ success: true, message: 'Gudang/cabang berhasil diperbarui' })
}

export async function deleteManagedWarehouse(req) {
  const id = Number(req.body?.id || 0)
  if (!id) return ok({ success: false, message: 'ID gudang wajib diisi' }, 400)
  await query(`UPDATE rfz_warehouses SET status='Nonaktif' WHERE id=?`, [id])
  await query(`UPDATE rfz_users SET status='Nonaktif' WHERE warehouse_id=? AND role='admin'`, [id])
  return ok({ success: true, message: 'Gudang/cabang berhasil dinonaktifkan' })
}

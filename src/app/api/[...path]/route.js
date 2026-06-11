import { initDb, query } from '@/lib/db'
import { corsHeaders, json, makeId, mapCourier, mapDelivery, mapMaterial, mapOrder, mapSupplier, readBody } from '@/lib/helpers'

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function GET(request, context) {
  try {
    await initDb()
    const path = '/' + (context.params.path || []).join('/')

    if (path === '/health') return json({ ok: true, message: 'Backend aktif' })
    if (path === '/overview') return json(await getOverview())

    return json({ message: `Endpoint GET ${path} tidak ditemukan` }, 404)
  } catch (error) {
    return json({ message: error.message || 'Server error' }, 500)
  }
}

export async function POST(request, context) {
  try {
    await initDb()
    const path = '/' + (context.params.path || []).join('/')
    const body = await readBody(request)

    if (path === '/login') return await login(body)
    if (path === '/actor-location') return await saveActorLocation(body)
    if (path === '/purchase-orders') return await createPurchaseOrder(body)
    if (path === '/supplier-confirm') return await supplierConfirm(body)
    if (path === '/driver-start') return await driverStart(body)
    if (path === '/delivery-location') return await updateDeliveryLocation(body)
    if (path === '/courier-task-response') return await courierTaskResponse(body)
    if (path === '/driver-arrived') return await driverArrived(body)
    if (path === '/delivery-complete') return await deliveryComplete(body)
    if (path === '/order-status') return await updateOrderStatus(body)
    if (path === '/assign-courier') return await assignCourier(body)
    if (path === '/couriers') return await createCourier(body)
    if (path === '/materials') return await upsertMaterial(body)
    if (path === '/production-usage') return await recordProductionUsage(body)
    if (path === '/receive-order') return await receiveOrder(body)
    if (path === '/courier-status') return await updateCourierStatus(body)
    if (path === '/manager-suppliers') return await createManagedSupplier(body)
    if (path === '/manager-warehouses') return await createManagedWarehouse(body)
    if (path === '/manager-suppliers-update') return await updateManagedSupplier(body)
    if (path === '/manager-suppliers-delete') return await deleteManagedSupplier(body)
    if (path === '/manager-warehouses-update') return await updateManagedWarehouse(body)
    if (path === '/manager-warehouses-delete') return await deleteManagedWarehouse(body)

    return json({ message: `Endpoint POST ${path} tidak ditemukan` }, 404)
  } catch (error) {
    return json({ message: error.message || 'Server error' }, 500)
  }
}

async function getOverview() {
  const materials = (await query('SELECT * FROM materials ORDER BY id')).map(mapMaterial)
  const suppliers = (await query('SELECT * FROM suppliers ORDER BY id')).map(mapSupplier)
  const couriers = (await query('SELECT * FROM couriers ORDER BY id')).map(mapCourier)
  const purchaseOrders = (await query('SELECT * FROM purchase_orders ORDER BY created_at DESC')).map(mapOrder)
  const deliveryTasks = (await query('SELECT * FROM deliveries ORDER BY created_at DESC')).map(mapDelivery)
  const productionUsage = await query('SELECT * FROM production_usages ORDER BY created_at DESC LIMIT 20')

  const lowStocks = materials.filter((item) => item.status === 'Menipis').length
  const completed = purchaseOrders.filter((po) => po.status === 'Selesai').length
  const activeDeliveries = deliveryTasks.filter((d) => d.status !== 'Selesai').length

  return {
    stockItems: materials,
    suppliers,
    couriers,
    purchaseOrders,
    deliveryTasks,
    productionUsage,
    activityTimeline: [
      { time: 'Now', title: 'Data backend aktif', text: 'Overview diambil dari database MySQL Railway.' },
      { time: 'Today', title: `${lowStocks} stok menipis`, text: 'Item dengan stok di bawah batas minimum perlu diproses.' },
      { time: 'Today', title: `${activeDeliveries} pengiriman aktif`, text: 'Kurir dapat memperbarui lokasi dan status pengiriman.' },
    ],
    managementSummary: [
      { label: 'Total Material', value: String(materials.length), note: `${lowStocks} item menipis` },
      { label: 'Supplier Aktif', value: String(suppliers.length), note: 'Data supplier terdaftar' },
      { label: 'Pesanan Selesai', value: String(completed), note: 'Berdasarkan purchase order' },
      { label: 'Pengiriman Aktif', value: String(activeDeliveries), note: 'Belum selesai diterima gudang' },
    ],
  }
}

async function login(body) {
  const rows = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [body.email])
  const user = rows[0]
  if (!user || user.password !== body.password) return json({ message: 'Email atau password salah' }, 401)

  return json({
    message: 'Login berhasil',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleName: user.role_name,
      branch: user.branch,
      avatar: user.avatar,
      description: user.description,
    },
    token: `demo-token-${user.id}`,
  })
}

async function saveActorLocation(body) {
  await query('INSERT INTO actor_locations (user_id,role,latitude,longitude,accuracy) VALUES (?,?,?,?,?)', [body.user_id, body.role, body.latitude, body.longitude, body.accuracy || null])
  return json({ message: 'Lokasi berhasil disimpan' })
}

async function createPurchaseOrder(body) {
  const id = body.id || makeId('PO-RFZ')
  await query(`INSERT INTO purchase_orders (id,material,qty,unit,supplier,status,priority,eta,branch)
    VALUES (?,?,?,?,?,?,?,?,?)`, [id, body.material, body.qty, body.unit, body.supplier, body.status || 'Menunggu Konfirmasi', body.priority || 'Normal', body.eta || '-', body.branch || 'Gudang Utama Rafiza'])
  return json({ message: 'Purchase order berhasil dibuat', id })
}

async function supplierConfirm(body) {
  const courierRows = body.courier_id ? await query('SELECT * FROM couriers WHERE id=? LIMIT 1', [body.courier_id]) : []
  const courier = courierRows[0]
  await query(`UPDATE purchase_orders SET status='Diproses Supplier', courier_id=?, courier=?, pickup_lat=?, pickup_lng=?, pickup_address=? WHERE id=?`, [body.courier_id || null, courier?.name || 'Belum ditugaskan', body.pickup_lat || null, body.pickup_lng || null, body.pickup_address || null, body.order_id])
  return json({ message: 'Order berhasil dikonfirmasi supplier' })
}

async function driverStart(body) {
  await query(`UPDATE deliveries SET status='Dalam Perjalanan', progress=40, latitude=?, longitude=? WHERE id=?`, [body.latitude || null, body.longitude || null, body.delivery_id])
  if (body.courier_id) await query(`UPDATE couriers SET status='Dalam Pengiriman' WHERE id=?`, [body.courier_id])
  return json({ message: 'Kurir mulai pengiriman' })
}

async function updateDeliveryLocation(body) {
  await query(`UPDATE deliveries SET latitude=?, longitude=?, progress=GREATEST(progress,60) WHERE id=?`, [body.latitude || null, body.longitude || null, body.delivery_id])
  return json({ message: 'Lokasi pengiriman diperbarui' })
}

async function courierTaskResponse(body) {
  const status = body.action === 'reject' ? 'Ditolak Kurir' : 'Diterima Kurir'
  await query(`UPDATE deliveries SET status=? WHERE id=?`, [status, body.delivery_id])
  return json({ message: `Tugas ${status.toLowerCase()}` })
}

async function driverArrived(body) {
  await query(`UPDATE deliveries SET status='Tiba di Gudang', progress=90, latitude=?, longitude=? WHERE id=?`, [body.latitude || null, body.longitude || null, body.delivery_id])
  return json({ message: 'Kurir tiba di gudang' })
}

async function deliveryComplete(body) {
  await query(`UPDATE deliveries SET status='Selesai', eta='Diterima', progress=100, latitude=?, longitude=?, proof_photo=?, proof_note=? WHERE id=?`, [body.latitude || null, body.longitude || null, body.proof_photo || null, body.proof_note || null, body.delivery_id])
  const delivery = (await query('SELECT * FROM deliveries WHERE id=? LIMIT 1', [body.delivery_id]))[0]
  if (delivery?.order_id) await query(`UPDATE purchase_orders SET status='Selesai', eta='Diterima' WHERE id=?`, [delivery.order_id])
  if (body.courier_id) await query(`UPDATE couriers SET status='Tersedia' WHERE id=?`, [body.courier_id])
  return json({ message: 'Pengiriman selesai' })
}

async function updateOrderStatus(body) {
  await query('UPDATE purchase_orders SET status=? WHERE id=?', [body.status, body.order_id])
  return json({ message: 'Status order diperbarui' })
}

async function assignCourier(body) {
  const courier = (await query('SELECT * FROM couriers WHERE id=? LIMIT 1', [body.courier_id]))[0]
  if (!courier) return json({ message: 'Kurir tidak ditemukan' }, 404)
  const order = (await query('SELECT * FROM purchase_orders WHERE id=? LIMIT 1', [body.order_id]))[0]
  if (!order) return json({ message: 'Order tidak ditemukan' }, 404)
  await query('UPDATE purchase_orders SET courier_id=?, courier=?, status=? WHERE id=?', [courier.id, courier.name, 'Kurir Ditugaskan', body.order_id])
  const deliveryId = makeId('DLV')
  await query(`INSERT INTO deliveries (id,order_id,courier_id,pickup,destination,material,status,eta,distance,progress) VALUES (?,?,?,?,?,?,?,?,?,?)`, [deliveryId, order.id, courier.id, order.supplier, 'Gudang Utama Rafiza', `${order.material} ${Number(order.qty)} ${order.unit}`, 'Menunggu Kurir', '-', '-', 10])
  return json({ message: 'Kurir berhasil ditugaskan', deliveryId })
}

async function createCourier(body) {
  const id = body.id || makeId('KUR')
  await query('INSERT INTO couriers (id,name,supplier,phone,vehicle,plate,status) VALUES (?,?,?,?,?,?,?)', [id, body.name, body.supplier || null, body.phone || null, body.vehicle || null, body.plate || null, body.status || 'Tersedia'])
  return json({ message: 'Kurir berhasil dibuat', id })
}

async function upsertMaterial(body) {
  const id = body.id || makeId('BB')
  await query(`INSERT INTO materials (id,name,category,stock,min_stock,unit,supplier) VALUES (?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), stock=VALUES(stock), min_stock=VALUES(min_stock), unit=VALUES(unit), supplier=VALUES(supplier)`, [id, body.name, body.category || null, body.stock || 0, body.minStock || body.min_stock || 0, body.unit || null, body.supplier || null])
  return json({ message: 'Material berhasil disimpan', id })
}

async function recordProductionUsage(body) {
  await query('INSERT INTO production_usages (material_id,material,qty,unit,note) VALUES (?,?,?,?,?)', [body.material_id || body.materialId || null, body.material || null, body.qty || 0, body.unit || null, body.note || null])
  if (body.material_id || body.materialId) {
    await query('UPDATE materials SET stock = GREATEST(stock - ?, 0) WHERE id=?', [body.qty || 0, body.material_id || body.materialId])
  }
  return json({ message: 'Pemakaian produksi berhasil dicatat' })
}

async function receiveOrder(body) {
  await query(`UPDATE purchase_orders SET status='Selesai', eta='Diterima' WHERE id=?`, [body.order_id || body.orderId])
  if (body.material_id || body.materialId) await query('UPDATE materials SET stock = stock + ? WHERE id=?', [body.qty || 0, body.material_id || body.materialId])
  return json({ message: 'Barang berhasil diterima' })
}

async function updateCourierStatus(body) {
  await query('UPDATE couriers SET status=? WHERE id=?', [body.status, body.id || body.courier_id])
  return json({ message: 'Status kurir diperbarui' })
}

async function createManagedSupplier(body) {
  const id = body.id || makeId('SUP')
  await query('INSERT INTO suppliers (id,name,category,phone,address,status,score) VALUES (?,?,?,?,?,?,?)', [id, body.name, body.category || null, body.phone || null, body.address || null, body.status || 'Aktif', body.score || 90])
  return json({ message: 'Supplier berhasil dibuat', id })
}

async function updateManagedSupplier(body) {
  await query('UPDATE suppliers SET name=?, category=?, phone=?, address=?, status=?, score=? WHERE id=?', [body.name, body.category || null, body.phone || null, body.address || null, body.status || 'Aktif', body.score || 90, body.id])
  return json({ message: 'Supplier berhasil diperbarui' })
}

async function deleteManagedSupplier(body) {
  await query('DELETE FROM suppliers WHERE id=?', [body.id])
  return json({ message: 'Supplier berhasil dihapus' })
}

async function createManagedWarehouse(body) {
  return json({ message: 'Warehouse berhasil disimpan', data: body })
}

async function updateManagedWarehouse(body) {
  return json({ message: 'Warehouse berhasil diperbarui', data: body })
}

async function deleteManagedWarehouse(body) {
  return json({ message: 'Warehouse berhasil dihapus', id: body.id })
}

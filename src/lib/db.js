import mysql from 'mysql2/promise'

let pool
let initialized = false

function buildDatabaseUrlFromParts() {
  const host = process.env.MYSQLHOST || process.env.MYSQL_HOST
  const port = process.env.MYSQLPORT || process.env.MYSQL_PORT || 3306
  const user = process.env.MYSQLUSER || process.env.MYSQL_USER || 'root'
  const password = process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD || process.env.MYSQL_PASSWORD || ''
  const database = process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'railway'
  if (!host) return ''
  return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`
}

export function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL || buildDatabaseUrlFromParts()
}

export function getPool() {
  if (!pool) {
    const databaseUrl = getDatabaseUrl()
    if (!databaseUrl) {
      throw new Error('DATABASE_URL / MYSQL_URL belum diatur di Railway Variables')
    }

    pool = mysql.createPool(databaseUrl, {
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      decimalNumbers: true,
      multipleStatements: false,
    })
  }
  return pool
}

export async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params)
  return rows
}

export async function initDb() {
  if (initialized) return

  await query(`CREATE TABLE IF NOT EXISTS rfz_warehouses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(40) UNIQUE,
    name VARCHAR(160) NOT NULL,
    address TEXT,
    status VARCHAR(40) DEFAULT 'Aktif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`)

  await query(`CREATE TABLE IF NOT EXISTS rfz_suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(40) UNIQUE,
    name VARCHAR(160) NOT NULL,
    material_type VARCHAR(160),
    material_unit VARCHAR(40),
    phone VARCHAR(60),
    address TEXT,
    status VARCHAR(40) DEFAULT 'Aktif',
    score INT DEFAULT 90,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`)

  await query(`CREATE TABLE IF NOT EXISTS rfz_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(40) UNIQUE,
    name VARCHAR(160) NOT NULL,
    category VARCHAR(100),
    stock DECIMAL(12,2) DEFAULT 0,
    minimum_stock DECIMAL(12,2) DEFAULT 0,
    unit VARCHAR(40),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`)

  await query(`CREATE TABLE IF NOT EXISTS rfz_couriers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(40) UNIQUE,
    supplier_id INT,
    name VARCHAR(160) NOT NULL,
    phone VARCHAR(60),
    vehicle_plate VARCHAR(80),
    status VARCHAR(60) DEFAULT 'Tersedia',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`)

  await query(`CREATE TABLE IF NOT EXISTS rfz_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password VARCHAR(160) NOT NULL,
    role VARCHAR(40) NOT NULL,
    role_name VARCHAR(100),
    branch VARCHAR(160),
    avatar VARCHAR(12),
    description TEXT,
    supplier_id INT NULL,
    courier_id INT NULL,
    warehouse_id INT NULL,
    status VARCHAR(40) DEFAULT 'Aktif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`)

  await query(`CREATE TABLE IF NOT EXISTS rfz_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(60) UNIQUE,
    material_id INT,
    supplier_id INT,
    warehouse_id INT,
    courier_id INT NULL,
    quantity DECIMAL(12,2) DEFAULT 0,
    unit VARCHAR(40),
    status VARCHAR(80) DEFAULT 'Menunggu Konfirmasi Supplier',
    notes TEXT,
    destination_lat DECIMAL(11,8),
    destination_lng DECIMAL(11,8),
    destination_address TEXT,
    ordered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`)

  await query(`CREATE TABLE IF NOT EXISTS rfz_deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(60) UNIQUE,
    order_id INT NOT NULL,
    courier_id INT,
    status VARCHAR(80) DEFAULT 'Menunggu Persetujuan Kurir',
    pickup_lat DECIMAL(11,8),
    pickup_lng DECIMAL(11,8),
    pickup_address TEXT,
    destination_lat DECIMAL(11,8),
    destination_lng DECIMAL(11,8),
    destination_address TEXT,
    current_lat DECIMAL(11,8),
    current_lng DECIMAL(11,8),
    progress INT DEFAULT 0,
    proof_photo TEXT,
    proof_note TEXT,
    proof_uploaded_at TIMESTAMP NULL,
    reject_reason TEXT,
    reject_proof TEXT,
    recorded_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`)

  await query(`CREATE TABLE IF NOT EXISTS rfz_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    material_id INT,
    order_id INT NULL,
    movement_type VARCHAR(20),
    source_type VARCHAR(80),
    quantity DECIMAL(12,2) DEFAULT 0,
    unit VARCHAR(40),
    stock_before DECIMAL(12,2) DEFAULT 0,
    stock_after DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_by VARCHAR(160),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`)

  await query(`CREATE TABLE IF NOT EXISTS rfz_actor_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    role VARCHAR(40),
    latitude DECIMAL(11,8),
    longitude DECIMAL(11,8),
    accuracy DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`)

  await seedDb()
  initialized = true
}

async function seedDb() {
  const warehouseCount = await query('SELECT COUNT(*) AS total FROM rfz_warehouses')
  if (warehouseCount[0].total === 0) {
    await query(`INSERT INTO rfz_warehouses (id,code,name,address,status) VALUES
      (1,'WH-001','Gudang Utama Rafiza','Jl. Operasional Rafiza Pusat','Aktif'),
      (2,'WH-002','Cabang Rafiza Timur','Area outlet timur','Aktif')`)
  }

  const supplierCount = await query('SELECT COUNT(*) AS total FROM rfz_suppliers')
  if (supplierCount[0].total === 0) {
    await query(`INSERT INTO rfz_suppliers (id,code,name,material_type,material_unit,phone,address,status,score) VALUES
      (1,'SUP-001','PT Ayam Segar Mandiri','Ayam Potong','Kg','0811-1111-1111','Jakarta Timur','Aktif',96),
      (2,'SUP-002','UD Bumbu Crispy','Tepung Bumbu Krispy','Kg','0833-3333-3333','Bekasi','Aktif',91),
      (3,'SUP-003','CV Sumber Minyak','Minyak Goreng','Liter','0822-2222-2222','Tangerang','Aktif',88)`) 
  }

  const materialCount = await query('SELECT COUNT(*) AS total FROM rfz_materials')
  if (materialCount[0].total === 0) {
    await query(`INSERT INTO rfz_materials (id,code,name,category,stock,minimum_stock,unit) VALUES
      (1,'BB-001','Ayam Potong','Protein',35,50,'Kg'),
      (2,'BB-002','Tepung Bumbu Krispy','Bumbu',120,45,'Kg'),
      (3,'BB-003','Minyak Goreng','Minyak',25,35,'Liter'),
      (4,'BB-004','Sambal Geprek','Saus',62,25,'Pack'),
      (5,'BB-005','Beras Premium','Karbohidrat',80,50,'Kg')`)
  }

  const courierCount = await query('SELECT COUNT(*) AS total FROM rfz_couriers')
  if (courierCount[0].total === 0) {
    await query(`INSERT INTO rfz_couriers (id,code,supplier_id,name,phone,vehicle_plate,status) VALUES
      (1,'KUR-001',1,'Andi Pratama','0812-3344-5566','B 1234 RFC','Tersedia'),
      (2,'KUR-002',2,'Budi Santoso','0821-4455-6677','B 7788 RFC','Tersedia'),
      (3,'KUR-003',3,'Rian Nugroho','0856-1122-3344','B 9012 RFC','Tersedia')`)
  }

  const userCount = await query('SELECT COUNT(*) AS total FROM rfz_users')
  if (userCount[0].total === 0) {
    await query(`INSERT INTO rfz_users (id,name,email,password,role,role_name,branch,avatar,description,supplier_id,courier_id,warehouse_id,status) VALUES
      (1,'Nadia Putri','admin@gmail.com','12345678','admin','Admin Gudang','Gudang Utama Rafiza','AG','Mengelola stok bahan baku, membuat pesanan pembelian, dan mengonfirmasi barang diterima.',NULL,NULL,1,'Aktif'),
      (2,'Supplier Ayam Segar','supplier@gmail.com','12345678','supplier','Supplier','PT Ayam Segar Mandiri','SP','Menerima pesanan bahan baku, memproses pesanan, dan menugaskan kurir.',1,NULL,NULL,'Aktif'),
      (3,'Andi Pratama','kurir@gmail.com','12345678','courier','Kurir','Kurir Mitra Supplier','KR','Melihat tugas pengiriman, memperbarui status perjalanan, dan menyelesaikan pengantaran.',1,1,NULL,'Aktif'),
      (4,'Rafiza Management','manager@gmail.com','12345678','manager','Manajemen','Head Office Rafiza','MG','Memantau performa stok, pesanan, supplier, kurir, dan laporan operasional.',NULL,NULL,NULL,'Aktif')`)
  }

  const orderCount = await query('SELECT COUNT(*) AS total FROM rfz_orders')
  if (orderCount[0].total === 0) {
    await query(`INSERT INTO rfz_orders (id,code,material_id,supplier_id,warehouse_id,courier_id,quantity,unit,status,notes,destination_address) VALUES
      (1,'PO-RFZ-001',1,1,1,1,100,'Kg','Menunggu Persetujuan Kurir','Order ayam potong untuk stok pusat','Gudang Utama Rafiza'),
      (2,'PO-RFZ-002',3,3,1,NULL,50,'Liter','Menunggu Konfirmasi Supplier','Order minyak goreng','Gudang Utama Rafiza'),
      (3,'PO-RFZ-003',2,2,1,2,80,'Kg','Pesanan Diterima','Order tepung selesai','Gudang Utama Rafiza')`)
  }

  const deliveryCount = await query('SELECT COUNT(*) AS total FROM rfz_deliveries')
  if (deliveryCount[0].total === 0) {
    await query(`INSERT INTO rfz_deliveries (id,code,order_id,courier_id,status,pickup_address,destination_address,current_lat,current_lng,progress,recorded_at) VALUES
      (1,'DLV-001',1,1,'Menunggu Persetujuan Kurir','PT Ayam Segar Mandiri','Gudang Utama Rafiza',NULL,NULL,10,NOW()),
      (2,'DLV-002',3,2,'Pengiriman Selesai','UD Bumbu Crispy','Gudang Utama Rafiza',NULL,NULL,100,NOW())`)
  }

  const movementCount = await query('SELECT COUNT(*) AS total FROM rfz_movements')
  if (movementCount[0].total === 0) {
    await query(`INSERT INTO rfz_movements (material_id,order_id,movement_type,source_type,quantity,unit,stock_before,stock_after,notes,created_by) VALUES
      (2,3,'IN','Barang Masuk Supplier',80,'Kg',40,120,'Penerimaan PO-RFZ-003','System'),
      (1,NULL,'OUT','Produksi Harian',15,'Kg',50,35,'Produksi ayam crispy shift pagi','System')`)
  }
}

import mysql from 'mysql2/promise'

let pool
let initialized = false

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL belum diatur')
    }
    pool = mysql.createPool(process.env.DATABASE_URL)
  }
  return pool
}

export async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params)
  return rows
}

export async function initDb() {
  if (initialized) return

  await query(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password VARCHAR(120) NOT NULL,
    role VARCHAR(30) NOT NULL,
    role_name VARCHAR(80),
    branch VARCHAR(120),
    avatar VARCHAR(10),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`)

  await query(`CREATE TABLE IF NOT EXISTS materials (
    id VARCHAR(30) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(80),
    stock DECIMAL(12,2) DEFAULT 0,
    min_stock DECIMAL(12,2) DEFAULT 0,
    unit VARCHAR(30),
    supplier VARCHAR(120),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`)

  await query(`CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(30) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(100),
    phone VARCHAR(50),
    address TEXT,
    status VARCHAR(30) DEFAULT 'Aktif',
    score INT DEFAULT 90,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`)

  await query(`CREATE TABLE IF NOT EXISTS couriers (
    id VARCHAR(30) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    supplier VARCHAR(120),
    phone VARCHAR(50),
    vehicle VARCHAR(80),
    plate VARCHAR(40),
    status VARCHAR(50) DEFAULT 'Tersedia',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`)

  await query(`CREATE TABLE IF NOT EXISTS purchase_orders (
    id VARCHAR(40) PRIMARY KEY,
    material VARCHAR(120) NOT NULL,
    qty DECIMAL(12,2) NOT NULL,
    unit VARCHAR(30),
    supplier VARCHAR(120),
    courier VARCHAR(120) DEFAULT 'Belum ditugaskan',
    courier_id VARCHAR(30),
    status VARCHAR(60) DEFAULT 'Menunggu Konfirmasi',
    priority VARCHAR(30) DEFAULT 'Normal',
    eta VARCHAR(50) DEFAULT '-',
    branch VARCHAR(120) DEFAULT 'Gudang Utama Rafiza',
    pickup_lat DECIMAL(11,8),
    pickup_lng DECIMAL(11,8),
    pickup_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`)

  await query(`CREATE TABLE IF NOT EXISTS deliveries (
    id VARCHAR(40) PRIMARY KEY,
    order_id VARCHAR(40) NOT NULL,
    courier_id VARCHAR(30),
    pickup VARCHAR(120),
    destination VARCHAR(120) DEFAULT 'Gudang Utama Rafiza',
    material VARCHAR(160),
    status VARCHAR(60) DEFAULT 'Menunggu Kurir',
    eta VARCHAR(50) DEFAULT '-',
    distance VARCHAR(50) DEFAULT '-',
    progress INT DEFAULT 0,
    latitude DECIMAL(11,8),
    longitude DECIMAL(11,8),
    proof_photo TEXT,
    proof_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`)

  await query(`CREATE TABLE IF NOT EXISTS actor_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    role VARCHAR(30),
    latitude DECIMAL(11,8),
    longitude DECIMAL(11,8),
    accuracy DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`)

  await query(`CREATE TABLE IF NOT EXISTS production_usages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    material_id VARCHAR(30),
    material VARCHAR(120),
    qty DECIMAL(12,2),
    unit VARCHAR(30),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`)

  await seedDb()
  initialized = true
}

async function seedDb() {
  const users = await query('SELECT COUNT(*) AS total FROM users')
  if (users[0].total === 0) {
    await query(`INSERT INTO users (name,email,password,role,role_name,branch,avatar,description) VALUES
      ('Nadia Putri','admin@gmail.com','12345678','admin','Admin Gudang','Gudang Utama Rafiza','AG','Mengelola stok bahan baku, membuat pesanan pembelian, dan mengonfirmasi barang diterima.'),
      ('Supplier Ayam Segar','supplier@gmail.com','12345678','supplier','Supplier','PT Ayam Segar Mandiri','SP','Menerima pesanan bahan baku, memproses pesanan, dan menugaskan kurir.'),
      ('Andi Pratama','kurir@gmail.com','12345678','courier','Kurir','Kurir Mitra Supplier','KR','Melihat tugas pengiriman, memperbarui status perjalanan, dan menyelesaikan pengantaran.'),
      ('Rafiza Management','manager@gmail.com','12345678','manager','Manajemen','Head Office Rafiza','MG','Memantau performa stok, pesanan, supplier, kurir, dan laporan operasional.')`)
  }

  const materials = await query('SELECT COUNT(*) AS total FROM materials')
  if (materials[0].total === 0) {
    await query(`INSERT INTO materials (id,name,category,stock,min_stock,unit,supplier) VALUES
      ('BB-001','Ayam Potong','Protein',35,50,'Kg','PT Ayam Segar Mandiri'),
      ('BB-002','Tepung Bumbu Krispy','Bumbu',120,45,'Kg','UD Bumbu Crispy'),
      ('BB-003','Minyak Goreng','Minyak',25,35,'Liter','CV Sumber Minyak'),
      ('BB-004','Sambal Geprek','Saus',62,25,'Pack','Dapur Sambal Nusantara'),
      ('BB-005','Beras Premium','Karbohidrat',80,50,'Kg','Toko Beras Makmur')`)
  }

  const suppliers = await query('SELECT COUNT(*) AS total FROM suppliers')
  if (suppliers[0].total === 0) {
    await query(`INSERT INTO suppliers (id,name,category,phone,address,status,score) VALUES
      ('SUP-001','PT Ayam Segar Mandiri','Ayam Potong','0811-1111-1111','Jakarta Timur','Aktif',96),
      ('SUP-002','UD Bumbu Crispy','Tepung Bumbu','0833-3333-3333','Bekasi','Aktif',91),
      ('SUP-003','CV Sumber Minyak','Minyak Goreng','0822-2222-2222','Tangerang','Aktif',88)`)
  }

  const couriers = await query('SELECT COUNT(*) AS total FROM couriers')
  if (couriers[0].total === 0) {
    await query(`INSERT INTO couriers (id,name,supplier,phone,vehicle,plate,status) VALUES
      ('KUR-001','Andi Pratama','PT Ayam Segar Mandiri','0812-3344-5566','Motor Box','B 1234 RFC','Dalam Pengiriman'),
      ('KUR-002','Budi Santoso','UD Bumbu Crispy','0821-4455-6677','Motor Box','B 7788 RFC','Tersedia'),
      ('KUR-003','Rian Nugroho','CV Sumber Minyak','0856-1122-3344','Pickup','B 9012 RFC','Tersedia')`)
  }

  const orders = await query('SELECT COUNT(*) AS total FROM purchase_orders')
  if (orders[0].total === 0) {
    await query(`INSERT INTO purchase_orders (id,material,qty,unit,supplier,courier,courier_id,status,priority,eta,branch) VALUES
      ('PO-RFZ-001','Ayam Potong',100,'Kg','PT Ayam Segar Mandiri','Andi Pratama','KUR-001','Dalam Perjalanan','Tinggi','18 menit','Outlet Rafiza Pusat'),
      ('PO-RFZ-002','Minyak Goreng',50,'Liter','CV Sumber Minyak','Belum ditugaskan',NULL,'Diproses Supplier','Sedang','-','Outlet Rafiza Pusat'),
      ('PO-RFZ-003','Tepung Bumbu Krispy',80,'Kg','UD Bumbu Crispy','Budi Santoso','KUR-002','Selesai','Normal','Diterima','Outlet Rafiza Pusat')`)
  }

  const deliveries = await query('SELECT COUNT(*) AS total FROM deliveries')
  if (deliveries[0].total === 0) {
    await query(`INSERT INTO deliveries (id,order_id,courier_id,pickup,destination,material,status,eta,distance,progress) VALUES
      ('DLV-001','PO-RFZ-001','KUR-001','PT Ayam Segar Mandiri','Gudang Utama Rafiza','Ayam Potong 100 Kg','Dalam Perjalanan','18 menit','5.4 km',62),
      ('DLV-002','PO-RFZ-003','KUR-002','UD Bumbu Crispy','Gudang Utama Rafiza','Tepung Bumbu 80 Kg','Selesai','Diterima','7.2 km',100)`)
  }
}

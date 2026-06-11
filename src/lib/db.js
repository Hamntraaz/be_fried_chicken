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


  await query(`CREATE TABLE IF NOT EXISTS rfz_branches (
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
    warehouse_id INT NULL,
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
    branch_id INT NULL,
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


  await query(`CREATE TABLE IF NOT EXISTS rfz_branch_stocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT NOT NULL,
    material_id INT NOT NULL,
    stock DECIMAL(12,2) DEFAULT 0,
    unit VARCHAR(40),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_branch_material (branch_id, material_id)
  )`)

  await query(`CREATE TABLE IF NOT EXISTS rfz_branch_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(60) UNIQUE,
    branch_id INT NOT NULL,
    warehouse_id INT NULL,
    material_id INT NOT NULL,
    quantity DECIMAL(12,2) DEFAULT 0,
    unit VARCHAR(40),
    status VARCHAR(80) DEFAULT 'Menunggu Persetujuan Gudang',
    notes TEXT,
    requested_by VARCHAR(160),
    approved_by VARCHAR(160),
    courier_id INT NULL,
    current_lat DECIMAL(11,8),
    current_lng DECIMAL(11,8),
    proof_photo TEXT,
    proof_note TEXT,
    proof_uploaded_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`)

  await query(`CREATE TABLE IF NOT EXISTS rfz_branch_sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(60) UNIQUE,
    branch_id INT NOT NULL,
    material_id INT NOT NULL,
    quantity DECIMAL(12,2) DEFAULT 0,
    unit VARCHAR(40),
    notes TEXT,
    created_by VARCHAR(160),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`)

  await query(`CREATE TABLE IF NOT EXISTS rfz_actor_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    role VARCHAR(40),
    supplier_id INT NULL,
    courier_id INT NULL,
    warehouse_id INT NULL,
    branch_id INT NULL,
    latitude DECIMAL(11,8),
    longitude DECIMAL(11,8),
    accuracy DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`)


  try { await query(`ALTER TABLE rfz_users ADD COLUMN branch_id INT NULL`) } catch (error) {}
  try { await query(`ALTER TABLE rfz_actor_locations ADD COLUMN supplier_id INT NULL`) } catch (error) {}
  try { await query(`ALTER TABLE rfz_actor_locations ADD COLUMN courier_id INT NULL`) } catch (error) {}
  try { await query(`ALTER TABLE rfz_actor_locations ADD COLUMN warehouse_id INT NULL`) } catch (error) {}
  try { await query(`ALTER TABLE rfz_actor_locations ADD COLUMN branch_id INT NULL`) } catch (error) {}

  try { await query(`ALTER TABLE rfz_couriers ADD COLUMN warehouse_id INT NULL`) } catch (error) {}
  try { await query(`ALTER TABLE rfz_branch_requests ADD COLUMN courier_id INT NULL`) } catch (error) {}
  try { await query(`ALTER TABLE rfz_branch_requests ADD COLUMN current_lat DECIMAL(11,8)`) } catch (error) {}
  try { await query(`ALTER TABLE rfz_branch_requests ADD COLUMN current_lng DECIMAL(11,8)`) } catch (error) {}
  try { await query(`ALTER TABLE rfz_branch_requests ADD COLUMN proof_photo TEXT`) } catch (error) {}
  try { await query(`ALTER TABLE rfz_branch_requests ADD COLUMN proof_note TEXT`) } catch (error) {}
  try { await query(`ALTER TABLE rfz_branch_requests ADD COLUMN proof_uploaded_at TIMESTAMP NULL`) } catch (error) {}
  try { await query(`ALTER TABLE rfz_branch_requests ADD COLUMN delivered_at TIMESTAMP NULL`) } catch (error) {}
  await normalizeRoleData()
  await seedDb()
  initialized = true
}

async function normalizeRoleData() {
  await query(`UPDATE rfz_users
    SET role='warehouse', role_name='Gudang', avatar=COALESCE(NULLIF(avatar,''),'GD'), description='Mengelola stok gudang, membuat pesanan ke supplier, dan memenuhi permintaan cabang.'
    WHERE role='admin'`)
}

async function seedDb() {
  const userCount = await query('SELECT COUNT(*) AS total FROM rfz_users')
  if (userCount[0].total === 0) {
    await query(`INSERT INTO rfz_users (name,email,password,role,role_name,branch,avatar,description,supplier_id,courier_id,warehouse_id,status) VALUES
      ('Rafiza Management','manager@gmail.com','12345678','manager','Manager','Head Office Rafiza','MG','Mengelola akun supplier, gudang, cabang, monitoring, dan laporan operasional.',NULL,NULL,NULL,'Aktif')`)
  }
}

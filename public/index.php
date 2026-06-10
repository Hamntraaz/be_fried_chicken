<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function load_env_file(): void
{
    $paths = [__DIR__ . '/../.env', __DIR__ . '/../../.env'];
    foreach ($paths as $path) {
        if (!is_file($path)) continue;
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value, " \t\n\r\0\x0B\"'");
            if ($key !== '' && getenv($key) === false) {
                putenv("{$key}={$value}");
                $_ENV[$key] = $value;
                $_SERVER[$key] = $value;
            }
        }
        return;
    }
}

load_env_file();

function response_json($data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function db(): PDO
{
    $host = getenv('DB_HOST') ?: '127.0.0.1';
    $port = getenv('DB_PORT') ?: '3306';
    $database = getenv('DB_DATABASE') ?: 'be_fried_chicken';
    $username = getenv('DB_USERNAME') ?: 'root';
    $password = getenv('DB_PASSWORD') !== false ? getenv('DB_PASSWORD') : 'root';

    return new PDO(
        "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function initials(string $name): string
{
    $words = preg_split('/\s+/', trim($name));
    $letters = '';
    foreach ($words as $word) {
        if ($word !== '') $letters .= mb_substr($word, 0, 1);
        if (mb_strlen($letters) >= 2) break;
    }
    return mb_strtoupper($letters ?: 'RFZ');
}

function role_meta(string $role, string $name): array
{
    $map = [
        'admin' => ['roleName' => 'Admin Gudang/Cabang', 'branch' => 'Gudang / Cabang Rafiza'],
        'supplier' => ['roleName' => 'Supplier', 'branch' => 'Mitra Supplier Rafiza'],
        'courier' => ['roleName' => 'Kurir', 'branch' => 'Kurir Supplier'],
        'manager' => ['roleName' => 'Manajemen', 'branch' => 'Head Office Rafiza'],
    ];
    return array_merge($map[$role] ?? ['roleName' => ucfirst($role), 'branch' => 'Rafiza Fried Chicken'], ['avatar' => initials($name)]);
}

function read_column_names(PDO $pdo, string $table): array
{
    $stmt = $pdo->prepare("SHOW COLUMNS FROM {$table}");
    try {
        $stmt->execute();
        return array_map(fn($r) => $r['Field'], $stmt->fetchAll());
    } catch (Throwable $e) {
        return [];
    }
}

function add_column_if_missing(PDO $pdo, string $table, string $column, string $definition): void
{
    $columns = read_column_names($pdo, $table);
    if (!in_array($column, $columns, true)) {
        $pdo->exec("ALTER TABLE {$table} ADD COLUMN {$column} {$definition}");
    }
}

function ensure_schema(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS user_locations (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NULL,
        role VARCHAR(50) NOT NULL,
        latitude DECIMAL(10,7) NOT NULL,
        longitude DECIMAL(10,7) NOT NULL,
        accuracy DECIMAL(10,2) NULL,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_user_location (user_id),
        KEY idx_role_location (role)
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS notifications (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        role VARCHAR(50) NOT NULL,
        title VARCHAR(160) NOT NULL,
        message TEXT NULL,
        order_id BIGINT UNSIGNED NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_role_notification (role),
        KEY idx_order_notification (order_id)
    )");

    add_column_if_missing($pdo, 'deliveries', 'proof_photo', 'MEDIUMTEXT NULL');
    add_column_if_missing($pdo, 'deliveries', 'proof_note', 'TEXT NULL');
    add_column_if_missing($pdo, 'deliveries', 'completed_lat', 'DECIMAL(10,7) NULL');
    add_column_if_missing($pdo, 'deliveries', 'completed_lng', 'DECIMAL(10,7) NULL');
    add_column_if_missing($pdo, 'deliveries', 'proof_uploaded_at', 'TIMESTAMP NULL');
    add_column_if_missing($pdo, 'deliveries', 'rejection_reason', 'TEXT NULL');
    add_column_if_missing($pdo, 'deliveries', 'rejection_proof', 'MEDIUMTEXT NULL');
    add_column_if_missing($pdo, 'deliveries', 'rejected_at', 'TIMESTAMP NULL');
    add_column_if_missing($pdo, 'users', 'supplier_id', 'BIGINT UNSIGNED NULL');
    add_column_if_missing($pdo, 'users', 'courier_id', 'BIGINT UNSIGNED NULL');
    add_column_if_missing($pdo, 'users', 'warehouse_id', 'BIGINT UNSIGNED NULL');
    add_column_if_missing($pdo, 'suppliers', 'material_unit', 'VARCHAR(50) NULL');

    $pdo->exec("CREATE TABLE IF NOT EXISTS warehouses (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        address TEXT NULL,
        status VARCHAR(50) DEFAULT 'Aktif',
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    $count = (int)$pdo->query('SELECT COUNT(*) FROM warehouses')->fetchColumn();
    // Gudang/cabang dibuat dari akun manajer agar data master benar-benar manual.

    $pdo->exec("CREATE TABLE IF NOT EXISTS material_movements (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        material_id BIGINT UNSIGNED NOT NULL,
        warehouse_id BIGINT UNSIGNED NULL,
        purchase_order_id BIGINT UNSIGNED NULL,
        movement_type ENUM('IN','OUT','ADJUSTMENT') NOT NULL,
        source_type VARCHAR(80) NOT NULL,
        quantity INT NOT NULL,
        unit VARCHAR(50) NOT NULL,
        stock_before INT NOT NULL DEFAULT 0,
        stock_after INT NOT NULL DEFAULT 0,
        notes TEXT NULL,
        created_by VARCHAR(120) NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_material_movements_material (material_id),
        KEY idx_material_movements_order (purchase_order_id)
    )");

    add_column_if_missing($pdo, 'materials', 'is_active', 'TINYINT(1) DEFAULT 1');
    add_column_if_missing($pdo, 'purchase_orders', 'warehouse_id', 'BIGINT UNSIGNED NULL');
}

function normalize_material(array $row): array
{
    $stock = (int)($row['stock'] ?? 0);
    $min = (int)($row['minimum_stock'] ?? 0);
    $status = $stock < $min ? 'Menipis' : ($row['status'] ?? 'Aman');
    return [
        'id' => (int)$row['id'],
        'code' => 'BB-' . str_pad((string)$row['id'], 3, '0', STR_PAD_LEFT),
        'name' => $row['name'],
        'category' => $row['category'] ?? '-',
        'unit' => $row['unit'] ?? '-',
        'stock' => $stock,
        'minimum_stock' => $min,
        'status' => $status,
    ];
}

function format_date(?string $date): string
{
    if (!$date) return '-';
    return date('d M Y H:i', strtotime($date));
}

function valid_coord($lat, $lng): bool
{
    return is_numeric($lat) && is_numeric($lng) && (float)$lat >= -90 && (float)$lat <= 90 && (float)$lng >= -180 && (float)$lng <= 180;
}

function notify_role(PDO $pdo, string $role, string $title, string $message, ?int $orderId = null): void
{
    $stmt = $pdo->prepare('INSERT INTO notifications (role, title, message, order_id, created_at) VALUES (?, ?, ?, ?, NOW())');
    $stmt->execute([$role, $title, $message, $orderId]);
}

function record_material_movement(PDO $pdo, int $materialId, int $warehouseId, ?int $orderId, string $type, string $sourceType, int $quantity, string $unit, int $before, int $after, string $notes, string $createdBy): void
{
    $stmt = $pdo->prepare('INSERT INTO material_movements (material_id, warehouse_id, purchase_order_id, movement_type, source_type, quantity, unit, stock_before, stock_after, notes, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())');
    $stmt->execute([$materialId, $warehouseId ?: null, $orderId, $type, $sourceType, $quantity, $unit, $before, $after, $notes, $createdBy]);
}


function ensure_material_from_supplier(PDO $pdo, string $materialName, string $unit): int
{
    $materialName = trim($materialName);
    $unit = trim($unit) ?: 'Unit';
    if ($materialName === '') return 0;

    $stmt = $pdo->prepare('SELECT id FROM materials WHERE LOWER(name) = LOWER(?) LIMIT 1');
    $stmt->execute([$materialName]);
    $existingId = (int)$stmt->fetchColumn();
    if ($existingId > 0) {
        $pdo->prepare("UPDATE materials SET unit = ?, updated_at = NOW() WHERE id = ?")
            ->execute([$unit, $existingId]);
        return $existingId;
    }

    $stmt = $pdo->prepare("INSERT INTO materials (name, category, unit, stock, minimum_stock, status, created_at, updated_at) VALUES (?, 'Bahan Supplier', ?, 0, 0, 'Aman', NOW(), NOW())");
    $stmt->execute([$materialName, $unit]);
    return (int)$pdo->lastInsertId();
}

function default_warehouse_id(PDO $pdo): int
{
    try {
        $id = (int)$pdo->query('SELECT id FROM warehouses ORDER BY id ASC LIMIT 1')->fetchColumn();
        return $id > 0 ? $id : 0;
    } catch (Throwable $e) {
        return 0;
    }
}

function latest_role_locations(PDO $pdo): array
{
    try {
        $rows = $pdo->query("SELECT ul.* FROM user_locations ul
            INNER JOIN (
                SELECT role, MAX(updated_at) AS max_updated_at
                FROM user_locations
                GROUP BY role
            ) latest ON latest.role = ul.role AND latest.max_updated_at = ul.updated_at
        ")->fetchAll();
    } catch (Throwable $e) {
        return [];
    }

    $map = [];
    foreach ($rows as $row) {
        $map[$row['role']] = [
            'user_id' => $row['user_id'] !== null ? (int)$row['user_id'] : null,
            'role' => $row['role'],
            'latitude' => (float)$row['latitude'],
            'longitude' => (float)$row['longitude'],
            'accuracy' => $row['accuracy'] !== null ? (float)$row['accuracy'] : null,
            'updated_at' => format_date($row['updated_at'] ?? null),
        ];
    }
    return $map;
}

function get_latest_location_for_role(array $locations, string $role): ?array
{
    return $locations[$role] ?? null;
}

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
$path = '/' . trim($uri, '/');
$path = preg_replace('#^/api#', '', $path);
$path = $path === '' ? '/' : $path;

try {
    if ($method === 'GET' && ($path === '/' || $path === '/health')) {
        response_json(['status' => 'ok', 'message' => 'Rafiza API berjalan']);
    }

    $pdo = db();
    ensure_schema($pdo);

    if ($method === 'GET' && $path === '/health-db') {
        $pdo->query('SELECT 1');
        response_json(['status' => 'ok', 'message' => 'Database tersambung']);
    }

    if ($method === 'POST' && $path === '/login') {
        $body = read_json_body();
        $email = trim($body['email'] ?? '');
        $password = (string)($body['password'] ?? '');

        $statement = $pdo->prepare('SELECT id, name, email, password, role, status, supplier_id, courier_id, warehouse_id FROM users WHERE email = ? LIMIT 1');
        $statement->execute([$email]);
        $user = $statement->fetch();

        if (!$user || $password !== (string)$user['password']) {
            response_json(['message' => 'Email atau password tidak sesuai dengan data users.'], 401);
        }

        $meta = role_meta($user['role'], $user['name']);
        response_json([
            'message' => 'Login berhasil',
            'user' => [
                'id' => (int)$user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'status' => $user['status'],
                'supplier_id' => $user['supplier_id'] !== null ? (int)$user['supplier_id'] : null,
                'courier_id' => $user['courier_id'] !== null ? (int)$user['courier_id'] : null,
                'warehouse_id' => $user['warehouse_id'] !== null ? (int)$user['warehouse_id'] : null,
                'roleName' => $meta['roleName'],
                'branch' => $meta['branch'],
                'avatar' => $meta['avatar'],
            ],
        ]);
    }

    if ($method === 'POST' && $path === '/actor-location') {
        $body = read_json_body();
        $userId = (int)($body['user_id'] ?? 0);
        $role = trim((string)($body['role'] ?? ''));
        $lat = $body['latitude'] ?? null;
        $lng = $body['longitude'] ?? null;
        $accuracy = isset($body['accuracy']) && is_numeric($body['accuracy']) ? (float)$body['accuracy'] : null;

        if ($userId <= 0 || $role === '' || !valid_coord($lat, $lng)) {
            response_json(['message' => 'user_id, role, latitude, dan longitude wajib valid.'], 422);
        }

        $stmt = $pdo->prepare("INSERT INTO user_locations (user_id, role, latitude, longitude, accuracy, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE role = VALUES(role), latitude = VALUES(latitude), longitude = VALUES(longitude), accuracy = VALUES(accuracy), updated_at = NOW()");
        $stmt->execute([$userId, $role, (float)$lat, (float)$lng, $accuracy]);

        response_json(['message' => 'Lokasi role berhasil disimpan.']);
    }

    if ($method === 'POST' && $path === '/purchase-orders') {
        $body = read_json_body();
        $supplierId = (int)($body['supplier_id'] ?? 0);
        $materialId = (int)($body['material_id'] ?? 0);
        $quantity = (int)($body['quantity'] ?? 0);
        $unit = trim((string)($body['unit'] ?? '')) ?: 'Unit';
        $notes = trim((string)($body['notes'] ?? ''));
        $destLat = $body['destination_lat'] ?? null;
        $destLng = $body['destination_lng'] ?? null;
        $destAddress = trim((string)($body['destination_address'] ?? 'Lokasi Gudang dari perangkat admin'));
        $warehouseId = (int)($body['warehouse_id'] ?? default_warehouse_id($pdo));

        if ($supplierId <= 0 || $materialId <= 0 || $quantity <= 0) {
            response_json(['message' => 'Supplier, bahan baku, dan jumlah wajib diisi.'], 422);
        }

        $matStmt = $pdo->prepare('SELECT id, unit FROM materials WHERE id = ? LIMIT 1');
        $matStmt->execute([$materialId]);
        $material = $matStmt->fetch();
        if (!$material) response_json(['message' => 'Bahan baku tidak ditemukan.'], 404);
        $unit = $unit ?: ($material['unit'] ?? 'Unit');

        $supplierStmt = $pdo->prepare('SELECT id, name FROM suppliers WHERE id = ? LIMIT 1');
        $supplierStmt->execute([$supplierId]);
        $supplier = $supplierStmt->fetch();
        if (!$supplier) response_json(['message' => 'Supplier tidak ditemukan.'], 404);

        $orderCode = 'PO-' . date('ymdHis');
        $pdo->beginTransaction();
        $orderStmt = $pdo->prepare("INSERT INTO purchase_orders (order_code, supplier_id, warehouse_id, status, notes, ordered_at, created_at, updated_at) VALUES (?, ?, ?, 'Permintaan Dikirim', ?, NOW(), NOW(), NOW())");
        $orderStmt->execute([$orderCode, $supplierId, $warehouseId ?: null, $notes]);
        $orderId = (int)$pdo->lastInsertId();

        $itemStmt = $pdo->prepare('INSERT INTO purchase_order_items (purchase_order_id, material_id, quantity, unit, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())');
        $itemStmt->execute([$orderId, $materialId, $quantity, $unit]);

        $latValue = valid_coord($destLat, $destLng) ? (float)$destLat : null;
        $lngValue = valid_coord($destLat, $destLng) ? (float)$destLng : null;
        $deliveryStmt = $pdo->prepare("INSERT INTO deliveries (purchase_order_id, status, pickup_address, destination_address, destination_lat, destination_lng, created_at, updated_at) VALUES (?, 'Menunggu Konfirmasi Supplier', 'Lokasi supplier menunggu konfirmasi', ?, ?, ?, NOW(), NOW())");
        $deliveryStmt->execute([$orderId, $destAddress, $latValue, $lngValue]);

        notify_role($pdo, 'supplier', 'Beep! Permintaan barang baru', "Gudang meminta bahan baku melalui {$orderCode}. Segera konfirmasi ketersediaan barang.", $orderId);
        $pdo->commit();

        response_json(['message' => 'Permintaan barang berhasil dikirim ke supplier.', 'order_id' => $orderId, 'order_code' => $orderCode]);
    }

    if ($method === 'POST' && $path === '/supplier-confirm') {
        $body = read_json_body();
        $orderId = (int)($body['order_id'] ?? 0);
        $courierId = (int)($body['courier_id'] ?? 0);
        $pickupLat = $body['pickup_lat'] ?? null;
        $pickupLng = $body['pickup_lng'] ?? null;
        $pickupAddress = trim((string)($body['pickup_address'] ?? 'Lokasi supplier dari perangkat supplier'));

        if ($orderId <= 0 || $courierId <= 0) response_json(['message' => 'order_id dan courier_id wajib valid.'], 422);
        if (!valid_coord($pickupLat, $pickupLng)) response_json(['message' => 'Lokasi supplier belum terbaca. Izinkan lokasi dulu.'], 422);

        $orderStmt = $pdo->prepare('SELECT id, order_code FROM purchase_orders WHERE id = ? LIMIT 1');
        $orderStmt->execute([$orderId]);
        $order = $orderStmt->fetch();
        if (!$order) response_json(['message' => 'Pesanan tidak ditemukan.'], 404);

        $courierStmt = $pdo->prepare('SELECT id, name FROM couriers WHERE id = ? LIMIT 1');
        $courierStmt->execute([$courierId]);
        $courier = $courierStmt->fetch();
        if (!$courier) response_json(['message' => 'Kurir tidak ditemukan.'], 404);

        $pdo->beginTransaction();
        $pdo->prepare("UPDATE purchase_orders SET courier_id = ?, status = 'Diproses Supplier', updated_at = NOW() WHERE id = ?")->execute([$courierId, $orderId]);
        $existing = $pdo->prepare('SELECT id FROM deliveries WHERE purchase_order_id = ? LIMIT 1');
        $existing->execute([$orderId]);
        $delivery = $existing->fetch();
        if ($delivery) {
            $pdo->prepare("UPDATE deliveries SET courier_id = ?, status = 'Menunggu Persetujuan Kurir', pickup_address = ?, pickup_lat = ?, pickup_lng = ?, updated_at = NOW() WHERE id = ?")
                ->execute([$courierId, $pickupAddress, (float)$pickupLat, (float)$pickupLng, (int)$delivery['id']]);
        } else {
            $pdo->prepare("INSERT INTO deliveries (purchase_order_id, courier_id, status, pickup_address, pickup_lat, pickup_lng, destination_address, created_at, updated_at) VALUES (?, ?, 'Menunggu Persetujuan Kurir', ?, ?, ?, 'Lokasi gudang dari perangkat admin', NOW(), NOW())")
                ->execute([$orderId, $courierId, $pickupAddress, (float)$pickupLat, (float)$pickupLng]);
        }
        $pdo->prepare("UPDATE couriers SET status = 'Ada Tugas', updated_at = NOW() WHERE id = ?")->execute([$courierId]);
        notify_role($pdo, 'admin', 'Supplier mengonfirmasi barang', "Barang untuk {$order['order_code']} tersedia. Status gudang: pesanan sedang diproses.", $orderId);
        notify_role($pdo, 'courier', 'Beep! Ada barang harus diantar', "Anda ditugaskan mengantar {$order['order_code']}. Klik Driver Berangkat saat mulai jalan.", $orderId);
        $pdo->commit();

        response_json(['message' => 'Supplier mengonfirmasi barang tersedia dan kurir sudah diberi tugas.']);
    }

    if ($method === 'POST' && $path === '/courier-task-response') {
        $body = read_json_body();
        $deliveryId = (int)($body['delivery_id'] ?? 0);
        $courierId = (int)($body['courier_id'] ?? 0);
        $action = trim((string)($body['action'] ?? ''));
        $reason = trim((string)($body['reason'] ?? ''));
        $proof = (string)($body['proof'] ?? '');

        if ($deliveryId <= 0 || $courierId <= 0 || !in_array($action, ['accept', 'reject'], true)) {
            response_json(['message' => 'delivery_id, courier_id, dan action wajib valid.'], 422);
        }

        $stmt = $pdo->prepare('SELECT d.id, d.purchase_order_id, po.order_code FROM deliveries d LEFT JOIN purchase_orders po ON po.id = d.purchase_order_id WHERE d.id = ? LIMIT 1');
        $stmt->execute([$deliveryId]);
        $delivery = $stmt->fetch();
        if (!$delivery) response_json(['message' => 'Delivery tidak ditemukan.'], 404);

        if ($action === 'reject') {
            if ($reason === '') response_json(['message' => 'Catatan alasan penolakan wajib diisi.'], 422);
            $pdo->beginTransaction();
            $pdo->prepare("UPDATE deliveries SET status = 'Ditolak Kurir', rejection_reason = ?, rejection_proof = ?, rejected_at = NOW(), updated_at = NOW() WHERE id = ?")
                ->execute([$reason, $proof, $deliveryId]);
            $pdo->prepare("UPDATE purchase_orders SET status = 'Ditolak Kurir', updated_at = NOW() WHERE id = ?")
                ->execute([(int)$delivery['purchase_order_id']]);
            $pdo->prepare("UPDATE couriers SET status = 'Tersedia', updated_at = NOW() WHERE id = ?")
                ->execute([$courierId]);
            notify_role($pdo, 'supplier', 'Kurir menolak tugas', "Kurir menolak pengantaran {$delivery['order_code']}. Alasan: {$reason}", (int)$delivery['purchase_order_id']);
            notify_role($pdo, 'admin', 'Kurir menolak tugas', "Pengantaran {$delivery['order_code']} ditolak kurir. Supplier perlu menugaskan kurir lain.", (int)$delivery['purchase_order_id']);
            notify_role($pdo, 'manager', 'Kurir menolak tugas', "Pengantaran {$delivery['order_code']} membutuhkan tindak lanjut supplier.", (int)$delivery['purchase_order_id']);
            $pdo->commit();
            response_json(['message' => 'Penolakan tugas berhasil dikirim ke supplier, gudang, dan manajemen.']);
        }

        $pdo->beginTransaction();
        $pdo->prepare("UPDATE deliveries SET status = 'Menunggu Driver Berangkat', updated_at = NOW() WHERE id = ?")
            ->execute([$deliveryId]);
        $pdo->prepare("UPDATE purchase_orders SET courier_id = ?, status = 'Menunggu Driver Berangkat', updated_at = NOW() WHERE id = ?")
            ->execute([$courierId, (int)$delivery['purchase_order_id']]);
        $pdo->prepare("UPDATE couriers SET status = 'Tugas Diterima', updated_at = NOW() WHERE id = ?")
            ->execute([$courierId]);
        notify_role($pdo, 'supplier', 'Kurir menerima tugas', "Kurir menerima tugas pengantaran {$delivery['order_code']} dan siap berangkat.", (int)$delivery['purchase_order_id']);
        notify_role($pdo, 'admin', 'Kurir menerima tugas', "Pengantaran {$delivery['order_code']} sudah diterima kurir. Menunggu driver berangkat.", (int)$delivery['purchase_order_id']);
        $pdo->commit();

        response_json(['message' => 'Tugas diterima. Driver dapat memulai perjalanan.']);
    }

    if ($method === 'POST' && $path === '/driver-start') {
        $body = read_json_body();
        $deliveryId = (int)($body['delivery_id'] ?? 0);
        $courierId = (int)($body['courier_id'] ?? 0);
        $lat = $body['latitude'] ?? null;
        $lng = $body['longitude'] ?? null;
        $accuracy = isset($body['accuracy']) && is_numeric($body['accuracy']) ? (float)$body['accuracy'] : null;

        if ($deliveryId <= 0 || $courierId <= 0 || !valid_coord($lat, $lng)) {
            response_json(['message' => 'delivery_id, courier_id, dan lokasi kurir wajib valid.'], 422);
        }

        $stmt = $pdo->prepare('SELECT d.id, d.purchase_order_id, po.order_code FROM deliveries d LEFT JOIN purchase_orders po ON po.id = d.purchase_order_id WHERE d.id = ? LIMIT 1');
        $stmt->execute([$deliveryId]);
        $delivery = $stmt->fetch();
        if (!$delivery) response_json(['message' => 'Delivery tidak ditemukan.'], 404);

        $pdo->beginTransaction();
        $pdo->prepare("UPDATE deliveries SET status = 'Kurir Dalam Perjalanan', courier_id = ?, started_at = COALESCE(started_at, NOW()), updated_at = NOW() WHERE id = ?")
            ->execute([$courierId, $deliveryId]);
        $pdo->prepare("UPDATE purchase_orders SET courier_id = ?, status = 'Kurir Dalam Perjalanan', updated_at = NOW() WHERE id = ?")
            ->execute([$courierId, (int)$delivery['purchase_order_id']]);
        $pdo->prepare("UPDATE couriers SET status = 'Mengantar', updated_at = NOW() WHERE id = ?")
            ->execute([$courierId]);
        $pdo->prepare('INSERT INTO delivery_locations (delivery_id, latitude, longitude, recorded_at, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW(), NOW())')
            ->execute([$deliveryId, (float)$lat, (float)$lng]);
        notify_role($pdo, 'admin', 'Kurir dalam perjalanan', "Kurir sudah berangkat untuk {$delivery['order_code']}. Tracking live aktif.", (int)$delivery['purchase_order_id']);
        notify_role($pdo, 'supplier', 'Kurir dalam perjalanan', "Kurir sudah berangkat untuk {$delivery['order_code']}. Tracking live aktif.", (int)$delivery['purchase_order_id']);
        $pdo->commit();

        response_json(['message' => 'Driver berangkat. Status tracking berubah menjadi Kurir Dalam Perjalanan.']);
    }

    if ($method === 'POST' && $path === '/delivery-location') {
        $body = read_json_body();
        $deliveryId = (int)($body['delivery_id'] ?? 0);
        $courierId = isset($body['courier_id']) ? (int)$body['courier_id'] : null;
        $latitude = $body['latitude'] ?? null;
        $longitude = $body['longitude'] ?? null;
        $accuracy = isset($body['accuracy']) ? (float)$body['accuracy'] : null;

        if ($deliveryId <= 0 || !valid_coord($latitude, $longitude)) {
            response_json(['message' => 'delivery_id, latitude, dan longitude wajib valid.'], 422);
        }

        $check = $pdo->prepare('SELECT id, courier_id, status FROM deliveries WHERE id = ? LIMIT 1');
        $check->execute([$deliveryId]);
        $delivery = $check->fetch();
        if (!$delivery) response_json(['message' => 'Data delivery tidak ditemukan.'], 404);

        if (!in_array($delivery['status'], ['Kurir Dalam Perjalanan', 'Driver Sampai', 'Pengiriman Selesai'], true)) {
            response_json(['message' => 'Driver belum klik Driver Berangkat, lokasi kurir belum ditampilkan sebagai tracking live.'], 409);
        }

        $pdo->prepare('INSERT INTO delivery_locations (delivery_id, latitude, longitude, recorded_at, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW(), NOW())')
            ->execute([$deliveryId, (float)$latitude, (float)$longitude]);

        if ($courierId) {
            $pdo->prepare("UPDATE couriers SET status = 'Mengantar', updated_at = NOW() WHERE id = ?")->execute([$courierId]);
        }

        response_json(['message' => 'Lokasi kurir berhasil diperbarui.', 'data' => ['delivery_id' => $deliveryId, 'latitude' => (float)$latitude, 'longitude' => (float)$longitude, 'accuracy' => $accuracy, 'recorded_at' => date('Y-m-d H:i:s')]]);
    }

    if ($method === 'POST' && $path === '/driver-arrived') {
        $body = read_json_body();
        $deliveryId = (int)($body['delivery_id'] ?? 0);
        $courierId = (int)($body['courier_id'] ?? 0);
        $lat = $body['latitude'] ?? null;
        $lng = $body['longitude'] ?? null;

        if ($deliveryId <= 0 || $courierId <= 0 || !valid_coord($lat, $lng)) {
            response_json(['message' => 'delivery_id, courier_id, dan lokasi sampai wajib valid.'], 422);
        }

        $stmt = $pdo->prepare('SELECT d.id, d.purchase_order_id, po.order_code FROM deliveries d LEFT JOIN purchase_orders po ON po.id = d.purchase_order_id WHERE d.id = ? LIMIT 1');
        $stmt->execute([$deliveryId]);
        $delivery = $stmt->fetch();
        if (!$delivery) response_json(['message' => 'Delivery tidak ditemukan.'], 404);

        $pdo->beginTransaction();
        $pdo->prepare("UPDATE deliveries SET status = 'Driver Sampai', completed_lat = ?, completed_lng = ?, updated_at = NOW() WHERE id = ?")
            ->execute([(float)$lat, (float)$lng, $deliveryId]);
        $pdo->prepare("UPDATE purchase_orders SET status = 'Driver Sampai di Gudang', updated_at = NOW() WHERE id = ?")
            ->execute([(int)$delivery['purchase_order_id']]);
        $pdo->prepare('INSERT INTO delivery_locations (delivery_id, latitude, longitude, recorded_at, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW(), NOW())')
            ->execute([$deliveryId, (float)$lat, (float)$lng]);
        notify_role($pdo, 'admin', 'Driver sampai di gudang', "Kurir sampai untuk {$delivery['order_code']}. Menunggu bukti foto penerimaan.", (int)$delivery['purchase_order_id']);
        notify_role($pdo, 'supplier', 'Driver sampai di tujuan', "Kurir sampai untuk {$delivery['order_code']}. Menunggu bukti foto penerimaan.", (int)$delivery['purchase_order_id']);
        notify_role($pdo, 'manager', 'Driver sampai di tujuan', "Pengiriman {$delivery['order_code']} sudah sampai, menunggu finalisasi bukti.", (int)$delivery['purchase_order_id']);
        $pdo->commit();

        response_json(['message' => 'Driver sampai. Upload bukti foto sudah dibuka.']);
    }

    if ($method === 'POST' && $path === '/delivery-complete') {
        $body = read_json_body();
        $deliveryId = (int)($body['delivery_id'] ?? 0);
        $courierId = (int)($body['courier_id'] ?? 0);
        $lat = $body['latitude'] ?? null;
        $lng = $body['longitude'] ?? null;
        $proofPhoto = (string)($body['proof_photo'] ?? '');
        $proofNote = trim((string)($body['proof_note'] ?? ''));

        if ($deliveryId <= 0 || $courierId <= 0 || !valid_coord($lat, $lng)) {
            response_json(['message' => 'delivery_id, courier_id, dan lokasi selesai wajib valid.'], 422);
        }
        if ($proofPhoto === '') {
            response_json(['message' => 'Bukti foto wajib diupload sebelum menyelesaikan pengiriman.'], 422);
        }

        $stmt = $pdo->prepare('SELECT d.id, d.purchase_order_id, d.status, po.order_code FROM deliveries d LEFT JOIN purchase_orders po ON po.id = d.purchase_order_id WHERE d.id = ? LIMIT 1');
        $stmt->execute([$deliveryId]);
        $delivery = $stmt->fetch();
        if (!$delivery) response_json(['message' => 'Delivery tidak ditemukan.'], 404);
        if (($delivery['status'] ?? '') !== 'Driver Sampai') {
            response_json(['message' => 'Tekan Driver Sampai terlebih dahulu sebelum finalisasi pengiriman.'], 422);
        }

        $pdo->beginTransaction();
        $pdo->prepare("UPDATE deliveries SET status = 'Menunggu Konfirmasi Gudang', completed_lat = ?, completed_lng = ?, proof_photo = ?, proof_note = ?, proof_uploaded_at = NOW(), finished_at = NOW(), updated_at = NOW() WHERE id = ?")
            ->execute([(float)$lat, (float)$lng, $proofPhoto, $proofNote, $deliveryId]);
        $pdo->prepare("UPDATE purchase_orders SET status = 'Menunggu Konfirmasi Gudang', updated_at = NOW() WHERE id = ?")
            ->execute([(int)$delivery['purchase_order_id']]);
        $pdo->prepare("UPDATE couriers SET status = 'Tersedia', updated_at = NOW() WHERE id = ?")
            ->execute([$courierId]);
        $pdo->prepare('INSERT INTO delivery_locations (delivery_id, latitude, longitude, recorded_at, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW(), NOW())')
            ->execute([$deliveryId, (float)$lat, (float)$lng]);
        notify_role($pdo, 'admin', 'Pengiriman selesai', "Kurir menyelesaikan {$delivery['order_code']} dan mengupload bukti foto.", (int)$delivery['purchase_order_id']);
        notify_role($pdo, 'supplier', 'Pengiriman sampai gudang', "Pengiriman {$delivery['order_code']} selesai diantar kurir. Menunggu konfirmasi penerimaan dari gudang.", (int)$delivery['purchase_order_id']);
        notify_role($pdo, 'manager', 'Menunggu konfirmasi gudang', "Bukti foto {$delivery['order_code']} sudah tersimpan. Gudang perlu mengonfirmasi penerimaan barang.", (int)$delivery['purchase_order_id']);
        $pdo->commit();

        response_json(['message' => 'Pengiriman selesai diantar kurir. Menunggu konfirmasi penerimaan barang oleh gudang.']);
    }



    if ($method === 'POST' && $path === '/manager-suppliers') {
        $body = read_json_body();
        $company = trim((string)($body['company_name'] ?? $body['name'] ?? ''));
        $materialType = trim((string)($body['material_type'] ?? ''));
        $materialUnit = trim((string)($body['material_unit'] ?? $body['unit'] ?? ''));
        $phone = trim((string)($body['phone'] ?? ''));
        $address = '';
        $email = trim((string)($body['email'] ?? ''));
        $password = (string)($body['password'] ?? '12345678');
        if ($company === '' || $materialType === '' || $materialUnit === '' || $email === '') {
            response_json(['message' => 'Nama PT/CV, bahan baku, satuan, dan email akun supplier wajib diisi.'], 422);
        }
        $exists = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $exists->execute([$email]);
        if ($exists->fetch()) response_json(['message' => 'Email akun sudah digunakan.'], 422);
        $pdo->beginTransaction();
        ensure_material_from_supplier($pdo, $materialType, $materialUnit);
        $stmt = $pdo->prepare("INSERT INTO suppliers (name, phone, address, material_type, material_unit, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'Aktif', NOW(), NOW())");
        $stmt->execute([$company, $phone, $address, $materialType, $materialUnit]);
        $supplierId = (int)$pdo->lastInsertId();
        $userStmt = $pdo->prepare("INSERT INTO users (name, email, password, role, status, supplier_id, created_at, updated_at) VALUES (?, ?, ?, 'supplier', 'Aktif', ?, NOW(), NOW())");
        $userStmt->execute([$company, $email, $password, $supplierId]);
        notify_role($pdo, 'manager', 'Supplier baru terdaftar', "Akun supplier {$company} berhasil dibuat untuk bahan {$materialType} ({$materialUnit}).", null);
        $pdo->commit();
        response_json(['message' => 'Supplier dan akun login supplier berhasil dibuat.', 'supplier_id' => $supplierId]);
    }

    if ($method === 'POST' && $path === '/manager-warehouses') {
        $body = read_json_body();
        $name = trim((string)($body['warehouse_name'] ?? $body['name'] ?? ''));
        $address = trim((string)($body['address'] ?? ''));
        $email = trim((string)($body['email'] ?? ''));
        $password = (string)($body['password'] ?? '12345678');
        $adminName = trim((string)($body['admin_name'] ?? 'Admin ' . $name));
        if ($name === '' || $email === '') response_json(['message' => 'Nama gudang/cabang dan email admin wajib diisi.'], 422);
        $exists = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $exists->execute([$email]);
        if ($exists->fetch()) response_json(['message' => 'Email akun sudah digunakan.'], 422);
        $pdo->beginTransaction();
        $stmt = $pdo->prepare("INSERT INTO warehouses (name, address, status, created_at, updated_at) VALUES (?, ?, 'Aktif', NOW(), NOW())");
        $stmt->execute([$name, $address]);
        $warehouseId = (int)$pdo->lastInsertId();
        $userStmt = $pdo->prepare("INSERT INTO users (name, email, password, role, status, warehouse_id, created_at, updated_at) VALUES (?, ?, ?, 'admin', 'Aktif', ?, NOW(), NOW())");
        $userStmt->execute([$adminName ?: $name, $email, $password, $warehouseId]);
        notify_role($pdo, 'manager', 'Gudang/cabang baru terdaftar', "Akun admin {$name} berhasil dibuat.", null);
        $pdo->commit();
        response_json(['message' => 'Gudang/cabang dan akun admin berhasil dibuat.', 'warehouse_id' => $warehouseId]);
    }


    if ($method === 'POST' && $path === '/manager-suppliers-update') {
        $body = read_json_body();
        $id = (int)($body['id'] ?? 0);
        $company = trim((string)($body['company_name'] ?? $body['name'] ?? ''));
        $materialType = trim((string)($body['material_type'] ?? ''));
        $materialUnit = trim((string)($body['material_unit'] ?? $body['unit'] ?? ''));
        $phone = trim((string)($body['phone'] ?? ''));
        $email = trim((string)($body['email'] ?? ''));
        $password = (string)($body['password'] ?? '');
        $status = trim((string)($body['status'] ?? 'Aktif')) ?: 'Aktif';

        if ($id <= 0 || $company === '' || $materialType === '' || $materialUnit === '' || $email === '') {
            response_json(['message' => 'ID, nama PT/CV, bahan baku, satuan, dan email akun supplier wajib diisi.'], 422);
        }
        $check = $pdo->prepare('SELECT id FROM suppliers WHERE id = ? LIMIT 1');
        $check->execute([$id]);
        if (!$check->fetch()) response_json(['message' => 'Supplier tidak ditemukan.'], 404);

        $exists = $pdo->prepare('SELECT id FROM users WHERE email = ? AND (supplier_id IS NULL OR supplier_id <> ?) LIMIT 1');
        $exists->execute([$email, $id]);
        if ($exists->fetch()) response_json(['message' => 'Email akun sudah digunakan user lain.'], 422);

        $pdo->beginTransaction();
        ensure_material_from_supplier($pdo, $materialType, $materialUnit);
        $pdo->prepare('UPDATE suppliers SET name = ?, phone = ?, material_type = ?, material_unit = ?, status = ?, updated_at = NOW() WHERE id = ?')
            ->execute([$company, $phone, $materialType, $materialUnit, $status, $id]);

        $user = $pdo->prepare("SELECT id FROM users WHERE supplier_id = ? AND role = 'supplier' LIMIT 1");
        $user->execute([$id]);
        $userId = (int)$user->fetchColumn();
        if ($userId > 0) {
            if ($password !== '') {
                $pdo->prepare('UPDATE users SET name = ?, email = ?, password = ?, status = ?, updated_at = NOW() WHERE id = ?')
                    ->execute([$company, $email, $password, $status, $userId]);
            } else {
                $pdo->prepare('UPDATE users SET name = ?, email = ?, status = ?, updated_at = NOW() WHERE id = ?')
                    ->execute([$company, $email, $status, $userId]);
            }
        } else {
            $pdo->prepare("INSERT INTO users (name, email, password, role, status, supplier_id, created_at, updated_at) VALUES (?, ?, ?, 'supplier', ?, ?, NOW(), NOW())")
                ->execute([$company, $email, $password !== '' ? $password : '12345678', $status, $id]);
        }
        notify_role($pdo, 'manager', 'Supplier diperbarui', "Data supplier {$company} berhasil diperbarui.", null);
        $pdo->commit();
        response_json(['message' => 'Supplier dan akun login supplier berhasil diperbarui.']);
    }

    if ($method === 'POST' && $path === '/manager-suppliers-delete') {
        $body = read_json_body();
        $id = (int)($body['id'] ?? 0);
        if ($id <= 0) response_json(['message' => 'ID supplier wajib valid.'], 422);
        $pdo->beginTransaction();
        $pdo->prepare("UPDATE suppliers SET status = 'Nonaktif', updated_at = NOW() WHERE id = ?")->execute([$id]);
        $pdo->prepare("UPDATE users SET status = 'Nonaktif', updated_at = NOW() WHERE supplier_id = ? AND role = 'supplier'")->execute([$id]);
        notify_role($pdo, 'manager', 'Supplier dinonaktifkan', 'Supplier dan akun loginnya dinonaktifkan. Riwayat transaksi tetap tersimpan.', null);
        $pdo->commit();
        response_json(['message' => 'Supplier berhasil dinonaktifkan.']);
    }

    if ($method === 'POST' && $path === '/manager-warehouses-update') {
        $body = read_json_body();
        $id = (int)($body['id'] ?? 0);
        $name = trim((string)($body['warehouse_name'] ?? $body['name'] ?? ''));
        $address = trim((string)($body['address'] ?? ''));
        $adminName = trim((string)($body['admin_name'] ?? 'Admin ' . $name));
        $email = trim((string)($body['email'] ?? ''));
        $password = (string)($body['password'] ?? '');
        $status = trim((string)($body['status'] ?? 'Aktif')) ?: 'Aktif';
        if ($id <= 0 || $name === '' || $email === '') response_json(['message' => 'ID, nama gudang/cabang, dan email admin wajib diisi.'], 422);
        $check = $pdo->prepare('SELECT id FROM warehouses WHERE id = ? LIMIT 1');
        $check->execute([$id]);
        if (!$check->fetch()) response_json(['message' => 'Gudang/cabang tidak ditemukan.'], 404);
        $exists = $pdo->prepare('SELECT id FROM users WHERE email = ? AND (warehouse_id IS NULL OR warehouse_id <> ?) LIMIT 1');
        $exists->execute([$email, $id]);
        if ($exists->fetch()) response_json(['message' => 'Email akun sudah digunakan user lain.'], 422);

        $pdo->beginTransaction();
        $pdo->prepare('UPDATE warehouses SET name = ?, address = ?, status = ?, updated_at = NOW() WHERE id = ?')
            ->execute([$name, $address, $status, $id]);
        $user = $pdo->prepare("SELECT id FROM users WHERE warehouse_id = ? AND role = 'admin' LIMIT 1");
        $user->execute([$id]);
        $userId = (int)$user->fetchColumn();
        if ($userId > 0) {
            if ($password !== '') {
                $pdo->prepare('UPDATE users SET name = ?, email = ?, password = ?, status = ?, updated_at = NOW() WHERE id = ?')
                    ->execute([$adminName ?: $name, $email, $password, $status, $userId]);
            } else {
                $pdo->prepare('UPDATE users SET name = ?, email = ?, status = ?, updated_at = NOW() WHERE id = ?')
                    ->execute([$adminName ?: $name, $email, $status, $userId]);
            }
        } else {
            $pdo->prepare("INSERT INTO users (name, email, password, role, status, warehouse_id, created_at, updated_at) VALUES (?, ?, ?, 'admin', ?, ?, NOW(), NOW())")
                ->execute([$adminName ?: $name, $email, $password !== '' ? $password : '12345678', $status, $id]);
        }
        notify_role($pdo, 'manager', 'Gudang/cabang diperbarui', "Data gudang/cabang {$name} berhasil diperbarui.", null);
        $pdo->commit();
        response_json(['message' => 'Gudang/cabang dan akun admin berhasil diperbarui.']);
    }

    if ($method === 'POST' && $path === '/manager-warehouses-delete') {
        $body = read_json_body();
        $id = (int)($body['id'] ?? 0);
        if ($id <= 0) response_json(['message' => 'ID gudang/cabang wajib valid.'], 422);
        $pdo->beginTransaction();
        $pdo->prepare("UPDATE warehouses SET status = 'Nonaktif', updated_at = NOW() WHERE id = ?")->execute([$id]);
        $pdo->prepare("UPDATE users SET status = 'Nonaktif', updated_at = NOW() WHERE warehouse_id = ? AND role = 'admin'")->execute([$id]);
        notify_role($pdo, 'manager', 'Gudang/cabang dinonaktifkan', 'Gudang/cabang dan akun adminnya dinonaktifkan. Riwayat transaksi tetap tersimpan.', null);
        $pdo->commit();
        response_json(['message' => 'Gudang/cabang berhasil dinonaktifkan.']);
    }

    if ($method === 'POST' && $path === '/materials') {
        $body = read_json_body();
        $id = (int)($body['id'] ?? 0);
        $name = trim((string)($body['name'] ?? ''));
        $category = trim((string)($body['category'] ?? ''));
        $unit = trim((string)($body['unit'] ?? '')) ?: 'Unit';
        $stock = max(0, (int)($body['stock'] ?? 0));
        $minimumStock = max(0, (int)($body['minimum_stock'] ?? 0));
        if ($name === '') response_json(['message' => 'Nama bahan wajib diisi.'], 422);

        if ($id > 0) {
            $stmt = $pdo->prepare('UPDATE materials SET name = ?, category = ?, unit = ?, stock = ?, minimum_stock = ?, status = CASE WHEN ? < ? THEN \'Menipis\' ELSE \'Aman\' END, updated_at = NOW() WHERE id = ?');
            $stmt->execute([$name, $category, $unit, $stock, $minimumStock, $stock, $minimumStock, $id]);
            response_json(['message' => 'Data bahan baku berhasil diperbarui.']);
        }

        $stmt = $pdo->prepare('INSERT INTO materials (name, category, unit, stock, minimum_stock, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CASE WHEN ? < ? THEN \'Menipis\' ELSE \'Aman\' END, NOW(), NOW())');
        $stmt->execute([$name, $category, $unit, $stock, $minimumStock, $stock, $minimumStock]);
        response_json(['message' => 'Data bahan baku berhasil ditambahkan.', 'id' => (int)$pdo->lastInsertId()]);
    }

    if ($method === 'POST' && $path === '/production-usage') {
        $body = read_json_body();
        $materialId = (int)($body['material_id'] ?? 0);
        $quantity = (int)($body['quantity'] ?? 0);
        $notes = trim((string)($body['notes'] ?? 'Pemakaian produksi'));
        $createdBy = trim((string)($body['created_by'] ?? 'Admin Gudang/Cabang'));
        $warehouseId = (int)($body['warehouse_id'] ?? default_warehouse_id($pdo));
        if ($materialId <= 0 || $quantity <= 0) response_json(['message' => 'Bahan baku dan jumlah pemakaian wajib valid.'], 422);

        $stmt = $pdo->prepare('SELECT * FROM materials WHERE id = ? LIMIT 1');
        $stmt->execute([$materialId]);
        $material = $stmt->fetch();
        if (!$material) response_json(['message' => 'Bahan baku tidak ditemukan.'], 404);
        $before = (int)$material['stock'];
        if ($quantity > $before) response_json(['message' => 'Jumlah pemakaian melebihi stok tersedia.'], 422);
        $after = $before - $quantity;

        $pdo->beginTransaction();
        $pdo->prepare('UPDATE materials SET stock = ?, status = CASE WHEN ? < minimum_stock THEN \'Menipis\' ELSE \'Aman\' END, updated_at = NOW() WHERE id = ?')->execute([$after, $after, $materialId]);
        record_material_movement($pdo, $materialId, $warehouseId, null, 'OUT', 'Pemakaian Produksi', $quantity, $material['unit'] ?? 'Unit', $before, $after, $notes, $createdBy);
        notify_role($pdo, 'manager', 'Pemakaian produksi dicatat', "{$material['name']} dipakai {$quantity} {$material['unit']}. Stok akhir: {$after} {$material['unit']}.", null);
        $pdo->commit();
        response_json(['message' => 'Pemakaian produksi berhasil dicatat dan stok otomatis berkurang.']);
    }

    if ($method === 'POST' && $path === '/receive-order') {
        $body = read_json_body();
        $orderId = (int)($body['order_id'] ?? 0);
        $createdBy = trim((string)($body['created_by'] ?? 'Admin Gudang/Cabang'));
        $warehouseId = (int)($body['warehouse_id'] ?? default_warehouse_id($pdo));
        if ($orderId <= 0) response_json(['message' => 'order_id wajib valid.'], 422);

        $orderStmt = $pdo->prepare('SELECT id, order_code, status FROM purchase_orders WHERE id = ? LIMIT 1');
        $orderStmt->execute([$orderId]);
        $order = $orderStmt->fetch();
        if (!$order) response_json(['message' => 'Pesanan tidak ditemukan.'], 404);
        if (!in_array($order['status'], ['Menunggu Konfirmasi Gudang', 'Driver Sampai di Gudang', 'Pengiriman Selesai'], true)) {
            response_json(['message' => 'Barang belum berada pada tahap konfirmasi gudang.'], 422);
        }

        $itemsStmt = $pdo->prepare('SELECT poi.material_id, poi.quantity, poi.unit, m.name, m.stock, m.unit AS material_unit FROM purchase_order_items poi INNER JOIN materials m ON m.id = poi.material_id WHERE poi.purchase_order_id = ?');
        $itemsStmt->execute([$orderId]);
        $items = $itemsStmt->fetchAll();
        if (!$items) response_json(['message' => 'Item pesanan kosong.'], 422);

        $pdo->beginTransaction();
        foreach ($items as $item) {
            $before = (int)$item['stock'];
            $qty = (int)$item['quantity'];
            $after = $before + $qty;
            $pdo->prepare('UPDATE materials SET stock = ?, status = CASE WHEN ? < minimum_stock THEN \'Menipis\' ELSE \'Aman\' END, updated_at = NOW() WHERE id = ?')->execute([$after, $after, (int)$item['material_id']]);
            record_material_movement($pdo, (int)$item['material_id'], $warehouseId, $orderId, 'IN', 'Barang Masuk Supplier', $qty, $item['unit'] ?: ($item['material_unit'] ?? 'Unit'), $before, $after, "Barang masuk dari PO {$order['order_code']}", $createdBy);
        }
        $pdo->prepare("UPDATE deliveries SET status = 'Pengiriman Selesai', updated_at = NOW() WHERE purchase_order_id = ?")->execute([$orderId]);
        $pdo->prepare("UPDATE purchase_orders SET status = 'Pesanan Diterima', updated_at = NOW() WHERE id = ?")->execute([$orderId]);
        notify_role($pdo, 'supplier', 'Gudang menerima barang', "Gudang mengonfirmasi penerimaan {$order['order_code']}. Stok gudang sudah bertambah.", $orderId);
        notify_role($pdo, 'manager', 'Barang masuk gudang', "Gudang menerima {$order['order_code']}. Data masuk ke laporan barang masuk.", $orderId);
        $pdo->commit();
        response_json(['message' => 'Barang berhasil diterima gudang. Stok bertambah dan data masuk laporan barang masuk.']);
    }

    if ($method === 'POST' && $path === '/order-status') {
        $body = read_json_body();
        $orderId = (int)($body['order_id'] ?? 0);
        $status = trim((string)($body['status'] ?? ''));
        $allowed = ['Permintaan Dikirim', 'Menunggu Konfirmasi', 'Diterima Supplier', 'Diproses Supplier', 'Menunggu Driver Berangkat', 'Kurir Dalam Perjalanan', 'Pesanan Diterima', 'Menunggu Konfirmasi Gudang', 'Driver Sampai di Gudang', 'Selesai', 'Ditolak', 'Ditolak Kurir'];
        if ($orderId <= 0 || $status === '' || !in_array($status, $allowed, true)) response_json(['message' => 'order_id dan status wajib valid.'], 422);
        $stmt = $pdo->prepare('SELECT id FROM purchase_orders WHERE id = ? LIMIT 1');
        $stmt->execute([$orderId]);
        if (!$stmt->fetch()) response_json(['message' => 'Pesanan tidak ditemukan.'], 404);
        $pdo->prepare('UPDATE purchase_orders SET status = ?, updated_at = NOW() WHERE id = ?')->execute([$status, $orderId]);
        response_json(['message' => 'Status pesanan berhasil diperbarui.']);
    }

    if ($method === 'POST' && $path === '/assign-courier') {
        $body = read_json_body();
        $orderId = (int)($body['order_id'] ?? 0);
        $courierId = (int)($body['courier_id'] ?? 0);
        if ($orderId <= 0 || $courierId <= 0) response_json(['message' => 'order_id dan courier_id wajib valid.'], 422);
        $pdo->prepare("UPDATE purchase_orders SET courier_id = ?, status = CASE WHEN status IN ('Menunggu Konfirmasi', 'Permintaan Dikirim') THEN 'Diterima Supplier' ELSE status END, updated_at = NOW() WHERE id = ?")->execute([$courierId, $orderId]);
        $exists = $pdo->prepare('SELECT id FROM deliveries WHERE purchase_order_id = ? LIMIT 1');
        $exists->execute([$orderId]);
        $delivery = $exists->fetch();
        if ($delivery) {
            $pdo->prepare('UPDATE deliveries SET courier_id = ?, updated_at = NOW() WHERE id = ?')->execute([$courierId, (int)$delivery['id']]);
        } else {
            $pdo->prepare("INSERT INTO deliveries (purchase_order_id, courier_id, status, pickup_address, destination_address, created_at, updated_at) VALUES (?, ?, 'Menunggu Driver Berangkat', 'Lokasi Supplier', 'Lokasi Gudang', NOW(), NOW())")->execute([$orderId, $courierId]);
        }
        response_json(['message' => 'Kurir berhasil ditugaskan ke pesanan.']);
    }


    if ($method === 'POST' && $path === '/courier-status') {
        $body = read_json_body();
        $courierId = (int)($body['courier_id'] ?? 0);
        $status = trim((string)($body['status'] ?? ''));
        $allowed = ['Tersedia', 'Nonaktif'];
        if ($courierId <= 0 || !in_array($status, $allowed, true)) response_json(['message' => 'courier_id dan status wajib valid.'], 422);
        $pdo->prepare('UPDATE couriers SET status = ?, updated_at = NOW() WHERE id = ?')->execute([$status, $courierId]);
        response_json(['message' => $status === 'Nonaktif' ? 'Akun kurir berhasil dinonaktifkan.' : 'Akun kurir berhasil diaktifkan.']);
    }

    if ($method === 'POST' && $path === '/couriers') {
        $body = read_json_body();
        $supplierId = (int)($body['supplier_id'] ?? 1);
        $name = trim((string)($body['name'] ?? ''));
        $phone = trim((string)($body['phone'] ?? ''));
        $plate = trim((string)($body['vehicle_plate'] ?? ''));
        $email = trim((string)($body['email'] ?? ''));
        $password = (string)($body['password'] ?? '12345678');
        if ($name === '' || $email === '') response_json(['message' => 'Nama kurir dan email login wajib diisi.'], 422);
        $exists = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $exists->execute([$email]);
        if ($exists->fetch()) response_json(['message' => 'Email akun sudah digunakan.'], 422);
        $pdo->beginTransaction();
        $pdo->prepare("INSERT INTO couriers (supplier_id, name, phone, vehicle_plate, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'Tersedia', NOW(), NOW())")
            ->execute([$supplierId > 0 ? $supplierId : null, $name, $phone, $plate]);
        $courierId = (int)$pdo->lastInsertId();
        $pdo->prepare("INSERT INTO users (name, email, password, role, status, supplier_id, courier_id, created_at, updated_at) VALUES (?, ?, ?, 'courier', 'Aktif', ?, ?, NOW(), NOW())")
            ->execute([$name, $email, $password, $supplierId > 0 ? $supplierId : null, $courierId]);
        $pdo->commit();
        response_json(['message' => 'Data kurir dan akun login kurir berhasil ditambahkan.', 'id' => $courierId]);
    }

    if ($method === 'GET' && $path === '/overview') {
        $actorLocations = latest_role_locations($pdo);
        $adminLocation = get_latest_location_for_role($actorLocations, 'admin');
        $supplierLocation = get_latest_location_for_role($actorLocations, 'supplier');

        $materialsRaw = $pdo->query('SELECT * FROM materials ORDER BY id ASC')->fetchAll();
        $materials = array_map('normalize_material', $materialsRaw);
        $suppliers = $pdo->query('SELECT id, name, phone, address, material_type, material_unit, status FROM suppliers ORDER BY id ASC')->fetchAll();

        $couriersRaw = $pdo->query('SELECT c.id, c.name, c.phone, c.vehicle_plate, c.status, c.supplier_id, s.name AS supplier_name FROM couriers c LEFT JOIN suppliers s ON s.id = c.supplier_id ORDER BY c.id ASC')->fetchAll();
        $couriers = array_map(function ($row) {
            $row['id'] = (int)$row['id'];
            $row['supplier_id'] = $row['supplier_id'] !== null ? (int)$row['supplier_id'] : null;
            $row['initials'] = initials($row['name']);
            return $row;
        }, $couriersRaw);

        $ordersRaw = $pdo->query("SELECT po.id, po.order_code AS code, po.status, po.notes, po.ordered_at, po.supplier_id, po.courier_id, po.warehouse_id, s.name AS supplier_name, c.name AS courier_name, w.name AS warehouse_name, w.address AS warehouse_address, GROUP_CONCAT(CONCAT(m.name, ' ', poi.quantity, ' ', poi.unit) ORDER BY poi.id SEPARATOR ', ') AS items_text FROM purchase_orders po LEFT JOIN suppliers s ON s.id = po.supplier_id LEFT JOIN couriers c ON c.id = po.courier_id LEFT JOIN warehouses w ON w.id = po.warehouse_id LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id LEFT JOIN materials m ON m.id = poi.material_id GROUP BY po.id, po.order_code, po.status, po.notes, po.ordered_at, po.supplier_id, po.courier_id, po.warehouse_id, s.name, c.name, w.name, w.address ORDER BY po.id DESC")->fetchAll();
        $orders = array_map(function ($row) {
            $row['id'] = (int)$row['id'];
            $row['supplier_id'] = $row['supplier_id'] !== null ? (int)$row['supplier_id'] : null;
            $row['courier_id'] = $row['courier_id'] !== null ? (int)$row['courier_id'] : null;
            $row['warehouse_id'] = $row['warehouse_id'] !== null ? (int)$row['warehouse_id'] : null;
            $row['warehouse_name'] = $row['warehouse_name'] ?: 'Gudang/Cabang Rafiza';
            $row['warehouse_address'] = $row['warehouse_address'] ?: '-';
            $row['items_text'] = $row['items_text'] ?: '-';
            $row['courier_name'] = $row['courier_name'] ?: 'Belum ditugaskan';
            $row['ordered_at'] = format_date($row['ordered_at'] ?? null);
            return $row;
        }, $ordersRaw);

        $deliveriesRaw = $pdo->query("SELECT d.id, d.purchase_order_id, d.status, d.courier_id, d.pickup_address, d.destination_address, d.pickup_lat, d.pickup_lng, d.destination_lat, d.destination_lng, d.started_at, d.finished_at, d.proof_photo, d.proof_note, d.proof_uploaded_at, d.rejection_reason, d.rejection_proof, d.rejected_at, po.order_code, po.status AS order_status, po.supplier_id, po.warehouse_id, s.name AS supplier_name, w.name AS warehouse_name, c.name AS courier_name, dl.latitude AS current_lat, dl.longitude AS current_lng, dl.recorded_at FROM deliveries d LEFT JOIN purchase_orders po ON po.id = d.purchase_order_id LEFT JOIN suppliers s ON s.id = po.supplier_id LEFT JOIN warehouses w ON w.id = po.warehouse_id LEFT JOIN couriers c ON c.id = d.courier_id LEFT JOIN delivery_locations dl ON dl.id = (SELECT id FROM delivery_locations WHERE delivery_id = d.id ORDER BY id DESC LIMIT 1) ORDER BY d.id DESC")->fetchAll();
        $deliveries = array_map(function ($row) use ($adminLocation, $supplierLocation) {
            $supplierName = $row['supplier_name'] ?: 'Supplier';
            $warehouseName = $row['warehouse_name'] ?: 'Gudang/Cabang Rafiza';
            if ($row['pickup_lat'] === null && $supplierLocation) {
                $row['pickup_lat'] = $supplierLocation['latitude'];
                $row['pickup_lng'] = $supplierLocation['longitude'];
            }
            if ($row['pickup_address'] === null || $row['pickup_address'] === '' || str_starts_with((string)$row['pickup_address'], 'Lokasi supplier')) {
                $row['pickup_address'] = 'Lokasi ' . $supplierName;
            }
            if ($row['destination_lat'] === null && $adminLocation) {
                $row['destination_lat'] = $adminLocation['latitude'];
                $row['destination_lng'] = $adminLocation['longitude'];
            }
            if ($row['destination_address'] === null || $row['destination_address'] === '' || str_contains((string)$row['destination_address'], 'Lokasi real gudang')) {
                $row['destination_address'] = $warehouseName;
            }
            $inTransit = in_array($row['status'], ['Kurir Dalam Perjalanan', 'Driver Sampai', 'Pengiriman Selesai'], true);
            if (!$inTransit) {
                $row['current_lat'] = null;
                $row['current_lng'] = null;
            }
            foreach (['pickup_lat','pickup_lng','destination_lat','destination_lng','current_lat','current_lng'] as $key) {
                $row[$key] = $row[$key] !== null ? (float)$row[$key] : null;
            }
            $row['id'] = (int)$row['id'];
            $row['purchase_order_id'] = (int)$row['purchase_order_id'];
            $row['supplier_id'] = $row['supplier_id'] !== null ? (int)$row['supplier_id'] : null;
            $row['warehouse_id'] = $row['warehouse_id'] !== null ? (int)$row['warehouse_id'] : null;
            $row['courier_id'] = $row['courier_id'] !== null ? (int)$row['courier_id'] : null;
            $row['started_at'] = format_date($row['started_at'] ?? null);
            $row['finished_at'] = format_date($row['finished_at'] ?? null);
            $row['recorded_at'] = format_date($row['recorded_at'] ?? null);
            $row['proof_uploaded_at'] = format_date($row['proof_uploaded_at'] ?? null);
            $row['rejected_at'] = format_date($row['rejected_at'] ?? null);
            $row['has_rejection_proof'] = !empty($row['rejection_proof']);
            $row['has_proof'] = !empty($row['proof_photo']);
            return $row;
        }, $deliveriesRaw);

        $notifications = [];
        try {
            $notifications = $pdo->query('SELECT id, role, title, message, order_id, created_at FROM notifications ORDER BY id DESC LIMIT 30')->fetchAll();
            $notifications = array_map(function ($row) {
                $row['id'] = (int)$row['id'];
                $row['order_id'] = $row['order_id'] !== null ? (int)$row['order_id'] : null;
                $row['created_at'] = format_date($row['created_at'] ?? null);
                return $row;
            }, $notifications);
        } catch (Throwable $e) {}

        $movementsRaw = [];
        try {
            $movementsRaw = $pdo->query("SELECT mm.id, mm.material_id, mm.purchase_order_id, mm.movement_type, mm.source_type, mm.quantity, mm.unit, mm.stock_before, mm.stock_after, mm.notes, mm.created_by, mm.created_at, m.name AS material_name, po.order_code FROM material_movements mm LEFT JOIN materials m ON m.id = mm.material_id LEFT JOIN purchase_orders po ON po.id = mm.purchase_order_id ORDER BY mm.id DESC LIMIT 80")->fetchAll();
        } catch (Throwable $e) {}
        $movements = array_map(function ($row) {
            foreach (['id','material_id','purchase_order_id','quantity','stock_before','stock_after'] as $key) {
                $row[$key] = $row[$key] !== null ? (int)$row[$key] : null;
            }
            $row['created_at'] = format_date($row['created_at'] ?? null);
            return $row;
        }, $movementsRaw);

        $warehouses = [];
        try { $warehouses = $pdo->query('SELECT id, name, address, status FROM warehouses ORDER BY id ASC')->fetchAll(); } catch (Throwable $e) {}
        $warehouses = array_map(function ($row) { $row['id'] = (int)$row['id']; return $row; }, $warehouses);

        $users = [];
        try {
            $usersRaw = $pdo->query("SELECT u.id, u.name, u.email, u.role, u.status, u.supplier_id, u.courier_id, u.warehouse_id, s.name AS supplier_name, c.name AS courier_name, w.name AS warehouse_name FROM users u LEFT JOIN suppliers s ON s.id = u.supplier_id LEFT JOIN couriers c ON c.id = u.courier_id LEFT JOIN warehouses w ON w.id = u.warehouse_id ORDER BY u.id ASC")->fetchAll();
            $users = array_map(function ($row) {
                foreach (['id','supplier_id','courier_id','warehouse_id'] as $key) $row[$key] = $row[$key] !== null ? (int)$row[$key] : null;
                return $row;
            }, $usersRaw);
        } catch (Throwable $e) {}

        $summary = [
            'total_materials' => count($materials),
            'total_suppliers' => count($suppliers),
            'total_couriers' => count($couriers),
            'total_users' => count($users),
            'total_warehouses' => count($warehouses),
            'total_orders' => count($orders),
            'active_orders' => count(array_filter($orders, fn($order) => !in_array($order['status'], ['Pesanan Diterima', 'Pengiriman Selesai', 'Selesai', 'Ditolak', 'Ditolak Kurir'], true))),
            'low_stock' => count(array_filter($materials, fn($item) => $item['status'] === 'Menipis')),
            'finished_deliveries' => count(array_filter($deliveries, fn($d) => in_array($d['status'], ['Pengiriman Selesai', 'Pesanan Diterima'], true))),
            'waiting_receive' => count(array_filter($orders, fn($o) => $o['status'] === 'Menunggu Konfirmasi Gudang')),
            'stock_in' => array_sum(array_map(fn($m) => $m['movement_type'] === 'IN' ? (int)$m['quantity'] : 0, $movements)),
            'stock_out' => array_sum(array_map(fn($m) => $m['movement_type'] === 'OUT' ? (int)$m['quantity'] : 0, $movements)),
        ];

        response_json(['data' => ['summary' => $summary, 'materials' => $materials, 'suppliers' => $suppliers, 'couriers' => $couriers, 'orders' => $orders, 'deliveries' => $deliveries, 'movements' => $movements, 'warehouses' => $warehouses, 'actor_locations' => $actorLocations, 'notifications' => $notifications, 'users' => $users]]);
    }

    response_json(['message' => 'Endpoint tidak ditemukan: ' . $path], 404);
} catch (Throwable $exception) {
    response_json(['message' => 'Terjadi error backend: ' . $exception->getMessage(), 'code' => $exception->getCode()], 500);
}

# Rafiza Backend API - Gudang & Cabang Dipisah

Backend Next.js API siap deploy ke Vercel. Database tetap MySQL Railway menggunakan `MYSQL_PUBLIC_URL` sebagai `DATABASE_URL` di Vercel.

## Role
- `manager`: mengelola akun/mitra dan monitoring.
- `warehouse`: Gudang pusat, memesan bahan ke supplier, menerima barang, memproses permintaan cabang.
- `branch`: Cabang penjualan, meminta barang ke gudang, menerima stok, mencatat penjualan.
- `supplier`: menerima pesanan dari gudang dan menugaskan kurir.
- `courier`: mengantar barang supplier ke gudang.

## Endpoint Baru
- `POST /api/manager-branches`: tambah cabang + akun cabang.
- `POST /api/manager-branches-update`: edit cabang + akun cabang.
- `POST /api/manager-branches-delete`: nonaktifkan cabang + akun cabang.
- `POST /api/branch-requests`: cabang membuat permintaan barang ke gudang.
- `POST /api/branch-request-status`: gudang approve/reject/send, cabang receive.
- `POST /api/branch-sales`: cabang mencatat penjualan dan stok cabang berkurang.

## Environment Vercel Backend
```env
DATABASE_URL=mysql://root:password@xxxx.proxy.rlwy.net:PORT/railway
FRONTEND_URL=https://rafiza-fried-chicken.vercel.app
JWT_SECRET=rafiza_secret_key
```

## Akun awal
```txt
manager@gmail.com / 12345678
```

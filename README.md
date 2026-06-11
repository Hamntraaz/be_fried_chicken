# Backend Next.js Rafiza - Vercel Ready

Backend API untuk FE React/Vite Rafiza Fried Chicken.
Endpoint sudah dipisah di `src/pages/api/*.js` dan siap deploy ke Vercel.

## Struktur penting

```txt
src/pages/api/
├─ health.js
├─ login.js
├─ overview.js
├─ purchase-orders.js
├─ supplier-confirm.js
├─ couriers.js
├─ materials.js
├─ production-usage.js
├─ receive-order.js
├─ courier-status.js
├─ manager-suppliers.js
├─ manager-suppliers-update.js
├─ manager-suppliers-delete.js
├─ manager-warehouses.js
├─ manager-warehouses-update.js
└─ manager-warehouses-delete.js
```

## Environment Variables Backend di Vercel

Gunakan `MYSQL_PUBLIC_URL` dari Railway MySQL sebagai `DATABASE_URL`.
Jangan gunakan `MYSQL_URL` / host `.railway.internal` untuk Vercel.

```env
DATABASE_URL=mysql://root:password@xxxx.proxy.rlwy.net:PORT/railway
FRONTEND_URL=https://rafiza-fried-chicken.vercel.app
JWT_SECRET=rafiza_secret_key
```

## Environment Variables Frontend di Vercel

Setelah backend Vercel jadi, ubah frontend:

```env
VITE_API_BASE_URL=https://domain-backend-vercel.vercel.app/api
```

Lalu redeploy frontend.

## Deploy Backend ke Vercel

1. Push folder backend ini ke GitHub.
2. Vercel → Add New Project → pilih repo backend.
3. Framework Preset: Next.js.
4. Root Directory: `/`.
5. Tambahkan Environment Variables backend.
6. Deploy.
7. Tes: `https://domain-backend-vercel.vercel.app/api/health`.

## Akun Login Default

- admin@gmail.com / 12345678
- supplier@gmail.com / 12345678
- kurir@gmail.com / 12345678
- manager@gmail.com / 12345678

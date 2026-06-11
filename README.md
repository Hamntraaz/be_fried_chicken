# Backend Next.js - Rafiza Fried Chicken

Backend ini dibuat untuk FE React/Vite kamu. Endpoint disesuaikan dengan `src/services/api.js` di frontend.

## Jalankan lokal

```bash
npm install
cp .env.example .env
npm run dev
```

Backend jalan di:

```txt
http://localhost:3001/api
```

Di frontend `.env`, isi:

```txt
VITE_API_BASE_URL=http://localhost:3001/api
```

## Deploy Railway

1. Upload/push folder ini ke GitHub.
2. Buat project baru di Railway.
3. Tambahkan service MySQL di Railway.
4. Tambahkan variable:
   - `DATABASE_URL` dari Railway MySQL
   - `FRONTEND_URL` = URL Vercel frontend kamu, contoh `https://nama-project.vercel.app`
5. Deploy.
6. Setelah backend Railway aktif, ubah `.env` frontend Vercel:

```txt
VITE_API_BASE_URL=https://nama-backend.up.railway.app/api
```

## Akun default

- admin@gmail.com / 12345678
- supplier@gmail.com / 12345678
- kurir@gmail.com / 12345678
- manager@gmail.com / 12345678

# Backend Next.js - Rafiza Fried Chicken

Endpoint utama:
- GET `/api/health` untuk cek server aktif tanpa database
- GET `/api/db-test` untuk cek koneksi MySQL
- POST `/api/login`
- GET `/api/overview`

## Railway Variables wajib

```env
DATABASE_URL=${{MySQL.MYSQL_URL}}
FRONTEND_URL=https://rafiza-fried-chicken.vercel.app
JWT_SECRET=rafiza_secret_key
```

Setelah variable diubah, klik **Deploy / Redeploy** di Railway.

## Vercel Frontend Variable

```env
VITE_API_BASE_URL=https://DOMAIN-BACKEND-RAILWAY/api
```

Domain backend harus diambil dari Railway > backend service > Settings > Networking/Public Domain.

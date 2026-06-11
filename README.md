# Backend Next.js Rafiza - Endpoint Terpisah

Backend ini dibuat untuk FE React/Vite Rafiza Fried Chicken.
Endpoint sudah dipisah di `src/pages/api/*.js`, bukan catch-all `[...path]`.

## Railway Variables

Tambahkan di service backend Railway:

```env
DATABASE_URL=${{MySQL.MYSQL_URL}}
FRONTEND_URL=https://rafiza-fried-chicken.vercel.app
JWT_SECRET=rafiza_secret_key
```

> Backend juga membaca `MYSQL_URL` sebagai fallback, tetapi yang disarankan tetap `DATABASE_URL`.

## Vercel Frontend Variable

```env
VITE_API_BASE_URL=https://domain-backend-railway.up.railway.app/api
```

## Public Networking Railway

Gunakan port `3000`, lalu Generate Domain.

## Akun Login Default

- admin@gmail.com / 12345678
- supplier@gmail.com / 12345678
- kurir@gmail.com / 12345678
- manager@gmail.com / 12345678

## Tes Backend

Buka:

```txt
https://domain-backend-railway.up.railway.app/api/health
```

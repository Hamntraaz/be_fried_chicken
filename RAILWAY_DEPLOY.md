# Deploy Backend Rafiza ke Railway

## Railway Variables
Tambahkan di service backend:

```env
DATABASE_URL=${{MySQL.MYSQL_URL}}
FRONTEND_URL=https://rafiza-fried-chicken.vercel.app
JWT_SECRET=rafiza_secret_key
```

## Railway Commands
Install Command:
```bash
npm install
```

Build Command:
```bash
npm run build
```

Start Command:
```bash
npm run start
```

## Public Networking
Port: `3000`

## Test Backend
```txt
https://DOMAIN-BE.up.railway.app/api/health
```

## Vercel Frontend
```env
VITE_API_BASE_URL=https://DOMAIN-BE.up.railway.app/api
```

# Backend Simple PHP API

Endpoint utama:

- `GET /api/health`
- `GET /api/health-db`
- `POST /api/login`
- `GET /api/overview`
- `POST /api/delivery-location`

## Deploy Railway

Repo ini bisa langsung dideploy ke Railway sebagai PHP service. `nixpacks.toml` menjalankan:

```bash
php -S 0.0.0.0:$PORT -t public
```

Tambahkan MySQL service di project Railway yang sama, lalu set environment variable backend dari variable MySQL Railway:

```env
MYSQL_URL=${{ MySQL.MYSQL_URL }}
MYSQLHOST=${{ MySQL.MYSQLHOST }}
MYSQLPORT=${{ MySQL.MYSQLPORT }}
MYSQLDATABASE=${{ MySQL.MYSQLDATABASE }}
MYSQLUSER=${{ MySQL.MYSQLUSER }}
MYSQLPASSWORD=${{ MySQL.MYSQLPASSWORD }}
```

Backend juga masih mendukung nama lokal `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, dan `DB_PASSWORD`.

Setelah deploy, buka:

```text
https://DOMAIN-BACKEND.up.railway.app/api/health-db
```

Jika responsnya `Database tersambung`, tabel awal dan akun manajemen `manager@gmail.com / 12345678` sudah siap.

## Update Lokasi Kurir

Body JSON:

```json
{
  "delivery_id": 1,
  "courier_id": 3,
  "latitude": -6.2056,
  "longitude": 106.8292,
  "accuracy": 25
}
```

Endpoint ini menyimpan koordinat ke tabel `delivery_locations`, mengubah status delivery menjadi `Dalam Perjalanan`, dan mengubah status kurir menjadi `Mengantar`.

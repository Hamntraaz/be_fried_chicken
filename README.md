# Backend Simple PHP API

Endpoint utama:

- `GET /api/health`
- `POST /api/login`
- `GET /api/overview`
- `POST /api/delivery-location`

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

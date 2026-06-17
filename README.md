# SIMODAR

SIMODAR adalah Sistem Informasi Mobile Unit Donor Darah.

Stack baru:

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: MySQL-ready, dengan fallback JSON lokal agar workflow lama tetap bisa diuji
- Auth: role-based login memakai JWT

## Jalankan di VS Code

Install dependency satu kali saja:

```bash
npm install
```

### Mode laptop saja

Pakai ini kalau cek di browser laptop:

```bash
npm run dev
```

Frontend:

`http://127.0.0.1:5173`

Backend API:

`http://127.0.0.1:5001/api/health`

### Mode cek di HP satu WiFi

Pakai ini kalau ingin buka dari HP:

```bash
npm run dev:lan
```

Cari IP laptop:

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object IPAddress,InterfaceAlias
```

Buka di browser HP dengan format:

```text
http://IP-LAPTOP:5173/
```

Contoh:

```text
http://192.168.100.142:5173/
```

HP dan laptop harus berada di WiFi yang sama. Jika tidak bisa dibuka, cek Windows Firewall dan izinkan Node.js pada Private Network.

Akun sementara:

- Username: `admin`
- Password: `admin123`
- Role: `admin`

## MySQL

1. Buat database dengan file:

```bash
backend/src/data/schema.sql
```

2. Copy `backend/.env.example` menjadi `backend/.env`.
3. Set:

```env
DB_ENABLED=true
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=simodar
```

Jika `DB_ENABLED=false`, sistem memakai data lama di folder `data/` supaya workflow tetap bisa dicoba.

## Production Lokal

```bash
npm run build
npm start
```

Express akan menjalankan API sekaligus melayani build React.

# SIMODAR

SIMODAR adalah Sistem Informasi Mobile Unit Donor Darah.

Stack baru:

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: MySQL-ready, dengan fallback JSON lokal agar workflow lama tetap bisa diuji
- Auth: role-based login memakai JWT

## Jalankan di VS Code

```bash
npm install
npm run dev
```

Frontend:

`http://127.0.0.1:5173`

Backend API:

`http://127.0.0.1:5001/api/health`

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

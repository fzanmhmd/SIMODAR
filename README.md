<div align="center">
  <img src="https://img.icons8.com/color/120/000000/rh-minus.png" alt="Logo SIMODAR" width="80" />
  <h1>SIMODAR (Sistem Informasi Mobile Unit Donor Darah)</h1>
  <p><i>Mendigitalisasi dan Mempermudah Operasional Donor Darah PMI & Instansi.</i></p>

  [![Live Demo](https://img.shields.io/badge/Live_Demo-simodar--blood.vercel.app-red?style=for-the-badge)](https://simodar-blood.vercel.app)
  [![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
  [![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)](https://expressjs.com/)
  [![MySQL](https://img.shields.io/badge/mysql-%2300f.svg?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
</div>

<br />

## 📖 Tentang Aplikasi
**SIMODAR** adalah sistem operasional modern berbasis *Full-Stack Web* yang dikembangkan khusus untuk mengelola kegiatan *Mobile Unit* Unit Donor Darah (UDD). Aplikasi ini mengintegrasikan seluruh alur kerja—mulai dari penjadwalan *event*, verifikasi surat pengajuan, penugasan staf medis lapangan, hingga pelaporan data perolehan kantong darah secara *real-time*.

Dengan antarmuka yang sangat responsif, SIMODAR didesain untuk digunakan dengan nyaman baik dari monitor komputer di kantor administrasi maupun dari *smartphone* para petugas langsung di lokasi kegiatan.

## 🚀 Live Demo
Kunjungi versi demo langsung melalui tautan di bawah ini:
👉 **[simodar-blood.vercel.app](https://simodar-blood.vercel.app)**

**Akun Demo:**
- **Username:** `admin`
- **Password:** `admin123`
*(Catatan: Sistem demo menggunakan server Render gratis. Waktu loading awal (*cold-start*) mungkin memerlukan 15-30 detik).*

## ✨ Fitur Utama
- **Dashboard Analitik Interaktif**: Visualisasi data performa harian dan bulanan secara instan.
- **Sistem Pengajuan Mandiri**: Mempermudah instansi luar dalam mengajukan permohonan lokasi donor darah.
- **Manajemen Jadwal & Penugasan Staf**: Mengatur plotting tenaga medis berdasarkan peran (Dokter, HB, Aftap) dengan efisien.
- **Sistem Laporan Excel (Export)**: Penghitungan otomatis gaji / *fee* tenaga medis berdasarkan kehadiran dan kegiatan untuk diunduh sebagai dokumen rekap.
- **Cloud-Ready Architecture**: Siap untuk diterjunkan pada ekosistem *serverless* (Vercel) maupun *container* (Render/VPS).
- **Auto-Switch Database**: Mesin pintar di *backend* secara otomatis mendeteksi apakah akan beroperasi menggunakan penyimpanan lokal (JSON/Dummy) atau Database Profesional (MySQL) berdasarkan ketersediaan Environment Variables.

---

## 🛠️ Tech Stack & Arsitektur
- **Frontend**: React.js 18 + Vite (SPA)
- **Styling**: Tailwind CSS & desain Glassmorphism yang dinamis.
- **Backend API**: Node.js + Express.js
- **Database Asli**: MySQL (Siap Produksi)
- **Database Demo**: JSON Lokal (*Fallback / Self-Healing*)
- **Otentikasi**: Role-Based JWT (JSON Web Token)

---

## 💻 Panduan Menjalankan Secara Lokal (Local Development)

### 1. Persiapan
Pastikan Anda sudah menginstal **Node.js** di laptop Anda. Kemudian buka terminal di dalam repositori ini:

```bash
# Instal seluruh dependency (frontend & backend)
npm install
```

### 2. Menjalankan Server & UI Bersamaan
```bash
# Menjalankan versi Localhost di browser
npm run dev

# Menjalankan versi LAN (agar bisa diakses via HP satu jaringan Wi-Fi)
npm run dev:lan
```
*Aplikasi frontend dapat diakses di `http://127.0.0.1:5173` dan backend API berada di port `5001`.*

### 3. Mengaktifkan Database MySQL (Khusus Production)
Secara bawaan (*default*), saat Anda menjalankan secara lokal, sistem akan menggunakan *file lokal* `data/admin_workflow.json` sebagai *database*. Jika Anda ingin menguji menggunakan MySQL:
1. Jalankan *query* yang ada di dalam `backend/src/data/schema.sql` pada phpMyAdmin / DBeaver Anda.
2. Gandakan (*copy*) file `backend/.env.example` dan ubah namanya menjadi `backend/.env`.
3. Isi kredensial database Anda:
   ```env
   DB_HOST=127.0.0.1
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=simodar
   ```
4. *Restart* server Anda, dan aplikasi akan secara ajaib memindahkan alur kerjanya ke MySQL!

---
<div align="center">
  <i>Dirancang & Dikembangkan oleh <b>Muhammad Fauzan</b>.</i>
</div>

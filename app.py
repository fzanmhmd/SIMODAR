import json
from datetime import datetime
from pathlib import Path

from flask import Flask, abort, redirect, render_template, request, send_from_directory, session, url_for
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = "simodar-dev-secret-key"
DATA_DIR = Path(__file__).resolve().parent / "data"
PENGAJUAN_FILE = DATA_DIR / "pengajuan.json"
UPLOAD_DIR = Path(__file__).resolve().parent / "static" / "uploads" / "surat_pengajuan"

MONTH_NAMES = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
]

ADMIN_NAV = [
    {
        "title": "Dashboard",
        "items": [
            ("dashboard", "Beranda"),
            ("notifikasi", "Notifikasi"),
            ("approval-pengajuan", "Approval Pengajuan"),
            ("histori-pengajuan", "Histori Pengajuan"),
        ],
    },
    {
        "title": "Kegiatan",
        "items": [
            ("jadwal-mobile-unit", "Jadwal Mobile Unit"),
            ("histori-mobile-unit", "Histori Mobile Unit"),
            ("review-kegiatan", "Review Kegiatan"),
            ("kegiatan-berjalan", "Kegiatan Berjalan"),
        ],
    },
    {
        "title": "Master Petugas",
        "items": [
            ("data-petugas", "Data Petugas"),
            ("histori-petugas", "Histori Petugas"),
            ("upload-jadwal-petugas", "Upload Jadwal Kerja"),
            ("view-jadwal-petugas", "View Jadwal Kerja"),
        ],
    },
    {
        "title": "Master Lokasi",
        "items": [
            ("data-lokasi", "Data Lokasi"),
            ("histori-kegiatan-lokasi", "Histori Kegiatan Lokasi"),
            ("validasi-lokasi", "Validasi Lokasi Baru"),
        ],
    },
    {
        "title": "Rekapitulasi",
        "items": [
            ("pembayaran", "Pembayaran"),
            ("operasional", "Operasional"),
            ("rekap-kantong-darah", "Rekap Kantong Darah"),
        ],
    },
    {
        "title": "Statistik",
        "items": [
            ("statistik-kompleks", "Statistik Kompleks"),
            ("tren-bulanan", "Tren Bulanan"),
            ("performa-petugas", "Performa Petugas"),
        ],
    },
    {
        "title": "Akun",
        "items": [
            ("profil", "Pengaturan Profil"),
        ],
    },
]

ADMIN_PAGES = {
    slug: {"title": label, "group": group["title"]}
    for group in ADMIN_NAV
    for slug, label in group["items"]
}

ADMIN_FILTER_PAGES = {
    "approval-pengajuan",
    "histori-pengajuan",
    "jadwal-mobile-unit",
    "histori-mobile-unit",
    "review-kegiatan",
    "kegiatan-berjalan",
    "histori-petugas",
    "upload-jadwal-petugas",
    "view-jadwal-petugas",
    "histori-kegiatan-lokasi",
    "pembayaran",
    "operasional",
    "rekap-kantong-darah",
    "statistik-kompleks",
    "tren-bulanan",
    "performa-petugas",
}


def load_pengajuan():
    if not PENGAJUAN_FILE.exists():
        return []

    try:
        return json.loads(PENGAJUAN_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def save_pengajuan(records):
    DATA_DIR.mkdir(exist_ok=True)
    PENGAJUAN_FILE.write_text(json.dumps(records, indent=2, ensure_ascii=False), encoding="utf-8")


def next_pengajuan_code(records=None, now=None):
    records = records if records is not None else load_pengajuan()
    now = now or datetime.now()
    prefix = now.strftime("%Y%m")
    sequence = 0

    for record in records:
        code = str(record.get("kode_pengajuan", ""))
        if code.startswith(prefix) and len(code) >= 10 and code[-4:].isdigit():
            sequence = max(sequence, int(code[-4:]))

    return f"{prefix}{sequence + 1:04d}"


def find_pengajuan(kode):
    kode = (kode or "").strip()
    if not kode:
        return None

    return next((record for record in load_pengajuan() if record.get("kode_pengajuan") == kode), None)


def greeting_label(now=None):
    now = now or datetime.now()

    if now.hour < 11:
        return "Selamat pagi"
    if now.hour < 15:
        return "Selamat siang"
    if now.hour < 18:
        return "Selamat sore"
    return "Selamat malam"


def month_options(now=None):
    now = now or datetime.now()
    options = []

    for offset in range(0, 12):
        month_index = now.month - offset
        year = now.year

        while month_index <= 0:
            month_index += 12
            year -= 1

        options.append(
            {
                "value": f"{year}-{month_index:02d}",
                "label": f"{MONTH_NAMES[month_index - 1]} {year}",
            }
        )

    return options


def normalize_month(value, now=None):
    now = now or datetime.now()

    try:
        year, month = value.split("-")
        month_number = int(month)
        int(year)
        if 1 <= month_number <= 12:
            return f"{year}-{month_number:02d}"
    except (AttributeError, ValueError):
        pass

    return now.strftime("%Y-%m")


def admin_dummy_data(selected_month):
    year, month = selected_month.split("-")
    month_name = MONTH_NAMES[int(month) - 1]
    month_label = f"{MONTH_NAMES[int(month) - 1]} {year}"
    pengajuan_records = [
        record
        for record in load_pengajuan()
        if str(record.get("kode_pengajuan", "")).startswith(f"{year}{month}")
    ]

    total_pengajuan = len(pengajuan_records)
    approved_count = sum(1 for item in pengajuan_records if item.get("status") == "Disetujui")
    pending_count = sum(1 for item in pengajuan_records if "Verifikasi" in item.get("status", ""))
    approval_rows = pengajuan_records or [
        {
            "kode_pengajuan": f"{year}{month}0001",
            "instansi": "Mandiri Inhealth",
            "lokasi": "Jl. Prof. Dr. Satrio, Jakarta Selatan",
            "tanggal": f"{year}-{month}-10",
            "jam_mulai": "08:00",
            "jam_selesai": "12:00",
            "peserta": "120",
            "status": "Menunggu Verifikasi",
            "nama_pic": "Rizky Pratama",
        },
        {
            "kode_pengajuan": f"{year}{month}0002",
            "instansi": "SMA 12 Jakarta",
            "lokasi": "Duren Sawit, Jakarta Timur",
            "tanggal": f"{year}-{month}-14",
            "jam_mulai": "09:00",
            "jam_selesai": "13:30",
            "peserta": "180",
            "status": "Dalam Peninjauan",
            "nama_pic": "Nur Aisyah",
        },
    ]
    pengajuan_history = sorted(
        approval_rows,
        key=lambda item: str(item.get("tanggal", "")),
        reverse=True,
    )
    activities = [
        {
            "title": "Mandiri Inhealth",
            "address": "Jl. Prof. Dr. Satrio, Jakarta Selatan",
            "date": f"10 {month_name}",
            "time": "08:00 - 12:00",
            "target": "120 Kantong",
            "staff": "Team Alpha",
            "status": "ACC",
        },
        {
            "title": "SMA 12 Jakarta",
            "address": "Jl. Pertanian, Duren Sawit",
            "date": f"14 {month_name}",
            "time": "09:00 - 13:30",
            "target": "180 Kantong",
            "staff": "Team Bravo",
            "status": "Review",
        },
        {
            "title": "Universitas Nasional",
            "address": "Pejaten, Jakarta Selatan",
            "date": f"21 {month_name}",
            "time": "08:30 - 14:00",
            "target": "250 Kantong",
            "staff": "Team Delta",
            "status": "ACC",
        },
    ]

    return {
        "month_label": month_label,
        "approval_rows": approval_rows,
        "pengajuan_history": pengajuan_history,
        "notifications": [
            {
                "title": "Pengajuan masuk",
                "body": f"{len(approval_rows)} pengajuan perlu dicek untuk {month_label}.",
                "meta": "Approval",
            },
            {
                "title": "Kegiatan hari ini",
                "body": "Mobile Unit berjalan di Mandiri Inhealth pukul 08:00 - 12:00.",
                "meta": "On Going",
            },
            {
                "title": "Jadwal petugas",
                "body": "Team Alpha bertugas mobile unit, Team Delta standby validasi lokasi.",
                "meta": "Petugas",
            },
            {
                "title": "Rekap pembayaran",
                "body": "2 pembayaran operasional masih menunggu konfirmasi bendahara.",
                "meta": "Finance",
            },
        ],
        "stats": [
            {"label": "Pengajuan Bulan Ini", "value": total_pengajuan or 18, "trend": "+12%", "tone": "red"},
            {"label": "Mobile Unit Berjalan", "value": 7, "trend": "3 hari ini", "tone": "green"},
            {"label": "Kantong Terkumpul", "value": 642, "trend": "64% target", "tone": "blue"},
            {"label": "Menunggu Review", "value": pending_count or 5, "trend": "butuh tindak lanjut", "tone": "orange"},
        ],
        "activities": activities,
        "histories": [
            {"date": f"03 {month_name}", "place": "Kantor Kecamatan Pasar Minggu", "result": "86 Kantong", "status": "Selesai"},
            {"date": f"07 {month_name}", "place": "PT Astra Komponen", "result": "104 Kantong", "status": "Selesai"},
            {"date": f"12 {month_name}", "place": "Mall Pelayanan Publik", "result": "72 Kantong", "status": "Selesai"},
        ],
        "reviews": [
            {"title": "Cek ventilasi aula SMA 12 Jakarta", "owner": "Koordinator Lapangan", "status": "Perlu follow up"},
            {"title": "Konfirmasi area parkir bus Universitas Nasional", "owner": "Admin Lokasi", "status": "Diproses"},
            {"title": "Review surat pengajuan PT Astra Komponen", "owner": "Admin Utama", "status": "Menunggu ACC"},
        ],
        "running": [
            {"place": "Mandiri Inhealth", "time": "08:00 - 12:00", "progress": "Registrasi donor", "staff": "Team Alpha"},
            {"place": "SMA 12 Jakarta", "time": "09:00 - 13:30", "progress": "Persiapan lokasi", "staff": "Team Bravo"},
        ],
        "payments": [
            {"name": "Operasional Mobile Unit", "amount": "Rp 4.750.000", "status": "Dibayar"},
            {"name": "Konsumsi Petugas", "amount": "Rp 1.250.000", "status": "Proses"},
            {"name": "Bahan Medis Pendukung", "amount": "Rp 8.600.000", "status": "Dijadwalkan"},
        ],
        "operations": [
            {"item": "BBM dan Tol", "budget": "Rp 1.800.000", "realization": "Rp 1.420.000"},
            {"item": "Logistik Lapangan", "budget": "Rp 2.500.000", "realization": "Rp 2.150.000"},
            {"item": "Perawatan Unit", "budget": "Rp 3.200.000", "realization": "Rp 1.900.000"},
        ],
        "blood_recap": [
            {"type": "A", "bags": 148},
            {"type": "B", "bags": 172},
            {"type": "AB", "bags": 58},
            {"type": "O", "bags": 264},
        ],
        "staff": [
            {"name": "Admin Utama", "role": "Koordinator", "shift": "08:00 - 16:00"},
            {"name": "Petugas Apheresis", "role": "Medis", "shift": "09:00 - 17:00"},
            {"name": "Driver MU", "role": "Operasional", "shift": "07:00 - 15:00"},
        ],
        "staff_history": [
            {"name": "Admin Utama", "activity": "ACC 8 pengajuan", "date": f"05 {month_name}"},
            {"name": "Petugas Apheresis", "activity": "Bertugas di 6 lokasi", "date": f"11 {month_name}"},
            {"name": "Driver MU", "activity": "12 perjalanan mobile unit", "date": f"18 {month_name}"},
        ],
        "work_schedules": [
            {"name": "Team Alpha", "date": f"10 {month_name}", "shift": "07:00 - 15:00", "location": "Mandiri Inhealth"},
            {"name": "Team Bravo", "date": f"14 {month_name}", "shift": "08:00 - 16:00", "location": "SMA 12 Jakarta"},
            {"name": "Team Delta", "date": f"21 {month_name}", "shift": "07:30 - 15:30", "location": "Universitas Nasional"},
        ],
        "locations": [
            {"name": "Mandiri Inhealth", "address": "Jl. Prof. Dr. Satrio", "status": "Aktif"},
            {"name": "SMA 12 Jakarta", "address": "Duren Sawit", "status": "Aktif"},
            {"name": "Universitas Nasional", "address": "Pejaten", "status": "Aktif"},
        ],
        "location_history": [
            {"name": "Mandiri Inhealth", "events": 4, "last": f"10 {month_name}", "bags": 120},
            {"name": "SMA 12 Jakarta", "events": 3, "last": f"14 {month_name}", "bags": 180},
            {"name": "Universitas Nasional", "events": 5, "last": f"21 {month_name}", "bags": 250},
        ],
        "location_validations": [
            {"name": "PT Maju Bersama", "address": "Cilandak", "need": "Cek parkir mobile unit"},
            {"name": "Karang Taruna Melati", "address": "Pancoran", "need": "Cek listrik dan ruang tunggu"},
        ],
        "location_stats": [
            {"name": "Instansi Aktif", "value": 42},
            {"name": "Lokasi Baru", "value": 6},
            {"name": "Riwayat Kegiatan", "value": 128},
        ],
        "trends": [
            {"month": "Jan", "bags": 510},
            {"month": "Feb", "bags": 570},
            {"month": "Mar", "bags": 604},
            {"month": "Apr", "bags": 622},
            {"month": "Mei", "bags": 638},
            {"month": month_name[:3], "bags": 642},
        ],
        "performance": [
            {"name": "Team Alpha", "score": "96%", "note": "Tepat waktu dan target tercapai"},
            {"name": "Team Bravo", "score": "91%", "note": "Butuh percepatan setup lokasi"},
            {"name": "Team Delta", "score": "94%", "note": "Dokumentasi lengkap"},
        ],
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/login", methods=["POST"])
def login():
    username = request.form.get("username", "").strip() or "Admin Utama"
    session["admin_username"] = username
    return redirect(url_for("admin_page", page="dashboard"))


@app.route("/admin")
def admin_dashboard():
    return redirect(url_for("admin_page", page="dashboard"))


@app.route("/admin/<page>")
def admin_page(page):
    username = session.get("admin_username")

    if not username:
        return redirect(url_for("index"))

    if page not in ADMIN_PAGES:
        abort(404)

    now = datetime.now()
    selected_month = request.args.get("bulan", now.strftime("%Y-%m"))
    selected_month = normalize_month(selected_month, now)
    data = admin_dummy_data(selected_month)
    current_time = f"{now.day} {MONTH_NAMES[now.month - 1]} {now.year}, {now:%H:%M:%S}"

    return render_template(
        "admin.html",
        username=username,
        page=page,
        page_title=ADMIN_PAGES[page]["title"],
        page_group=ADMIN_PAGES[page]["group"],
        admin_nav=ADMIN_NAV,
        greeting=greeting_label(now),
        current_time=current_time,
        current_time_iso=now.isoformat(timespec="seconds"),
        selected_month=selected_month,
        month_options=month_options(now),
        filter_pages=ADMIN_FILTER_PAGES,
        show_month_filter=page in ADMIN_FILTER_PAGES,
        data=data,
    )


@app.route("/logout")
def logout():
    session.pop("admin_username", None)
    return redirect(url_for("index"))


@app.route("/pengajuan", methods=["GET", "POST"])
def pengajuan():
    records = load_pengajuan()

    if request.method == "POST":
        submitted_code = request.form.get("kode_pengajuan", "").strip()
        existing_codes = {record.get("kode_pengajuan") for record in records}
        code = submitted_code if submitted_code and submitted_code not in existing_codes else next_pengajuan_code(records)
        instansi = request.form.get("instansi_baru") or request.form.get("instansi_terdaftar") or "-"
        logistik = request.form.getlist("logistik")
        surat = request.files.get("surat_pengajuan")
        surat_filename = secure_filename(surat.filename) if surat and surat.filename else ""
        saved_surat = ""

        if surat_filename:
            UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
            saved_surat = f"{code}-{surat_filename}"
            surat.save(UPLOAD_DIR / saved_surat)

        records.append(
            {
                "kode_pengajuan": code,
                "status": "Menunggu Verifikasi",
                "instansi": instansi.strip(),
                "lokasi": request.form.get("lokasi", "").strip(),
                "tanggal": request.form.get("tanggal", "").strip(),
                "jam_mulai": request.form.get("jam_mulai", "").strip(),
                "jam_selesai": request.form.get("jam_selesai", "").strip(),
                "peserta": request.form.get("peserta", "").strip(),
                "nama_pic": request.form.get("nama_pic", "").strip(),
                "whatsapp_pic": request.form.get("whatsapp_pic", "").strip(),
                "email_pic": request.form.get("email_pic", "").strip(),
                "latitude": request.form.get("latitude", "").strip(),
                "longitude": request.form.get("longitude", "").strip(),
                "surat_pengajuan": surat_filename,
                "surat_file": saved_surat,
                "logistik": logistik,
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "deskripsi": "Pengajuan sudah diterima sistem dan menunggu verifikasi petugas SIMODAR.",
            }
        )
        save_pengajuan(records)
        return redirect(url_for("pengajuan", terkirim=code))

    success_code = request.args.get("terkirim", "").strip()
    return render_template(
        "pengajuan.html",
        kode_pengajuan=next_pengajuan_code(records),
        success_pengajuan=find_pengajuan(success_code),
    )


@app.route("/cek-pengajuan")
def cek_pengajuan():
    kode = request.args.get("kode", "").strip()
    return render_template("cek_pengajuan.html", kode=kode, pengajuan=find_pengajuan(kode))


@app.route("/surat-pengajuan/<kode>")
def surat_pengajuan(kode):
    pengajuan_data = find_pengajuan(kode)

    if not pengajuan_data:
        abort(404)

    surat_file = pengajuan_data.get("surat_file", "")

    if surat_file and (UPLOAD_DIR / surat_file).exists():
        return send_from_directory(UPLOAD_DIR, surat_file, as_attachment=False)

    return render_template("surat_pengajuan.html", pengajuan=pengajuan_data)


if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)

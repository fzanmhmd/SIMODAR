import json
from datetime import datetime
from pathlib import Path

from flask import Flask, Response, abort, redirect, render_template, request, send_from_directory, session, url_for
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = "simodar-dev-secret-key"
DATA_DIR = Path(__file__).resolve().parent / "data"
PENGAJUAN_FILE = DATA_DIR / "pengajuan.json"
WORKFLOW_FILE = DATA_DIR / "admin_workflow.json"
UPLOAD_DIR = Path(__file__).resolve().parent / "static" / "uploads" / "surat_pengajuan"

DAY_NAMES = [
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
    "Minggu",
]

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

STAFF_ROLE_OPTIONS = ["dokter", "hb", "aftap", "admin", "driver", "other"]

ADMIN_NAV = [
    {
        "title": "Dashboard",
        "items": [
            ("dashboard", "Dashboard"),
        ],
    },
    {
        "title": "Kegiatan",
        "items": [
            ("approval-pengajuan", "Approval Pengajuan"),
            ("penugasan-petugas", "Penugasan Petugas"),
            ("jadwal-kegiatan", "Jadwal Kegiatan"),
            ("hasil-kegiatan", "Hasil Kegiatan"),
            ("histori-kegiatan", "Histori Kegiatan"),
        ],
    },
    {
        "title": "Master Petugas",
        "items": [
            ("data-petugas", "Data Petugas"),
            ("histori-petugas", "Histori Petugas"),
        ],
    },
    {
        "title": "Master Lokasi",
        "items": [
            ("data-lokasi", "Data Lokasi"),
            ("kegiatan-lokasi", "Kegiatan Lokasi"),
        ],
    },
]

ADMIN_PAGES = {
    slug: {"title": label, "group": group["title"]}
    for group in ADMIN_NAV
    for slug, label in group["items"]
}

ADMIN_FILTER_PAGES = {
    "histori-petugas",
    "kegiatan-lokasi",
    "histori-kegiatan",
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


def read_json(path, default):
    if not path.exists():
        return default

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return default


def write_json(path, payload):
    DATA_DIR.mkdir(exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def default_workflow():
    return {
        "assignments": [],
        "schedules": [],
        "results": [],
        "histories": [],
        "staff": [
            {
                "id": "ptg-001",
                "name": "Admin Utama",
                "roles": ["admin", "driver"],
                "absen": "0001",
                "password": "1234",
                "rekening": "",
            },
            {
                "id": "ptg-002",
                "name": "Dr. Nadya Putri",
                "roles": ["dokter"],
                "absen": "0002",
                "password": "1234",
                "rekening": "",
            },
            {
                "id": "ptg-003",
                "name": "Raka Pratama",
                "roles": ["aftap", "hb"],
                "absen": "0003",
                "password": "1234",
                "rekening": "",
            },
            {
                "id": "ptg-004",
                "name": "Siti Rahma",
                "roles": ["admin", "hb"],
                "absen": "0004",
                "password": "1234",
                "rekening": "",
            },
            {
                "id": "ptg-005",
                "name": "Bima Saputra",
                "roles": ["driver"],
                "absen": "0005",
                "password": "1234",
                "rekening": "",
            },
        ],
        "locations": [
            {
                "id": "lok-001",
                "name": "Mandiri Inhealth",
                "address": "Menara Mandiri Inhealth, Jl. Prof. Dr. Satrio, Jakarta Selatan",
            },
            {
                "id": "lok-002",
                "name": "SMA 12 Jakarta",
                "address": "Jl. Pertanian, Duren Sawit, Jakarta Timur",
            },
            {
                "id": "lok-003",
                "name": "Universitas Nasional",
                "address": "Jl. Sawo Manila, Pejaten, Jakarta Selatan",
            },
        ],
    }


def load_workflow():
    defaults = default_workflow()
    workflow = read_json(WORKFLOW_FILE, defaults)

    for key, value in defaults.items():
        workflow.setdefault(key, value)

    for staff in workflow.get("staff", []):
        staff.setdefault("rekening", "")

    return workflow


def save_workflow(workflow):
    write_json(WORKFLOW_FILE, workflow)


def update_pengajuan_status(kode, status, deskripsi=None):
    records = load_pengajuan()

    for record in records:
        if record.get("kode_pengajuan") == kode:
            record["status"] = status
            if deskripsi:
                record["deskripsi"] = deskripsi
            break

    save_pengajuan(records)


def find_record(records, key, value):
    return next((record for record in records if record.get(key) == value), None)


def remove_record(records, key, value):
    record = find_record(records, key, value)
    if record:
        records.remove(record)
    return record


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


def parse_datetime(value):
    if not value:
        return None

    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            pass

    return None


def format_date_id(value):
    parsed = parse_datetime(value)
    if not parsed:
        return value or "-"
    return f"{parsed.day:02d}/{parsed.month:02d}/{parsed.year}"


def format_datetime_id(value):
    parsed = value if isinstance(value, datetime) else parse_datetime(value)
    if not parsed:
        return value or "-"
    return f"{DAY_NAMES[parsed.weekday()]}, {parsed.day} {MONTH_NAMES[parsed.month - 1]} {parsed.year}, {parsed:%H:%M:%S}"


def month_label(value):
    year, month = value.split("-")
    return f"{MONTH_NAMES[int(month) - 1]} {year}"


def same_month(value, selected_month):
    parsed = parse_datetime(value)
    return bool(parsed and parsed.strftime("%Y-%m") == selected_month)


def workflow_codes(workflow):
    codes = set()
    for key in ("assignments", "schedules", "results", "histories"):
        codes.update(item.get("kode_pengajuan") for item in workflow.get(key, []))
    return {code for code in codes if code}


def activity_from_pengajuan(record):
    return {
        "kode_pengajuan": record.get("kode_pengajuan", ""),
        "tanggal_pengajuan": record.get("created_at", ""),
        "instansi": record.get("instansi", "-"),
        "lokasi": record.get("lokasi", "-"),
        "tanggal": record.get("tanggal", ""),
        "jam_mulai": record.get("jam_mulai", ""),
        "jam_selesai": record.get("jam_selesai", ""),
        "peserta": record.get("peserta", "0"),
        "nama_pic": record.get("nama_pic", "-"),
        "whatsapp_pic": record.get("whatsapp_pic", "-"),
        "email_pic": record.get("email_pic", "-"),
        "logistik": record.get("logistik", []),
        "surat_pengajuan": record.get("surat_pengajuan", ""),
        "created_at": record.get("created_at", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        "staff_assignments": [],
        "pj_petugas": "",
        "status": "Menunggu Penugasan",
    }


def sync_workflow_from_pengajuan(workflow, records):
    existing_codes = workflow_codes(workflow)
    changed = False

    for record in records:
        status = record.get("status", "")
        code = record.get("kode_pengajuan")
        if not code or code in existing_codes:
            continue
        if status.startswith("Disetujui"):
            workflow["assignments"].append(activity_from_pengajuan(record))
            existing_codes.add(code)
            changed = True

    if changed:
        save_workflow(workflow)


def pending_pengajuan(records, workflow):
    blocked = workflow_codes(workflow)
    rows = []

    for record in records:
        code = record.get("kode_pengajuan")
        status = record.get("status", "")
        if code in blocked:
            continue
        if status in {"Menunggu Verifikasi", "Dalam Peninjauan"}:
            rows.append(record)

    return sorted(rows, key=lambda item: item.get("created_at", ""), reverse=True)


def rows_by_month(rows, selected_month):
    return [row for row in rows if same_month(row.get("tanggal") or row.get("completed_at"), selected_month)]


def history_status_counts(rows):
    counts = {"total": len(rows), "selesai": 0, "batal": 0, "ditolak": 0}

    for row in rows:
        status = (row.get("status") or "").lower()
        if status == "selesai":
            counts["selesai"] += 1
        elif status == "batal":
            counts["batal"] += 1
        elif status == "ditolak":
            counts["ditolak"] += 1

    return counts


def staff_history_rows(workflow, selected_month):
    rows = []
    activities = workflow.get("schedules", []) + workflow.get("results", []) + workflow.get("histories", [])

    for staff in workflow.get("staff", []):
        places = []
        for activity in activities:
            if not same_month(activity.get("tanggal"), selected_month):
                continue
            assigned = [
                item for item in activity.get("staff_assignments", [])
                if item.get("name") == staff.get("name")
            ]
            if assigned:
                places.append(
                    {
                        "kode": activity.get("kode_pengajuan"),
                        "lokasi": activity.get("instansi"),
                        "tanggal": activity.get("tanggal"),
                        "status": activity.get("status", "-"),
                        "fungsi": ", ".join(sorted({item.get("role", "-") for item in assigned})),
                    }
                )
        rows.append({"staff": staff, "places": places, **history_status_counts(places)})

    return rows


def location_activity_rows(workflow, selected_month):
    grouped = {}

    for history in workflow.get("histories", []):
        if not same_month(history.get("tanggal"), selected_month):
            continue
        name = history.get("instansi", "-")
        grouped.setdefault(
            name,
            {
                "name": name,
                "address": history.get("lokasi", "-"),
                "total": 0,
                "selesai": 0,
                "batal": 0,
                "ditolak": 0,
                "events": [],
            },
        )
        grouped[name]["events"].append(history)
        grouped[name].update(history_status_counts(grouped[name]["events"]))

    return sorted(grouped.values(), key=lambda item: item["total"], reverse=True)


def admin_data(selected_month, now=None):
    now = now or datetime.now()
    records = load_pengajuan()
    workflow = load_workflow()
    sync_workflow_from_pengajuan(workflow, records)
    workflow = load_workflow()
    approvals = pending_pengajuan(records, workflow)
    today = now.strftime("%Y-%m-%d")
    today_running = [item for item in workflow.get("schedules", []) if item.get("tanggal") == today]

    cards = [
        {
            "label": "Pengajuan Masuk",
            "value": len(approvals),
            "hint": "Total data masuk",
            "href": url_for("admin_page", page="approval-pengajuan", sort="terbaru"),
            "tone": "red",
        },
        {
            "label": "Penugasan Petugas",
            "value": len(workflow.get("assignments", [])),
            "hint": "Total ACC menunggu petugas",
            "href": url_for("admin_page", page="penugasan-petugas"),
            "tone": "green",
        },
        {
            "label": "Siap Kegiatan",
            "value": len(workflow.get("schedules", [])),
            "hint": "Jadwal siap berangkat",
            "href": url_for("admin_page", page="jadwal-kegiatan"),
            "tone": "blue",
        },
        {
            "label": "Hasil Kegiatan",
            "value": len(workflow.get("results", [])),
            "hint": "Menunggu input hasil",
            "href": url_for("admin_page", page="hasil-kegiatan"),
            "tone": "orange",
        },
    ]

    locations = list(workflow.get("locations", []))
    known_locations = {item.get("name", "").lower() for item in locations}
    for record in records:
        instansi = record.get("instansi", "")
        if instansi and instansi.lower() not in known_locations:
            locations.append(
                {
                    "id": "",
                    "name": instansi,
                    "address": record.get("lokasi", "-"),
                }
            )
            known_locations.add(instansi.lower())

    histories_month = rows_by_month(workflow.get("histories", []), selected_month)
    next_priorities = [
        {
            "label": "Verifikasi pengajuan",
            "title": approvals[0].get("instansi") if approvals else "Tidak ada pengajuan masuk",
            "meta": approvals[0].get("kode_pengajuan") if approvals else "Semua pengajuan sudah diproses",
            "href": url_for("admin_page", page="approval-pengajuan", sort="terbaru"),
        },
        {
            "label": "Buat penugasan",
            "title": (workflow.get("assignments") or [{}])[0].get("instansi", "Tidak ada data menunggu"),
            "meta": f"{len(workflow.get('assignments', []))} kegiatan perlu petugas",
            "href": url_for("admin_page", page="penugasan-petugas"),
        },
        {
            "label": "Input hasil",
            "title": (workflow.get("results") or [{}])[0].get("instansi", "Tidak ada hasil tertunda"),
            "meta": f"{len(workflow.get('results', []))} kegiatan menunggu hasil",
            "href": url_for("admin_page", page="hasil-kegiatan"),
        },
    ]

    workflow_steps = [
        {"label": "Masuk", "value": len(approvals)},
        {"label": "Penugasan", "value": len(workflow.get("assignments", []))},
        {"label": "Siap", "value": len(workflow.get("schedules", []))},
        {"label": "Hasil", "value": len(workflow.get("results", []))},
    ]

    return {
        "month_label": month_label(selected_month),
        "approvals": approvals,
        "cards": cards,
        "next_priorities": next_priorities,
        "workflow_steps": workflow_steps,
        "today_running": today_running,
        "assignments": workflow.get("assignments", []),
        "schedules": workflow.get("schedules", []),
        "results": workflow.get("results", []),
        "histories": histories_month,
        "history_counts": history_status_counts(histories_month),
        "all_histories": workflow.get("histories", []),
        "staff": workflow.get("staff", []),
        "staff_history": staff_history_rows(workflow, selected_month),
        "locations": locations,
        "location_activity": location_activity_rows(workflow, selected_month),
        "role_options": STAFF_ROLE_OPTIONS,
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
    data = admin_data(selected_month, now)
    current_time = format_datetime_id(now)
    sort_order = request.args.get("sort", "terbaru")

    if page == "approval-pengajuan" and sort_order == "terlama":
        data["approvals"] = list(reversed(data["approvals"]))

    return render_template(
        "admin.html",
        username=username,
        page=page,
        page_title=ADMIN_PAGES[page]["title"],
        page_group=ADMIN_PAGES[page]["group"],
        admin_nav=ADMIN_NAV,
        greeting=greeting_label(now).upper(),
        current_time=current_time,
        current_time_iso=now.isoformat(timespec="seconds"),
        selected_month=selected_month,
        month_options=month_options(now),
        filter_pages=ADMIN_FILTER_PAGES,
        show_month_filter=page in ADMIN_FILTER_PAGES,
        sort_order=sort_order,
        toast_message=request.args.get("pesan", ""),
        format_date=format_date_id,
        format_datetime=format_datetime_id,
        data=data,
    )


def admin_redirect(page, message=None, **kwargs):
    if message:
        kwargs["pesan"] = message
    return redirect(url_for("admin_page", page=page, **kwargs))


def pdf_escape(value):
    return str(value or "-").replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def wrap_text(value, limit=86):
    words = str(value or "-").split()
    if not words:
        return ["-"]

    lines = []
    current = []
    current_length = 0

    for word in words:
        next_length = current_length + len(word) + (1 if current else 0)
        if current and next_length > limit:
            lines.append(" ".join(current))
            current = [word]
            current_length = len(word)
        else:
            current.append(word)
            current_length = next_length

    if current:
        lines.append(" ".join(current))

    return lines


def build_pdf(commands_by_page):
    objects = {
        1: b"<< /Type /Catalog /Pages 2 0 R >>",
        3: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        4: b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    }
    page_ids = []
    next_id = 5

    for commands in commands_by_page:
        content = "\n".join(commands).encode("latin-1", "replace")
        page_id = next_id
        content_id = next_id + 1
        next_id += 2
        page_ids.append(page_id)
        objects[page_id] = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
            f"/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {content_id} 0 R >>"
        ).encode("latin-1")
        objects[content_id] = (
            f"<< /Length {len(content)} >>\nstream\n".encode("latin-1")
            + content
            + b"\nendstream"
        )

    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    objects[2] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode("latin-1")

    output = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    max_id = max(objects)

    for object_id in range(1, max_id + 1):
        offsets.append(len(output))
        output.extend(f"{object_id} 0 obj\n".encode("latin-1"))
        output.extend(objects[object_id])
        output.extend(b"\nendobj\n")

    xref_at = len(output)
    output.extend(f"xref\n0 {max_id + 1}\n0000000000 65535 f \n".encode("latin-1"))
    for offset in offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode("latin-1"))
    output.extend(
        f"trailer\n<< /Size {max_id + 1} /Root 1 0 R >>\nstartxref\n{xref_at}\n%%EOF".encode("latin-1")
    )
    return bytes(output)


def schedule_pdf_bytes(item):
    commands = []
    pages = [commands]
    y = 790

    def add_command(command):
        commands.append(command)

    def new_page():
        nonlocal commands, y
        commands = []
        pages.append(commands)
        y = 790

    def text(x, value, size=10, bold=False, color="0 0 0"):
        font = "F2" if bold else "F1"
        add_command(f"BT /{font} {size} Tf {color} rg 1 0 0 1 {x} {y} Tm ({pdf_escape(value)}) Tj ET")

    def line(x1, y1, x2, y2, color="0.88 0.70 0.70", width=1):
        add_command(f"q {color} RG {width} w {x1} {y1} m {x2} {y2} l S Q")

    def box(x, y_box, width, height, fill="0.99 0.96 0.96", stroke="0.90 0.72 0.72"):
        add_command(f"q {fill} rg {stroke} RG 1 w {x} {y_box} {width} {height} re B Q")

    def move(amount):
        nonlocal y
        y -= amount
        if y < 72:
            new_page()

    def label_value(label, value):
        nonlocal y
        text(64, label, 9, True, "0.36 0.20 0.21")
        first = True
        for wrapped in wrap_text(value, 64):
            text(196, wrapped, 9, False, "0.12 0.10 0.10" if first else "0.28 0.28 0.28")
            first = False
            move(15)
        move(3)

    box(36, 736, 523, 72, fill="0.73 0.06 0.08", stroke="0.73 0.06 0.08")
    text(56, "SIMODAR", 24, True, "1 1 1")
    move(26)
    text(56, "Jadwal Mobile Unit Donor Darah", 12, False, "1 1 1")
    move(30)
    box(44, 690, 507, 32, fill="1 0.98 0.98", stroke="0.93 0.74 0.74")
    text(60, f"Kode Pengajuan: {item.get('kode_pengajuan', '-')}", 10, True, "0.73 0.06 0.08")
    text(380, f"Status: {item.get('status', 'Siap Kegiatan')}", 10, True, "0.73 0.06 0.08")
    move(38)

    text(52, "Informasi Kegiatan", 12, True, "0.73 0.06 0.08")
    move(18)
    box(52, y - 167, 491, 183, fill="0.99 0.97 0.97", stroke="0.92 0.75 0.75")
    label_value("Lokasi", item.get("instansi", "-"))
    label_value("Alamat", item.get("lokasi", "-"))
    label_value("Tanggal", format_date_id(item.get("tanggal")))
    label_value("Waktu", f"{item.get('jam_mulai', '-')} - {item.get('jam_selesai', '-')}")
    label_value("Estimasi", f"{item.get('peserta', '0')} donor")
    label_value("PIC", f"{item.get('nama_pic', '-')} | {item.get('whatsapp_pic', '-')}")
    label_value("Email PIC", item.get("email_pic", "-"))
    label_value("PJ Petugas", item.get("pj_petugas") or "-")

    move(12)
    text(52, "Daftar Petugas", 12, True, "0.73 0.06 0.08")
    move(18)
    box(52, y - 7, 491, 22, fill="0.73 0.06 0.08", stroke="0.73 0.06 0.08")
    text(66, "No", 9, True, "1 1 1")
    text(104, "Nama Petugas", 9, True, "1 1 1")
    text(402, "Fungsi", 9, True, "1 1 1")
    move(26)
    staff_rows = item.get("staff_assignments", [])
    if staff_rows:
        for index, staff in enumerate(staff_rows, start=1):
            box(52, y - 7, 491, 20, fill="1 1 1", stroke="0.92 0.82 0.82")
            text(68, str(index), 9, False, "0.12 0.10 0.10")
            text(104, staff.get("name", "-"), 9, False, "0.12 0.10 0.10")
            text(402, staff.get("role", "-").upper(), 9, True, "0.36 0.20 0.21")
            move(22)
    else:
        box(52, y - 7, 491, 24, fill="1 1 1", stroke="0.92 0.82 0.82")
        text(66, "Belum ada petugas ditugaskan.", 9, False, "0.45 0.45 0.45")
        move(26)

    move(8)
    text(52, "Kelengkapan", 12, True, "0.73 0.06 0.08")
    move(18)
    label_value("Logistik", ", ".join(item.get("logistik", [])) if item.get("logistik") else "-")
    move(12)
    line(52, y + 8, 543, y + 8)
    text(52, f"Dicetak: {format_datetime_id(datetime.now())}", 8, False, "0.45 0.45 0.45")
    move(16)
    text(52, "Dokumen ini dibuat otomatis oleh SIMODAR.", 8, False, "0.45 0.45 0.45")

    return build_pdf(pages)


@app.get("/admin/jadwal-kegiatan/export")
def export_schedule():
    if not session.get("admin_username"):
        return redirect(url_for("index"))
    return admin_redirect("jadwal-kegiatan", "Download PDF tersedia pada masing-masing jadwal.")


@app.get("/admin/jadwal-kegiatan/<kode>/pdf")
def export_schedule_pdf(kode):
    if not session.get("admin_username"):
        return redirect(url_for("index"))

    now = datetime.now()
    schedule = find_record(load_workflow().get("schedules", []), "kode_pengajuan", kode)

    if not schedule:
        abort(404)

    filename = f"jadwal-simodar-{kode}-{now:%Y%m%d-%H%M}.pdf"
    return Response(
        schedule_pdf_bytes(schedule),
        content_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


def collect_staff_assignments():
    names = request.form.getlist("staff_name")
    roles = request.form.getlist("staff_role")
    rows = []

    for index, name in enumerate(names):
        clean_name = name.strip()
        if not clean_name:
            continue
        rows.append(
            {
                "name": clean_name,
                "role": roles[index].strip() if index < len(roles) and roles[index].strip() else "other",
            }
        )

    return rows


@app.post("/admin/approval-pengajuan/<kode>/acc")
def approve_pengajuan(kode):
    workflow = load_workflow()
    records = load_pengajuan()
    record = find_record(records, "kode_pengajuan", kode)

    if not record:
        abort(404)

    if not find_record(workflow["assignments"], "kode_pengajuan", kode):
        workflow["assignments"].append(activity_from_pengajuan(record))

    save_workflow(workflow)
    update_pengajuan_status(
        kode,
        "Disetujui - Menunggu Penugasan",
        "Pengajuan disetujui dan menunggu penugasan petugas.",
    )
    return admin_redirect("approval-pengajuan", "Pengajuan masuk ke Penugasan Petugas.", sort=request.args.get("sort", "terbaru"))


@app.post("/admin/approval-pengajuan/<kode>/tolak")
def reject_pengajuan(kode):
    workflow = load_workflow()
    records = load_pengajuan()
    record = find_record(records, "kode_pengajuan", kode)

    if not record:
        abort(404)

    note = request.form.get("keterangan", "").strip() or "Pengajuan ditolak oleh admin."
    history = activity_from_pengajuan(record)
    history.update(
        {
            "status": "Ditolak",
            "rejection_note": note,
            "completed_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "result": {},
        }
    )
    workflow["histories"].append(history)
    save_workflow(workflow)
    update_pengajuan_status(kode, "Ditolak", note)
    return admin_redirect("approval-pengajuan", "Pengajuan ditolak dan masuk histori.", sort=request.args.get("sort", "terbaru"))


@app.post("/admin/penugasan-petugas/<kode>/simpan")
def save_assignment(kode):
    workflow = load_workflow()
    activity = remove_record(workflow["assignments"], "kode_pengajuan", kode)

    if not activity:
        abort(404)

    staff_rows = collect_staff_assignments()
    if not staff_rows:
        workflow["assignments"].append(activity)
        save_workflow(workflow)
        return admin_redirect("penugasan-petugas", "Minimal tambahkan satu petugas.")

    pj_petugas = request.form.get("pj_petugas", "").strip() or staff_rows[0]["name"]
    activity.update(
        {
            "status": "Siap Kegiatan",
            "staff_assignments": staff_rows,
            "pj_petugas": pj_petugas,
            "assigned_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
    )
    workflow["schedules"].append(activity)
    save_workflow(workflow)
    update_pengajuan_status(kode, "Siap Kegiatan", "Petugas sudah ditugaskan dan kegiatan siap dijadwalkan.")
    return admin_redirect("penugasan-petugas", "Penugasan tersimpan dan masuk Jadwal Kegiatan.")


@app.post("/admin/jadwal-kegiatan/<kode>/ubah-petugas")
def update_schedule_staff(kode):
    workflow = load_workflow()
    activity = find_record(workflow["schedules"], "kode_pengajuan", kode)

    if not activity:
        abort(404)

    staff_rows = collect_staff_assignments()
    if staff_rows:
        activity["staff_assignments"] = staff_rows
        activity["pj_petugas"] = request.form.get("pj_petugas", "").strip() or staff_rows[0]["name"]
        activity["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        save_workflow(workflow)
        return admin_redirect("jadwal-kegiatan", "Data petugas pada jadwal diperbarui.")

    return admin_redirect("jadwal-kegiatan", "Tidak ada petugas yang disimpan.")


@app.post("/admin/jadwal-kegiatan/<kode>/selesai")
def finish_schedule(kode):
    workflow = load_workflow()
    activity = remove_record(workflow["schedules"], "kode_pengajuan", kode)

    if not activity:
        abort(404)

    activity.update(
        {
            "status": "Menunggu Input Hasil",
            "finished_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
    )
    workflow["results"].append(activity)
    save_workflow(workflow)
    update_pengajuan_status(kode, "Menunggu Input Hasil", "Kegiatan selesai dan menunggu input hasil kegiatan.")
    return admin_redirect("jadwal-kegiatan", "Kegiatan selesai dan masuk Hasil Kegiatan.")


@app.post("/admin/jadwal-kegiatan/<kode>/batal")
def cancel_schedule(kode):
    workflow = load_workflow()
    activity = remove_record(workflow["schedules"], "kode_pengajuan", kode)

    if not activity:
        abort(404)

    note = request.form.get("keterangan", "").strip() or "Kegiatan dibatalkan."
    activity.update(
        {
            "status": "Batal",
            "cancel_note": note,
            "completed_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "result": {},
        }
    )
    workflow["histories"].append(activity)
    save_workflow(workflow)
    update_pengajuan_status(kode, "Batal", note)
    return admin_redirect("jadwal-kegiatan", "Jadwal dibatalkan dan masuk Histori Kegiatan.")


@app.post("/admin/hasil-kegiatan/<kode>/simpan")
def save_activity_result(kode):
    workflow = load_workflow()
    activity = remove_record(workflow["results"], "kode_pengajuan", kode)

    if not activity:
        abort(404)

    result = {
        "donor_terdaftar": request.form.get("donor_terdaftar", "0"),
        "donor_berhasil": request.form.get("donor_berhasil", "0"),
        "donor_gagal": request.form.get("donor_gagal", "0"),
        "kantong_darah": request.form.get("kantong_darah", "0"),
        "snack_terpakai": request.form.get("snack_terpakai", "0"),
        "catatan": request.form.get("catatan", "").strip(),
    }
    activity.update(
        {
            "status": "Selesai",
            "result": result,
            "completed_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
    )
    workflow["histories"].append(activity)
    save_workflow(workflow)
    update_pengajuan_status(kode, "Selesai", "Hasil kegiatan sudah diinput dan tersimpan di histori.")
    return admin_redirect("hasil-kegiatan", "Hasil kegiatan tersimpan di Histori Kegiatan.")


@app.post("/admin/histori-kegiatan/<kode>/edit")
def edit_history_result(kode):
    workflow = load_workflow()
    history = find_record(workflow["histories"], "kode_pengajuan", kode)

    if not history:
        abort(404)

    history.setdefault("result", {})
    history["result"].update(
        {
            "donor_terdaftar": request.form.get("donor_terdaftar", history["result"].get("donor_terdaftar", "0")),
            "donor_berhasil": request.form.get("donor_berhasil", history["result"].get("donor_berhasil", "0")),
            "donor_gagal": request.form.get("donor_gagal", history["result"].get("donor_gagal", "0")),
            "kantong_darah": request.form.get("kantong_darah", history["result"].get("kantong_darah", "0")),
            "snack_terpakai": request.form.get("snack_terpakai", history["result"].get("snack_terpakai", "0")),
            "catatan": request.form.get("catatan", "").strip(),
        }
    )
    history["history_updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    save_workflow(workflow)
    selected_month = request.form.get("bulan", datetime.now().strftime("%Y-%m"))
    return admin_redirect("histori-kegiatan", "Histori kegiatan diperbarui.", bulan=selected_month)


@app.post("/admin/petugas/tambah")
def add_staff():
    workflow = load_workflow()
    roles = request.form.getlist("roles") or ["other"]
    workflow["staff"].append(
        {
            "id": f"ptg-{int(datetime.now().timestamp())}",
            "name": request.form.get("name", "").strip() or "Petugas Baru",
            "roles": roles,
            "absen": request.form.get("absen", "").strip(),
            "password": request.form.get("password", "").strip(),
            "rekening": request.form.get("rekening", "").strip(),
        }
    )
    save_workflow(workflow)
    return admin_redirect("data-petugas", "Petugas baru ditambahkan.")


@app.post("/admin/petugas/<staff_id>/edit")
def edit_staff(staff_id):
    workflow = load_workflow()
    staff = find_record(workflow["staff"], "id", staff_id)

    if not staff:
        abort(404)

    staff["name"] = request.form.get("name", "").strip() or staff["name"]
    staff["roles"] = request.form.getlist("roles") or staff.get("roles", ["other"])
    staff["absen"] = request.form.get("absen", "").strip()
    staff["password"] = request.form.get("password", "").strip()
    staff["rekening"] = request.form.get("rekening", "").strip()
    save_workflow(workflow)
    return admin_redirect("data-petugas", "Data petugas diperbarui.")


@app.post("/admin/petugas/<staff_id>/hapus")
def delete_staff(staff_id):
    workflow = load_workflow()
    remove_record(workflow["staff"], "id", staff_id)
    save_workflow(workflow)
    return admin_redirect("data-petugas", "Petugas dihapus.")


@app.post("/admin/lokasi/tambah")
def add_location():
    workflow = load_workflow()
    workflow["locations"].append(
        {
            "id": f"lok-{int(datetime.now().timestamp())}",
            "name": request.form.get("name", "").strip() or "Lokasi Baru",
            "address": request.form.get("address", "").strip(),
        }
    )
    save_workflow(workflow)
    return admin_redirect("data-lokasi", "Lokasi baru ditambahkan.")


@app.post("/admin/lokasi/<location_id>/edit")
def edit_location(location_id):
    workflow = load_workflow()
    location = find_record(workflow["locations"], "id", location_id)

    if not location:
        abort(404)

    location["name"] = request.form.get("name", "").strip() or location["name"]
    location["address"] = request.form.get("address", "").strip()
    save_workflow(workflow)
    return admin_redirect("data-lokasi", "Data lokasi diperbarui.")


@app.post("/admin/lokasi/<location_id>/hapus")
def delete_location(location_id):
    workflow = load_workflow()
    remove_record(workflow["locations"], "id", location_id)
    save_workflow(workflow)
    return admin_redirect("data-lokasi", "Lokasi dihapus.")


@app.route("/logout")
def logout():
    session.pop("admin_username", None)
    return redirect(url_for("index"))


@app.route("/pengajuan", methods=["GET", "POST"])
def pengajuan():
    records = load_pengajuan()
    is_admin_pengajuan = request.args.get("from") == "admin" and bool(session.get("admin_username"))

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
        redirect_args = {"terkirim": code}
        if is_admin_pengajuan:
            redirect_args["from"] = "admin"
        return redirect(url_for("pengajuan", **redirect_args))

    success_code = request.args.get("terkirim", "").strip()
    back_href = url_for("admin_page", page="dashboard") if is_admin_pengajuan else url_for("index")
    pengajuan_action_args = {"from": "admin"} if is_admin_pengajuan else {}
    return render_template(
        "pengajuan.html",
        kode_pengajuan=next_pengajuan_code(records),
        success_pengajuan=find_pengajuan(success_code),
        is_admin_pengajuan=is_admin_pengajuan,
        back_href=back_href,
        pengajuan_action=url_for("pengajuan", **pengajuan_action_args),
    )


@app.route("/cek-pengajuan")
def cek_pengajuan():
    kode = request.args.get("kode", "").strip()
    is_admin_session = bool(session.get("admin_username"))
    return render_template(
        "cek_pengajuan.html",
        kode=kode,
        pengajuan=find_pengajuan(kode),
        is_admin_session=is_admin_session,
        back_href=url_for("admin_page", page="dashboard") if is_admin_session else url_for("index"),
    )


@app.route("/surat-pengajuan-file/<path:filename>")
def surat_pengajuan_file(filename):
    return send_from_directory(UPLOAD_DIR, secure_filename(filename), as_attachment=False)


@app.route("/surat-pengajuan/<kode>")
def surat_pengajuan(kode):
    pengajuan_data = find_pengajuan(kode)

    if not pengajuan_data:
        abort(404)

    surat_file = pengajuan_data.get("surat_file", "")
    is_admin_session = bool(session.get("admin_username"))
    back_href = (
        url_for("admin_page", page="dashboard")
        if is_admin_session
        else url_for("cek_pengajuan", kode=pengajuan_data.get("kode_pengajuan"))
    )

    if surat_file and (UPLOAD_DIR / surat_file).exists():
        if is_admin_session:
            return render_template(
                "surat_pengajuan.html",
                pengajuan=pengajuan_data,
                back_href=back_href,
                attached_file_url=url_for("surat_pengajuan_file", filename=surat_file),
            )
        return send_from_directory(UPLOAD_DIR, surat_file, as_attachment=False)

    return render_template(
        "surat_pengajuan.html",
        pengajuan=pengajuan_data,
        back_href=back_href,
        attached_file_url="",
    )


if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)

import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { authRequired, loginUser, updateUserProfile } from "./auth.js";
import { buildSchedulePdf, buildActivityResultPdf } from "./utils/pdf.js";
import { buildReportExcel, buildStaffClaimExcel } from "./utils/report.js";
import {
  activityFromPengajuan,
  findRecord,
  getAdminSnapshot,
  loadPengajuan,
  loadWorkflow,
  nextPengajuanCode,
  pendingPengajuan,
  removeRecord,
  savePengajuan,
  saveWorkflow,
  updatePengajuanStatus,
  workflowCodes,
} from "./data/store.js";
import { formatDate, formatDateTime, monthKey, monthLabel, nowStamp, sameMonth } from "./utils/date.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const uploadDir = path.join(rootDir, "backend", "uploads", "surat_pengajuan");
const activityImageDir = path.join(rootDir, "backend", "uploads", "kegiatan");
const frontendDist = path.join(rootDir, "frontend", "dist");
const app = express();
const port = Number(process.env.PORT || 5001);
const host = process.env.HOST || "0.0.0.0";

await fs.mkdir(uploadDir, { recursive: true });
await fs.mkdir(activityImageDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (request, file, callback) => {
      const safe = file.originalname.replace(/[^\w.\-() ]+/g, "_");
      callback(null, `${request.body.kode_pengajuan || Date.now()}-${safe}`);
    },
  }),
});

const activityImageUpload = multer({
  storage: multer.diskStorage({
    destination: activityImageDir,
    filename: (request, file, callback) => {
      const safe = file.originalname.replace(/[^\w.\-() ]+/g, "_");
      callback(null, `${request.params.code || Date.now()}-${Date.now()}-${safe}`);
    },
  }),
  limits: { files: 3, fileSize: 20 * 1024 * 1024 }, // 20 MB per file
  fileFilter: (request, file, callback) => {
    callback(null, String(file.mimetype || "").startsWith("image/"));
  },
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(path.join(rootDir, "backend", "uploads")));

function ok(response, payload = {}) {
  response.json({ ok: true, ...payload });
}

function latestActivityUpdate(row) {
  return (
    row?.history_updated_at ||
    row?.updated_at ||
    row?.completed_at ||
    row?.finished_at ||
    row?.assigned_at ||
    row?.approved_at ||
    row?.created_at ||
    ""
  );
}

function sumResult(rows, key) {
  return rows.reduce((total, row) => total + Number(row.result?.[key] || 0), 0);
}

function inSelectedMonth(row, selectedMonth) {
  return sameMonth(row?.tanggal || row?.completed_at || row?.created_at, selectedMonth);
}

function staffText(row) {
  return (row.staff_assignments || []).map((staff) => `${staff.name} (${staff.role})`).join(", ");
}

function resultDataFromBody(body = {}) {
  return {
    donor_terdaftar: body.donor_terdaftar || "0",
    donor_berhasil: body.donor_berhasil || "0",
    donor_gagal: body.donor_gagal || "0",
    kantong_darah: body.kantong_darah || "0",
    snack_terpakai: body.snack_terpakai || "0",
    catatan: body.catatan || "",
  };
}

function missingResultFields(body = {}) {
  return ["donor_terdaftar", "donor_berhasil", "donor_gagal", "kantong_darah", "snack_terpakai"]
    .filter((field) => String(body[field] ?? "").trim() === "");
}

function activityImagesFromFiles(files = []) {
  const timestamp = nowStamp();
  return files.map((file) => ({
    name: file.originalname,
    file: file.filename,
    url: `/uploads/kegiatan/${file.filename}`,
    uploaded_at: timestamp,
  }));
}

const reportTypes = [
  { value: "pengajuan", label: "Pengajuan ACC/Ditolak" },
  { value: "kegiatan", label: "Kegiatan Berhasil" },
  { value: "kantong", label: "Kantong per Lokasi" },
  { value: "histories", label: "Rekap Histori Kegiatan" },
];

function workflowRows(snapshot) {
  return [
    ...(snapshot.assignments || []),
    ...(snapshot.schedules || []),
    ...(snapshot.results || []),
    ...(snapshot.allHistories || []),
  ];
}

function decisionDate(row) {
  const status = String(row.status || "").toLowerCase();
  if (status === "ditolak") return row.completed_at || row.updated_at || row.created_at || "";
  return row.approved_at || row.assigned_at || row.updated_at || row.created_at || "";
}

function successfulHistories(snapshot, selectedMonth) {
  return (snapshot.allHistories || [])
    .filter((row) => String(row.status || "").toLowerCase() === "selesai")
    .filter((row) => sameMonth(row.tanggal || row.completed_at, selectedMonth));
}

function buildPengajuanReport(snapshot, selectedMonth) {
  const rows = workflowRows(snapshot)
    .map((row) => {
      const status = String(row.status || "").toLowerCase() === "ditolak" ? "Ditolak" : "ACC";
      return {
        kode_pengajuan: row.kode_pengajuan || "-",
        tanggal_pengajuan: formatDateTime(row.tanggal_pengajuan || row.created_at),
        tanggal_keputusan: formatDateTime(decisionDate(row)),
        instansi: row.instansi || "-",
        alamat: row.lokasi || "-",
        status,
        tanggal_kegiatan: formatDate(row.tanggal),
        keterangan: row.rejection_note || row.cancel_note || row.missed_note || row.status || "-",
        _decision_date: decisionDate(row),
      };
    })
    .filter((row) => sameMonth(row._decision_date, selectedMonth))
    .sort((a, b) => String(b._decision_date || "").localeCompare(String(a._decision_date || "")))
    .map(({ _decision_date, ...row }) => row);

  const accTotal = rows.filter((row) => row.status === "ACC").length;
  const rejectedTotal = rows.filter((row) => row.status === "Ditolak").length;

  return {
    cards: [
      { key: "total", label: "Total Keputusan", value: rows.length },
      { key: "acc", label: "Pengajuan ACC", value: accTotal },
      { key: "reject", label: "Pengajuan Ditolak", value: rejectedTotal },
    ],
    columns: [
      { key: "kode_pengajuan", label: "Kode" },
      { key: "tanggal_pengajuan", label: "Tanggal Pengajuan" },
      { key: "tanggal_keputusan", label: "Tanggal Keputusan" },
      { key: "instansi", label: "Instansi" },
      { key: "alamat", label: "Alamat" },
      { key: "status", label: "Status" },
      { key: "tanggal_kegiatan", label: "Tanggal Kegiatan" },
      { key: "keterangan", label: "Keterangan" },
    ],
    rows,
  };
}

function buildKegiatanReport(snapshot, selectedMonth) {
  const histories = successfulHistories(snapshot, selectedMonth);
  const rows = histories
    .map((row) => ({
      kode_pengajuan: row.kode_pengajuan || "-",
      tanggal_kegiatan: formatDate(row.tanggal),
      instansi: row.instansi || "-",
      alamat: row.lokasi || "-",
      waktu: [row.jam_mulai, row.jam_selesai].filter(Boolean).join(" - ") || "-",
      pj_petugas: row.pj_petugas || "-",
      petugas: staffText(row) || "-",
      donor_terdaftar: row.result?.donor_terdaftar || "0",
      donor_berhasil: row.result?.donor_berhasil || "0",
      donor_gagal: row.result?.donor_gagal || "0",
      kantong_darah: row.result?.kantong_darah || "0",
      snack_terpakai: row.result?.snack_terpakai || "0",
      update_data: formatDateTime(latestActivityUpdate(row)),
    }))
    .sort((a, b) => String(a.tanggal_kegiatan || "").localeCompare(String(b.tanggal_kegiatan || "")));
  const uniqueStaff = new Set(histories.flatMap((row) => (row.staff_assignments || []).map((staff) => staff.name)));

  return {
    cards: [
      { key: "total", label: "Kegiatan Berhasil", value: rows.length },
      { key: "locations", label: "Lokasi Berhasil", value: new Set(rows.map((row) => row.instansi)).size },
      { key: "staff", label: "Petugas Terlibat", value: uniqueStaff.size },
      { key: "bags", label: "Kantong Darah", value: sumResult(histories, "kantong_darah") },
      { key: "success", label: "Donor Berhasil", value: sumResult(histories, "donor_berhasil") },
      { key: "failed", label: "Donor Gagal", value: sumResult(histories, "donor_gagal") },
    ],
    columns: [
      { key: "kode_pengajuan", label: "Kode" },
      { key: "tanggal_kegiatan", label: "Tanggal Kegiatan" },
      { key: "instansi", label: "Instansi" },
      { key: "alamat", label: "Alamat" },
      { key: "waktu", label: "Waktu" },
      { key: "pj_petugas", label: "PJ Petugas" },
      { key: "petugas", label: "Petugas Lengkap" },
      { key: "donor_terdaftar", label: "Terdaftar" },
      { key: "donor_berhasil", label: "Berhasil" },
      { key: "donor_gagal", label: "Gagal" },
      { key: "kantong_darah", label: "Kantong" },
      { key: "snack_terpakai", label: "Snack" },
    ],
    rows,
  };
}

function buildHistoriesReport(snapshot, selectedMonth) {
  const rows = (snapshot.allHistories || [])
    .filter((row) => sameMonth(row.tanggal || row.completed_at, selectedMonth))
    .map((row) => ({
      kode_pengajuan: row.kode_pengajuan || "-",
      tanggal_kegiatan: formatDate(row.tanggal),
      instansi: row.instansi || "-",
      status: String(row.status || "").toUpperCase(),
      kantong_darah: String(row.result?.kantong_darah || "0"),
      donor_berhasil: String(row.result?.donor_berhasil || "0"),
      donor_gagal: String(row.result?.donor_gagal || "0"),
      donor_terdaftar: String(row.result?.donor_terdaftar || "0"),
      update_data: formatDateTime(latestActivityUpdate(row)),
    }))
    .sort((a, b) => String(a.tanggal_kegiatan || "").localeCompare(String(b.tanggal_kegiatan || "")));

  const selesaiTotal = rows.filter((r) => String(r.status).toLowerCase() === "selesai").length;
  const batalTotal = rows.filter((r) => String(r.status).toLowerCase() === "batal").length;
  const tolakTotal = rows.filter((r) => String(r.status).toLowerCase() === "ditolak").length;

  return {
    cards: [
      { key: "total", label: "Total Data Histori", value: rows.length },
      { key: "selesai", label: "Selesai", value: selesaiTotal },
      { key: "batal", label: "Batal", value: batalTotal },
      { key: "ditolak", label: "Ditolak", value: tolakTotal },
    ],
    columns: [
      { key: "kode_pengajuan", label: "Kode" },
      { key: "tanggal_kegiatan", label: "Tanggal" },
      { key: "instansi", label: "Instansi / Lokasi" },
      { key: "status", label: "Status" },
      { key: "kantong_darah", label: "Kantong" },
      { key: "donor_berhasil", label: "Berhasil" },
      { key: "donor_gagal", label: "Gagal" },
      { key: "donor_terdaftar", label: "Terdaftar" },
      { key: "update_data", label: "Update" },
    ],
    rows,
  };
}

function buildKantongReport(snapshot, selectedMonth) {
  const histories = successfulHistories(snapshot, selectedMonth);
  const grouped = {};
  for (const row of histories) {
    const key = row.instansi || "-";
    grouped[key] ||= {
      instansi: key,
      alamat: row.lokasi || "-",
      total_kegiatan: 0,
      donor_terdaftar: 0,
      donor_berhasil: 0,
      donor_gagal: 0,
      kantong_darah: 0,
      terakhir_kegiatan: "",
    };
    grouped[key].total_kegiatan += 1;
    grouped[key].donor_terdaftar += Number(row.result?.donor_terdaftar || 0);
    grouped[key].donor_berhasil += Number(row.result?.donor_berhasil || 0);
    grouped[key].donor_gagal += Number(row.result?.donor_gagal || 0);
    grouped[key].kantong_darah += Number(row.result?.kantong_darah || 0);
    if (String(row.tanggal || "") > String(grouped[key].terakhir_kegiatan || "")) grouped[key].terakhir_kegiatan = row.tanggal || "";
  }
  const rows = Object.values(grouped)
    .sort((a, b) => b.kantong_darah - a.kantong_darah)
    .map((row) => ({ ...row, terakhir_kegiatan: formatDate(row.terakhir_kegiatan) }));

  return {
    cards: [
      { key: "locations", label: "Lokasi Donor", value: rows.length },
      { key: "activities", label: "Kegiatan Berhasil", value: histories.length },
      { key: "bags", label: "Total Kantong", value: rows.reduce((total, row) => total + row.kantong_darah, 0) },
      { key: "success", label: "Donor Berhasil", value: rows.reduce((total, row) => total + row.donor_berhasil, 0) },
    ],
    columns: [
      { key: "instansi", label: "Lokasi" },
      { key: "alamat", label: "Alamat" },
      { key: "total_kegiatan", label: "Total Kegiatan" },
      { key: "kantong_darah", label: "Kantong Darah" },
      { key: "donor_terdaftar", label: "Terdaftar" },
      { key: "donor_berhasil", label: "Berhasil" },
      { key: "donor_gagal", label: "Gagal" },
      { key: "terakhir_kegiatan", label: "Terakhir Kegiatan" },
    ],
    rows,
  };
}

function buildAdminReport(snapshot, selectedMonth, requestedType = "pengajuan") {
  const type = reportTypes.some((item) => item.value === requestedType) ? requestedType : "pengajuan";
  const typeLabel = reportTypes.find((item) => item.value === type)?.label || "Report";
  const payload =
    type === "kegiatan"
      ? buildKegiatanReport(snapshot, selectedMonth)
      : type === "kantong"
        ? buildKantongReport(snapshot, selectedMonth)
        : type === "histories"
          ? buildHistoriesReport(snapshot, selectedMonth)
          : buildPengajuanReport(snapshot, selectedMonth);

  return {
    month: selectedMonth,
    month_label: monthLabel(selectedMonth),
    generated_at: formatDateTime(new Date()),
    type,
    type_label: typeLabel,
    types: reportTypes,
    ...payload,
  };
}

function staffAssignmentsFromBody(body) {
  return (body.staff_assignments || [])
    .filter((row) => row?.name)
    .map((row) => ({
      name: String(row.name).trim(),
      role: String(row.role || "other").trim(),
      is_pj: Boolean(row.is_pj),
    }));
}

function pjNamesFromBody(body, staffRows) {
  const namesFromRows = staffRows.filter((row) => row.is_pj).map((row) => row.name);
  const rawNames = Array.isArray(body.pj_petugas)
    ? body.pj_petugas
    : String(body.pj_petugas || "").split(",");
  const namesFromBody = rawNames.map((name) => String(name).trim()).filter(Boolean);
  return Array.from(new Set([...namesFromRows, ...namesFromBody]));
}

app.get("/api/health", (request, response) => ok(response, { service: "SIMODAR API", time: nowStamp() }));

app.post("/api/auth/login", async (request, response) => {
  const result = await loginUser(request.body.username, request.body.password);
  if (!result) return response.status(401).json({ message: "Username atau password tidak sesuai." });
  ok(response, result);
});

app.get("/api/auth/me", authRequired(), (request, response) => ok(response, { user: request.user }));

app.put("/api/auth/profile", authRequired(), async (request, response) => {
  try {
    const result = await updateUserProfile(request.user, request.body);
    ok(response, { ...result, message: "Profil akun diperbarui." });
  } catch (error) {
    response.status(400).json({ message: error.message || "Profil akun gagal diperbarui." });
  }
});

app.get("/api/public/summary", async (request, response) => {
  const snapshot = await getAdminSnapshot(monthKey());
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = monthKey(lastMonth);
  const historiesLastMonth = snapshot.allHistories.filter((row) => sameMonth(row.tanggal || row.completed_at, lastMonthKey));
  const bloodBagsLastMonth = historiesLastMonth.reduce((total, row) => total + Number(row.result?.kantong_darah || 0), 0);
  const monthSchedules = snapshot.schedules
    .filter((row) => sameMonth(row.tanggal, monthKey(now)))
    .sort((a, b) => String(a.tanggal || "").localeCompare(String(b.tanggal || "")));

  ok(response, {
    info: {
      todayRunning: snapshot.todayRunning,
      lastMonthHistory: {
        totalLocations: new Set(historiesLastMonth.map((row) => row.instansi)).size,
        totalActivities: historiesLastMonth.length,
        bloodBags: bloodBagsLastMonth,
      },
      monthSchedules: monthSchedules.slice(0, 6),
    },
  });
});

app.get("/api/locations", async (request, response) => {
  const snapshot = await getAdminSnapshot(monthKey());
  ok(response, { locations: snapshot.locations });
});

app.get("/api/public/logistics", async (request, response) => {
  const workflow = await loadWorkflow();
  ok(response, { logistics: workflow.logistics || [] });
});

app.get("/api/submissions/next-code", async (request, response) => {
  const records = await loadPengajuan();
  ok(response, { code: nextPengajuanCode(records) });
});

app.post("/api/submissions", upload.single("surat_pengajuan"), async (request, response) => {
  console.log("REQUEST BODY SUBMISSION:", request.body);
  const records = await loadPengajuan();
  const existingCodes = new Set(records.map((record) => record.kode_pengajuan));
  const code = request.body.kode_pengajuan && !existingCodes.has(request.body.kode_pengajuan)
    ? request.body.kode_pengajuan
    : nextPengajuanCode(records);
  const timestamp = nowStamp();
  const record = {
    kode_pengajuan: code,
    status: "Menunggu Verifikasi",
    instansi: request.body.instansi || request.body.instansi_baru || "-",
    lokasi: request.body.lokasi || "-",
    tanggal: request.body.tanggal || "",
    jam_mulai: request.body.jam_mulai || "",
    jam_selesai: request.body.jam_selesai || "",
    peserta: request.body.peserta || "",
    nama_pic: request.body.nama_pic || "",
    whatsapp_pic: request.body.whatsapp_pic || "",
    email_pic: request.body.email_pic || "",
    latitude: request.body.latitude || "",
    longitude: request.body.longitude || "",
    maps_url: request.body.maps_url || "",
    surat_pengajuan: request.file?.originalname || "",
    surat_file: request.file?.filename || "",
    logistik: Array.isArray(request.body.logistik) ? request.body.logistik : String(request.body.logistik || "").split(",").filter(Boolean),
    created_at: timestamp,
    updated_at: timestamp,
    deskripsi: "Pengajuan sudah diterima sistem dan menunggu verifikasi petugas SIMODAR.",
  };
  records.push(record);
  await savePengajuan(records);
  ok(response, { submission: record });
});

app.get("/api/submissions/:code", async (request, response) => {
  const records = await loadPengajuan();
  const submission = findRecord(records, "kode_pengajuan", request.params.code);
  if (!submission) return response.status(404).json({ message: "Kode pengajuan tidak ditemukan." });
  ok(response, { submission });
});

app.get("/api/submissions/:code/file", async (request, response) => {
  const records = await loadPengajuan();
  const submission = findRecord(records, "kode_pengajuan", request.params.code);
  if (!submission?.surat_file) return response.status(404).json({ message: "File surat tidak tersedia." });
  const filePath = path.join(uploadDir, submission.surat_file);
  try {
    await fs.access(filePath);
    return response.sendFile(filePath);
  } catch {
    response.status(404).json({ message: "File surat tidak ditemukan di server." });
  }
});

app.use("/api/admin", authRequired(["admin"]));

app.get("/api/admin/overview", async (request, response) => {
  ok(response, { data: await getAdminSnapshot(request.query.month || monthKey()) });
});

app.get("/api/admin/approvals", async (request, response) => {
  const records = await loadPengajuan();
  const workflow = await loadWorkflow();
  let approvals = pendingPengajuan(records, workflow);
  if (request.query.sort === "terlama") approvals = approvals.reverse();
  ok(response, { approvals });
});

app.put("/api/admin/approvals/:code", async (request, response) => {
  const records = await loadPengajuan();
  const workflow = await loadWorkflow();
  const record = findRecord(records, "kode_pengajuan", request.params.code);
  if (!record) return response.status(404).json({ message: "Pengajuan tidak ditemukan." });
  if (workflowCodes(workflow).has(request.params.code)) {
    return response.status(409).json({ message: "Pengajuan sudah diproses dan tidak bisa diedit dari approval." });
  }

  const editableFields = [
    "instansi",
    "lokasi",
    "tanggal",
    "jam_mulai",
    "jam_selesai",
    "peserta",
    "nama_pic",
    "whatsapp_pic",
    "email_pic",
    "maps_url",
  ];
  for (const field of editableFields) {
    if (request.body[field] !== undefined) record[field] = String(request.body[field]).trim();
  }
  record.updated_at = nowStamp();
  await savePengajuan(records);
  ok(response, { message: "Data pengajuan diperbarui.", submission: record });
});

app.post("/api/admin/approvals/:code/approve", async (request, response) => {
  const records = await loadPengajuan();
  const workflow = await loadWorkflow();
  const record = findRecord(records, "kode_pengajuan", request.params.code);
  if (!record) return response.status(404).json({ message: "Pengajuan tidak ditemukan." });

  if (!findRecord(workflow.assignments, "kode_pengajuan", request.params.code)) {
    const activity = activityFromPengajuan(record);
    activity.approved_at = nowStamp();
    activity.updated_at = activity.approved_at;
    workflow.assignments.push(activity);
  }
  await saveWorkflow(workflow);
  await updatePengajuanStatus(request.params.code, "Disetujui - Menunggu Penugasan", "Pengajuan disetujui dan menunggu penugasan petugas.");
  ok(response, { message: "Pengajuan masuk ke Penugasan Petugas." });
});

app.post("/api/admin/approvals/:code/reject", async (request, response) => {
  const records = await loadPengajuan();
  const workflow = await loadWorkflow();
  const record = findRecord(records, "kode_pengajuan", request.params.code);
  if (!record) return response.status(404).json({ message: "Pengajuan tidak ditemukan." });

  const note = request.body.keterangan || "Pengajuan ditolak oleh admin.";
  const history = {
    ...activityFromPengajuan(record),
    status: "Ditolak",
    rejection_note: note,
    completed_at: nowStamp(),
    updated_at: nowStamp(),
    result: {},
  };
  workflow.histories.push(history);
  await saveWorkflow(workflow);
  await updatePengajuanStatus(request.params.code, "Ditolak", note);
  ok(response, { message: "Pengajuan ditolak dan masuk histori." });
});

app.get("/api/admin/assignments", async (request, response) => {
  const snapshot = await getAdminSnapshot(request.query.month || monthKey());
  ok(response, { assignments: snapshot.assignments, staff: snapshot.staff, roleOptions: snapshot.roleOptions });
});

app.delete("/api/admin/assignments/:code", async (request, response) => {
  const workflow = await loadWorkflow();
  const activity = removeRecord(workflow.assignments, "kode_pengajuan", request.params.code);
  if (!activity) return response.status(404).json({ message: "Data penugasan tidak ditemukan." });

  const timestamp = nowStamp();
  const note = "Pengajuan terlewat dari batas penugasan dan dihapus dari antrian.";
  activity.status = "Terlewatkan";
  activity.missed_note = note;
  activity.completed_at = timestamp;
  activity.updated_at = timestamp;
  activity.result = {};
  workflow.histories.push(activity);
  await saveWorkflow(workflow);
  await updatePengajuanStatus(request.params.code, "Terlewatkan", note);
  ok(response, { message: "Data terlewatkan dihapus dari penugasan dan masuk histori." });
});

app.post("/api/admin/assignments/:code/save", async (request, response) => {
  const workflow = await loadWorkflow();
  const activity = removeRecord(workflow.assignments, "kode_pengajuan", request.params.code);
  if (!activity) return response.status(404).json({ message: "Data penugasan tidak ditemukan." });
  const staffRows = staffAssignmentsFromBody(request.body);
  if (!staffRows.length) {
    workflow.assignments.push(activity);
    await saveWorkflow(workflow);
    return response.status(400).json({ message: "Minimal tambahkan satu petugas." });
  }
  const pjNames = pjNamesFromBody(request.body, staffRows);
  if (!pjNames.length || !pjNames.every((name) => staffRows.some((row) => row.name === name))) {
    workflow.assignments.push(activity);
    await saveWorkflow(workflow);
    return response.status(400).json({ message: "Minimal pilih satu PJ petugas terlebih dahulu." });
  }
  activity.status = "Siap Kegiatan";
  activity.staff_assignments = staffRows.map((row) => ({ ...row, is_pj: pjNames.includes(row.name) || row.is_pj }));
  activity.pj_petugas = pjNames.join(", ");
  activity.assigned_at = nowStamp();
  activity.updated_at = activity.assigned_at;
  workflow.schedules.push(activity);
  await saveWorkflow(workflow);
  await updatePengajuanStatus(request.params.code, "Siap Kegiatan", "Petugas sudah ditugaskan dan kegiatan siap dijadwalkan.");
  ok(response, { message: "Penugasan tersimpan. Data masuk ke Jadwal Kegiatan." });
});

app.get("/api/admin/schedules", async (request, response) => {
  const snapshot = await getAdminSnapshot(request.query.month || monthKey());
  ok(response, { schedules: snapshot.schedules, staff: snapshot.staff, roleOptions: snapshot.roleOptions });
});

app.put("/api/admin/schedules/:code/staff", async (request, response) => {
  const workflow = await loadWorkflow();
  const activity = findRecord(workflow.schedules, "kode_pengajuan", request.params.code);
  if (!activity) return response.status(404).json({ message: "Jadwal tidak ditemukan." });
  const staffRows = staffAssignmentsFromBody(request.body);
  if (!staffRows.length) return response.status(400).json({ message: "Minimal tambahkan satu petugas." });
  const pjNames = pjNamesFromBody(request.body, staffRows);
  if (!pjNames.length || !pjNames.every((name) => staffRows.some((row) => row.name === name))) {
    return response.status(400).json({ message: "Minimal pilih satu PJ petugas terlebih dahulu." });
  }
  activity.staff_assignments = staffRows.map((row) => ({ ...row, is_pj: pjNames.includes(row.name) || row.is_pj }));
  activity.pj_petugas = pjNames.join(", ");
  activity.updated_at = nowStamp();
  await saveWorkflow(workflow);
  ok(response, { message: "Data petugas pada jadwal diperbarui." });
});

app.post("/api/admin/schedules/:code/finish", async (request, response) => {
  const workflow = await loadWorkflow();
  const activity = removeRecord(workflow.schedules, "kode_pengajuan", request.params.code);
  if (!activity) return response.status(404).json({ message: "Jadwal tidak ditemukan." });
  activity.status = "Menunggu Input Hasil";
  activity.finished_at = nowStamp();
  activity.updated_at = activity.finished_at;
  workflow.results.push(activity);
  await saveWorkflow(workflow);
  await updatePengajuanStatus(request.params.code, "Menunggu Input Hasil", "Kegiatan selesai dan menunggu input hasil kegiatan.");
  ok(response, { message: "Kegiatan selesai dan masuk Hasil Kegiatan." });
});

app.post("/api/admin/schedules/:code/cancel", async (request, response) => {
  const workflow = await loadWorkflow();
  const activity = removeRecord(workflow.schedules, "kode_pengajuan", request.params.code);
  if (!activity) return response.status(404).json({ message: "Jadwal tidak ditemukan." });
  const note = request.body.keterangan || "Kegiatan dibatalkan.";
  activity.status = "Batal";
  activity.cancel_note = note;
  activity.completed_at = nowStamp();
  activity.updated_at = activity.completed_at;
  activity.result = {};
  workflow.histories.push(activity);
  await saveWorkflow(workflow);
  await updatePengajuanStatus(request.params.code, "Batal", note);
  ok(response, { message: "Jadwal dibatalkan dan masuk Histori Kegiatan." });
});

app.get("/api/admin/schedules/:code/pdf", async (request, response) => {
  const workflow = await loadWorkflow();
  const schedule = findRecord(workflow.schedules, "kode_pengajuan", request.params.code);
  if (!schedule) return response.status(404).json({ message: "Jadwal tidak ditemukan." });
  const pdf = await buildSchedulePdf(schedule);
  response.setHeader("Content-Type", "application/pdf");
  response.setHeader("Content-Disposition", `attachment; filename=jadwal-simodar-${schedule.kode_pengajuan}.pdf`);
  response.send(pdf);
});

app.get("/api/admin/histories/:code/pdf", async (request, response) => {
  const workflow = await loadWorkflow();
  const history = findRecord(workflow.histories, "kode_pengajuan", request.params.code);
  if (!history) return response.status(404).json({ message: "Histori tidak ditemukan." });
  const pdf = await buildActivityResultPdf(history, activityImageDir);
  response.setHeader("Content-Type", "application/pdf");
  response.setHeader("Content-Disposition", `attachment; filename=hasil-kegiatan-${history.kode_pengajuan}.pdf`);
  response.send(pdf);
});

app.get("/api/admin/results", async (request, response) => {
  const snapshot = await getAdminSnapshot(request.query.month || monthKey());
  ok(response, { results: snapshot.results });
});

app.post("/api/admin/results/:code/save", activityImageUpload.array("images", 3), async (request, response) => {
  const workflow = await loadWorkflow();
  const activity = removeRecord(workflow.results, "kode_pengajuan", request.params.code);
  if (!activity) return response.status(404).json({ message: "Data hasil tidak ditemukan." });
  const missingFields = missingResultFields(request.body);
  if (missingFields.length) {
    workflow.results.push(activity);
    await saveWorkflow(workflow);
    return response.status(400).json({ message: "Semua field hasil kegiatan wajib diisi." });
  }
  if ((request.files || []).length !== 3) {
    workflow.results.push(activity);
    await saveWorkflow(workflow);
    return response.status(400).json({ message: "Upload wajib tepat 3 gambar kegiatan." });
  }
  activity.status = "Selesai";
  activity.result = {
    ...resultDataFromBody(request.body),
    images: activityImagesFromFiles(request.files).slice(0, 3),
  };
  activity.completed_at = nowStamp();
  activity.updated_at = activity.completed_at;
  workflow.histories.push(activity);
  await saveWorkflow(workflow);
  await updatePengajuanStatus(request.params.code, "Selesai", "Hasil kegiatan sudah diinput dan tersimpan di histori.");
  ok(response, { message: "Hasil kegiatan tersimpan di Histori Kegiatan." });
});

app.get("/api/admin/histories", async (request, response) => {
  const snapshot = await getAdminSnapshot(request.query.month || monthKey());
  ok(response, { histories: snapshot.histories, counts: snapshot.historyCounts });
});

app.put("/api/admin/histories/:code/result", activityImageUpload.array("images", 3), async (request, response) => {
  const workflow = await loadWorkflow();
  const history = findRecord(workflow.histories, "kode_pengajuan", request.params.code);
  if (!history) return response.status(404).json({ message: "Histori tidak ditemukan." });
  const missingFields = missingResultFields(request.body);
  if (missingFields.length) {
    return response.status(400).json({ message: "Semua field hasil kegiatan wajib diisi." });
  }
  const existingImages = Array.isArray(history.result?.images) ? history.result.images : [];
  let currentImages = existingImages;
  if (request.body.keep_images !== undefined) {
    const keepList = Array.isArray(request.body.keep_images)
      ? request.body.keep_images
      : typeof request.body.keep_images === "string"
        ? [request.body.keep_images]
        : [];
    currentImages = existingImages.filter(img => keepList.includes(img.file) || keepList.includes(img.url));
  }
  if (currentImages.length + (request.files || []).length !== 3) {
    return response.status(400).json({ message: "Total gambar kegiatan wajib tepat 3." });
  }
  history.result = {
    ...(history.result || {}),
    ...resultDataFromBody(request.body),
    images: [...currentImages, ...activityImagesFromFiles(request.files)].slice(0, 3),
  };
  history.history_updated_at = nowStamp();
  history.updated_at = history.history_updated_at;
  await saveWorkflow(workflow);
  ok(response, { message: "Histori kegiatan diperbarui." });
});



app.get("/api/admin/reports/export", async (request, response) => {
  const selectedMonth = request.query.month || monthKey();
  const type = String(request.query.type || "pengajuan");
  const snapshot = await getAdminSnapshot(selectedMonth);
  const report = buildAdminReport(snapshot, selectedMonth, type);

  const workbook = buildReportExcel(report);
  response.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
  response.setHeader("Content-Disposition", `attachment; filename=report-simodar-${report.type}-${selectedMonth}.xls`);
  response.send(workbook);
});

app.get("/api/admin/staff", async (request, response) => {
  const snapshot = await getAdminSnapshot(request.query.month || monthKey());
  ok(response, { staff: snapshot.staff, roleOptions: snapshot.roleOptions });
});

app.post("/api/admin/staff", async (request, response) => {
  const workflow = await loadWorkflow();
  const timestamp = nowStamp();
  workflow.staff.push({
    id: `ptg-${Date.now()}`,
    name: request.body.name || "Petugas Baru",
    roles: request.body.roles || ["other"],
    absen: request.body.absen || "",
    password: request.body.password || "",
    rekening: request.body.rekening || "",
    created_at: timestamp,
    updated_at: timestamp,
  });
  await saveWorkflow(workflow);
  ok(response, { message: "Petugas baru ditambahkan." });
});

app.put("/api/admin/staff/:id", async (request, response) => {
  const workflow = await loadWorkflow();
  const staff = findRecord(workflow.staff, "id", request.params.id);
  if (!staff) return response.status(404).json({ message: "Petugas tidak ditemukan." });
  Object.assign(staff, {
    name: request.body.name || staff.name,
    roles: request.body.roles || staff.roles,
    absen: request.body.absen || "",
    password: request.body.password || "",
    rekening: request.body.rekening || "",
    updated_at: nowStamp(),
  });
  await saveWorkflow(workflow);
  ok(response, { message: "Data petugas diperbarui." });
});

app.delete("/api/admin/staff/:id", async (request, response) => {
  const workflow = await loadWorkflow();
  removeRecord(workflow.staff, "id", request.params.id);
  await saveWorkflow(workflow);
  ok(response, { message: "Petugas dihapus." });
});

app.get("/api/admin/staff-history", async (request, response) => {
  const snapshot = await getAdminSnapshot(request.query.month || monthKey());
  ok(response, { rows: snapshot.staffHistory, staff: snapshot.staff });
});

app.get("/api/admin/staff-history/export", async (request, response) => {
  const selectedMonth = request.query.month || monthKey();
  const snapshot = await getAdminSnapshot(selectedMonth);
  const workflow = await loadWorkflow();
  
  const excel = buildStaffClaimExcel(snapshot, workflow.claims || {}, selectedMonth);
  response.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
  response.setHeader("Content-Disposition", `attachment; filename=laporan-klaim-petugas-${selectedMonth}.xls`);
  response.send(excel);
});

app.get("/api/admin/claims", async (request, response) => {
  const workflow = await loadWorkflow();
  ok(response, { claims: workflow.claims || {} });
});

app.put("/api/admin/claims", async (request, response) => {
  const workflow = await loadWorkflow();
  workflow.claims = { ...(workflow.claims || {}), ...request.body };
  await saveWorkflow(workflow);
  ok(response, { message: "Data klaim tersimpan." });
});

app.get("/api/admin/locations", async (request, response) => {
  const snapshot = await getAdminSnapshot(request.query.month || monthKey());
  ok(response, { locations: snapshot.locations });
});

app.post("/api/admin/locations", async (request, response) => {
  const workflow = await loadWorkflow();
  const timestamp = nowStamp();
  workflow.locations.push({
    id: `lok-${Date.now()}`,
    name: request.body.name || "Lokasi Baru",
    address: request.body.address || "",
    latitude: request.body.latitude || "",
    longitude: request.body.longitude || "",
    maps_url: request.body.maps_url || "",
    created_at: timestamp,
    updated_at: timestamp,
  });
  await saveWorkflow(workflow);
  ok(response, { message: "Lokasi baru ditambahkan." });
});

app.put("/api/admin/locations/:id", async (request, response) => {
  const workflow = await loadWorkflow();
  let location = findRecord(workflow.locations, "id", request.params.id);
  
  if (!location) {
    // If location was dynamically generated from Pengajuan and not yet in workflow.locations,
    // we create it now and save it permanently.
    location = {
      id: request.params.id,
      created_at: nowStamp(),
    };
    workflow.locations.push(location);
  }

  Object.assign(location, {
    name: request.body.name || location.name,
    address: request.body.address || "",
    latitude: request.body.latitude || "",
    longitude: request.body.longitude || "",
    maps_url: request.body.maps_url || "",
    updated_at: nowStamp(),
  });
  
  await saveWorkflow(workflow);
  ok(response, { message: "Data lokasi diperbarui." });
});

app.delete("/api/admin/locations/:id", async (request, response) => {
  const workflow = await loadWorkflow();
  removeRecord(workflow.locations, "id", request.params.id);
  await saveWorkflow(workflow);
  ok(response, { message: "Lokasi dihapus." });
});

app.get("/api/admin/location-activity", async (request, response) => {
  const snapshot = await getAdminSnapshot(request.query.month || monthKey());
  ok(response, { rows: snapshot.locationActivity });
});

app.get("/api/admin/logistics", async (request, response) => {
  const workflow = await loadWorkflow();
  ok(response, { logistics: workflow.logistics || [] });
});

app.post("/api/admin/logistics", async (request, response) => {
  const workflow = await loadWorkflow();
  if (!workflow.logistics) workflow.logistics = [];
  workflow.logistics.push(request.body.name);
  await saveWorkflow(workflow);
  ok(response, { message: "Item logistik ditambahkan." });
});

app.put("/api/admin/logistics/:index", async (request, response) => {
  const workflow = await loadWorkflow();
  const index = parseInt(request.params.index, 10);
  if (workflow.logistics && workflow.logistics[index] !== undefined) {
    workflow.logistics[index] = request.body.name;
    await saveWorkflow(workflow);
    ok(response, { message: "Item logistik diperbarui." });
  } else {
    response.status(404).json({ message: "Item tidak ditemukan." });
  }
});

app.delete("/api/admin/logistics/:index", async (request, response) => {
  const workflow = await loadWorkflow();
  const index = parseInt(request.params.index, 10);
  if (workflow.logistics && workflow.logistics[index] !== undefined) {
    workflow.logistics.splice(index, 1);
    await saveWorkflow(workflow);
    ok(response, { message: "Item logistik dihapus." });
  } else {
    response.status(404).json({ message: "Item tidak ditemukan." });
  }
});

try {
  await fs.access(frontendDist);
  app.use(express.static(frontendDist));
  app.get("*", (request, response, next) => {
    if (request.path.startsWith("/api")) return next();
    response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.setHeader("Pragma", "no-cache");
    response.setHeader("Expires", "0");
    response.sendFile(path.join(frontendDist, "index.html"));
  });
} catch {
  // Frontend dist is optional during development; Vite serves React on port 5173.
}

app.use((error, request, response, next) => {
  console.error(error);
  if (error.code === "LIMIT_FILE_SIZE") {
    return response.status(400).json({ message: "Ukuran foto terlalu besar. Maksimal 20 MB per gambar." });
  }
  response.status(500).json({ message: "Terjadi kesalahan pada server SIMODAR." });
});

app.listen(port, host, () => {
  const displayHost = host === "0.0.0.0" ? "localhost" : host;
  console.log(`SIMODAR running at http://${displayHost}:${port}`);
});
// Trigger reload comment to verify binding 2.

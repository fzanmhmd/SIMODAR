import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { authRequired, loginUser } from "./auth.js";
import { buildSchedulePdf } from "./utils/pdf.js";
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
} from "./data/store.js";
import { monthKey, nowStamp, sameMonth } from "./utils/date.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const uploadDir = path.join(rootDir, "backend", "uploads", "surat_pengajuan");
const frontendDist = path.join(rootDir, "frontend", "dist");
const app = express();
const port = Number(process.env.PORT || 5001);

await fs.mkdir(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (request, file, callback) => {
      const safe = file.originalname.replace(/[^\w.\-() ]+/g, "_");
      callback(null, `${request.body.kode_pengajuan || Date.now()}-${safe}`);
    },
  }),
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(path.join(rootDir, "backend", "uploads")));

function ok(response, payload = {}) {
  response.json({ ok: true, ...payload });
}

function staffAssignmentsFromBody(body) {
  return (body.staff_assignments || [])
    .filter((row) => row?.name)
    .map((row) => ({ name: String(row.name).trim(), role: String(row.role || "other").trim() }));
}

app.get("/api/health", (request, response) => ok(response, { service: "SIMODAR API", time: nowStamp() }));

app.post("/api/auth/login", async (request, response) => {
  const result = await loginUser(request.body.username, request.body.password);
  if (!result) return response.status(401).json({ message: "Username atau password tidak sesuai." });
  ok(response, result);
});

app.get("/api/auth/me", authRequired(), (request, response) => ok(response, { user: request.user }));

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

app.get("/api/submissions/next-code", async (request, response) => {
  const records = await loadPengajuan();
  ok(response, { code: nextPengajuanCode(records) });
});

app.post("/api/submissions", upload.single("surat_pengajuan"), async (request, response) => {
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
  activity.status = "Siap Kegiatan";
  activity.staff_assignments = staffRows;
  activity.pj_petugas = request.body.pj_petugas || staffRows[0].name;
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
  activity.staff_assignments = staffRows;
  activity.pj_petugas = request.body.pj_petugas || staffRows[0].name;
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

app.get("/api/admin/results", async (request, response) => {
  const snapshot = await getAdminSnapshot(request.query.month || monthKey());
  ok(response, { results: snapshot.results });
});

app.post("/api/admin/results/:code/save", async (request, response) => {
  const workflow = await loadWorkflow();
  const activity = removeRecord(workflow.results, "kode_pengajuan", request.params.code);
  if (!activity) return response.status(404).json({ message: "Data hasil tidak ditemukan." });
  activity.status = "Selesai";
  activity.result = {
    donor_terdaftar: request.body.donor_terdaftar || "0",
    donor_berhasil: request.body.donor_berhasil || "0",
    donor_gagal: request.body.donor_gagal || "0",
    kantong_darah: request.body.kantong_darah || "0",
    snack_terpakai: request.body.snack_terpakai || "0",
    catatan: request.body.catatan || "",
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

app.put("/api/admin/histories/:code/result", async (request, response) => {
  const workflow = await loadWorkflow();
  const history = findRecord(workflow.histories, "kode_pengajuan", request.params.code);
  if (!history) return response.status(404).json({ message: "Histori tidak ditemukan." });
  history.result = { ...(history.result || {}), ...request.body };
  history.history_updated_at = nowStamp();
  history.updated_at = history.history_updated_at;
  await saveWorkflow(workflow);
  ok(response, { message: "Histori kegiatan diperbarui." });
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
  ok(response, { rows: snapshot.staffHistory });
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
    created_at: timestamp,
    updated_at: timestamp,
  });
  await saveWorkflow(workflow);
  ok(response, { message: "Lokasi baru ditambahkan." });
});

app.put("/api/admin/locations/:id", async (request, response) => {
  const workflow = await loadWorkflow();
  const location = findRecord(workflow.locations, "id", request.params.id);
  if (!location) return response.status(404).json({ message: "Lokasi tidak ditemukan." });
  Object.assign(location, {
    name: request.body.name || location.name,
    address: request.body.address || "",
    latitude: request.body.latitude || "",
    longitude: request.body.longitude || "",
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

try {
  await fs.access(frontendDist);
  app.use(express.static(frontendDist));
  app.get("*", (request, response, next) => {
    if (request.path.startsWith("/api")) return next();
    response.sendFile(path.join(frontendDist, "index.html"));
  });
} catch {
  // Frontend dist is optional during development; Vite serves React on port 5173.
}

app.use((error, request, response, next) => {
  console.error(error);
  response.status(500).json({ message: "Terjadi kesalahan pada server SIMODAR." });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`SIMODAR API running at http://127.0.0.1:${port}`);
});

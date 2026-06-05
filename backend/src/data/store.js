import {
  loadPengajuanFile,
  loadWorkflowFile,
  savePengajuanFile,
  saveWorkflowFile,
} from "./fileStore.js";
import {
  loadPengajuanMysql,
  loadWorkflowMysql,
  mysqlEnabled,
  savePengajuanMysql,
  saveWorkflowMysql,
} from "./mysqlStore.js";
import { defaultWorkflow, staffRoleOptions } from "./defaults.js";
import { monthKey, nowStamp, sameMonth } from "../utils/date.js";

export async function loadPengajuan() {
  return mysqlEnabled() ? loadPengajuanMysql() : loadPengajuanFile();
}

export async function savePengajuan(records) {
  return mysqlEnabled() ? savePengajuanMysql(records) : savePengajuanFile(records);
}

export async function loadWorkflow() {
  const defaults = defaultWorkflow();
  const workflow = mysqlEnabled() ? await loadWorkflowMysql() : await loadWorkflowFile();
  const normalized = { ...defaults, ...workflow };

  normalized.staff = (normalized.staff || defaults.staff).map((staff) => ({
    rekening: "",
    created_at: "",
    updated_at: "",
    ...staff,
  }));
  normalized.locations = (normalized.locations || defaults.locations).map((location) => ({
    latitude: "",
    longitude: "",
    created_at: "",
    updated_at: "",
    ...location,
  }));

  return normalized;
}

export async function saveWorkflow(workflow) {
  return mysqlEnabled() ? saveWorkflowMysql(workflow) : saveWorkflowFile(workflow);
}

export function nextPengajuanCode(records = [], date = new Date()) {
  const prefix = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
  const lastSequence = records.reduce((highest, record) => {
    const code = String(record.kode_pengajuan || "");
    if (!code.startsWith(prefix) || !/^\d{10}$/.test(code)) return highest;
    return Math.max(highest, Number(code.slice(-4)));
  }, 0);

  return `${prefix}${String(lastSequence + 1).padStart(4, "0")}`;
}

export function findRecord(rows, key, value) {
  return rows.find((row) => row?.[key] === value);
}

export function removeRecord(rows, key, value) {
  const index = rows.findIndex((row) => row?.[key] === value);
  if (index < 0) return null;
  const [record] = rows.splice(index, 1);
  return record;
}

export function workflowCodes(workflow) {
  return new Set(
    ["assignments", "schedules", "results", "histories"]
      .flatMap((key) => workflow[key] || [])
      .map((item) => item.kode_pengajuan)
      .filter(Boolean),
  );
}

export function activityFromPengajuan(record) {
  const timestamp = record.updated_at || record.created_at || nowStamp();
  return {
    kode_pengajuan: record.kode_pengajuan || "",
    tanggal_pengajuan: record.created_at || "",
    instansi: record.instansi || "-",
    lokasi: record.lokasi || "-",
    tanggal: record.tanggal || "",
    jam_mulai: record.jam_mulai || "",
    jam_selesai: record.jam_selesai || "",
    peserta: record.peserta || "0",
    nama_pic: record.nama_pic || "-",
    whatsapp_pic: record.whatsapp_pic || "-",
    email_pic: record.email_pic || "-",
    latitude: record.latitude || "",
    longitude: record.longitude || "",
    logistik: record.logistik || [],
    surat_pengajuan: record.surat_pengajuan || "",
    surat_file: record.surat_file || "",
    created_at: record.created_at || timestamp,
    updated_at: timestamp,
    staff_assignments: [],
    pj_petugas: "",
    status: "Menunggu Penugasan",
  };
}

export async function updatePengajuanStatus(code, status, deskripsi) {
  const records = await loadPengajuan();
  const timestamp = nowStamp();
  const record = findRecord(records, "kode_pengajuan", code);
  if (record) {
    record.status = status;
    record.updated_at = timestamp;
    if (deskripsi) record.deskripsi = deskripsi;
    await savePengajuan(records);
  }
}

export function pendingPengajuan(records, workflow) {
  const blocked = workflowCodes(workflow);
  return records
    .filter((record) => {
      if (blocked.has(record.kode_pengajuan)) return false;
      return ["Menunggu Verifikasi", "Dalam Peninjauan"].includes(record.status);
    })
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
}

export async function syncWorkflowFromPengajuan() {
  const records = await loadPengajuan();
  const workflow = await loadWorkflow();
  const existingCodes = workflowCodes(workflow);
  let changed = false;

  for (const record of records) {
    if (!record.kode_pengajuan || existingCodes.has(record.kode_pengajuan)) continue;
    if (String(record.status || "").startsWith("Disetujui")) {
      workflow.assignments.push(activityFromPengajuan(record));
      existingCodes.add(record.kode_pengajuan);
      changed = true;
    }
  }

  if (changed) await saveWorkflow(workflow);
  return { records, workflow: changed ? await loadWorkflow() : workflow };
}

export function historyStatusCounts(rows) {
  return rows.reduce(
    (counts, row) => {
      counts.total += 1;
      const status = String(row.status || "").toLowerCase();
      if (status === "selesai") counts.selesai += 1;
      if (status === "batal") counts.batal += 1;
      if (status === "ditolak") counts.ditolak += 1;
      return counts;
    },
    { total: 0, selesai: 0, batal: 0, ditolak: 0 },
  );
}

export function staffHistoryRows(workflow, selectedMonth) {
  const activities = [...(workflow.schedules || []), ...(workflow.results || []), ...(workflow.histories || [])];
  return (workflow.staff || []).map((staff) => {
    const places = activities
      .filter((activity) => sameMonth(activity.tanggal, selectedMonth))
      .flatMap((activity) => {
        const assignments = (activity.staff_assignments || []).filter((row) => row.name === staff.name);
        return assignments.map((assignment) => ({
          kode: activity.kode_pengajuan,
          lokasi: activity.instansi,
          tanggal: activity.tanggal,
          jam_mulai: activity.jam_mulai || "",
          jam_selesai: activity.jam_selesai || "",
          status: activity.status || "-",
          fungsi: assignment.role || "-",
          updated_at:
            activity.history_updated_at ||
            activity.updated_at ||
            activity.completed_at ||
            activity.finished_at ||
            activity.assigned_at ||
            activity.approved_at ||
            activity.created_at ||
            "",
        }));
      });
    return { staff, places, total: places.length };
  });
}

export function locationActivityRows(workflow, selectedMonth) {
  const grouped = {};
  for (const history of workflow.histories || []) {
    if (!sameMonth(history.tanggal, selectedMonth)) continue;
    const name = history.instansi || "-";
    grouped[name] ||= {
      name,
      address: history.lokasi || "-",
      events: [],
      total: 0,
      selesai: 0,
      batal: 0,
      ditolak: 0,
    };
    grouped[name].events.push(history);
    Object.assign(grouped[name], historyStatusCounts(grouped[name].events));
  }
  return Object.values(grouped).sort((a, b) => b.total - a.total);
}

export async function getAdminSnapshot(selectedMonth = monthKey()) {
  const { records, workflow } = await syncWorkflowFromPengajuan();
  const approvals = pendingPengajuan(records, workflow);
  const histories = (workflow.histories || []).filter((row) => sameMonth(row.tanggal || row.completed_at, selectedMonth));
  const today = new Date().toISOString().slice(0, 10);

  const knownLocations = new Map((workflow.locations || []).map((location) => [String(location.name).toLowerCase(), location]));
  for (const record of records) {
    const key = String(record.instansi || "").toLowerCase();
    if (key && !knownLocations.has(key)) {
      knownLocations.set(key, {
        id: `lok-${record.kode_pengajuan}`,
        name: record.instansi,
        address: record.lokasi,
        latitude: record.latitude,
        longitude: record.longitude,
        created_at: record.created_at,
        updated_at: record.updated_at || record.created_at,
      });
    }
  }

  return {
    cards: [
      { key: "approvals", label: "Pengajuan Masuk", value: approvals.length, href: "/admin/approval-pengajuan" },
      { key: "assignments", label: "Penugasan Petugas", value: workflow.assignments.length, href: "/admin/penugasan-petugas" },
      { key: "schedules", label: "Siap Kegiatan", value: workflow.schedules.length, href: "/admin/jadwal-kegiatan" },
      { key: "results", label: "Hasil Kegiatan", value: workflow.results.length, href: "/admin/hasil-kegiatan" },
    ],
    approvals,
    assignments: workflow.assignments || [],
    schedules: workflow.schedules || [],
    results: workflow.results || [],
    histories,
    allHistories: workflow.histories || [],
    historyCounts: historyStatusCounts(histories),
    todayRunning: (workflow.schedules || []).filter((row) => row.tanggal === today),
    staff: workflow.staff || [],
    staffHistory: staffHistoryRows(workflow, selectedMonth),
    locations: Array.from(knownLocations.values()),
    locationActivity: locationActivityRows(workflow, selectedMonth),
    roleOptions: staffRoleOptions,
  };
}

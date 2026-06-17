export const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export const monthNames = [
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
];

const appTimeZone = process.env.SIMODAR_TIME_ZONE || "Asia/Jakarta";

function zonedParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: appTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  });
  return Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
}

export function nowStamp(date = new Date()) {
  const parts = zonedParts(date);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

export function dateKey(date = new Date()) {
  const parts = zonedParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function timeToMinutes(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function scheduleRuntimeStatus(row, date = new Date()) {
  if (!row || row.tanggal !== dateKey(date)) return row?.status || "Siap Kegiatan";
  const start = timeToMinutes(row.jam_mulai);
  if (start === null) return "Terjadwal Hari Ini";

  const parts = zonedParts(date);
  const nowMinutes = Number(parts.hour) * 60 + Number(parts.minute);
  if (nowMinutes < start) return "Persiapan";
  return "On Going";
}

export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  const normalized = String(value).replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value) {
  const date = parseDate(value);
  if (!date) return value || "-";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export function formatLongDate(value) {
  const date = parseDate(value);
  if (!date) return value || "-";
  return `${dayNames[date.getDay()]}, ${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatTime(value) {
  const date = parseDate(value);
  if (!date) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}

export function formatDateTime(value = new Date()) {
  const date = parseDate(value);
  if (!date) return value || "-";
  return `${dayNames[date.getDay()]}, ${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}, ${formatTime(date)}`;
}

export function monthKey(value = new Date()) {
  if (value instanceof Date) {
    const parts = zonedParts(value);
    return `${parts.year}-${parts.month}`;
  }
  const date = parseDate(value) || new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(value) {
  const [year, month] = String(value || monthKey()).split("-");
  return `${monthNames[Number(month) - 1] || ""} ${year}`.trim();
}

export function sameMonth(value, selectedMonth) {
  const date = parseDate(value);
  if (!date) return false;
  return monthKey(date) === selectedMonth;
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 11) return "SELAMAT PAGI";
  if (hour < 15) return "SELAMAT SIANG";
  if (hour < 18) return "SELAMAT SORE";
  return "SELAMAT MALAM";
}

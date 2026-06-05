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

export function nowStamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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

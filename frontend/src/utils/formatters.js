export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatDate(value) {
  if (!value) return "-";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export function formatClock(value) {
  if (!value) return "";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return String(value).slice(11, 19);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}

export function formatDateTime(value) {
  if (!value) return "-";
  const clock = formatClock(value);
  return `${formatDate(value)}${clock ? `, ${clock}` : ""}`;
}

export function formatMonthLabel(value) {
  if (!value) return "-";
  const date = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export function formatLongDate(value) {
  if (!value) return "-";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function activityDateText(row) {
  const date = formatDate(row?.tanggal);
  const time = [row?.jam_mulai, row?.jam_selesai].filter(Boolean).join(" - ");
  return time ? `${date}, ${time}` : date;
}

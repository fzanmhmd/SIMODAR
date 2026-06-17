import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  LayoutDashboard,
  MapPin,
  UserRound,
  UsersRound,
} from "lucide-react";

export const adminMenus = [
  { title: "Dashboard", items: [{ path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "Kegiatan",
    items: [
      { path: "/admin/approval-pengajuan", label: "Approval Pengajuan", icon: FileCheck2 },
      { path: "/admin/penugasan-petugas", label: "Penugasan Petugas", icon: UsersRound },
      { path: "/admin/jadwal-kegiatan", label: "Jadwal Kegiatan", icon: CalendarDays },
      { path: "/admin/hasil-kegiatan", label: "Hasil Kegiatan", icon: CheckCircle2 },
      { path: "/admin/histori-kegiatan", label: "Histori Kegiatan", icon: Clock3 },
    ],
  },
  {
    title: "Master Petugas",
    items: [
      { path: "/admin/data-petugas", label: "Data Petugas", icon: UserRound },
      { path: "/admin/histori-petugas", label: "Histori Petugas", icon: Activity },
    ],
  },
  {
    title: "Master Lokasi",
    items: [
      { path: "/admin/data-lokasi", label: "Data Lokasi", icon: MapPin },
      { path: "/admin/kegiatan-lokasi", label: "Kegiatan Lokasi", icon: CalendarDays },
      { path: "/admin/master-logistik", label: "Master Logistik", icon: FileCheck2 },
    ],
  },
  { title: "Report", items: [{ path: "/admin/report", label: "Report Rekap", icon: Download }] },
  { title: "Akun", items: [{ path: "/admin/profil", label: "Profil Akun", icon: UserRound }] },
];

export const roleOptions = ["dokter", "hb", "aftap", "admin", "driver", "other"];

export function splitPjNames(value) {
  if (Array.isArray(value)) return value.map((name) => String(name).trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

export function clientRowId(prefix = "row") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function parseLocalDate(value) {
  if (!value) return null;
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function daysUntilDate(value) {
  const date = parseLocalDate(value);
  if (!date) return null;
  const day = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(date) - startOfDay(new Date())) / day);
}

export function hoursSinceDate(value) {
  const date = parseLocalDate(value);
  if (!date) return null;
  return (Date.now() - date.getTime()) / (60 * 60 * 1000);
}

export function assignmentQueueAlert(row) {
  const daysToActivity = daysUntilDate(row?.tanggal);
  if (daysToActivity !== null && daysToActivity <= -1) {
    return { label: "Terlewatkan", tone: "red", overdue: true };
  }
  if (daysToActivity !== null && daysToActivity >= 0 && daysToActivity <= 3) {
    return { label: "Segera Jadwalkan", tone: "yellow", overdue: false };
  }
  const accAgeHours = hoursSinceDate(row?.approved_at || row?.updated_at);
  if (accAgeHours !== null && accAgeHours >= 0 && accAgeHours <= 24) {
    return { label: "Baru", tone: "green", overdue: false };
  }
  return null;
}

export function validCoordinate(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

export function googleMapsUrl(row) {
  const savedLink = row?.maps_url || row?.google_maps_url || row?.map_url;
  if (savedLink) return savedLink;
  const latitude = validCoordinate(row?.latitude);
  const longitude = validCoordinate(row?.longitude);
  if (latitude !== null && longitude !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }
  const query = [row?.instansi, row?.lokasi].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || "lokasi donor darah")}`;
}

export async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

export async function shareScheduleMaps(row, toast) {
  const url = googleMapsUrl(row);
  const title = `Lokasi ${row.instansi || "kegiatan SIMODAR"}`;
  const text = `Lokasi kegiatan donor: ${row.instansi || "-"} - ${row.lokasi || "-"}`;
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return;
    }
    await copyText(url);
    toast("Link Google Maps disalin.");
  } catch (error) {
    if (error?.name === "AbortError") return;
    window.open(url, "_blank", "noopener,noreferrer");
    toast("Google Maps dibuka.");
  }
}

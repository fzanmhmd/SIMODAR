
import { formatDateTime, formatLongDate } from "./date.js";

function text(value) {
  return String(value ?? "-");
}

function escapeHtml(value) {
  return text(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function excelTable(title, columns, rows) {
  return `
    <h2>${escapeHtml(title)}</h2>
    <table border="1">
      <thead>
        <tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows.length ? rows.map((row) => `
          <tr>
            ${columns.map((column) => `<td>${escapeHtml(row[column.key])}</td>`).join("")}
          </tr>
        `).join("") : `<tr><td colspan="${columns.length}">Tidak ada data</td></tr>`}
      </tbody>
    </table>
  `;
}

export function buildReportExcel(report) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8" />
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>Report</x:Name>
            <x:WorksheetOptions>
              <x:DisplayGridlines/>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <style>
      body { font-family: Arial, sans-serif; color: #111827; }
      h1 { color: #ba121b; }
      h2 { margin-top: 24px; color: #7f1d1d; }
      table { border-collapse: collapse; width: 100%; margin-top: 8px; border: 1px solid #ccc; }
      th { background: #ba121b; color: #ffffff; font-weight: 700; border: 1px solid #ccc; }
      th, td { padding: 8px; vertical-align: top; border: 1px solid #ccc; }
      .summary td:first-child { font-weight: 700; background: #fff7f7; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(report.type_label)}</h1>
    <p>Periode: ${escapeHtml(report.month_label)}</p>
    <p>Dicetak: ${escapeHtml(formatDateTime(new Date()))}</p>
    <h2>Ringkasan</h2>
    <table border="1" class="summary">
      <tbody>
        ${report.cards.map((card) => `<tr><td>${escapeHtml(card.label)}</td><td>${escapeHtml(card.value)}</td></tr>`).join("")}
      </tbody>
    </table>
    ${excelTable(`Detail ${report.type_label}`, report.columns, report.rows)}
  </body>
  </html>`;

  return Buffer.from(html, "utf8");
}

function columnWeight(key) {
  if (key === "instansi" || key === "alamat" || key === "petugas" || key === "keterangan") return 1.55;
  if (key.includes("tanggal")) return 1.15;
  if (key === "kode_pengajuan" || key === "status" || key === "waktu") return 0.9;
  return 0.78;
}




function extractProvince(address, instansi = "") {
  const combined = `${address || ""} ${instansi || ""}`.toLowerCase();
  if (!combined.trim() || combined === "- -") return "-";
  
  if (combined.match(/\b(jakarta|jkt|dki|istiqlal|monas)\b/)) return "Jakarta";
  if (combined.match(/\b(banten|tangerang|tangsel)\b/)) return "Banten";
  if (combined.match(/\b(jawa barat|jabar|bogor|depok|bekasi|bandung|cikarang|karawang)\b/)) return "Jawa Barat";
  
  return "-";
}

export function buildStaffClaimExcel(snapshot, claims, selectedMonth) {
  const rows = [];
  for (const history of snapshot.histories || []) {
    if (!history.staff_assignments || !history.staff_assignments.length) continue;

    const staffNames = [];
    const roles = [];
    const claimNames = [];

    for (const assignment of history.staff_assignments) {
      staffNames.push(escapeHtml(assignment.name || "-"));
      roles.push(escapeHtml(assignment.role || "-"));
      claimNames.push(escapeHtml(claims[`${history.kode_pengajuan}-${assignment.role}`] || "-"));
    }

    rows.push({
      tanggal: formatLongDate(history.tanggal) || "-",
      lokasi: history.instansi || "-",
      status: extractProvince(history.lokasi, history.instansi),
      staffNames: staffNames.join("<br>"),
      roles: roles.join("<br>"),
      claims: claimNames.join("<br>"),
    });
  }

  rows.sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)));

  const columns = [
    { label: "No", key: "no" },
    { label: "Lokasi", key: "lokasi" },
    { label: "Status Klaim", key: "status" },
    { label: "Tanggal Kegiatan", key: "tanggal" },
    { label: "Nama Petugas", key: "staffNames" },
    { label: "Fungsi/Role", key: "roles" },
    { label: "Klaim (Atas Nama)", key: "claims" },
  ];

  let tbody = "";
  if (!rows.length) {
    tbody = `<tr><td colspan="7">Belum ada data tugas/kegiatan di bulan ini.</td></tr>`;
  } else {
    tbody = rows.map((row, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(row.lokasi)}</td>
        <td>${escapeHtml(row.status)}</td>
        <td>${escapeHtml(row.tanggal)}</td>
        <td>${row.staffNames}</td>
        <td>${row.roles}</td>
        <td>${row.claims}</td>
      </tr>
    `).join("");
  }

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8" />
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>Klaim_Petugas</x:Name>
            <x:WorksheetOptions>
              <x:DisplayGridlines/>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <style>
      body { font-family: Arial, sans-serif; color: #111827; }
      h1 { color: #ba121b; }
      h2 { margin-top: 24px; color: #7f1d1d; }
      table { border-collapse: collapse; width: 100%; margin-top: 8px; border: 1px solid #ccc; }
      th { background: #ba121b; color: #ffffff; font-weight: 700; border: 1px solid #ccc; }
      th, td { padding: 8px; vertical-align: top; border: 1px solid #ccc; }
    </style>
  </head>
  <body>
    <h1>Laporan Klaim & Pembayaran Petugas</h1>
    <p>Periode: ${escapeHtml(snapshot.monthLabel || selectedMonth)}</p>
    <p>Dicetak: ${escapeHtml(formatDateTime(new Date()))}</p>
    <table border="1">
      <thead>
        <tr>${columns.map((col) => `<th>${escapeHtml(col.label)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${tbody}
      </tbody>
    </table>
  </body>
  </html>`;

  return Buffer.from(html, "utf8");
}


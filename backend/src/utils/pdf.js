import PDFDocument from "pdfkit";
import { formatDate, formatDateTime } from "./date.js";

export function buildSchedulePdf(schedule) {
  const doc = new PDFDocument({ size: "A4", margin: 42 });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  doc
    .roundedRect(42, 42, 511, 82, 12)
    .fill("#ba121b")
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(24)
    .text("SIMODAR", 62, 60)
    .font("Helvetica")
    .fontSize(11)
    .text("Jadwal Mobile Unit Donor Darah", 62, 91);

  doc
    .fillColor("#1f2937")
    .font("Helvetica-Bold")
    .fontSize(15)
    .text(schedule.instansi || "-", 42, 154)
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#64748b")
    .text(schedule.lokasi || "-", 42, 178, { width: 420 });

  const details = [
    ["Kode Pengajuan", schedule.kode_pengajuan],
    ["Tanggal", formatDate(schedule.tanggal)],
    ["Waktu", `${schedule.jam_mulai || "-"} - ${schedule.jam_selesai || "-"}`],
    ["Estimasi Peserta", `${schedule.peserta || 0} donor`],
    ["PIC", `${schedule.nama_pic || "-"} | ${schedule.whatsapp_pic || "-"}`],
    ["Email PIC", schedule.email_pic || "-"],
    ["PJ Petugas", schedule.pj_petugas || "-"],
  ];

  let y = 230;
  for (const [label, value] of details) {
    doc
      .roundedRect(42, y, 511, 32, 8)
      .fill("#fff7f7")
      .fillColor("#7f1d1d")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(label, 58, y + 10)
      .fillColor("#111827")
      .font("Helvetica")
      .text(String(value || "-"), 190, y + 10, { width: 330 });
    y += 39;
  }

  y += 14;
  doc.fillColor("#ba121b").font("Helvetica-Bold").fontSize(13).text("Daftar Petugas", 42, y);
  y += 24;
  doc.roundedRect(42, y, 511, 28, 7).fill("#ba121b");
  doc.fillColor("#ffffff").fontSize(9).text("No", 58, y + 10).text("Nama Petugas", 100, y + 10).text("Fungsi", 420, y + 10);
  y += 30;

  const staffRows = schedule.staff_assignments?.length ? schedule.staff_assignments : [{ name: "Belum ada petugas", role: "-" }];
  staffRows.forEach((staff, index) => {
    doc.roundedRect(42, y, 511, 27, 5).fill(index % 2 ? "#ffffff" : "#fffafa");
    doc
      .fillColor("#111827")
      .font("Helvetica")
      .fontSize(9)
      .text(String(index + 1), 58, y + 9)
      .text(staff.name || "-", 100, y + 9)
      .font("Helvetica-Bold")
      .fillColor("#7f1d1d")
      .text(String(staff.role || "-").toUpperCase(), 420, y + 9);
    y += 29;
  });

  doc
    .moveTo(42, 780)
    .lineTo(553, 780)
    .strokeColor("#fecdd3")
    .stroke()
    .fillColor("#64748b")
    .font("Helvetica")
    .fontSize(8)
    .text(`Dicetak: ${formatDateTime(new Date())}`, 42, 792)
    .text("Dokumen ini dibuat otomatis oleh SIMODAR.", 42, 806);

  doc.end();
  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

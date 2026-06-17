import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { formatDate, formatDateTime, formatLongDate } from "./date.js";

export function buildSchedulePdf(schedule) {
  const doc = new PDFDocument({ size: "A4", margin: 42 });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  // Header
  doc
    .roundedRect(42, 42, 511, 74, 10)
    .fill("#ba121b")
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(22)
    .text("SIMODAR", 62, 56)
    .font("Helvetica")
    .fontSize(11)
    .text("Jadwal Mobile Unit Donor Darah", 62, 85);

  // Instansi & Lokasi
  doc
    .fillColor("#1f2937")
    .font("Helvetica-Bold")
    .fontSize(15)
    .text(schedule.instansi || "-", 42, 140)
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#64748b")
    .text(schedule.lokasi || "-", 42, 160, { width: 450 });

  const details = [
    ["Kode Pengajuan", schedule.kode_pengajuan],
    ["Tanggal", formatLongDate(schedule.tanggal)],
    ["Waktu", `${schedule.jam_mulai || "-"} - ${schedule.jam_selesai || "-"}`],
    ["Estimasi Pendonor", `${schedule.peserta || 0} pendonor`],
    ["Nama PIC", schedule.nama_pic || "-"],
    ["No. Telepon / WA", schedule.whatsapp_pic || "-"],
  ];

  let y = 195;
  for (const [label, value] of details) {
    doc
      .roundedRect(42, y, 511, 24, 6)
      .fill("#fff7f7")
      .fillColor("#7f1d1d")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(label.toUpperCase(), 54, y + 7)
      .fillColor("#111827")
      .font("Helvetica")
      .text(String(value || "-"), 180, y + 7, { width: 330 });
    y += 28;
  }

  y += 10;
  doc.fillColor("#ba121b").font("Helvetica-Bold").fontSize(12).text("Petugas Mobile Unit", 42, y);
  y += 20;

  // Table Header
  doc.roundedRect(42, y, 511, 22, 6).fill("#ba121b");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9)
     .text("NO", 54, y + 6)
     .text("NAMA PETUGAS", 100, y + 6)
     .text("FUNGSI / PERAN", 400, y + 6);
  y += 24;

  const staffRows = schedule.staff_assignments?.length ? schedule.staff_assignments : [{ name: "Belum ada petugas ditugaskan", role: "-" }];
  staffRows.forEach((staff, index) => {
    doc.roundedRect(42, y, 511, 20, 4).fill(index % 2 ? "#ffffff" : "#fffafa");
    
    const roleText = `${String(staff.role || "-").toUpperCase()}${staff.is_pj ? "  (PJ)" : ""}`;
    
    doc
      .fillColor("#111827")
      .font("Helvetica")
      .fontSize(9)
      .text(String(index + 1), 54, y + 5)
      .font("Helvetica-Bold")
      .text(staff.name || "-", 100, y + 5)
      .fillColor("#7f1d1d")
      .text(roleText, 400, y + 5);
    y += 22;
  });

  // Footer (Dynamic relative to Y to avoid pushing to second page)
  const bottomY = y + 25;
  doc
    .moveTo(42, bottomY)
    .lineTo(553, bottomY)
    .strokeColor("#e2e8f0")
    .lineWidth(1)
    .stroke()
    .fillColor("#94a3b8")
    .font("Helvetica")
    .fontSize(8)
    .text(`Dicetak pada: ${formatDateTime(new Date())}`, 42, bottomY + 10)
    .text("Dokumen ini digenerate secara otomatis oleh sistem SIMODAR.", 42, bottomY + 22);

  doc.end();
  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

export function buildActivityResultPdf(activity, imageDir) {
  const doc = new PDFDocument({ size: "A4", margin: 42 });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  // Header
  doc
    .roundedRect(42, 42, 511, 74, 10)
    .fill("#ba121b")
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .fontSize(22)
    .text("SIMODAR", 62, 56)
    .font("Helvetica")
    .fontSize(11)
    .text("Laporan Hasil Kegiatan Mobile Unit", 62, 85);

  // Instansi & Lokasi
  doc
    .fillColor("#1f2937")
    .font("Helvetica-Bold")
    .fontSize(15)
    .text(activity.instansi || "-", 42, 140)
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#64748b")
    .text(activity.lokasi || "-", 42, 160, { width: 450 });

  const statusMap = { selesai: "Selesai", batal: "Dibatalkan", ditolak: "Ditolak" };
  const statusLabel = statusMap[String(activity.status || "").toLowerCase()] || activity.status || "-";

  const details = [
    ["Kode Pengajuan", activity.kode_pengajuan],
    ["Tanggal", formatLongDate(activity.tanggal)],
    ["Waktu", `${activity.jam_mulai || "-"} - ${activity.jam_selesai || "-"}`],
    ["Status Kegiatan", statusLabel],
    ["Nama PIC", activity.nama_pic || "-"],
    ["No. Telepon / WA", activity.whatsapp_pic || "-"],
  ];

  let y = 195;
  for (const [label, value] of details) {
    doc
      .roundedRect(42, y, 511, 24, 6)
      .fill("#fff7f7")
      .fillColor("#7f1d1d")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(label.toUpperCase(), 54, y + 7)
      .fillColor("#111827")
      .font("Helvetica")
      .text(String(value || "-"), 180, y + 7, { width: 330 });
    y += 28;
  }

  y += 10;
  doc.fillColor("#ba121b").font("Helvetica-Bold").fontSize(12).text("Hasil Pencapaian", 42, y);
  y += 20;

  const resultCards = [
    { label: "Donor Terdaftar", value: activity.result?.donor_terdaftar || "0" },
    { label: "Donor Berhasil", value: activity.result?.donor_berhasil || "0" },
    { label: "Ditangguhkan", value: activity.result?.donor_gagal || "0" },
    { label: "Kantong Darah", value: activity.result?.kantong_darah || "0" },
  ];

  const cardWidth = 120;
  resultCards.forEach((card, index) => {
    const x = 42 + index * (cardWidth + 10);
    doc.roundedRect(x, y, cardWidth, 42, 6).fill("#f8fafc");
    doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(8).text(card.label.toUpperCase(), x + 10, y + 10);
    doc.fillColor("#111827").font("Helvetica-Bold").fontSize(14).text(card.value, x + 10, y + 22);
  });

  y += 56;
  doc.fillColor("#ba121b").font("Helvetica-Bold").fontSize(12).text("Dokumentasi Kegiatan", 42, y);
  y += 20;

  if (activity.result?.images?.length) {
    const imgWidth = 164;
    const imgHeight = 110;
    activity.result.images.forEach((img, index) => {
      if (index >= 3) return; // Max 3 images
      const imgPath = path.join(imageDir, img.file);
      const x = 42 + index * (imgWidth + 9);
      if (fs.existsSync(imgPath)) {
        try {
          doc.image(imgPath, x, y, { fit: [imgWidth, imgHeight], align: "center", valign: "center" });
          doc.rect(x, y, imgWidth, imgHeight).strokeColor("#e2e8f0").lineWidth(1).stroke();
        } catch (error) {
          doc.roundedRect(x, y, imgWidth, imgHeight, 6).fill("#f1f5f9");
          doc.fillColor("#94a3b8").font("Helvetica").fontSize(10).text("Gambar tidak valid", x, y + 45, { width: imgWidth, align: "center" });
        }
      } else {
        doc.roundedRect(x, y, imgWidth, imgHeight, 6).fill("#f1f5f9");
        doc.fillColor("#94a3b8").font("Helvetica").fontSize(10).text("File tidak ditemukan", x, y + 45, { width: imgWidth, align: "center" });
      }
    });
    y += imgHeight + 20;
  } else {
    doc.fillColor("#64748b").font("Helvetica").fontSize(10).text("Tidak ada foto dokumentasi yang diupload.", 42, y);
    y += 24;
  }

  const bottomY = Math.max(y + 10, 770);
  doc
    .moveTo(42, bottomY)
    .lineTo(553, bottomY)
    .strokeColor("#e2e8f0")
    .lineWidth(1)
    .stroke()
    .fillColor("#94a3b8")
    .font("Helvetica")
    .fontSize(8)
    .text(`Dicetak pada: ${formatDateTime(new Date())}`, 42, bottomY + 10)
    .text("Dokumen ini digenerate secara otomatis oleh sistem SIMODAR.", 42, bottomY + 22);

  doc.end();
  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

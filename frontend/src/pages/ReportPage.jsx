import { useState } from "react";
import { FileSpreadsheet, Users } from "lucide-react";
import { downloadFile } from "../api.js";
import { PageHeader, MonthFilter } from "../components/PageHeader.jsx";
import { monthKey } from "../utils/formatters.js";

export default function ReportPage({ toast }) {
  const [month, setMonth] = useState(monthKey());

  return (
    <>
      <PageHeader eyebrow="Report" title="Pusat Unduhan Laporan" subtitle="Unduh laporan rekapitulasi pengajuan, penugasan, dan pembayaran petugas.">
        <MonthFilter month={month} setMonth={setMonth} />
      </PageHeader>
      
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <button 
          type="button" 
          onClick={() => downloadFile(`/admin/reports/export?format=excel&month=${month}&type=histories`, `rekap-simodar-${month}.xls`)} 
          className="group flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
        >
          <div className="rounded-2xl bg-emerald-100 p-5 text-emerald-600 transition-transform group-hover:scale-110">
            <FileSpreadsheet size={48} strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-800">Rekap Kegiatan (Excel)</h3>
            <p className="mt-2 text-sm text-slate-500">Unduh data tabel rekapitulasi seluruh kegiatan dalam format spreadsheet (Excel).</p>
          </div>
        </button>

        <button 
          type="button" 
          onClick={() => downloadFile(`/admin/staff-history/export?month=${month}`, `laporan-klaim-petugas-${month}.xls`)} 
          className="group flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-500 hover:bg-blue-50 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20"
        >
          <div className="rounded-2xl bg-blue-100 p-5 text-blue-600 transition-transform group-hover:scale-110">
            <Users size={48} strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-800">Klaim Petugas (Excel)</h3>
            <p className="mt-2 text-sm text-slate-500">Unduh dokumen Excel rincian gaji, pembayaran, dan peran petugas di tiap lokasi.</p>
          </div>
        </button>
      </div>
    </>
  );
}

import { useState } from "react";
import { DataTable } from "../components/DataTable.jsx";
import { PageHeader, MonthFilter } from "../components/PageHeader.jsx";
import { LoadingPanel } from "../components/AdminLayout.jsx";
import { useApiData } from "../hooks/useApiData.js";
import { monthKey, formatDate, formatDateTime } from "../utils/formatters.js";
import { latestUpdate } from "../components/DateDisplay.jsx";
import { StatusBadge, Modal } from "../components/ui.jsx";

export default function LocationActivityPage() {
  const [month, setMonth] = useState(monthKey());
  const [activeRow, setActiveRow] = useState(null);
  const { data, loading } = useApiData(`/admin/location-activity?month=${month}`, [month]);

  if (loading) return <LoadingPanel />;
  return (
    <>
      <PageHeader eyebrow="Master Lokasi" title="Kegiatan Lokasi" subtitle="Rekap lokasi berdasarkan histori kegiatan per bulan."><MonthFilter month={month} setMonth={setMonth} /></PageHeader>
      <DataTable rows={data.rows || []} empty="Belum ada kegiatan lokasi." columns={[
        { key: "name", label: "Lokasi", render: (row) => <strong className="font-black text-[14px] text-slate-900 whitespace-nowrap">{row.name}</strong> },
        { key: "address", label: "Alamat", render: (row) => <span className="block text-[10px] font-medium text-slate-400 leading-relaxed max-w-sm">{row.address}</span> },
        { key: "total", label: "Total" },
        { key: "selesai", label: "Selesai" },
        { key: "batal", label: "Batal" },
        { key: "ditolak", label: "Ditolak" },
        {
          key: "events",
          label: "Tanggal Kegiatan",
          render: (row) => row.events?.length ? (
            <button 
              type="button" 
              onClick={() => setActiveRow(row)}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-extrabold text-blue-600 transition hover:bg-blue-100 whitespace-nowrap"
            >
              Lihat Histori
            </button>
          ) : "-",
        },
      ]} />
      
      <Modal
        open={Boolean(activeRow)}
        onClose={() => setActiveRow(null)}
        title={`Histori Kegiatan: ${activeRow?.name}`}
        description={`Menampilkan histori status kegiatan untuk lokasi ini.`}
      >
        <div className="grid gap-3">
          {activeRow?.events?.map((event) => (
            <div key={event.kode_pengajuan} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-200 p-4 shadow-sm bg-white">
              <div>
                <p className="text-sm font-extrabold text-slate-800">{formatDate(event.tanggal)}</p>
                <p className="mt-1 text-[11px] font-medium text-slate-500">
                  Update: {formatDateTime(latestUpdate(event))}
                </p>
              </div>
              <div>
                <StatusBadge>{event.status}</StatusBadge>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}

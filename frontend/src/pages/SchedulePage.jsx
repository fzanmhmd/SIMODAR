import { useState } from "react";
import { Download, MapPin } from "lucide-react";
import { api, downloadFile } from "../api.js";
import { Button } from "../components/ui.jsx";
import { DataTable } from "../components/DataTable.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { LoadingPanel } from "../components/AdminLayout.jsx";
import { StaffAssignModal, NoteModal } from "../components/StaffAssignModal.jsx";
import { ApprovalActivityDate, ScheduleUpdateDate } from "../components/DateDisplay.jsx";
import { useApiData } from "../hooks/useApiData.js";
import { shareScheduleMaps } from "../utils/helpers.js";

export default function SchedulePage({ toast, confirm }) {
  const { data, loading, reload } = useApiData("/admin/schedules", []);
  const [edit, setEdit] = useState(null);
  const [cancel, setCancel] = useState(null);

  if (loading) return <LoadingPanel />;
  return (
    <>
      <PageHeader eyebrow="Kegiatan" title="Jadwal Kegiatan" subtitle="Jadwal yang sudah siap berangkat dan menunggu waktu pelaksanaan." />
      <DataTable
        rows={data.schedules || []}
        empty="Belum ada jadwal siap kegiatan."
        columns={[
          { key: "no", label: "No", render: (_, i) => i + 1 },
          { key: "instansi", label: "Nama Lokasi", render: (row) => <ScheduleLocationCell row={row} toast={toast} /> },
          { key: "tanggal_kegiatan", label: "Tanggal Kegiatan", render: (row) => <ApprovalActivityDate row={row} /> },
          { key: "updated_at", label: "Update Data", render: (row) => <ScheduleUpdateDate row={row} /> },
          {
            key: "pj_petugas",
            label: "PJ Petugas",
            render: (row) => {
              const names = String(row.pj_petugas || "").split(",").map((name) => name.trim()).filter(Boolean);
              if (!names.length) return "-";
              return (
                <div className="flex flex-wrap gap-1 max-w-[180px]">
                  {names.map((name) => (
                    <span key={name} className="inline-block rounded-lg border border-rose-100 bg-rose-50 px-2 py-0.5 text-xs font-bold text-simodar-deep">
                      {name}
                    </span>
                  ))}
                </div>
              );
            },
          },
          { key: "jumlah", label: "Jumlah Petugas", render: (row) => row.staff_assignments?.length || 0 },
          {
            key: "aksi",
            label: "Aksi",
            render: (row) => (
              <div className="grid w-max grid-cols-2 gap-1.5">
                <Button type="button" variant="soft" className="min-h-8 rounded-lg px-2.5 text-xs" onClick={() => downloadFile(`/admin/schedules/${row.kode_pengajuan}/pdf`, `jadwal-simodar-${row.kode_pengajuan}.pdf`)}><Download size={14} /> PDF</Button>
                <Button type="button" variant="soft" className="min-h-8 rounded-lg px-2.5 text-xs" onClick={() => setEdit(row)}>Ubah</Button>
                <Button type="button" className="min-h-8 rounded-lg px-2.5 text-xs" onClick={() => confirm(`Selesaikan kegiatan ${row.instansi}?`, async () => { const result = await api(`/admin/schedules/${row.kode_pengajuan}/finish`, { method: "POST" }); toast(result.message); reload(); })}>Selesai</Button>
                <Button type="button" variant="danger" className="min-h-8 rounded-lg px-2.5 text-xs" onClick={() => setCancel(row)}>Batal</Button>
              </div>
            ),
          },
        ]}
      />
      <StaffAssignModal
        open={Boolean(edit)}
        title="Ubah Petugas Jadwal"
        activity={edit}
        staff={data.staff || []}
        onClose={() => setEdit(null)}
        onSave={(payload) => confirm(`Simpan perubahan petugas ${edit.kode_pengajuan}?`, async () => { const result = await api(`/admin/schedules/${edit.kode_pengajuan}/staff`, { method: "PUT", body: payload }); toast(result.message); setEdit(null); reload(); })}
      />
      <NoteModal
        open={Boolean(cancel)}
        title="Batalkan Jadwal"
        description={cancel ? `Sedang eksekusi data: ${cancel.instansi}` : ""}
        label="Keterangan Batal"
        onClose={() => setCancel(null)}
        onSave={(note) => confirm(`Batalkan jadwal ${cancel.kode_pengajuan}?`, async () => { const result = await api(`/admin/schedules/${cancel.kode_pengajuan}/cancel`, { method: "POST", body: { keterangan: note } }); toast(result.message); setCancel(null); reload(); })}
      />
    </>
  );
}

function ScheduleLocationCell({ row, toast }) {
  return (
    <div className="min-w-[240px] leading-snug">
      <b className="block text-slate-900">{row.instansi}</b>
      <small className="mt-1 block font-semibold text-slate-500">{row.lokasi}</small>
      <button
        type="button"
        className="mt-2 inline-flex min-h-7 items-center gap-1.5 rounded-full border border-rose-200 bg-white px-2.5 text-[11px] font-extrabold text-simodar-deep transition hover:bg-rose-50"
        onClick={() => shareScheduleMaps(row, toast)}
      >
        <MapPin size={13} /> Share Maps
      </button>
    </div>
  );
}

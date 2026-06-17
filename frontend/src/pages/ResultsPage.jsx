import { useState } from "react";
import { api } from "../api.js";
import { Button } from "../components/ui.jsx";
import { DataTable } from "../components/DataTable.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { LoadingPanel } from "../components/AdminLayout.jsx";
import { ResultModal } from "../components/ResultModal.jsx";
import { ApprovalActivityDate, ScheduleUpdateDate } from "../components/DateDisplay.jsx";
import { useApiData } from "../hooks/useApiData.js";

export default function ResultsPage({ toast, confirm }) {
  const { data, loading, reload } = useApiData("/admin/results", []);
  const [active, setActive] = useState(null);

  if (loading) return <LoadingPanel />;
  return (
    <>
      <PageHeader eyebrow="Kegiatan" title="Hasil Kegiatan" subtitle="Input hasil kegiatan setelah jadwal ditandai selesai." />
      <DataTable rows={data.results || []} empty="Tidak ada hasil kegiatan yang perlu diinput." columns={[
        { key: "no", label: "No", render: (_, i) => i + 1 },
        {
          key: "instansi",
          label: "Lokasi",
          render: (row) => (
            <div className="min-w-[230px] leading-snug">
              <b className="block font-extrabold text-slate-900">{row.instansi}</b>
              <small className="mt-1 block font-semibold text-slate-500">{row.lokasi || "-"}</small>
            </div>
          ),
        },
        { key: "tanggal_kegiatan", label: "Tanggal Kegiatan", render: (row) => <ApprovalActivityDate row={row} /> },
        { key: "updated_at", label: "Update Data", render: (row) => <ScheduleUpdateDate row={row} /> },
        { key: "aksi", label: "Aksi", render: (row) => <Button type="button" onClick={() => setActive(row)}>Input Hasil</Button> },
      ]} />
      <ResultModal open={Boolean(active)} activity={active} onClose={() => setActive(null)} onSave={(payload) => confirm(`Simpan hasil ${active.kode_pengajuan}?`, async () => { const result = await api(`/admin/results/${active.kode_pengajuan}/save`, { method: "POST", body: payload }); toast(result.message); setActive(null); reload(); })} />
    </>
  );
}

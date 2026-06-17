import { useState } from "react";
import { api } from "../api.js";
import { Button } from "../components/ui.jsx";
import { DataTable } from "../components/DataTable.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { LoadingPanel } from "../components/AdminLayout.jsx";
import { StaffAssignModal } from "../components/StaffAssignModal.jsx";
import { ApprovalAccDate, ApprovalActivityDate } from "../components/DateDisplay.jsx";
import { useApiData } from "../hooks/useApiData.js";
import { assignmentQueueAlert } from "../utils/helpers.js";

export default function AssignmentPage({ toast, confirm }) {
  const { data, loading, reload } = useApiData("/admin/assignments", []);
  const [active, setActive] = useState(null);

  async function deleteMissed(row) {
    confirm(`Hapus data terlewatkan ${row.instansi}?`, async () => {
      const result = await api(`/admin/assignments/${row.kode_pengajuan}`, { method: "DELETE" });
      toast(result.message);
      reload();
    });
  }

  if (loading) return <LoadingPanel />;
  return (
    <>
      <PageHeader eyebrow="Kegiatan" title="Penugasan Petugas" subtitle="Tugaskan penanggung jawab dan tim petugas untuk kegiatan mobile unit." />
      <DataTable
        rows={data.assignments || []}
        empty="Belum ada kegiatan yang perlu penugasan petugas."
        columns={[
          { key: "kode_pengajuan", label: "Kode" },
          { key: "approved_at", label: "Tanggal Approval", render: (row) => <ApprovalAccDate row={row} /> },
          { key: "tanggal_kegiatan", label: "Tanggal Kegiatan", render: (row) => <ApprovalActivityDate row={row} /> },
          {
            key: "instansi",
            label: "Instansi",
            render: (row) => (
              <div className="min-w-[230px] leading-snug">
                <b className="block font-extrabold text-slate-900">{row.instansi}</b>
                <small className="mt-1 block font-semibold text-slate-500">{row.lokasi || "-"}</small>
              </div>
            ),
          },
          { key: "peserta", label: "Peserta", render: (row) => `${row.peserta || 0}` },
          {
            key: "aksi",
            label: "Aksi",
            render: (row) => (
              <AssignmentAction row={row} onAdd={() => setActive(row)} onDelete={() => deleteMissed(row)} />
            ),
          },
        ]}
      />
      <StaffAssignModal
        open={Boolean(active)}
        title="Tugaskan Petugas"
        activity={active}
        staff={data.staff || []}
        onClose={() => setActive(null)}
        onSave={(payload) =>
          confirm(`Simpan penugasan petugas ${active.kode_pengajuan}?`, async () => {
            const result = await api(`/admin/assignments/${active.kode_pengajuan}/save`, {
              method: "POST",
              body: payload,
            });
            toast(result.message);
            setActive(null);
            reload();
          })
        }
      />
    </>
  );
}

function AssignmentAction({ row, onAdd, onDelete }) {
  const alert = assignmentQueueAlert(row);
  const toneClass = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    yellow: "bg-amber-50 text-amber-700 ring-amber-100",
    red: "bg-red-50 text-red-700 ring-red-100",
  }[alert?.tone || "green"];

  return (
    <div className="flex w-max flex-wrap items-center gap-1.5">
      {alert?.overdue ? (
        <Button type="button" variant="danger" className="min-h-8 rounded-lg px-2.5 text-xs" onClick={onDelete}>
          Hapus
        </Button>
      ) : (
        <Button type="button" className="min-h-8 rounded-lg px-2.5 text-xs" onClick={onAdd}>
          Tambah Petugas
        </Button>
      )}
      {alert && <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${toneClass}`}>{alert.label}</span>}
    </div>
  );
}

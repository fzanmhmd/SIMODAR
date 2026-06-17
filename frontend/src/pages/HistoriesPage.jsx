import { useState } from "react";
import { api, downloadFile } from "../api.js";
import { Button, Card, StatusBadge, Modal } from "../components/ui.jsx";
import { DataTable } from "../components/DataTable.jsx";
import { PageHeader, MonthFilter } from "../components/PageHeader.jsx";
import { LoadingPanel } from "../components/AdminLayout.jsx";
import { ResultModal } from "../components/ResultModal.jsx";
import { ApprovalActivityDate, ScheduleUpdateDate } from "../components/DateDisplay.jsx";
import { useApiData } from "../hooks/useApiData.js";
import { monthKey } from "../utils/formatters.js";
import { Droplets, Users, CalendarCheck, Ban, XCircle, FileDown } from "lucide-react";

export default function HistoriesPage({ toast, confirm }) {
  const [month, setMonth] = useState(monthKey());
  const { data, loading, reload } = useApiData(`/admin/histories?month=${month}`, [month]);
  const [activeModal, setActiveModal] = useState(null);
  const [staffModal, setStaffModal] = useState(null);

  if (loading) return <LoadingPanel />;

  const histories = data.histories || [];

  // Calculate statistics from histories list
  const stats = histories.reduce(
    (acc, row) => {
      const status = String(row.status || "").toLowerCase();
      if (status === "selesai") {
        acc.selesai += 1;
        if (row.result) {
          acc.darah += parseInt(row.result.kantong_darah, 10) || 0;
          acc.terdaftar += parseInt(row.result.donor_terdaftar, 10) || 0;
          acc.berhasil += parseInt(row.result.donor_berhasil, 10) || 0;
          acc.gagal += parseInt(row.result.donor_gagal, 10) || 0;
        }
      } else if (status === "batal") {
        acc.batal += 1;
      } else if (status === "ditolak") {
        acc.ditolak += 1;
      }
      return acc;
    },
    { selesai: 0, darah: 0, terdaftar: 0, berhasil: 0, gagal: 0, batal: 0, ditolak: 0 }
  );

  return (
    <>
      <PageHeader eyebrow="Kegiatan" title="Histori Kegiatan" subtitle="Data permanen kegiatan selesai, batal, dan ditolak.">
        <MonthFilter month={month} setMonth={setMonth} />
      </PageHeader>

      {/* Statistics Cards */}
      <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className="p-4 flex items-center gap-3.5 border-l-4 border-l-rose-500">
          <div className="rounded-xl bg-rose-50 p-2.5 text-rose-600">
            <Droplets size={22} className="fill-current" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Darah</p>
            <b className="text-2xl font-extrabold text-slate-900 leading-tight">{stats.darah}</b>
            <p className="text-[10px] font-semibold text-slate-400">Pendapatan Darah</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 border-l-4 border-l-blue-500">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Terdaftar</p>
            <b className="text-2xl font-extrabold text-slate-900 leading-tight">{stats.terdaftar}</b>
            <p className="text-[10px] font-semibold text-slate-400">Pendonor yang Terdaftar</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 border-l-4 border-l-emerald-500">
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
            <CalendarCheck size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Selesai</p>
            <b className="text-2xl font-extrabold text-slate-900 leading-tight">{stats.selesai}</b>
            <p className="text-[10px] font-semibold text-slate-400">Kegiatan sukses</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 border-l-4 border-l-amber-500">
          <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
            <Ban size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Batal</p>
            <b className="text-2xl font-extrabold text-slate-900 leading-tight">{stats.batal}</b>
            <p className="text-[10px] font-semibold text-slate-400">Kegiatan dibatalkan</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 border-l-4 border-l-red-500">
          <div className="rounded-xl bg-red-50 p-2.5 text-red-600">
            <XCircle size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ditolak</p>
            <b className="text-2xl font-extrabold text-slate-900 leading-tight">{stats.ditolak}</b>
            <p className="text-[10px] font-semibold text-slate-400">Pengajuan ditolak</p>
          </div>
        </Card>
      </div>

      <DataTable rows={histories} empty="Belum ada histori pada bulan ini." columns={[
        {
          key: "kode_pengajuan",
          label: "Kode",
          render: (row) => <strong className="text-slate-900 font-extrabold">{row.kode_pengajuan}</strong>
        },
        {
          key: "instansi",
          label: "Lokasi / Alamat",
          render: (row) => (
            <div>
              <b className="block text-slate-950 font-bold leading-normal">{row.instansi}</b>
              <span className="block text-xs text-slate-500 font-medium max-w-xs break-words leading-relaxed">{row.lokasi || "-"}</span>
            </div>
          ),
        },
        { key: "tanggal", label: "Tanggal Kegiatan", render: (row) => <ApprovalActivityDate row={row} /> },
        { key: "riwayat", label: "Riwayat Update", render: (row) => <ScheduleUpdateDate row={row} /> },
        { key: "status", label: "Status", render: (row) => <StatusBadge>{row.status}</StatusBadge> },
        {
          key: "petugas",
          label: "Petugas Lapangan",
          render: (row) => {
            const list = row.staff_assignments || [];
            if (!list.length) return <span className="text-slate-400 font-medium">-</span>;
            return (
              <Button type="button" variant="soft" className="!min-h-8 rounded-lg px-2.5 text-[11px] font-bold whitespace-nowrap shadow-sm" onClick={() => setStaffModal(row)}>
                View
              </Button>
            );
          }
        },
        {
          key: "hasil",
          label: "Hasil Donasi",
          render: (row) => {
            if (row.status !== "Selesai" || !row.result) return <span className="text-slate-400 font-medium">-</span>;
            return (
              <strong className="text-simodar-red font-extrabold text-sm">{row.result.kantong_darah} Kantong</strong>
            );
          }
        },
        {
          key: "aksi",
          label: "Aksi",
          render: (row) => {
            const status = String(row.status || "").toLowerCase();
            return (
              <div className="flex gap-1.5">
                {(status === "selesai" || status === "batal") && (
                  <>
                    <Button
                      type="button"
                      variant="soft"
                      className="!min-h-8 rounded-lg px-2.5 text-[11px] font-bold shadow-sm"
                      onClick={() => setActiveModal({ mode: "view", data: row })}
                    >
                      Lihat
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      className="!min-h-8 rounded-lg px-2.5 text-[11px] font-bold shadow-sm"
                      onClick={() => setActiveModal({ mode: "edit", data: row })}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      className="!min-h-8 rounded-lg px-2.5 text-[11px] font-bold shadow-sm flex items-center gap-1.5 bg-slate-800 text-white hover:bg-slate-900 border-none"
                      onClick={() => downloadFile(`/admin/histories/${row.kode_pengajuan}/pdf`, `hasil-kegiatan-${row.kode_pengajuan}.pdf`)}
                    >
                      <FileDown size={13} strokeWidth={2.5} /> PDF
                    </Button>
                  </>
                )}
              </div>
            );
          },
        },
      ]} />

      <ResultModal
        open={Boolean(activeModal)}
        activity={activeModal?.data}
        readOnly={activeModal?.mode === "view"}
        onClose={() => setActiveModal(null)}
        onSave={(payload) =>
          confirm(`Simpan perubahan hasil ${activeModal.data.kode_pengajuan}?`, async () => {
            const result = await api(`/admin/histories/${activeModal.data.kode_pengajuan}/result`, {
              method: "PUT",
              body: payload,
            });
            toast(result.message);
            setActiveModal(null);
            reload();
          })
        }
      />

      <Modal open={Boolean(staffModal)} onClose={() => setStaffModal(null)} title="Data Petugas Lapangan" size="sm">
        {staffModal && (
          <div className="flex flex-col gap-3">
            {staffModal.staff_assignments.map((item, index) => (
              <div key={index} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-600">
                  {item.role}
                </span>
              </div>
            ))}
            <div className="mt-4 flex justify-end">
              <Button type="button" variant="soft" onClick={() => setStaffModal(null)}>Tutup</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

import { useState, useEffect } from "react";
import { api } from "../api.js";
import { Eye } from "lucide-react";
import { Button, Card, EmptyState, Modal, StatusBadge } from "../components/ui.jsx";
import { DataTable } from "../components/DataTable.jsx";
import { PageHeader, MonthFilter } from "../components/PageHeader.jsx";
import { LoadingPanel } from "../components/AdminLayout.jsx";
import { FunctionLabels } from "../components/StaffAssignModal.jsx";
import { useApiData } from "../hooks/useApiData.js";
import { monthKey, formatMonthLabel, formatDateTime, activityDateText, formatLongDate } from "../utils/formatters.js";

function extractProvince(address, instansi = "") {
  const combined = `${address || ""} ${instansi || ""}`.toLowerCase();
  if (!combined.trim() || combined === "- -") return "-";
  
  if (combined.match(/\b(jakarta|jkt|dki|istiqlal|monas)\b/)) return "Jakarta";
  if (combined.match(/\b(banten|tangerang|tangsel)\b/)) return "Banten";
  if (combined.match(/\b(jawa barat|jabar|bogor|depok|bekasi|bandung|cikarang|karawang)\b/)) return "Jawa Barat";
  
  return "-";
}

export default function StaffHistoryPage({ toast, confirm }) {
  const [month, setMonth] = useState(monthKey());
  const { data, loading, reload } = useApiData(`/admin/staff-history?month=${month}`, [month]);
  const { data: claimsData, reload: reloadClaims } = useApiData(`/admin/claims`, []);
  const [active, setActive] = useState(null);

  if (loading) return <LoadingPanel />;
  return (
    <>
      <PageHeader eyebrow="Master Petugas" title="Histori Petugas" subtitle="Jumlah dan lokasi penugasan petugas per bulan.">
        <MonthFilter month={month} setMonth={setMonth} />
      </PageHeader>

      <DataTable rows={data?.rows || []} empty="Belum ada histori petugas." columns={[
        {
          key: "staff",
          label: "Petugas",
          render: (row) => (
            <div>
              <b className="block text-slate-900">{row.staff.name}</b>
              <div className="mt-2"><FunctionLabels roles={row.staff.roles} /></div>
            </div>
          ),
        },
        {
          key: "total",
          label: "Total Tugas",
          render: (row) => (
            <div>
              <b className="block text-2xl text-simodar-red">{row.total}</b>
              <small className="font-semibold text-slate-500">kegiatan</small>
            </div>
          ),
        },
        {
          key: "places",
          label: "Histori Terakhir",
          render: (row) => {
            const latest = row.places?.[0];
            if (!latest) return <span className="font-semibold text-slate-400">Belum ada tugas bulan ini</span>;
            return (
              <div>
                <b className="block text-slate-900">{latest.lokasi}</b>
                <small className="font-semibold text-slate-500">Tanggal kegiatan: {activityDateText(latest)} | Fungsi: {latest.fungsi}</small>
              </div>
            );
          },
        },
        {
          key: "aksi",
          label: "Aksi",
          render: (row) => (
            <Button type="button" variant="soft" disabled={!row.places?.length} onClick={() => setActive(row)}>
              <Eye size={16} /> View Histori
            </Button>
          ),
        },
      ]} />
      <StaffHistoryModal open={Boolean(active)} row={active} month={month} staffList={data?.staff || []} initialClaims={claimsData?.claims || {}} onClose={() => setActive(null)} toast={toast} reloadClaims={reloadClaims} />
    </>
  );
}

function StaffHistoryModal({ open, row, month, staffList, initialClaims, onClose, toast, reloadClaims }) {
  const places = row?.places || [];
  const [claims, setClaims] = useState({});

  useEffect(() => {
    if (open) {
      setClaims(initialClaims);
    }
  }, [open, initialClaims]);

  const handleClaimChange = (kode, fungsi, value) => {
    setClaims((prev) => ({ ...prev, [`${kode}-${fungsi}`]: value }));
  };

  const handleSave = async () => {
    try {
      const result = await api("/admin/claims", { method: "PUT", body: claims });
      toast(result.message || "Klaim histori berhasil disimpan!");
      reloadClaims();
      onClose();
    } catch (error) {
      toast(error.message);
    }
  };
  return (
    <Modal
      open={open}
      title="View Histori Kegiatan Petugas"
      description={row ? `${row.staff.name} - periode ${formatMonthLabel(month)}` : ""}
      onClose={onClose}
      size="2xl"
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Petugas</p>
          <b className="mt-1 block text-lg text-slate-950">{row?.staff?.name || "-"}</b>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Total Tugas</p>
          <b className="mt-1 block text-3xl text-simodar-red">{row?.total || 0}</b>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Periode</p>
          <b className="mt-1 block text-lg text-slate-950">{formatMonthLabel(month)}</b>
        </Card>
      </div>

      {places.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto simodar-scrollbar">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-4 text-center font-extrabold w-12">No</th>
                  <th className="px-4 py-4 font-extrabold">Lokasi Kegiatan</th>
                  <th className="px-4 py-4 font-extrabold whitespace-nowrap">Tanggal Kegiatan</th>
                  <th className="px-4 py-4 font-extrabold whitespace-nowrap">Update Data</th>
                  <th className="px-4 py-4 font-extrabold">Fungsi</th>
                  <th className="px-4 py-4 font-extrabold">Status</th>
                  <th className="px-4 py-4 font-extrabold whitespace-nowrap">Status Klaim</th>
                  <th className="px-4 py-4 font-extrabold w-[200px]">Klaim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {places.map((place, index) => (
                  <tr key={`${place.kode}-${place.fungsi}-${index}`} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-3 py-4 text-center text-sm font-bold text-slate-400 group-hover:text-slate-500">{index + 1}</td>
                    <td className="px-4 py-4 text-sm font-bold leading-snug text-slate-900 min-w-[200px]">{place.lokasi}</td>
                    <td className="px-4 py-4 text-xs font-medium text-slate-500 whitespace-nowrap">{formatLongDate(place.tanggal)}</td>
                    <td className="px-4 py-4 text-xs font-medium text-slate-500 whitespace-nowrap">{formatDateTime(place.updated_at)}</td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-700">{place.fungsi}</td>
                    <td className="px-4 py-4"><StatusBadge>{place.status}</StatusBadge></td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-600 whitespace-nowrap">{extractProvince(place.alamat, place.lokasi)}</td>
                    <td className="px-4 py-3">
                      <select 
                        value={claims[`${place.kode}-${place.fungsi}`] !== undefined ? claims[`${place.kode}-${place.fungsi}`] : row.staff.name}
                        onChange={(e) => handleClaimChange(place.kode, place.fungsi, e.target.value)}
                        className="w-full min-w-[160px] cursor-pointer rounded-md border border-slate-200 bg-slate-50/50 px-2 py-1.5 text-[11px] font-semibold text-slate-700 outline-none transition-all hover:bg-slate-100 focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20"
                      >
                        {staffList.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name === row.staff.name ? "Sendiri" : s.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState>Petugas ini belum memiliki histori kegiatan pada periode yang dipilih.</EmptyState>
      )}

      <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Button type="button" variant="soft" onClick={onClose}>
          Tutup
        </Button>
        <Button type="button" onClick={handleSave}>
          Simpan
        </Button>
      </div>
    </Modal>
  );
}

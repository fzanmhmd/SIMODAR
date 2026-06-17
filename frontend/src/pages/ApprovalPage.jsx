import { useState, useEffect } from "react";
import { api } from "../api.js";
import { Button, Field, Input, Modal, StatusBadge, TimeInput } from "../components/ui.jsx";
import { DataTable } from "../components/DataTable.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { LoadingPanel } from "../components/AdminLayout.jsx";
import { Info } from "../components/Info.jsx";
import { ApprovalSubmissionDate, ApprovalActivityDate, latestUpdate } from "../components/DateDisplay.jsx";
import { useApiData } from "../hooks/useApiData.js";
import { markApprovalsSeen } from "../utils/approvalStore.js";
import { formatDateTime, formatLongDate } from "../utils/formatters.js";

export default function ApprovalPage({ toast, confirm }) {
  const [sort, setSort] = useState("terbaru");
  const { data, loading, reload } = useApiData(`/admin/approvals?sort=${sort}`, [sort]);
  const [reject, setReject] = useState(null);
  const [edit, setEdit] = useState(null);
  const [preview, setPreview] = useState(null);
  const approvals = data?.approvals || [];

  useEffect(() => {
    if (!loading) markApprovalsSeen(approvals);
  }, [loading, approvals]);

  async function approve(row) {
    confirm(`ACC pengajuan ${row.instansi}?`, async () => {
      const result = await api(`/admin/approvals/${row.kode_pengajuan}/approve`, { method: "POST" });
      toast(result.message);
      reload();
    });
  }

  async function saveEdit(payload) {
    confirm(`Simpan perubahan pengajuan ${payload.instansi}?`, async () => {
      const result = await api(`/admin/approvals/${edit.kode_pengajuan}`, { method: "PUT", body: payload });
      toast(result.message);
      setEdit(null);
      reload();
    });
  }

  async function saveReject(event) {
    event.preventDefault();
    const note = new FormData(event.currentTarget).get("keterangan");
    if (!note) return toast("Isi keterangan tolak terlebih dahulu.");
    confirm(`Tolak pengajuan ${reject.kode_pengajuan}?`, async () => {
      const result = await api(`/admin/approvals/${reject.kode_pengajuan}/reject`, { method: "POST", body: { keterangan: note } });
      toast(result.message);
      setReject(null);
      reload();
    });
  }

  if (loading) return <LoadingPanel />;
  return (
    <>
      <PageHeader eyebrow="Kegiatan" title="Approval Pengajuan" subtitle="Verifikasi pengajuan user eksternal sebelum masuk penugasan.">
        <div className="inline-flex rounded-xl border border-rose-100 bg-white p-1">
          {[
            ["terbaru", "Terbaru"],
            ["terlama", "Terlama"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSort(value)}
              className={`min-h-8 rounded-lg px-3 text-xs font-extrabold ${
                sort === value ? "bg-simodar-red text-white shadow-sm" : "text-slate-500 hover:bg-rose-50 hover:text-simodar-red"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </PageHeader>
      <DataTable
        rows={approvals}
        empty="Belum ada pengajuan masuk."
        columns={[
          { key: "kode_pengajuan", label: "Kode" },
          { key: "tanggal_pengajuan", label: "Tanggal Pengajuan", render: (row) => <ApprovalSubmissionDate row={row} /> },
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
          { key: "peserta", label: "Estimasi Pendonor", render: (row) => `${row.peserta || 0}` },
          {
            key: "aksi",
            label: "Aksi",
            render: (row) => (
              <div className="grid w-max grid-cols-2 gap-1.5">
                <Button type="button" variant="soft" className="min-h-8 rounded-lg px-2.5 text-xs" onClick={() => setPreview(row)}>Preview</Button>
                <Button type="button" variant="soft" className="min-h-8 rounded-lg px-2.5 text-xs" onClick={() => setEdit(row)}>Edit</Button>
                <Button type="button" className="min-h-8 rounded-lg px-2.5 text-xs" onClick={() => approve(row)}>ACC</Button>
                <Button type="button" variant="danger" className="min-h-8 rounded-lg px-2.5 text-xs" onClick={() => setReject(row)}>Tolak</Button>
              </div>
            ),
          },
        ]}
      />
      <ApprovalPreviewModal open={Boolean(preview)} approval={preview} onClose={() => setPreview(null)} />
      <ApprovalEditModal open={Boolean(edit)} approval={edit} onClose={() => setEdit(null)} onSave={saveEdit} />
      <Modal open={Boolean(reject)} title="Tolak Pengajuan" description={reject ? `Sedang eksekusi data: ${reject.instansi} - ${reject.lokasi}` : ""} onClose={() => setReject(null)} size="sm">
        <form className="grid gap-4" onSubmit={saveReject}>
          <Field label="Keterangan Tolak" required>
            <Input name="keterangan" placeholder="Contoh: Jadwal bentrok atau data belum lengkap" autoFocus={false} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="soft" onClick={() => setReject(null)}>Batal</Button>
            <Button type="submit" variant="danger">Simpan Tolak</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function ApprovalPreviewModal({ open, approval, onClose }) {
  if (!approval) return null;
  const logistik = Array.isArray(approval.logistik)
    ? approval.logistik.join(", ")
    : String(approval.logistik || "").replaceAll(",", ", ");
  return (
    <Modal
      open={open}
      title="Preview Pengajuan"
      description={`Sedang melihat data: ${approval.instansi}`}
      onClose={onClose}
      size="lg"
    >
      <div className="grid gap-5">
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-simodar-red">{approval.copy_code || approval.kode_pengajuan}</p>
          <h3 className="mt-2 font-display text-2xl font-extrabold text-slate-950">{approval.instansi}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{approval.lokasi}</p>
        </div>
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <Info label="Tanggal Pengajuan" value={formatDateTime(approval.tanggal_pengajuan || approval.created_at)} />
          <Info label="Tanggal Kegiatan" value={formatLongDate(approval.tanggal)} />
          <Info label="Jam Kegiatan" value={`${approval.jam_mulai || "-"} - ${approval.jam_selesai || "-"}`} />
          <Info label="Estimasi Pendonor" value={`${approval.peserta || 0} pendonor`} />
          <Info label="Nama PIC" value={approval.nama_pic} />
          <Info label="WhatsApp PIC" value={approval.whatsapp_pic} />
          <Info label="Email PIC" value={approval.email_pic} />
          <Info label="Logistik" value={logistik || "Tidak ada catatan logistik"} />
          <Info label="Status" value={approval.status} />
          <Info label="Update Data" value={formatDateTime(latestUpdate(approval))} />
        </dl>
        <div className="flex flex-wrap justify-end gap-2">
          {approval.surat_file && (
            <a
              className="inline-flex min-h-10 items-center rounded-xl bg-simodar-red px-4 text-sm font-bold text-white hover:bg-simodar-deep"
              href={`/api/submissions/${approval.kode_pengajuan}/file`}
              target="_self"
            >
              View Surat Pengajuan
            </a>
          )}
          <Button type="button" variant="soft" onClick={onClose}>Tutup</Button>
        </div>
      </div>
    </Modal>
  );
}

function ApprovalEditModal({ open, approval, onClose, onSave }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (!approval) return;
    setForm({
      instansi: approval.instansi || "",
      lokasi: approval.lokasi || "",
      tanggal: approval.tanggal || "",
      jam_mulai: approval.jam_mulai || "",
      jam_selesai: approval.jam_selesai || "",
      peserta: approval.peserta || "",
      nama_pic: approval.nama_pic || "",
      whatsapp_pic: approval.whatsapp_pic || "",
      email_pic: approval.email_pic || "",
    });
  }, [approval]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    if (form.jam_mulai && form.jam_selesai && form.jam_selesai <= form.jam_mulai) return;
    onSave(form);
  }

  return (
    <Modal
      open={open}
      title="Edit Pengajuan"
      description={approval ? `Sedang mengubah data: ${approval.instansi}` : ""}
      onClose={onClose}
      size="lg"
    >
      <form className="grid gap-4" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Instansi/Tempat Donor" required>
            <Input value={form.instansi || ""} onChange={(event) => update("instansi", event.target.value)} required />
          </Field>
          <Field label="Estimasi Pendonor" required>
            <Input type="number" min="50" value={form.peserta || ""} onChange={(event) => update("peserta", event.target.value)} required />
          </Field>
          <div className="md:col-span-2">
            <Field label="Alamat Lokasi" required>
              <Input value={form.lokasi || ""} onChange={(event) => update("lokasi", event.target.value)} required />
            </Field>
          </div>
          <Field label="Tanggal Kegiatan" required>
            <Input type="date" value={form.tanggal || ""} onChange={(event) => update("tanggal", event.target.value)} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Jam Mulai" required>
              <TimeInput name="jam_mulai" value={form.jam_mulai || ""} onChange={(event) => update("jam_mulai", event.target.value)} required />
            </Field>
            <Field label="Jam Selesai" required>
              <TimeInput name="jam_selesai" value={form.jam_selesai || ""} onChange={(event) => update("jam_selesai", event.target.value)} required />
            </Field>
          </div>
          <Field label="Nama PIC" required>
            <Input value={form.nama_pic || ""} onChange={(event) => update("nama_pic", event.target.value)} required />
          </Field>
          <Field label="WhatsApp PIC" required>
            <Input value={form.whatsapp_pic || ""} onChange={(event) => update("whatsapp_pic", event.target.value)} required />
          </Field>
          <Field label="Email PIC" required>
            <Input type="email" value={form.email_pic || ""} onChange={(event) => update("email_pic", event.target.value)} required />
          </Field>
        </div>
        {form.jam_mulai && form.jam_selesai && form.jam_selesai <= form.jam_mulai && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">Jam selesai harus lebih besar dari jam mulai.</p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="soft" onClick={onClose}>Batal</Button>
          <Button type="submit">Simpan Perubahan</Button>
        </div>
      </form>
    </Modal>
  );
}

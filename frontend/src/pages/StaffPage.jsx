import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { api } from "../api.js";
import { Button, Field, Input, Modal } from "../components/ui.jsx";
import { DataTable } from "../components/DataTable.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { LoadingPanel } from "../components/AdminLayout.jsx";
import { FunctionLabels } from "../components/StaffAssignModal.jsx";
import { EntityDates } from "../components/DateDisplay.jsx";
import { useApiData } from "../hooks/useApiData.js";
import { roleOptions } from "../utils/helpers.js";

export default function StaffPage({ toast, confirm }) {
  const { data, loading, reload } = useApiData("/admin/staff", []);
  const [active, setActive] = useState(null);

  if (loading) return <LoadingPanel />;
  const rows = data.staff || [];
  return (
    <>
      <PageHeader eyebrow="Master Petugas" title="Data Petugas" subtitle="Kelola nama, fungsi, absen, password, dan rekening petugas.">
        <Button type="button" onClick={() => setActive({ roles: ["other"] })}><Plus size={17} /> Tambah Petugas</Button>
      </PageHeader>
      <DataTable rows={rows} empty="Belum ada petugas." columns={[
        { key: "no", label: "No", render: (_, i) => i + 1 },
        { key: "name", label: "Nama Petugas" },
        { key: "roles", label: "Fungsi", render: (row) => <FunctionLabels roles={row.roles} /> },
        { key: "absen", label: "No Absen" },
        { key: "rekening", label: "Rekening" },
        { key: "dates", label: "Tanggal Data", render: (row) => <EntityDates row={row} /> },
        { key: "aksi", label: "Aksi", render: (row) => <div className="flex gap-2"><Button variant="soft" onClick={() => setActive(row)}>Edit</Button><Button variant="danger" onClick={() => confirm(`Hapus petugas ${row.name}?`, async () => { const result = await api(`/admin/staff/${row.id}`, { method: "DELETE" }); toast(result.message); reload(); })}>Hapus</Button></div> },
      ]} />
      <StaffModal open={Boolean(active)} staff={active} onClose={() => setActive(null)} onSave={(payload) => confirm(`Simpan data petugas ${payload.name}?`, async () => { const method = active.id ? "PUT" : "POST"; const path = active.id ? `/admin/staff/${active.id}` : "/admin/staff"; const result = await api(path, { method, body: payload }); toast(result.message); setActive(null); reload(); })} />
    </>
  );
}

function StaffModal({ open, staff, onClose, onSave }) {
  const [form, setForm] = useState({ name: "", roles: ["other"], absen: "", password: "", rekening: "" });
  useEffect(() => setForm({ name: staff?.name || "", roles: staff?.roles || ["other"], absen: staff?.absen || "", password: staff?.password || "", rekening: staff?.rekening || "" }), [staff]);
  return (
    <Modal open={open} title={staff?.id ? "Edit Petugas" : "Tambah Petugas"} description="Data fungsi digunakan untuk login dan penugasan." onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nama Petugas" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="No Absen"><Input value={form.absen} onChange={(e) => setForm({ ...form, absen: e.target.value })} /></Field>
        <Field label="Password Absen"><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <Field label="Rekening"><Input value={form.rekening} onChange={(e) => setForm({ ...form, rekening: e.target.value })} /></Field>
        <div className="md:col-span-2">
          <p className="mb-2 text-sm font-bold text-slate-700">Fungsi</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {roleOptions.map((role) => <label key={role} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 text-sm font-semibold"><input type="checkbox" className="accent-simodar-red" checked={form.roles.includes(role)} onChange={(event) => setForm({ ...form, roles: event.target.checked ? [...form.roles, role] : form.roles.filter((item) => item !== role) })} />{role}</label>)}
          </div>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2"><Button variant="soft" onClick={onClose}>Batal</Button><Button onClick={() => onSave(form)}>Simpan</Button></div>
    </Modal>
  );
}

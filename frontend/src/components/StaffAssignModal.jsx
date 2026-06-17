import { useState, useEffect } from "react";
import { XCircle } from "lucide-react";
import { Button, EmptyState, Field, Input, Modal, Select } from "./ui.jsx";
import { roleOptions, splitPjNames, clientRowId } from "../utils/helpers.js";

export function StaffAssignModal({ open, title, activity, staff, onClose, onSave }) {
  const [rows, setRows] = useState([]);
  const [selectedName, setSelectedName] = useState("");
  const [selectedRole, setSelectedRole] = useState("dokter");

  useEffect(() => {
    const legacyPjNames = splitPjNames(activity?.pj_petugas);
    setRows(
      activity?.staff_assignments?.length
        ? activity.staff_assignments.map((row) => ({
            ...row,
            is_pj: Boolean(row.is_pj) || legacyPjNames.includes(row.name),
            _client_id: row._client_id || clientRowId("staff"),
          }))
        : []
    );
    setSelectedName("");
    setSelectedRole("dokter");
  }, [activity]);

  const pjNames = Array.from(new Set(rows.filter((row) => row.is_pj).map((row) => row.name)));

  function addStaff() {
    if (!selectedName) return;
    const duplicateRole = rows.some((row) => row.name === selectedName && row.role === selectedRole);
    if (duplicateRole) return;
    setRows([...rows, { name: selectedName, role: selectedRole, is_pj: false, _client_id: clientRowId("staff") }]);
    setSelectedName("");
    setSelectedRole("dokter");
  }

  function removeStaff(clientId) {
    setRows((currentRows) => currentRows.filter((row) => row._client_id !== clientId));
  }

  function togglePj(clientId, checked) {
    setRows((currentRows) => currentRows.map((row) => (row._client_id === clientId ? { ...row, is_pj: checked } : row)));
  }

  return (
    <Modal open={open} title={title} description={activity ? `Sedang eksekusi data: ${activity.instansi}` : ""} onClose={onClose} size="md">
      <div className="grid gap-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-3 text-sm font-extrabold text-slate-800">Tambah petugas untuk kegiatan ini</p>
          <div className="grid gap-3 md:grid-cols-[1fr_150px_auto] md:items-end">
            <Field label="Nama Petugas">
              <Select value={selectedName} onChange={(event) => setSelectedName(event.target.value)}>
                <option value="">Pilih petugas</option>
                {staff.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              </Select>
            </Field>
            <Field label="Fungsi">
              <Select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
                {roleOptions.map((role) => <option key={role} value={role}>{role.toUpperCase()}</option>)}
              </Select>
            </Field>
            <Button type="button" disabled={!selectedName} onClick={addStaff}>Tambah</Button>
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            Tambahkan petugas dulu, lalu centang PJ pada daftar petugas terjadwal. Minimal 1 PJ sebelum menyimpan.
          </p>
        </div>

        <div className="grid gap-2">
          <p className="text-sm font-extrabold text-slate-800">Petugas terjadwal</p>
          {rows.length ? rows.map((row) => (
            <div key={row._client_id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
              <div>
                <b className="block text-sm text-slate-900">{row.name}</b>
                <small className="font-semibold text-slate-500">{row.role.toUpperCase()}{row.is_pj ? " | PJ" : ""}</small>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex min-h-9 items-center gap-2 rounded-full bg-rose-50 px-3 text-xs font-extrabold text-simodar-deep">
                  <input
                    type="checkbox"
                    className="accent-simodar-red"
                    checked={Boolean(row.is_pj)}
                    onChange={(event) => togglePj(row._client_id, event.target.checked)}
                  />
                  PJ
                </label>
                <button type="button" className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-simodar-red" onClick={() => removeStaff(row._client_id)} aria-label={`Hapus ${row.name}`}>
                  <XCircle size={18} />
                </button>
              </div>
            </div>
          )) : (
            <EmptyState>Belum ada petugas yang ditambahkan.</EmptyState>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="soft" onClick={onClose}>Batal</Button>
          <Button
            type="button"
            disabled={!rows.length || !pjNames.length}
            onClick={() =>
              onSave({
                pj_petugas: pjNames.join(", "),
                staff_assignments: rows.map(({ _client_id, ...row }) => row),
              })
            }
          >
            Simpan
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function FunctionLabels({ roles = [] }) {
  const values = Array.isArray(roles) && roles.length ? roles : ["other"];
  return (
    <div className="flex min-w-[180px] flex-wrap gap-1.5">
      {values.map((role) => (
        <span key={role} className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-simodar-deep ring-1 ring-rose-100">
          {role}
        </span>
      ))}
    </div>
  );
}

export function NoteModal({ open, title, description, label, onClose, onSave }) {
  const [note, setNote] = useState("");
  useEffect(() => setNote(""), [open]);
  return (
    <Modal open={open} title={title} description={description} onClose={onClose} size="sm">
      <div className="grid gap-4">
        <Field label={label} required><Input value={note} onChange={(event) => setNote(event.target.value)} /></Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="soft" onClick={onClose}>Batal</Button>
          <Button type="button" variant="danger" onClick={() => note ? onSave(note) : null}>Simpan</Button>
        </div>
      </div>
    </Modal>
  );
}

import { useState, useEffect } from "react";
import { Plus, MapPin } from "lucide-react";
import { api } from "../api.js";
import { Button, Field, Input, Textarea, Modal } from "../components/ui.jsx";
import { DataTable } from "../components/DataTable.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { LoadingPanel } from "../components/AdminLayout.jsx";
import { EntityDates } from "../components/DateDisplay.jsx";
import { useApiData } from "../hooks/useApiData.js";

export default function LocationPage({ toast, confirm }) {
  const { data, loading, reload } = useApiData("/admin/locations", []);
  const [active, setActive] = useState(null);

  if (loading) return <LoadingPanel />;
  return (
    <>
      <PageHeader eyebrow="Master Lokasi" title="Data Lokasi" subtitle="Kelola lokasi donor yang sering digunakan."><Button onClick={() => setActive({})}><Plus size={17} /> Tambah Lokasi</Button></PageHeader>
      <DataTable rows={data.locations || []} empty="Belum ada lokasi." columns={[
        { key: "name", label: "Nama Lokasi", render: (row) => <strong className="font-bold text-slate-900 whitespace-nowrap">{row.name}</strong> },
        { key: "address", label: "Alamat", render: (row) => <span className="block text-[11px] text-slate-600 leading-relaxed max-w-sm">{row.address}</span> },
        {
          key: "maps_url",
          label: "Link Map",
          render: (row) => {
            const finalUrl = row.maps_url || (row.latitude && row.longitude ? `https://www.google.com/maps?q=${row.latitude},${row.longitude}` : "");
            return (
              <div className="text-[11px] font-semibold leading-normal">
                {finalUrl ? (
                  <a href={finalUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-rose-200 bg-white px-2.5 text-[11px] font-extrabold text-simodar-deep transition hover:bg-rose-50 whitespace-nowrap">
                  <MapPin size={13} /> Buka Map
                </a>
                ) : "-"}
              </div>
            );
          },
        },
        { key: "dates", label: "Tanggal Data", render: (row) => <EntityDates row={row} /> },
        { key: "aksi", label: "Aksi", render: (row) => <div className="flex gap-2"><Button variant="soft" onClick={() => setActive(row)}>Edit</Button><Button variant="danger" onClick={() => confirm(`Hapus lokasi ${row.name}?`, async () => { const result = await api(`/admin/locations/${row.id}`, { method: "DELETE" }); toast(result.message); reload(); })}>Hapus</Button></div> },
      ]} />
      <LocationModal open={Boolean(active)} location={active} onClose={() => setActive(null)} onSave={(payload) => confirm(`Simpan data lokasi ${payload.name}?`, async () => { const method = active.id ? "PUT" : "POST"; const path = active.id ? `/admin/locations/${active.id}` : "/admin/locations"; const result = await api(path, { method, body: payload }); toast(result.message); setActive(null); reload(); })} />
    </>
  );
}



function LocationModal({ open, location, onClose, onSave }) {
  const [form, setForm] = useState({ name: "", address: "", latitude: "", longitude: "", maps_url: "" });

  useEffect(() => {
    const fallbackMapsUrl = (!location?.maps_url && location?.latitude && location?.longitude) 
      ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
      : (location?.maps_url || "");

    setForm({
      name: location?.name || "",
      address: location?.address || "",
      latitude: location?.latitude || "",
      longitude: location?.longitude || "",
      maps_url: fallbackMapsUrl,
    });
  }, [location]);



  return (
    <Modal open={open} title={location?.id ? "Edit Lokasi" : "Tambah Lokasi"} description="Data lokasi dipakai pada form pengajuan dan histori kegiatan." onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label="Nama Lokasi" required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label="Alamat" required>
          <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
        </Field>
        <div>
          <Field label="Link Google Maps" required hint="Wajib diisi. Tempel (paste) link Google Maps ke sini.">
            <Input
              value={form.maps_url}
              onChange={(e) => setForm({ ...form, maps_url: e.target.value })}
              placeholder="Paste link dari Google Maps (Link share bebas)"
              required
            />
          </Field>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="soft" onClick={onClose}>Batal</Button>
        <Button onClick={() => onSave(form)}>Simpan</Button>
      </div>
    </Modal>
  );
}
